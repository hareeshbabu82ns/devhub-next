# Next.js Authentication System Implementation Guide

This guide provides a complete authentication system for Next.js 15+ with App Router, featuring NextAuth v5, TOTP (Two-Factor Authentication), multiple OAuth providers, magic link email authentication, and comprehensive security features.

## Overview

A production-ready authentication system with:

- ✅ Credentials-based authentication (email/password)
- ✅ OAuth providers (Google, GitHub)
- ✅ Magic link email authentication (Resend)
- ✅ TOTP (Time-based One-Time Password) 2FA
- ✅ Backup codes for 2FA recovery
- ✅ Role-based access control (USER, ADMIN)
- ✅ Signup restrictions (email whitelist, domain whitelist)
- ✅ Encrypted TOTP secrets
- ✅ Session management with JWT
- ✅ Protected routes with middleware
- ✅ Email notifications (welcome emails, magic links)

## Tech Stack

```json
{
  "dependencies": {
    "next": "15.3.1",
    "react": "^19.2.0",
    "next-auth": "5.0.0-beta.27",
    "@auth/prisma-adapter": "^2.11.1",
    "@prisma/client": "6.19.0",
    "bcryptjs": "^3.0.3",
    "otpauth": "^9.4.1",
    "qrcode": "^1.5.4",
    "zod": "^4.1.12",
    "resend": "^4.5.0",
    "@react-email/components": "^1.0.0",
    "react-hook-form": "^7.66.0",
    "@hookform/resolvers": "^5.2.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/qrcode": "^1.5.6"
  }
}
```

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/dbname"

# NextAuth Configuration
AUTH_SECRET="your-random-secret-key-here-generate-with-openssl"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
AUTH_GITHUB_ID="your-github-oauth-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-client-secret"

# Email Provider (Resend)
AUTH_RESEND_KEY="your-resend-api-key"
SMTP_FROM="noreply@yourdomain.com"

# TOTP Encryption
TOTP_ENCRYPTION_KEY="your-totp-encryption-key-32-characters-min"

# Admin Configuration
ADMIN_EMAILS="admin@example.com,admin2@example.com"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## Database Schema (Prisma)

Create `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../app/generated/prisma"
}

enum UserRole {
  USER
  ADMIN
}

model User {
  id            String          @id @default(auto()) @map("_id") @db.ObjectId
  name          String?
  email         String?         @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          UserRole        @default(USER)
  accounts      Account[]
  sessions      Session[]
  Authenticator Authenticator[]

  // TOTP (Time-based One-Time Password) fields
  totpSecret      String?   // Encrypted TOTP secret
  totpEnabled     Boolean   @default(false)
  totpBackupCodes String[]  @default([]) // Array of hashed backup codes

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id                String  @id @default(auto()) @map("_id") @db.ObjectId
  userId            String  @db.ObjectId
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.String
  access_token      String? @db.String
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.String
  session_state     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionToken String   @unique
  userId       String   @db.ObjectId
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model VerificationToken {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
}

// Optional for WebAuthn support
model Authenticator {
  credentialID         String  @id @map("_id")
  userId               String  @db.ObjectId
  providerAccountId    String
  credentialPublicKey  String
  counter              Int
  credentialDeviceType String
  credentialBackedUp   Boolean
  transports           String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, credentialID])
}

model AppSettings {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId

  // Signup restriction settings
  restrictSignup        Boolean  @default(false)
  allowedSignupEmails   String[] @default([])
  allowedSignupDomains  String[] @default([])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## File Structure

```
middleware.ts             # Root middleware (exports from src/proxy.ts)
src/
├── proxy.ts              # Auth middleware implementation (Next.js 15+ pattern)
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── sign-in/
│   │   │   └── page.tsx
│   │   └── sign-up/
│   │       └── page.tsx
│   ├── actions/
│   │   └── totp-actions.ts
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   ├── generated/
│   │   └── prisma/       # Prisma client generated files
│   └── layout.tsx
├── components/
│   ├── auth/
│   │   ├── Provider.tsx
│   │   └── sign-in.tsx
│   └── emails/
│       ├── MagicLoginLinkEmail.tsx
│       └── WelcomeEmail.tsx
├── config/
│   ├── routes.ts
│   └── site.ts
└── lib/
    ├── auth/
    │   ├── index.ts      # Main NextAuth configuration
    │   ├── utils.ts      # Auth utilities and type extensions
    │   ├── actions.ts    # Sign in/up server actions
    │   ├── totp.ts       # TOTP utilities (generate, verify, encrypt)
    │   └── signup-validation.ts  # Email validation for signup restrictions
    ├── db/
    │   └── index.ts      # Prisma client singleton
    ├── email/
    │   └── actions.ts    # Email sending utilities
    └── validations/
        └── user.ts       # Zod schemas for user validation
```

## Core Implementation Files

### 1. Database Client (`lib/db/index.ts`)

```typescript
import { PrismaClient } from "@/app/generated/prisma";

declare const global: {
  db: PrismaClient | undefined;
};

export const db: PrismaClient =
  global.db ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.db = db;
```

### 2. Routes Configuration (`config/routes.ts`)

```typescript
export const publicRoutes = ["/", "/sign-in", "/sign-up"];

export const privateRoutes = ["/dashboard", "/users", "/settings", "/profile"];

export const apiRoutePrefix = "/api/auth";

export const DEFAULT_LOGIN_REDIRECT = "/dashboard";
```

### 3. Site Configuration (`config/site.ts`)

```typescript
export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  address: string;
  defaultUserImg: string;
  emailVerificationDuration: number;
  // ... other site configs
};

