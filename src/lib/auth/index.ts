import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { NextAuthConfig } from "next-auth";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import ResendProvider from "next-auth/providers/resend";
import { CredentialsSignin } from "next-auth";
import bcrypt from "bcryptjs";
import MagicLoginLinkEmail from "@/components/emails/MagicLoginLinkEmail";
import WelcomeEmail from "@/components/emails/WelcomeEmail";
import { siteConfig } from "@/config/site";
import { authOptionsPartial } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/email/actions";
import {
  validateSignupEmail,
  isAdminEmail,
} from "@/lib/auth/signup-validation";

// Custom error class for TOTP requirement
class TOTPRequiredError extends CredentialsSignin {
  code = "TOTP_REQUIRED";
}

export const authOptions: NextAuthConfig = {
  ...authOptionsPartial,
  adapter: PrismaAdapter(db) as Adapter,

  providers: [
    ...authOptionsPartial.providers,
    ResendProvider({
      name: "Email (WebOnly)",
      from: process.env.SMTP_FROM,
      async sendVerificationRequest(params) {
        const { identifier: to, url } = params;
        try {
          const dbUser = await db.user.findFirst({
            where: { email: to },
          });
          await sendMail({
            to: [to],
            subject: `Sign in to ${siteConfig.name}`,
            react: MagicLoginLinkEmail({
              name: dbUser?.name,
              email: dbUser?.email || to,
              url,
            }),
            includeAdmins: false,
          });
        } catch (error) {
          console.error("Error sending verification email:", error);
          throw new Error("Failed to send verification email");
        }
      },
    }),
    GoogleProvider,
    GitHubProvider,
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "TOTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const dbUser = await db.user.findFirst({
          where: { email: credentials.email as string },
        });

        if (!dbUser || !dbUser.password) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          dbUser.password,
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Check if TOTP is enabled for this user
        if (dbUser.totpEnabled && dbUser.totpSecret) {
          const totpCode = credentials.totpCode as string | undefined;

          // Check if TOTP code is provided and not empty
          // Also handle the case where it's the string "undefined"
          if (
            !totpCode ||
            totpCode.trim() === "" ||
            totpCode === "undefined" ||
            totpCode === "null"
          ) {
            throw new TOTPRequiredError("TOTP_REQUIRED");
          }

          const { verifyUserTOTP } = await import("@/app/actions/totp-actions");

          const totpResult = await verifyUserTOTP({
            userId: dbUser.id,
            token: totpCode.trim(),
          });

          if (totpResult.status !== "success") {
            throw new Error(totpResult.error || "Invalid TOTP code");
          }
        }

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image,
          role: dbUser.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Skip validation for credentials provider
      if (account?.provider === "credentials") {
        return true;
      }

      // Check if this is a new user signup
      const existingUser = await db.user.findUnique({
        where: { email: user.email || undefined },
      });

      if (existingUser) {
        return true;
      }

      // For new OAuth signups, validate email restrictions
      const emailValidation = await validateSignupEmail(user.email || "");
      if (!emailValidation.isAllowed) {
        return false;
      }

      return true;
    },
    // jwt is called with `user` on sign-in, and with `token` on subsequent requests
    // so save user details in token for later use
    jwt: async ({ token, user, trigger }) => {
      // console.log("jwt callback", { token, user,  trigger, rest })
      if (user) {
        // User is available during sign-in
        token.id = user.id ?? token.sub ?? "";
        token.name = user.name;
        token.email = user.email;
        token.image = user.image || siteConfig.defaultUserImg;

        const shouldBeAdmin = await isAdminEmail(user.email || "");

        if (shouldBeAdmin && user.role !== "ADMIN") {
          try {
            await db.user.update({
              where: { id: user.id },
              data: { role: "ADMIN" },
            });
            token.role = "ADMIN";
          } catch (error) {
            console.error("Failed to update user role to ADMIN:", error);
            token.role = user.role;
          }
        } else {
          token.role = user.role;
        }
        // console.log("jwt user details updated")
      }

      if (trigger === "signUp") {
        // new user
        // console.log("jwt signUp", { token, user, rest })
        if (user) {
          const name = user.name || user.email || "";
          try {
            await sendMail({
              to: [user.email || ""],
              subject: `Welcome to ${siteConfig.name}`,
              react: WelcomeEmail({ name }),
            });
          } catch (error) {
            console.error("new user sendMail error", {
              to: user.email,
              name,
              error,
            });
          }
        }
      }
      return token;
    },
    // Update session with user data from token to be used in pages and client components
    session: async ({ session, token }) => {
      // console.log("session callback", { session, token, rest })
      if (token?.id) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email || "";
        session.user.role = token.role;
        session.user.image = token.image || siteConfig.defaultUserImg;
      }
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
