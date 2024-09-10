import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { NextAuthConfig } from "next-auth";
import { Adapter } from "next-auth/adapters";
// import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import MagicLoginLinkEmail from "@/components/emails/MagicLoginLinkEmail";
import WelcomeEmail from "@/components/emails/WelcomeEmail";
import { siteConfig } from "@/config/site";
import { authOptionsPartial } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/email/actions";

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
      },
    }),
    GoogleProvider,
    // CredentialsProvider({
    //   name: "Credentials",
    //   credentials: {
    //     email: { label: "Email", type: "email" },
    //     password: { label: "Password", type: "password" },
    //   },
    //   async authorize(credentials): Promise<User | null> {
    //     const dbUser = await db.user.findFirst({
    //       where: { email: credentials.email || "" },
    //     })
    //     if (dbUser && dbUser.password === credentials.password) {
    //       // console.log("auth success", dbUser)
    //       return {
    //         id: dbUser.id,
    //         name: dbUser.name,
    //         email: dbUser.email,
    //         image: dbUser.image,
    //       }
    //     }
    //     return null
    //   },
    // }),
  ],
  callbacks: {
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
        token.role = user.role;
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