export const siteConfig: SiteConfig = {
  name: "YourApp",
  description: "Your App Description",
  url: "https://yourapp.com",
  address: "Your Address",
  defaultUserImg: "/default-user.png",
  emailVerificationDuration: 15, // minutes
  // ... other configs
};
```

### 4. Auth Utilities (`lib/auth/utils.ts`)

```typescript
import { type UserRole } from "@/app/generated/prisma";
import { type DefaultSession, NextAuthConfig } from "next-auth";
import {} from "next-auth/jwt";
import { apiRoutePrefix } from "@/config/routes";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      image?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    image?: string;
  }
}

// Partial config to be used in middleware
export const authOptionsPartial: NextAuthConfig = {
  providers: [],
  basePath: apiRoutePrefix,
  debug: process.env.NODE_ENV === "development",
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt", // Required for credentials provider and middleware
  },
  pages: {
    signIn: "/sign-in",
    signOut: "/",
    error: "/sign-in",
  },
};
```

### 5. TOTP Utilities (`lib/auth/totp.ts`)

```typescript
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const ENCRYPTION_KEY =
  process.env.TOTP_ENCRYPTION_KEY ||
  "default-encryption-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypt a string using AES-256-CBC
 */
export function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt a string using AES-256-CBC
 */
export function decrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  return OTPAuth.Secret.fromBase32(
    OTPAuth.Secret.fromHex(crypto.randomBytes(20).toString("hex")).base32,
  ).base32;
}

/**
 * Generate QR code data URL for TOTP setup
 */
export async function generateQRCode(params: {
  email: string;
  secret: string;
  appName?: string;
}): Promise<string> {
  const { email, secret, appName = "YourApp" } = params;

  const totp = new OTPAuth.TOTP({
    issuer: appName,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const otpauth = totp.toString();

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Verify a TOTP token
 */
export function verifyTOTP(params: {
  token: string;
  secret: string;
  window?: number;
}): boolean {
  const { token, secret, window = 1 } = params;

  try {
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Validate the token with a time window (allows for time drift)
    const delta = totp.validate({ token, window });

    return delta !== null;
  } catch (error) {
    console.error("Error verifying TOTP:", error);
    return false;
  }
}

/**
 * Generate backup codes for TOTP
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Hash backup codes for storage
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashedCodes = await Promise.all(
    codes.map((code) => bcrypt.hash(code, 10)),
  );
  return hashedCodes;
}

/**
 * Verify a backup code against hashed codes
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[],
): Promise<{ isValid: boolean; usedIndex: number }> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const isValid = await bcrypt.compare(code, hashedCodes[i]);
    if (isValid) {
      return { isValid: true, usedIndex: i };
    }
  }

  return { isValid: false, usedIndex: -1 };
}

/**
 * Generate the current TOTP token for a secret (useful for testing)
 */
export function generateCurrentToken(secret: string): string {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  return totp.generate();
}
```

### 6. Signup Validation (`lib/auth/signup-validation.ts`)

```typescript
"use server";

import { db } from "@/lib/db";

/**
 * Validates if an email is allowed to sign up based on app settings
 */
export async function validateSignupEmail(email: string): Promise<{
  isAllowed: boolean;
  error?: string;
}> {
  try {
    const settings = await db.appSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // If no settings exist or signup restriction is not enabled, allow all
    if (!settings || !settings.restrictSignup) {
      return { isAllowed: true };
    }

    const emailLower = email.toLowerCase();
    const emailDomain = emailLower.split("@")[1];

    // Check if email is in the allowed list
    const allowedEmails = settings.allowedSignupEmails.map((e) =>
      e.toLowerCase(),
    );
    if (allowedEmails.includes(emailLower)) {
      return { isAllowed: true };
    }

    // Check if email domain is in the allowed domains list
    const allowedDomains = settings.allowedSignupDomains.map((d) =>
      d.toLowerCase(),
    );
    if (emailDomain && allowedDomains.includes(emailDomain)) {
      return { isAllowed: true };
    }

    return {
      isAllowed: false,
      error:
        "This email address is not authorized to sign up. Please contact an administrator.",
    };
  } catch (error) {
    console.error("Error validating signup email:", error);
    return { isAllowed: true }; // Allow on error to avoid blocking legitimate users
  }
}

/**
 * Check if user is an admin based on ADMIN_EMAILS environment variable
 */
export async function isAdminEmail(email: string): Promise<boolean> {
  const adminEmails =
    process.env.ADMIN_EMAILS?.split(",").map((e: string) =>
      e.trim().toLowerCase(),
    ) || [];
  return adminEmails.includes(email.toLowerCase());
}
```

### 7. User Validation Schemas (`lib/validations/user.ts`)

```typescript
import * as z from "zod";
import { siteConfig } from "@/config/site";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(5).max(100),
  email: z.string().email(),
  telephone: z.string().min(10).max(15).optional(),
  image: z.string().default(siteConfig.defaultUserImg).optional(),
  isAdmin: z.boolean().default(false),
});

export const UserInputSchema = UserSchema.omit({ id: true });

export const UserSigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export const UserSignupSchema = z.object({
  name: z.string().min(5).max(100),
  email: z.string().email(),
  password: z.string().min(4),
  // For more complex password rules:
  // password: z.string().refine(
  //   (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/.test(value),
  //   {
  //     message: "Password must contain uppercase, lowercase, number, special character, min 8 chars",
  //   }
  // ),
});
```

### 8. Auth Actions (`lib/auth/actions.ts`)

```typescript
"use server";

import { differenceInMinutes, format, subDays } from "date-fns";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { UserSigninSchema, UserSignupSchema } from "@/lib/validations/user";
import {
  validateSignupEmail,
  isAdminEmail,
} from "@/lib/auth/signup-validation";
import { signIn as naSignIn, signOut as naSignOut } from ".";

export type SignInEmailResponse =
  | { status: "success"; message: string }
  | { status: "error"; error: string };

export const signIn = async (provider?: string) => {
  return naSignIn(provider);
};

export const signInCredentials = async (
  values: z.infer<typeof UserSigninSchema>,
) => {
  const validatedFields = UserSigninSchema.safeParse(values);
  if (!validatedFields.success) throw new Error("Invalid fields");

  return naSignIn("credentials", {
    ...validatedFields.data,
    callbackUrl: "/dashboard",
  });
};

export const signInEmail = async (
  email: string,
): Promise<SignInEmailResponse> => {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { status: "error", error: "Please enter a valid email address" };
    }

    // Check for recent token generation
    const dbToken = await db.verificationToken.findFirst({
      where: { identifier: email },
    });

    if (dbToken) {
      const tokenGenDate = subDays(dbToken?.expires || new Date(), 1);
      const diffMins = differenceInMinutes(new Date(), tokenGenDate);
      if (diffMins < siteConfig.emailVerificationDuration) {
        const remainingMins = siteConfig.emailVerificationDuration - diffMins;
        return {
          status: "error",
          error: `Token already sent to ${email} at ${format(tokenGenDate, "p")}. Please wait ${remainingMins} more minute${remainingMins > 1 ? "s" : ""} before requesting a new one.`,
        };
      }
    }

    const result = await naSignIn("resend", { email, redirect: false });

    if (result?.error) {
      console.error("SignIn error:", result.error);
      return {
        status: "error",
        error:
          "Failed to send magic link. Please try again or contact support.",
      };
    }

    return {
      status: "success",
      message: `Magic link sent to ${email}! Check your inbox and spam folder.`,
    };
  } catch (error) {
    console.error("SignInEmail error:", error);
    return {
      status: "error",
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
    };
  }
};

export const signOut = async () => {
  await naSignOut();
};

export type SignUpResponse =
  | { status: "success"; message: string; userId: string }
  | { status: "error"; error: string };

export const signUp = async (
  values: z.infer<typeof UserSignupSchema>,
): Promise<SignUpResponse> => {
  try {
    const validatedFields = UserSignupSchema.safeParse(values);

    if (!validatedFields.success) {
      const errors = validatedFields.error.issues
        .map((err) => err.message)
        .join(", ");
      return { status: "error", error: errors };
    }

    const { name, email, password } = validatedFields.data;

    // Validate signup email restrictions
    const emailValidation = await validateSignupEmail(email);
    if (!emailValidation.isAllowed) {
      return {
        status: "error",
        error:
          emailValidation.error || "This email is not authorized to sign up.",
      };
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const shouldBeAdmin = await isAdminEmail(email);
    const userRole = shouldBeAdmin ? "ADMIN" : "USER";

    let user;
    let isUpdatingOAuthUser = false;

    if (existingUser) {
      if (existingUser.password) {
        return {
          status: "error",
          error:
            "An account with this email already exists. Please sign in instead.",
        };
      }

      // User exists but doesn't have a password (OAuth user)
      isUpdatingOAuthUser = true;
      user = await db.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          name: name || existingUser.name,
          emailVerified: existingUser.emailVerified || new Date(),
          role: userRole,
        },
      });
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: userRole,
          emailVerified: new Date(),
        },
      });
    }

    const successMessage = isUpdatingOAuthUser
      ? "Password added to your account! Now set up two-factor authentication."
      : "Account created successfully! Now set up two-factor authentication.";

    return {
      status: "success",
      message: successMessage,
      userId: user.id,
    };
  } catch (error) {
    console.error("SignUp error:", error);
    return {
      status: "error",
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
    };
  }
};
```

### 9. Main NextAuth Configuration (`lib/auth/index.ts`)

```typescript
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { NextAuthConfig } from "next-auth";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import ResendProvider from "next-auth/providers/resend";
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
          if (!credentials.totpCode) {
            throw new Error("TOTP verification required");
          }

          const { verifyUserTOTP } = await import("@/app/actions/totp-actions");

          const totpResult = await verifyUserTOTP({
            userId: dbUser.id,
            token: credentials.totpCode as string,
          });

          if (totpResult.status !== "success") {
            throw new Error("Invalid TOTP code");
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
    jwt: async ({ token, user, trigger }) => {
      if (user) {
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
      }

      if (trigger === "signUp") {
        if (user) {
          const name = user.name || user.email || "";
          try {
            await sendMail({
              to: [user.email || ""],
              subject: `Welcome to ${siteConfig.name}`,
              react: WelcomeEmail({ name }),
            });
          } catch (error) {
            console.error("new user sendMail error", error);
          }
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
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

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
```

### 10. TOTP Actions (`app/actions/totp-actions.ts`)

```typescript
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  encrypt,
  decrypt,
} from "@/lib/auth/totp";

export type TotpActionResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/**
 * Setup TOTP for a user - generates secret and QR code
 */
export async function setupTOTP(userId?: string): Promise<
  TotpActionResponse<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }>
> {
  try {
    const session = await auth();
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) {
      return { status: "error", error: "Unauthorized" };
    }

    if (userId && session && userId !== session?.user?.id) {
      if (session?.user?.role !== "ADMIN") {
        return { status: "error", error: "Unauthorized" };
      }
    }

    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, totpEnabled: true },
    });

    if (!user || !user.email) {
      return { status: "error", error: "User not found" };
    }

    const secret = generateTOTPSecret();
    const qrCode = await generateQRCode({
      email: user.email,
      secret,
    });

    const backupCodes = generateBackupCodes(10);

    return {
      status: "success",
      data: {
        secret,
        qrCode,
        backupCodes,
      },
    };
  } catch (error) {
    console.error("Setup TOTP error:", error);
    return { status: "error", error: "Failed to setup TOTP" };
  }
}

/**
 * Enable TOTP for a user after verifying the token
 */
const EnableTOTPSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  token: z.string().length(6, "Token must be 6 digits"),
  backupCodes: z.array(z.string()),
  userId: z.string().optional(),
});

export async function enableTOTP(
  data: z.infer<typeof EnableTOTPSchema>,
): Promise<TotpActionResponse<{ backupCodes: string[] }>> {
  try {
    const validated = EnableTOTPSchema.parse(data);
    const session = await auth();
    const targetUserId = validated.userId || session?.user?.id;

    if (!targetUserId) {
      return { status: "error", error: "Unauthorized" };
    }

    if (validated.userId && session && validated.userId !== session?.user?.id) {
      if (session?.user?.role !== "ADMIN") {
        return { status: "error", error: "Unauthorized" };
      }
    }

    const isValid = verifyTOTP({
      token: validated.token,
      secret: validated.secret,
    });

    if (!isValid) {
      return { status: "error", error: "Invalid verification code" };
    }

    const hashedBackupCodes = await hashBackupCodes(validated.backupCodes);
    const encryptedSecret = encrypt(validated.secret);

    await db.user.update({
      where: { id: targetUserId },
      data: {
        totpSecret: encryptedSecret,
        totpEnabled: true,
        totpBackupCodes: hashedBackupCodes,
      },
    });

    return {
      status: "success",
      data: {
        backupCodes: validated.backupCodes,
      },
    };
  } catch (error) {
    console.error("Enable TOTP error:", error);
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }
    return { status: "error", error: "Failed to enable TOTP" };
  }
}

/**
 * Verify TOTP token for a user
 */
const VerifyTOTPSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  token: z
    .string()
    .min(6, "Token must be at least 6 characters")
    .max(8, "Token must be at most 8 characters"),
});

export async function verifyUserTOTP(
  data: z.infer<typeof VerifyTOTPSchema>,
): Promise<TotpActionResponse<{ verified: true }>> {
  try {
    const validated = VerifyTOTPSchema.parse(data);

    const user = await db.user.findUnique({
      where: { id: validated.userId },
      select: { totpSecret: true, totpEnabled: true, totpBackupCodes: true },
    });

    if (!user || !user.totpEnabled || !user.totpSecret) {
      return { status: "error", error: "TOTP not enabled for this user" };
    }

    const secret = decrypt(user.totpSecret);

    // First, try to verify as TOTP token
    const isValidTOTP = verifyTOTP({
      token: validated.token,
      secret,
    });

    if (isValidTOTP) {
      return { status: "success", data: { verified: true } };
    }

    // If TOTP fails, try backup code
    const backupCodeResult = await verifyBackupCode(
      validated.token,
      user.totpBackupCodes,
    );

    if (backupCodeResult.isValid) {
      // Remove used backup code
      const updatedBackupCodes = user.totpBackupCodes.filter(
        (_, index) => index !== backupCodeResult.usedIndex,
      );

      await db.user.update({
        where: { id: validated.userId },
        data: { totpBackupCodes: updatedBackupCodes },
      });

      return { status: "success", data: { verified: true } };
    }

    return { status: "error", error: "Invalid TOTP code or backup code" };
  } catch (error) {
    console.error("Verify TOTP error:", error);
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }
    return { status: "error", error: "Failed to verify TOTP" };
  }
}

/**
 * Disable TOTP for a user
 */
export async function disableTOTP(
  userId?: string,
): Promise<TotpActionResponse<{ disabled: true }>> {
  try {
    const session = await auth();
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) {
      return { status: "error", error: "Unauthorized" };
    }

    if (userId && session && userId !== session?.user?.id) {
      if (session?.user?.role !== "ADMIN") {
        return { status: "error", error: "Unauthorized" };
      }
    }

    await db.user.update({
      where: { id: targetUserId },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpBackupCodes: [],
      },
    });

    return { status: "success", data: { disabled: true } };
  } catch (error) {
    console.error("Disable TOTP error:", error);
    return { status: "error", error: "Failed to disable TOTP" };
  }
}
```

### 11. API Route Handler (`app/api/auth/[...nextauth]/route.ts`)

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### 12. Auth Middleware - Next.js 15+ Pattern

**Root Middleware (`middleware.ts`):**

```typescript
// Next.js 15+ pattern: Export auth middleware from proxy
export { default } from "./src/proxy";
export { config } from "./src/proxy";
```

**Auth Proxy Implementation (`src/proxy.ts`):**

```typescript
import NextAuth from "next-auth";
import { authOptionsPartial } from "@/lib/auth/utils";
import {
  apiRoutePrefix,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from "./config/routes";

const { auth } = NextAuth(authOptionsPartial);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const queryParams = nextUrl.searchParams;

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiRoutePrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  if (isApiAuthRoute) {
    return;
  }

  if (
    isLoggedIn &&
    (nextUrl.pathname === "/sign-in" || nextUrl.pathname === "/sign-up")
  ) {
    const from = queryParams.has("from")
      ? decodeURIComponent(queryParams.get("from") || DEFAULT_LOGIN_REDIRECT)
      : queryParams.has("callbackUrl")
        ? decodeURIComponent(
            queryParams.get("callbackUrl") || DEFAULT_LOGIN_REDIRECT,
          )
        : DEFAULT_LOGIN_REDIRECT;
    return Response.redirect(new URL(from, nextUrl));
  }

  if (!isLoggedIn && !isPublicRoute) {
    let from = nextUrl.pathname;
    if (nextUrl.search) {
      from += nextUrl.search;
    }
    return Response.redirect(
      new URL(`/sign-in?from=${encodeURIComponent(from)}`, nextUrl),
    );
  }

  // Optional: Redirect logged-in users from home to dashboard
  if (isLoggedIn && nextUrl.pathname === "/") {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

**Why this pattern?**

Next.js 15+ recommends separating the auth middleware implementation into `src/proxy.ts` for better module resolution and to avoid potential circular dependency issues. The root `middleware.ts` simply re-exports from the proxy file.

### 13. Session Provider (`components/auth/Provider.tsx`)

```tsx
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { apiRoutePrefix } from "@/config/routes";
import { auth } from "@/lib/auth";

export default async function NextAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (session && session.user) {
    session.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: session.user.role,
    };
  }
  return (
    <SessionProvider basePath={apiRoutePrefix} session={session}>
      {children}
    </SessionProvider>
  );
}
```

### 14. Email Utilities (`lib/email/actions.ts`)

```typescript
"use server";

import { UserRole } from "@/app/generated/prisma";
import { db } from "../db";
import { Resend } from "resend";
import { JSX } from "react";

export async function sendMail({
  to,
  subject,
  react,
  includeAdmins = true,
}: {
  to: string[];
  subject: string;
  react: JSX.Element;
  includeAdmins?: boolean;
}) {
  const adminEmails = process.env.ADMIN_EMAILS!.split(",");
  const adminUsers = await db.user.findMany({
    where: { role: UserRole.ADMIN },
  });

  if (process.env.NODE_ENV !== "development") {
    adminUsers.forEach((user) => {
      if (user.email && !adminEmails.includes(user.email)) {
        adminEmails.push(user.email);
      }
    });
  }

  const finalCC = includeAdmins ? adminEmails.splice(0, 3) : [];

  if (process.env.NODE_ENV === "development") {
    return;
  }

  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const data = await resend.emails.send({
    from: `YourApp <${process.env.SMTP_FROM}>`,
    to: [...to],
    cc: finalCC,
    subject: subject,
    react,
  });

  return data;
}
```

### 15. Email Templates

**Magic Link Email (`components/emails/MagicLoginLinkEmail.tsx`):**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { siteConfig } from "@/config/site";

interface MagicLoginLinkEmailProps {
  name?: string | null;
  email: string;
  url: string;
}

export const MagicLoginLinkEmail = ({
  name,
  email,
  url,
}: MagicLoginLinkEmailProps) => {
  const { host, searchParams } = new URL(url);
  const loginCode = searchParams.get("token");

  return (
    <Html>
      <Head />
      <Preview>Login to {siteConfig.name}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${host}/logo.png`}
            width="170"
            height="170"
            alt="Logo"
            style={logo}
          />
          <Text style={paragraph}>Hi {name || email},</Text>
          <Text style={paragraph}>Login to {siteConfig.name}.</Text>
          <Section style={btnContainer}>
            <Button style={button} href={url}>
              Login
            </Button>
          </Section>
          <Link
            href={url}
            target="_blank"
            style={{ ...link, display: "block", marginBottom: "16px" }}
          >
            Click here to log in with this magic link
          </Link>
          <Text style={{ ...text, marginBottom: "14px" }}>
            Or, copy and paste this temporary login code:
          </Text>
          <code style={code}>{loginCode}</code>
          <Text
            style={{
              ...text,
              color: "#ababab",
              marginTop: "14px",
              marginBottom: "16px",
            }}
          >
            If you didn&apos;t try to login, you can safely ignore this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>{siteConfig.address}</Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
};

const logo = {
  margin: "0 auto",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
};

const btnContainer = {
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#5F51E8",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px",
};

const link = {
  color: "#067df7",
  textDecoration: "underline",
};

const text = {
  fontSize: "14px",
  lineHeight: "24px",
};

const code = {
  display: "inline-block",
  padding: "16px 4.5%",
  width: "90.5%",
  backgroundColor: "#f4f4f4",
  borderRadius: "5px",
  border: "1px solid #eee",
  color: "#333",
};

const hr = {
  borderColor: "#cccccc",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
};

export default MagicLoginLinkEmail;
```

**Welcome Email (`components/emails/WelcomeEmail.tsx`):**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { siteConfig } from "@/config/site";

interface WelcomeEmailProps {
  name: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/";

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to {siteConfig.name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/logo.png`}
          width="170"
          height="170"
          alt="Logo"
          style={logo}
        />
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>Welcome to {siteConfig.name}.</Text>
        <Section style={btnContainer}>
          <Button style={button} href={baseUrl}>
            Get started
          </Button>
        </Section>
        <Text style={paragraph}>
          Best Wishes,
          <br />
          The Team
        </Text>
        <Hr style={hr} />
        <Text style={footer}>{siteConfig.address}</Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
};

const logo = {
  margin: "0 auto",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
};

const btnContainer = {
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#5F51E8",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px",
};

const hr = {
  borderColor: "#cccccc",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
};

export default WelcomeEmail;
```

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install next-auth@5.0.0-beta.27 @auth/prisma-adapter @prisma/client bcryptjs otpauth qrcode resend @react-email/components react-hook-form @hookform/resolvers zod date-fns

pnpm install -D @types/bcryptjs @types/qrcode prisma
```

### 2. Initialize Prisma

```bash
npx prisma init
```

### 3. Configure Environment Variables

Copy the environment variables section above to your `.env` file and fill in the values.

### 4. Generate Prisma Client

```bash
npx prisma generate
npx prisma db push
```

### 5. Generate Auth Secret

```bash
openssl rand -base64 32
```

Add this to your `.env` as `AUTH_SECRET`.

### 6. Configure OAuth Providers

**Google OAuth:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**GitHub OAuth:**

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

### 7. Configure Resend for Email

1. Sign up at [Resend](https://resend.com)
2. Get your API key
3. Verify your sending domain

### 8. Wrap Your App with Session Provider

In your root layout (`app/layout.tsx`):

```tsx
import NextAuthProvider from "@/components/auth/Provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
```

## Usage Examples

### Protecting Routes

Use the `auth()` function in Server Components:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  return <div>Welcome {session.user.name}</div>;
}
```

### Client-Side Session Access

```tsx
"use client";

import { useSession } from "next-auth/react";

export function UserProfile() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Not signed in</div>;
  }

  return <div>Signed in as {session.user.email}</div>;
}
```

### Role-Based Access Control

```tsx
import { auth } from "@/lib/auth";

export default async function AdminPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access Denied</div>;
  }

  return <div>Admin Dashboard</div>;
}
```

### Sign Out

```tsx
"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })}>Sign Out</button>
  );
}
```

## Security Considerations

1. **Strong Secret Keys**: Always use strong, randomly generated secrets
2. **HTTPS in Production**: Never use HTTP in production
3. **TOTP Encryption**: The TOTP secrets are encrypted at rest
4. **Password Hashing**: Passwords are hashed with bcrypt (10 rounds)
5. **Email Verification**: Consider implementing email verification for new signups
6. **Rate Limiting**: Implement rate limiting for authentication endpoints
7. **CSRF Protection**: NextAuth handles CSRF protection automatically
8. **Backup Codes**: Backup codes are hashed and can only be used once

## Testing

Test credentials login with TOTP:

1. Sign up with email/password
2. Set up TOTP (scan QR code with Google Authenticator or Authy)
3. Save backup codes securely
4. Sign out and sign in with email, password, and TOTP code

Test OAuth login:

1. Click "Sign in with Google" or "Sign in with GitHub"
2. Authorize the application
3. Should redirect to dashboard

Test magic link:

1. Enter email address
2. Check email inbox for magic link
3. Click link to sign in

## Troubleshooting

**Issue: "Invalid callback URL" error**

- Ensure `NEXTAUTH_URL` matches your actual URL
- Check OAuth provider redirect URIs

**Issue: TOTP codes not working**

- Ensure system time is synchronized
- Check TOTP window parameter (default: 1)
- Verify encryption key is consistent

**Issue: Emails not sending**

- Verify Resend API key
- Check SMTP_FROM email is verified
- Check email provider logs

**Issue: Session not persisting**

- Verify AUTH_SECRET is set
- Check cookie settings in browser
- Ensure middleware is properly configured

## UI Components

### Sign-In Page (`app/(auth)/sign-in/page.tsx`)

Complete sign-in page with credentials, magic link, and OAuth authentication:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Icons } from "@/components/shared/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { signInEmail } from "@/lib/auth/actions";
import { checkTOTPByEmail } from "@/app/actions/totp-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  InfoIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showTotpInput, setShowTotpInput] = useState(false);
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [emailToken, setEmailToken] = useState("");
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    if (!showTotpInput) {
      setIsCredentialsLoading(true);
      try {
        const totpStatus = await checkTOTPByEmail(email);

        if (totpStatus.status === "success" && totpStatus.data.totpEnabled) {
          setShowTotpInput(true);
          toast({
            title: "Two-Factor Authentication Required",
            description:
              "Please enter your 6-digit code from your authenticator app",
          });
          setIsCredentialsLoading(false);
          return;
        }

        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          toast({
            title: "Authentication failed",
            description: "Invalid email or password",
            variant: "destructive",
          });
        } else if (result?.ok) {
          window.location.href = "/dashboard";
        }
      } catch (e) {
        console.error("Credentials sign-in error:", e);
        toast({
          title: "Error signing in",
          description: e instanceof Error ? e.message : "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsCredentialsLoading(false);
      }
    } else {
      if (!totpCode || (totpCode.length !== 6 && totpCode.length !== 8)) {
        toast({
          title: "Invalid code",
          description:
            "Please enter a 6-digit TOTP code or 8-character backup code",
          variant: "destructive",
        });
        return;
      }

      setIsCredentialsLoading(true);
      try {
        const result = await signIn("credentials", {
          email,
          password,
          totpCode,
          redirect: false,
        });

        if (result?.error) {
          toast({
            title: "Authentication failed",
            description:
              "Invalid verification code. Please try again or use a backup code.",
            variant: "destructive",
          });
          setTotpCode("");
        } else if (result?.ok) {
          window.location.href = "/dashboard";
        }
      } catch (e) {
        console.error("TOTP verification error:", e);
        toast({
          title: "Error verifying code",
          description: e instanceof Error ? e.message : "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsCredentialsLoading(false);
      }
    }
  };

  const sendMagicLink = async () => {
    if (!magicEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsSendingMagicLink(true);
    try {
      const result = await signInEmail(magicEmail);

      if (result.status === "success") {
        setEmailSent(true);
        toast({
          title: "Magic link sent! ✉️",
          description: result.message,
        });
      } else {
        toast({
          title: "Error sending magic link",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Magic link error:", e);
      toast({
        title: "Error sending magic link",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleTokenSubmit = async () => {
    if (!magicEmail || !emailToken) {
      toast({
        title: "Missing information",
        description: "Please enter both email and token",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingToken(true);
    try {
      const result = await signIn("resend", {
        email: magicEmail,
        token: emailToken,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result && "error" in result && result.error) {
        toast({
          title: "Authentication failed",
          description:
            "Invalid or expired token. Please request a new magic link.",
          variant: "destructive",
        });
        setIsSubmittingToken(false);
      } else if (result && "url" in result) {
        window.location.href = result.url || "/dashboard";
      }
    } catch (e) {
      console.error("Token submit error:", e);
      toast({
        title: "Error signing in",
        description: "Please check your token and try again",
        variant: "destructive",
      });
      setIsSubmittingToken(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsOAuthLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (e) {
      toast({
        title: "Error signing in",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
      setIsOAuthLoading(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl border-2 shadow-lg">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-center justify-center pb-2">
          <div className="rounded-full bg-gradient-to-br from-primary to-primary/60 p-1">
            <Avatar className="size-16">
              <AvatarImage src="/icon-192.png" />
              <AvatarFallback>HK</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold">
            Welcome to YourApp
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to access your account
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="credentials" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credentials">Email & Password</TabsTrigger>
            <TabsTrigger value="magic">Magic Link</TabsTrigger>
          </TabsList>

          <TabsContent value="credentials" className="space-y-4">
            <Alert>
              <InfoIcon className="size-4" />
              <AlertDescription>
                Sign in with your email and password
              </AlertDescription>
            </Alert>

            <form onSubmit={handleCredentialsSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isCredentialsLoading || showTotpInput}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isCredentialsLoading || showTotpInput}
                  required
                />
              </div>

              {showTotpInput && (
                <div className="space-y-2">
                  <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                    <ShieldCheckIcon className="size-4 text-blue-600" />
                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                      Enter your 6-digit code from your authenticator app or use
                      an 8-character backup code
                    </AlertDescription>
                  </Alert>
                  <Label htmlFor="totpCode">Authentication Code</Label>
                  <Input
                    id="totpCode"
                    type="text"
                    placeholder="000000 or ABCD1234"
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(
                        e.target.value
                          .replace(/[^0-9A-Fa-f]/g, "")
                          .slice(0, 8)
                          .toUpperCase(),
                      )
                    }
                    disabled={isCredentialsLoading}
                    maxLength={8}
                    autoFocus
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    6 digits from your authenticator app or 8-character backup
                    code
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isCredentialsLoading}
                size="lg"
              >
                {isCredentialsLoading ? (
                  <>
                    <Icons.spinner className="mr-2 size-4 animate-spin" />
                    {showTotpInput ? "Verifying..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    <Icons.login className="mr-2 size-4" />
                    {showTotpInput ? "Verify & Sign In" : "Sign In"}
                  </>
                )}
              </Button>

              {showTotpInput && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowTotpInput(false);
                    setTotpCode("");
                  }}
                  disabled={isCredentialsLoading}
                >
                  Back to Password
                </Button>
              )}
            </form>
          </TabsContent>

          <TabsContent value="magic" className="space-y-4">
            <Alert>
              <InfoIcon className="size-4" />
              <AlertDescription>
                Enter your email to receive a magic link. Click the link or
                paste the token here.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magicEmail">Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="magicEmail"
                    type="email"
                    placeholder="name@example.com"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    disabled={isSendingMagicLink}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isSendingMagicLink)
                        sendMagicLink();
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMagicLink}
                    disabled={isSendingMagicLink || !magicEmail}
                    size="lg"
                  >
                    {isSendingMagicLink ? (
                      <Icons.spinner className="size-4 animate-spin" />
                    ) : (
                      <Icons.email className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              {emailSent && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Magic link sent! Check your email inbox and spam folder.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="emailToken">Token (from email)</Label>
                <div className="flex gap-2">
                  <Input
                    id="emailToken"
                    type="text"
                    placeholder="Enter token from email"
                    value={emailToken}
                    onChange={(e) => setEmailToken(e.target.value)}
                    disabled={isSubmittingToken}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isSubmittingToken)
                        handleTokenSubmit();
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleTokenSubmit}
                    disabled={isSubmittingToken || !emailToken || !magicEmail}
                    size="lg"
                  >
                    {isSubmittingToken ? (
                      <Icons.spinner className="size-4 animate-spin" />
                    ) : (
                      <Icons.login className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isOAuthLoading !== null}
            size="lg"
            className="w-full"
          >
            {isOAuthLoading === "google" ? (
              <Icons.spinner className="mr-2 size-5 animate-spin" />
            ) : (
              <svg
                className="mr-2 size-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Google
          </Button>

          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn("github")}
            disabled={isOAuthLoading !== null}
            size="lg"
            className="w-full"
          >
            {isOAuthLoading === "github" ? (
              <Icons.spinner className="mr-2 size-5 animate-spin" />
            ) : (
              <Icons.gitHub className="mr-2 size-5" />
            )}
            GitHub
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
          <LockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Your data is encrypted and secure. We never share your information
            with third parties.
          </p>
        </div>

        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Sign-Up Page (`app/(auth)/sign-up/page.tsx`)

Complete sign-up page with TOTP setup flow:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyholeIcon,
  ShieldCheckIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserSignupSchema } from "@/lib/validations/user";
import { signUp } from "@/lib/auth/actions";
import { Icons } from "@/components/shared/icons";
import { setupTOTP, enableTOTP } from "@/app/actions/totp-actions";

type SignupFormValues = z.infer<typeof UserSignupSchema>;

export default function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"signup" | "totp-setup" | "totp-verify">(
    "signup",
  );
  const [totpData, setTotpData] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(UserSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const handleSignup = async (values: SignupFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp(values);

      if (!result) {
        throw new Error("Signup failed - no response from server");
      }

      if (result.status === "error") {
        setError(result.error);
        toast({
          title: "Signup Failed",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Now let's set up two-factor authentication",
        });

        setCredentials({
          email: values.email,
          password: values.password,
        });

        setUserId(result.userId);

        const totpSetup = await setupTOTP(result.userId);

        if (!totpSetup) {
          throw new Error("Failed to setup TOTP - no response from server");
        }

        if (totpSetup.status === "success") {
          setTotpData(totpSetup.data);
          setStep("totp-setup");
        } else {
          throw new Error(totpSetup.error);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpVerify = async () => {
    if (!totpCode || totpCode.length !== 6 || !totpData || !userId) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await enableTOTP({
        secret: totpData.secret,
        token: totpCode,
        backupCodes: totpData.backupCodes,
        userId: userId,
      });

      if (!result) {
        throw new Error("Failed to enable TOTP - no response from server");
      }

      if (result.status === "success") {
        toast({
          title: "Two-Factor Authentication Enabled!",
          description: "Your account is now secured with 2FA",
        });
        setStep("totp-verify");
      } else {
        toast({
          title: "Verification Failed",
          description: result.error,
          variant: "destructive",
        });
        setTotpCode("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (totpData) {
      const codesText = totpData.backupCodes.join("\n");
      navigator.clipboard.writeText(codesText);
      setCopiedCodes(true);
      toast({
        title: "Copied!",
        description: "Backup codes copied to clipboard",
      });
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const completeTotpSetup = () => {
    toast({
      title: "Setup Complete!",
      description: "Please sign in with your authenticator code",
    });
    router.push("/sign-in");
  };

  const handleOAuthSignIn = async (provider: string) => {
    setIsOAuthLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to sign in with ${provider}`,
        variant: "destructive",
      });
    } finally {
      setIsOAuthLoading(null);
    }
  };

  return (
    <Card className="min-w-lg m-auto rounded-lg p-2 md:min-w-[500px]">
      <CardHeader>
        <div className="flex items-center justify-center pb-2">
          <Avatar className="size-16">
            <AvatarImage src="/icon-192.png" />
            <AvatarFallback>Logo</AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">
          {step === "signup" && "Sign Up"}
          {step === "totp-setup" && "Set Up Two-Factor Authentication"}
          {step === "totp-verify" && "Save Your Backup Codes"}
        </CardTitle>
        <CardDescription>
          {step === "signup" && "Enter your information to create an account"}
          {step === "totp-setup" &&
            "Scan the QR code with your authenticator app"}
          {step === "totp-verify" && "Save these backup codes in a safe place"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "signup" && (
          <form onSubmit={form.handleSubmit(handleSignup)}>
            <div className="grid gap-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...form.register("name")}
                  disabled={isLoading}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...form.register("email")}
                  disabled={isLoading}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...form.register("password")}
                  disabled={isLoading}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icons.spinner className="mr-2 size-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create an account"
                )}
              </Button>

              <div className="flex w-full items-center py-4">
                <div className="bg-primary h-px flex-1" />
                <span className="text-primary px-2 text-sm">
                  <LockKeyholeIcon className="size-4" />
                </span>
                <div className="bg-primary h-px flex-1" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isOAuthLoading === "google" || isLoading}
              >
                {isOAuthLoading === "google" ? (
                  <>
                    <Icons.spinner className="mr-2 size-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Sign up with Google"
                )}
              </Button>
            </div>
          </form>
        )}

        {step === "totp-setup" && totpData && (
          <div className="grid gap-4">
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <ShieldCheckIcon className="size-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                Two-factor authentication adds an extra layer of security
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center gap-4">
              <div className="rounded-lg border-2 border-border bg-white p-4">
                <img
                  src={totpData.qrCode}
                  alt="TOTP QR Code"
                  className="size-64"
                />
              </div>

              <div className="w-full space-y-2">
                <Label>Manual Entry Code</Label>
                <div className="rounded bg-muted p-3">
                  <code className="text-sm font-mono break-all">
                    {totpData.secret}
                  </code>
                </div>
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="totpCode">
                  Enter 6-digit code from your app
                </Label>
                <Input
                  id="totpCode"
                  type="text"
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={isLoading}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleTotpVerify}
                className="w-full"
                disabled={isLoading || totpCode.length !== 6}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Icons.spinner className="mr-2 size-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="mr-2 size-4" />
                    Verify & Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "totp-verify" && totpData && (
          <div className="grid gap-4">
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <ShieldCheckIcon className="size-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Save these backup codes! You&apos;ll need them if you lose
                access to your authenticator app.
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {totpData.backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="rounded bg-background p-2 text-center"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={copyBackupCodes}
              variant="outline"
              className="w-full"
            >
              {copiedCodes ? (
                <>
                  <CheckIcon className="mr-2 size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="mr-2 size-4" />
                  Copy All Codes
                </>
              )}
            </Button>

            <Button onClick={completeTotpSetup} className="w-full" size="lg">
              I&apos;ve Saved My Backup Codes
            </Button>
          </div>
        )}

        {step === "signup" && (
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/sign-in" className="underline">
              Sign in
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Auth Layout (`app/(auth)/layout.tsx`)

Simple centered layout for authentication pages:

```tsx
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      {children}
    </div>
  );
}
```

### Additional TOTP Helper Action

Add this helper function to `app/actions/totp-actions.ts` for checking TOTP status:

```typescript
/**
 * Check if user has TOTP enabled by email
 */
export async function checkTOTPByEmail(
  email: string,
): Promise<TotpActionResponse<{ totpEnabled: boolean }>> {
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { totpEnabled: true },
    });

    if (!user) {
      return { status: "error", error: "User not found" };
    }

    return {
      status: "success",
      data: { totpEnabled: user.totpEnabled },
    };
  } catch (error) {
    console.error("Check TOTP by email error:", error);
    return { status: "error", error: "Failed to check TOTP status" };
  }
}
```

## Additional Features to Implement

1. **Password Reset**: Add password reset functionality
2. **Email Change**: Allow users to change their email
3. **Session Management**: Show active sessions and allow revocation
4. **Audit Logging**: Log authentication events
5. **Account Linking**: Allow linking multiple OAuth providers
6. **WebAuthn**: Add passkey/fingerprint authentication
7. **Rate Limiting**: Implement rate limiting on auth routes
8. **IP Whitelisting**: Add IP-based restrictions

## Support

For issues or questions:

- NextAuth Documentation: https://authjs.dev
- Prisma Documentation: https://www.prisma.io/docs
- TOTP (OTPAuth): https://github.com/hectorm/otpauth

---

This authentication system provides enterprise-grade security with modern authentication methods. Customize it according to your specific requirements and always follow security best practices.
