# Next.js Authentication System - Complete Implementation Guide

> **A production-ready, enterprise-grade authentication system for Next.js 15+ applications**

This comprehensive guide enables you to implement a complete, secure authentication system in any Next.js 15+ project with App Router. The implementation follows security best practices and provides a consistent, maintainable architecture that can be adapted to your specific requirements.

## 🎯 What You'll Build

A fully-featured authentication system with:

- ✅ **Multiple Authentication Methods**
  - Credentials-based (email/password)
  - OAuth providers (Google, GitHub, extendable to others)
  - Magic link email authentication (passwordless)
- ✅ **Two-Factor Authentication (TOTP)**
  - QR code generation for authenticator apps
  - Backup codes for account recovery
  - Encrypted secret storage
- ✅ **Access Control & Security**
  - Role-based access control (USER, ADMIN, extendable)
  - Signup restrictions (email/domain whitelists)
  - Protected routes with middleware
  - Session management with JWT
- ✅ **User Experience**
  - Responsive, accessible UI components
  - Email notifications (welcome, magic links)
  - Loading states and error handling
  - Mobile-optimized dialogs and forms

## 🏗️ Architecture Overview

The authentication system is built with a modular, layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  (UI Components, Forms, Pages)                              │
├─────────────────────────────────────────────────────────────┤
│                     Application Layer                        │
│  (Server Actions, API Routes, Middleware)                   │
├─────────────────────────────────────────────────────────────┤
│                     Business Logic Layer                     │
│  (Auth Configuration, TOTP Utils, Validation)               │
├─────────────────────────────────────────────────────────────┤
│                     Data Access Layer                        │
│  (Prisma Client, Database Models)                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Separation of Concerns**: Clear boundaries between UI, business logic, and data access
2. **Type Safety**: Full TypeScript support with discriminated unions for responses
3. **Security First**: Encryption, hashing, and validation at every layer
4. **Extensibility**: Easy to add new auth providers or modify existing flows
5. **Testability**: Modular components that can be tested independently
6. **User-Centric**: Accessible, responsive, and intuitive user interfaces

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** 18.17 or later
- **Package Manager**: npm, yarn, pnpm, or bun
- **Database**: MongoDB, PostgreSQL, MySQL, or SQLite (this guide uses MongoDB)
- **Basic Knowledge**: Next.js App Router, TypeScript, React

### Tech Stack

This implementation uses:

| Package                     | Version      | Purpose                                           |
| --------------------------- | ------------ | ------------------------------------------------- |
| **next**                    | 15.x+        | Web framework                                     |
| **react**                   | 19.x+        | UI library                                        |
| **next-auth**               | 5.0.0-beta.x | Authentication framework                          |
| **@auth/prisma-adapter**    | 2.x+         | Database adapter                                  |
| **@prisma/client**          | 5.x or 6.x+  | Database ORM                                      |
| **bcryptjs**                | 2.4.x+       | Password hashing                                  |
| **otpauth**                 | 9.x+         | TOTP generation                                   |
| **qrcode**                  | 1.5.x+       | QR code generation                                |
| **zod**                     | 3.x or 4.x+  | Schema validation                                 |
| **resend**                  | 3.x or 4.x+  | Email service (optional, can use other providers) |
| **@react-email/components** | 0.0.x+       | Email templates (optional)                        |
| **react-hook-form**         | 7.x+         | Form management                                   |
| **@hookform/resolvers**     | 3.x or 5.x+  | Form validation resolvers                         |

### Optional Dependencies

```json
{
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/qrcode": "^1.5.6"
  }
}
```

## 🚀 Quick Start (TL;DR)

For experienced developers who want to get started quickly:

1. **Install Dependencies**:

   ```bash
   pnpm install next-auth@beta @auth/prisma-adapter @prisma/client bcryptjs otpauth qrcode zod resend @react-email/components react-hook-form @hookform/resolvers
   pnpm install -D @types/bcryptjs @types/qrcode prisma
   ```

2. **Setup Database**: Configure Prisma schema (see Database Schema section)

3. **Configure Environment**: Copy environment variables (see Environment Variables section)

4. **Copy Core Files**: Implement the files in the order shown in the Implementation Steps section

5. **Test**: Run the application and test each authentication flow

> **💡 Tip**: Follow the detailed Implementation Steps section for production deployments

## 🔧 Environment Variables

Create a `.env` file in your project root with the following variables:

### Core Configuration (Required)

```bash
# Database Connection
# MongoDB example: mongodb+srv://username:password@cluster.mongodb.net/dbname
# PostgreSQL example: postgresql://username:password@localhost:5432/dbname
DATABASE_URL="your-database-connection-string"

# NextAuth Secret (Generate with: openssl rand -base64 32)
AUTH_SECRET="your-random-secret-key-here-minimum-32-characters"

# Base URL for callbacks
NEXTAUTH_URL="http://localhost:3000"  # Production: https://yourdomain.com

# Application Base URL (for emails, redirects)
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Production: https://yourdomain.com

# Environment
NODE_ENV="development"  # production | development | test
```

### TOTP/2FA Configuration (Required for TOTP)

```bash
# TOTP Secret Encryption Key (Minimum 32 characters)
# Generate with: openssl rand -base64 32
TOTP_ENCRYPTION_KEY="your-totp-encryption-key-minimum-32-characters-required"
```

### Admin Configuration (Optional)

```bash
# Comma-separated list of admin emails
# Users with these emails will be automatically assigned ADMIN role
ADMIN_EMAILS="admin@example.com,admin2@example.com"
```

### OAuth Providers (Optional - configure the ones you need)

#### Google OAuth

```bash
# Get from: https://console.cloud.google.com/
AUTH_GOOGLE_ID="your-google-oauth-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
```

**Setup Instructions**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `{NEXTAUTH_URL}/api/auth/callback/google`

#### GitHub OAuth

```bash
# Get from: https://github.com/settings/developers
AUTH_GITHUB_ID="your-github-oauth-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-client-secret"
```

**Setup Instructions**:

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Set Authorization callback URL: `{NEXTAUTH_URL}/api/auth/callback/github`

### Email Provider (Optional - for magic links and notifications)

#### Resend (Recommended)

```bash
# Get from: https://resend.com/api-keys
AUTH_RESEND_KEY="re_xxxxxxxxxxxxxxxxxxxx"
SMTP_FROM="noreply@yourdomain.com"  # Must be verified domain
```

**Setup Instructions**:

1. Sign up at [Resend](https://resend.com)
2. Verify your sending domain
3. Create an API key

#### Alternative Email Providers

You can use any email provider supported by NextAuth:

- **SendGrid**: Configure `sendgrid` provider
- **Nodemailer**: Use custom nodemailer configuration
- **AWS SES**: Configure `ses` provider

### Example .env File

```bash
# Core (Required)
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/myapp"
AUTH_SECRET="32-character-minimum-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# TOTP (Required for 2FA)
TOTP_ENCRYPTION_KEY="another-32-character-minimum-key-here"

# Admin (Optional)
ADMIN_EMAILS="admin@example.com"

# OAuth (Optional)
AUTH_GOOGLE_ID="xxxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="xxxxx"
AUTH_GITHUB_ID="xxxxx"
AUTH_GITHUB_SECRET="xxxxx"

# Email (Optional)
AUTH_RESEND_KEY="re_xxxxx"
SMTP_FROM="noreply@example.com"
```

### Security Notes

> **🔒 Important Security Considerations**:
>
> - Never commit `.env` files to version control
> - Use different secrets for each environment (dev, staging, prod)
> - Rotate secrets regularly in production
> - Use minimum 32-character random strings for secrets
> - In production, use environment variables from your hosting provider
> - Consider using secret management services (AWS Secrets Manager, Azure Key Vault, etc.)

## 📝 Implementation Steps

Follow these steps in order to implement the authentication system. Each step builds on the previous one.

### Step 1: Initialize Next.js Project (If Starting Fresh)

```bash
# Create new Next.js app
npx create-next-app@latest my-app --typescript --tailwind --eslint --app
cd my-app

# Or if adding to existing project, skip this step
```

### Step 2: Install Dependencies

```bash
# Core authentication dependencies
pnpm install next-auth@5.0.0-beta.27 @auth/prisma-adapter

# Database ORM
pnpm install @prisma/client
pnpm install -D prisma

# Security & Crypto
pnpm install bcryptjs otpauth qrcode
pnpm install -D @types/bcryptjs @types/qrcode

# Validation & Forms
pnpm install zod react-hook-form @hookform/resolvers

# Email (optional, if using magic links)
pnpm install resend @react-email/components

# Utility (if not already installed)
pnpm install date-fns
```

### Step 3: Setup Database Schema

Initialize Prisma and configure your database schema (next section).

### Step 4: Configure Environment Variables

Create `.env` file with all required variables (previous section).

### Step 5: Implement Core Authentication

Implement files in this order:

1. **Database Client** (`lib/db/index.ts`) - Singleton Prisma client
2. **Configuration** (`config/routes.ts`, `config/site.ts`) - App configuration
3. **Validation Schemas** (`lib/validations/user.ts`) - Zod schemas
4. **Auth Utilities** (`lib/auth/utils.ts`) - Type extensions and partial config
5. **TOTP Utilities** (`lib/auth/totp.ts`) - TOTP generation and verification
6. **Signup Validation** (`lib/auth/signup-validation.ts`) - Email restrictions
7. **Auth Actions** (`lib/auth/actions.ts`) - Server actions for auth
8. **Main Auth Config** (`lib/auth/index.ts`) - NextAuth configuration
9. **TOTP Actions** (`app/actions/totp-actions.ts`) - TOTP management

### Step 6: Setup Middleware

Implement route protection:

1. **Auth Proxy** (`src/proxy.ts`) - Middleware implementation
2. **Root Middleware** (`middleware.ts`) - Export from proxy

### Step 7: Create API Routes

1. **NextAuth Route** (`app/api/auth/[...nextauth]/route.ts`) - API handler

### Step 8: Build UI Components

Implement in this order:

1. **Session Provider** (`components/auth/Provider.tsx`) - Context provider
2. **Reusable Components** - Auth card, dividers, social buttons
3. **Sign-In Page** (`app/(auth)/sign-in/page.tsx`) - Login form
4. **Sign-Up Page** (`app/(auth)/sign-up/page.tsx`) - Registration form
5. **Auth Layout** (`app/(auth)/layout.tsx`) - Auth pages layout
6. **TOTP Setup Component** - Two-factor authentication setup

### Step 9: Add Email Templates (Optional)

If using email authentication:

1. **Magic Link Email** (`components/emails/MagicLoginLinkEmail.tsx`)
2. **Welcome Email** (`components/emails/WelcomeEmail.tsx`)
3. **Email Actions** (`lib/email/actions.ts`) - Email sending utilities

### Step 10: Wrap Your App

Update root layout to include session provider:

```tsx
// app/layout.tsx
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

### Step 11: Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or create migration (production)
npx prisma migrate dev --name init
```

### Step 12: Test Each Flow

Test all authentication methods (see Testing section).

## 🗄️ Database Schema (Prisma)

Create `prisma/schema.prisma`:

```prisma
// Choose your database provider
datasource db {
  provider = "mongodb"  // or "postgresql", "mysql", "sqlite", "sqlserver", "cockroachdb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  // Optional: Custom output path
  // Default is node_modules/.prisma/client
  // Uncomment and adjust if you need a custom location:
  // output   = "./generated/prisma"
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
// Import from default location or your custom output path
// Default: import { PrismaClient } from "@prisma/client";
// Custom: import { PrismaClient } from "@/generated/prisma";
import { PrismaClient } from "@prisma/client";

// Prevent multiple instances of Prisma Client in development
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

> **💡 Note on Prisma Client Import**:
>
> - If using default Prisma generator (no custom `output`), import from `@prisma/client`
> - If using custom output path in `schema.prisma`, adjust the import path accordingly
> - Update `tsconfig.json` paths if needed for custom locations

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
  // Add other site-specific configs as needed
};

export const siteConfig: SiteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "My App",
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Welcome to my app",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Your Company Address",
  defaultUserImg: "/default-avatar.png", // or use a placeholder service
  emailVerificationDuration: 15, // minutes before allowing resend
  // Add other configs as needed for your application
};
```

> **💡 Configuration Tips**:
>
> - Store sensitive or environment-specific values in `.env`
> - Use `NEXT_PUBLIC_` prefix for client-accessible values
> - Add type-safe getters for complex configuration logic
> - Consider using a config validation library like `zod` for runtime checks

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

## 🧪 Testing Your Authentication System

### Manual Testing Checklist

#### 1. Credentials Authentication

- [ ] Sign up with valid email/password
- [ ] Sign up with existing email (should fail)
- [ ] Sign up with invalid email (should fail)
- [ ] Sign up with weak password (should fail if validation added)
- [ ] Sign in with correct credentials
- [ ] Sign in with wrong password (should fail)
- [ ] Sign in with non-existent email (should fail)

#### 2. TOTP/2FA Testing

- [ ] Enable TOTP during signup
- [ ] Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
- [ ] Verify TOTP code successfully
- [ ] Save backup codes
- [ ] Sign out and sign in with TOTP code
- [ ] Sign in with backup code
- [ ] Verify backup code is consumed (can't use twice)
- [ ] Disable TOTP from settings
- [ ] Re-enable TOTP (new QR code generated)
- [ ] Regenerate backup codes

#### 3. OAuth Authentication

- [ ] Sign in with Google OAuth
- [ ] Sign in with GitHub OAuth
- [ ] Sign up with Google OAuth
- [ ] Sign up with GitHub OAuth
- [ ] Link multiple OAuth accounts to same email
- [ ] OAuth callback redirects correctly

#### 4. Magic Link Authentication

- [ ] Request magic link with valid email
- [ ] Receive email with magic link
- [ ] Click magic link (should sign in)
- [ ] Copy token from email and paste manually
- [ ] Request magic link too quickly (rate limit)
- [ ] Use expired token (should fail)

#### 5. Session Management

- [ ] Session persists after browser refresh
- [ ] Session expires after configured duration
- [ ] Sign out clears session
- [ ] Multiple tabs/windows share same session
- [ ] Session cookie is secure (httpOnly, secure flags)

#### 6. Route Protection

- [ ] Access protected route without auth (redirects to sign-in)
- [ ] Access sign-in while authenticated (redirects to dashboard)
- [ ] Callback URL works after sign-in
- [ ] Public routes accessible without auth
- [ ] API routes protected appropriately

#### 7. Role-Based Access

- [ ] Admin email automatically gets ADMIN role
- [ ] Regular users get USER role
- [ ] Admin-only pages restrict non-admin access
- [ ] Role persists in session

#### 8. Email Restrictions (if enabled)

- [ ] Whitelist email can sign up
- [ ] Non-whitelist email rejected
- [ ] Domain whitelist allows signup
- [ ] Restrictions apply to OAuth signups

### Automated Testing

Create test files for core functionality:

```typescript
// __tests__/auth/totp.test.ts
import {
  generateTOTPSecret,
  verifyTOTP,
  generateBackupCodes,
} from "@/lib/auth/totp";

describe("TOTP Utilities", () => {
  it("should generate valid TOTP secret", () => {
    const secret = generateTOTPSecret();
    expect(secret).toHaveLength(32);
  });

  it("should verify valid TOTP token", () => {
    const secret = generateTOTPSecret();
    // Generate token for testing
    // Verify it works
  });

  it("should generate 10 unique backup codes", () => {
    const codes = generateBackupCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10); // All unique
  });
});
```

## 🐛 Troubleshooting & Common Issues

### Authentication Errors

#### Issue: "Invalid callback URL" error

**Symptoms**: OAuth redirect fails with callback URL error

**Solutions**:

- Verify `NEXTAUTH_URL` in `.env` matches your actual application URL
- Check OAuth provider console has correct redirect URI: `{NEXTAUTH_URL}/api/auth/callback/{provider}`
- For Google: Ensure redirect URI includes protocol (http/https)
- For GitHub: Check Authorization callback URL exactly matches
- In development, ensure both provider and `.env` use `http://localhost:3000`
- In production, ensure both use `https://yourdomain.com`

#### Issue: "Error: [next-auth][error][SIGNIN_OAUTH_ERROR]"

**Symptoms**: OAuth sign-in fails with generic error

**Solutions**:

- Check browser console and server logs for detailed error
- Verify OAuth credentials (CLIENT_ID and CLIENT_SECRET) are correct
- Ensure OAuth app is not suspended or has restrictions
- Check OAuth scopes requested (email, profile usually required)
- Verify authorized domains in OAuth console
- Clear browser cookies and try again

#### Issue: "Credentials sign-in not working"

**Symptoms**: Email/password authentication fails

**Solutions**:

- Check database connection is working
- Verify user exists in database with `password` field populated
- Check password hashing is working (bcrypt)
- Ensure `CredentialsProvider` is properly configured
- Verify `authorize` function returns user object
- Check for async/await issues in authorize function
- Look for validation errors in form submission

### TOTP/2FA Issues

#### Issue: TOTP codes not working

**Symptoms**: Valid codes from authenticator app rejected

**Solutions**:

- **Time Synchronization**: Ensure server and device time are synchronized
  ```bash
  # Check server time
  date
  # Sync time on Linux
  sudo ntpdate -s time.nist.gov
  ```
- Verify TOTP secret is correctly encrypted/decrypted
- Check `TOTP_ENCRYPTION_KEY` environment variable is set and consistent
- Verify TOTP algorithm parameters (SHA1, 6 digits, 30-second period)
- Increase time window in `verifyTOTP` function (default: 1, try: 2)
- Check authenticator app is using correct secret (regenerate if needed)
- Verify QR code generation is working properly

#### Issue: Backup codes not working

**Symptoms**: Backup codes rejected during sign-in

**Solutions**:

- Verify backup codes are hashed before storage
- Check bcrypt comparison is working
- Ensure backup code hasn't been used already (should be removed after use)
- Verify input format (usually 8 uppercase characters: ABCD1234)
- Check database has backup codes array populated
- Look for case sensitivity issues

#### Issue: "TypeError: Cannot read property 'totpSecret' of null"

**Symptoms**: TOTP operations fail with null user

**Solutions**:

- Ensure user is properly authenticated before TOTP operations
- Check session contains user ID
- Verify database query for user is successful
- Add null checks before accessing user properties
- Ensure TOTP actions check for authenticated session

### Email Issues

#### Issue: Emails not sending

**Symptoms**: Magic links or welcome emails not received

**Solutions**:

- **Check API Key**: Verify `AUTH_RESEND_KEY` is correct and active
- **Verify Domain**: Ensure `SMTP_FROM` domain is verified in Resend
- **Check Logs**: Look at Resend dashboard for send errors
- **Rate Limits**: Check if you've hit API rate limits
- **Spam Folder**: Check recipient's spam/junk folder
- **DNS Records**: Verify SPF, DKIM records are properly configured
- **Test Mode**: In development, emails might not send (check `NODE_ENV`)
- **Error Handling**: Add try-catch and log email send errors

```typescript
// Enhanced error logging for email
try {
  await sendMail({
    to: [email],
    subject: "Test",
    react: <TestEmail />
  });
} catch (error) {
  console.error("Email send error:", error);
  // Check error.message for specific failure reason
}
```

#### Issue: Magic link token invalid or expired

**Symptoms**: Clicking magic link shows error

**Solutions**:

- Check token expiration time (default: 24 hours)
- Verify token is correctly extracted from URL
- Ensure database token matches URL token
- Check for URL encoding issues with token
- Verify verification token model and database queries
- Look for clock skew between email send and verification

### Session & Cookie Issues

#### Issue: Session not persisting

**Symptoms**: User logged out on page refresh

**Solutions**:

- **Verify AUTH_SECRET**: Ensure it's set and at least 32 characters
- **Check Cookies**: Browser must allow cookies
  - Open DevTools > Application > Cookies
  - Look for `next-auth.session-token` or `__Secure-next-auth.session-token`
- **Cookie Settings**: Verify secure flag matches environment
  ```typescript
  // In production with HTTPS, cookies are secure
  // In development with HTTP, secure flag should be false
  ```
- **Samite Settings**: Check `sameSite` cookie attribute
- **Domain Issues**: Ensure cookie domain matches your domain
- **Middleware**: Verify middleware is properly configured
- **Session Strategy**: Confirm using `jwt` strategy in config

#### Issue: "Error: [next-auth][error][JWT_SESSION_ERROR]"

**Symptoms**: JWT session errors in logs

**Solutions**:

- Verify `AUTH_SECRET` is set and consistent across deployments
- Check JWT token isn't malformed or tampered with
- Ensure session callback returns proper user data
- Verify token signing and encryption is working
- Clear all cookies and sign in again
- Check for character encoding issues in secret

### Database Issues

#### Issue: Prisma Client errors

**Symptoms**: Database operations fail

**Solutions**:

- **Generate Client**: Run `npx prisma generate`
- **Check Connection**: Verify `DATABASE_URL` is correct
- **Migrations**: Run `npx prisma db push` or `npx prisma migrate dev`
- **Import Path**: Verify Prisma Client import path matches generator output
- **Type Errors**: Regenerate client after schema changes
- **Connection Pooling**: Check database connection limits

#### Issue: Duplicate key errors

**Symptoms**: "Unique constraint failed" errors

**Solutions**:

- Check for existing user with same email
- Handle unique constraint violations in code
- Implement proper error handling for signup
- Verify database indexes are correct
- Look for race conditions in concurrent signups

### Middleware & Routing Issues

#### Issue: Middleware not protecting routes

**Symptoms**: Can access protected pages without auth

**Solutions**:

- Verify `middleware.ts` is in project root (or `src/` folder)
- Check `matcher` config includes your routes
- Ensure middleware returns proper Response objects
- Verify auth check is working (`const isLoggedIn = !!req.auth`)
- Check route arrays (`publicRoutes`, `privateRoutes`) are correct
- Look for incorrect redirect logic

#### Issue: Infinite redirect loops

**Symptoms**: Browser shows "Too many redirects"

**Solutions**:

- Check middleware doesn't redirect authenticated users from sign-in to sign-in
- Verify `DEFAULT_LOGIN_REDIRECT` is accessible
- Ensure public routes include sign-in and sign-up pages
- Look for conflicting redirects in multiple places
- Check middleware matcher doesn't exclude necessary paths

### Development & Build Issues

#### Issue: Build fails with auth errors

**Symptoms**: `next build` fails

**Solutions**:

- Ensure all environment variables are set
- Check for server-only code in client components
- Verify "use client" and "use server" directives
- Check for circular dependencies
- Ensure Prisma Client is generated
- Verify all imports are correct

#### Issue: TypeScript errors after setup

**Symptoms**: TS errors in auth code

**Solutions**:

- Install type definitions: `pnpm install -D @types/bcryptjs @types/qrcode`
- Verify NextAuth type augmentations in `lib/auth/utils.ts`
- Check Prisma types are generated
- Ensure `tsconfig.json` includes proper paths
- Restart TypeScript server in IDE

### Production Issues

#### Issue: Auth works locally but not in production

**Symptoms**: Authentication fails after deployment

**Solutions**:

- **Environment Variables**: Verify all .env values are set in production
- **NEXTAUTH_URL**: Must match production domain (https://)
- **OAuth Callbacks**: Update OAuth provider redirect URIs for production domain
- **Cookies**: Ensure secure cookies work with HTTPS
- **Build Output**: Check server logs for errors
- **Database**: Verify production database is accessible
- **Secrets**: Ensure all secrets are different from development

### Performance Issues

#### Issue: Slow authentication operations

**Symptoms**: Sign-in/sign-up takes too long

**Solutions**:

- Check database query performance
- Optimize bcrypt rounds (10 is recommended)
- Implement caching for repeated queries
- Use database indexes on email field
- Consider Redis for session storage
- Monitor API response times
- Check for N+1 query problems

### Getting Help

If you're still stuck:

1. **Check Logs**: Server logs often contain detailed error messages
2. **Browser DevTools**: Network tab shows API call failures
3. **Documentation**:
   - [NextAuth.js Docs](https://authjs.dev)
   - [Prisma Docs](https://www.prisma.io/docs)
   - [Resend Docs](https://resend.com/docs)
4. **Community**:
   - NextAuth.js Discord
   - GitHub Discussions
   - Stack Overflow
5. **Debug Mode**: Enable NextAuth debug mode in development:
   ```typescript
   export const authOptions: NextAuthConfig = {
     debug: process.env.NODE_ENV === "development",
     // ... rest of config
   };
   ```

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

## 🔧 Customization & Extension Guide

### Adding New OAuth Providers

NextAuth supports many OAuth providers. To add a new one:

1. **Install Provider** (if not built-in):

   ```bash
   pnpm install next-auth@beta
   ```

2. **Add Environment Variables**:

   ```bash
   AUTH_PROVIDER_ID="your-client-id"
   AUTH_PROVIDER_SECRET="your-client-secret"
   ```

3. **Update Auth Configuration** (`lib/auth/index.ts`):

   ```typescript
   import TwitterProvider from "next-auth/providers/twitter";

   providers: [
     // ... existing providers
     TwitterProvider({
       clientId: process.env.AUTH_TWITTER_ID,
       clientSecret: process.env.AUTH_TWITTER_SECRET,
     }),
   ];
   ```

4. **Add Button to UI** (Sign-In/Sign-Up pages):
   ```tsx
   <Button onClick={() => handleOAuthSignIn("twitter")}>
     <Icons.twitter className="mr-2 size-5" />
     Twitter
   </Button>
   ```

### Adding Custom User Fields

1. **Update Prisma Schema**:

   ```prisma
   model User {
     // ... existing fields
     phoneNumber  String?
     company      String?
     customField  String?
   }
   ```

2. **Run Migration**:

   ```bash
   npx prisma db push
   # or
   npx prisma migrate dev --name add_user_fields
   ```

3. **Update Type Definitions** (`lib/auth/utils.ts`):

   ```typescript
   declare module "next-auth" {
     interface User {
       role: UserRole;
       phoneNumber?: string;
       company?: string;
     }
   }
   ```

4. **Update JWT Callback**:
   ```typescript
   jwt: async ({ token, user }) => {
     if (user) {
       token.phoneNumber = user.phoneNumber;
       token.company = user.company;
     }
     return token;
   };
   ```

### Customizing Email Templates

Create new email components in `components/emails/`:

```tsx
// components/emails/CustomEmail.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
} from "@react-email/components";

interface CustomEmailProps {
  userName: string;
  customData: string;
}

export default function CustomEmail({
  userName,
  customData,
}: CustomEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Custom Email Preview</Preview>
      <Body style={main}>
        <Container>
          <Text>Hello {userName},</Text>
          <Text>{customData}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "sans-serif",
};
```

### Adding Password Reset

1. **Create Password Reset Token Model**:

   ```prisma
   model PasswordResetToken {
     id         String   @id @default(auto()) @map("_id") @db.ObjectId
     email      String
     token      String   @unique
     expires    DateTime
     createdAt  DateTime @default(now())

     @@index([email])
     @@index([token])
   }
   ```

2. **Create Reset Actions** (`lib/auth/password-reset.ts`):

   ```typescript
   export async function requestPasswordReset(email: string) {
     // Generate token
     // Save to database
     // Send email with reset link
   }

   export async function resetPassword(token: string, newPassword: string) {
     // Verify token
     // Update user password
     // Delete token
   }
   ```

3. **Create Reset UI Pages**:
   - Request reset: `app/(auth)/forgot-password/page.tsx`
   - Reset form: `app/(auth)/reset-password/page.tsx`

### Implementing Rate Limiting

Use a rate limiting library:

```bash
pnpm install @upstash/ratelimit @upstash/redis
```

Create rate limit utility (`lib/rate-limit.ts`):

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute
});

export async function checkRateLimit(identifier: string) {
  const { success, remaining } = await ratelimit.limit(identifier);
  return { success, remaining };
}
```

Apply to auth actions:

```typescript
export async function signUp(values: SignupValues) {
  const { success } = await checkRateLimit(values.email);
  if (!success) {
    return {
      status: "error",
      error: "Too many requests. Please try again later.",
    };
  }
  // ... rest of signup logic
}
```

### Adding Audit Logging

1. **Create Audit Log Model**:

   ```prisma
   model AuditLog {
     id        String   @id @default(auto()) @map("_id") @db.ObjectId
     userId    String?  @db.ObjectId
     action    String   // "LOGIN", "LOGOUT", "SIGNUP", "PASSWORD_CHANGE"
     ipAddress String?
     userAgent String?
     metadata  Json?
     createdAt DateTime @default(now())

     @@index([userId, createdAt])
     @@index([action, createdAt])
   }
   ```

2. **Create Logging Utility** (`lib/audit-log.ts`):

   ```typescript
   export async function logAuthEvent(params: {
     userId?: string;
     action: string;
     ipAddress?: string;
     userAgent?: string;
     metadata?: Record<string, any>;
   }) {
     await db.auditLog.create({
       data: {
         ...params,
         createdAt: new Date(),
       },
     });
   }
   ```

3. **Integrate into Auth Callbacks**:
   ```typescript
   callbacks: {
     signIn: async ({ user, account }) => {
       await logAuthEvent({
         userId: user.id,
         action: 'LOGIN',
         metadata: { provider: account?.provider },
       });
       return true;
     },
   }
   ```

### Adding More User Roles

1. **Update Prisma Enum**:

   ```prisma
   enum UserRole {
     USER
     ADMIN
     MODERATOR
     EDITOR
     VIEWER
   }
   ```

2. **Create Role Guard Utilities** (`lib/auth/role-guards.ts`):

   ```typescript
   export function hasRole(session: Session, roles: UserRole[]) {
     return session?.user?.role && roles.includes(session.user.role);
   }

   export function requireRole(roles: UserRole[]) {
     return async function () {
       const session = await auth();
       if (!session || !hasRole(session, roles)) {
         redirect("/unauthorized");
       }
       return session;
     };
   }
   ```

3. **Use in Server Components**:
   ```typescript
   export default async function ModeratorPage() {
     await requireRole(['ADMIN', 'MODERATOR'])();
     return <div>Moderator Dashboard</div>;
   }
   ```

### Integration with Third-Party Services

#### Segment Analytics

```typescript
// lib/analytics.ts
import { Analytics } from '@segment/analytics-node';

const analytics = new Analytics({
  writeKey: process.env.SEGMENT_WRITE_KEY!,
});

export async function trackAuthEvent(userId: string, event: string, properties?: object) {
  analytics.track({
    userId,
    event,
    properties,
  });
}

// Use in auth callbacks
callbacks: {
  signIn: async ({ user }) => {
    await trackAuthEvent(user.id, 'User Signed In', {
      method: 'credentials',
    });
    return true;
  },
}
```

#### Sentry Error Tracking

```typescript
// Add to auth error handlers
import * as Sentry from "@sentry/nextjs";

try {
  // auth operation
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: "authentication",
    },
  });
  throw error;
}
```

## 🚀 Advanced Features to Implement

### 1. **Password Reset & Recovery**

- Forgot password flow with email token
- Password strength requirements
- Password history (prevent reuse)

### 2. **Email Verification**

- Verify email before account activation
- Resend verification email
- Change email with re-verification

### 3. **Session Management**

- View active sessions across devices
- Revoke specific sessions
- "Sign out all devices" functionality

### 4. **Account Linking**

- Link multiple OAuth providers to one account
- Unlink OAuth providers
- Primary authentication method

### 5. **Security Enhancements**

- WebAuthn/Passkey support
- SMS-based 2FA (alternative to TOTP)
- Security questions
- Login notifications
- Suspicious activity detection

### 6. **User Profile Management**

- Avatar upload and management
- Profile customization
- Privacy settings
- Account deletion

### 7. **Admin Dashboard**

- User management interface
- Role assignment
- Session monitoring
- Audit log viewing
- Signup restriction management

### 8. **Rate Limiting & Protection**

- Request rate limiting
- CAPTCHA integration
- IP-based restrictions
- Brute force protection

### 9. **Multi-Tenancy Support**

- Organization/tenant model
- Tenant-specific roles
- Tenant invitation system

### 10. **Compliance Features**

- GDPR data export
- Account deletion (right to be forgotten)
- Cookie consent management
- Privacy policy acceptance tracking

## 🎯 Best Practices & Security Recommendations

### Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use different secrets for each environment
   - Rotate secrets regularly in production
   - Use secret management services (AWS Secrets Manager, Azure Key Vault)

2. **Password Security**
   - Enforce strong password policies (minimum length, complexity)
   - Use bcrypt with appropriate cost factor (10-12 rounds)
   - Implement password history to prevent reuse
   - Add password strength indicators in UI

3. **Session Management**
   - Use secure, httpOnly cookies
   - Implement session timeout
   - Allow users to view and revoke sessions
   - Use JWT with reasonable expiration times

4. **TOTP/2FA Security**
   - Always encrypt TOTP secrets at rest
   - Use strong encryption keys (32+ characters)
   - Implement backup codes for recovery
   - Allow users to regenerate backup codes
   - Consider requiring 2FA for admins

5. **Rate Limiting**
   - Implement rate limiting on all auth endpoints
   - Use exponential backoff for failed attempts
   - Consider CAPTCHA for repeated failures
   - Log suspicious activity

6. **Database Security**
   - Use parameterized queries (Prisma handles this)
   - Implement proper access controls
   - Encrypt sensitive data at rest
   - Regular backups and disaster recovery plan
   - Use connection pooling appropriately

7. **API Security**
   - Validate all inputs (use Zod or similar)
   - Sanitize user-provided data
   - Use CSRF protection (NextAuth provides this)
   - Implement proper CORS policies
   - Use HTTPS in production (always)

8. **Error Handling**
   - Don't expose sensitive information in error messages
   - Log errors securely (avoid logging sensitive data)
   - Provide user-friendly error messages
   - Implement proper error boundaries

### Code Quality Best Practices

1. **Type Safety**
   - Use TypeScript strict mode
   - Define proper types for all functions
   - Use discriminated unions for responses
   - Avoid `any` type

2. **Error Handling**
   - Always use try-catch for async operations
   - Return typed error responses
   - Log errors appropriately
   - Provide meaningful error messages

3. **Code Organization**
   - Follow the layered architecture
   - Keep files focused and small
   - Use consistent naming conventions
   - Document complex logic

4. **Testing**
   - Write unit tests for utilities
   - Integration tests for auth flows
   - E2E tests for critical paths
   - Test error scenarios

5. **Performance**
   - Implement caching where appropriate
   - Optimize database queries
   - Use database indexes
   - Monitor performance metrics

### Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured correctly
- [ ] AUTH_SECRET is strong and unique
- [ ] NEXTAUTH_URL points to production domain
- [ ] OAuth redirect URIs updated for production
- [ ] Database backups configured
- [ ] HTTPS/SSL certificate installed
- [ ] Error logging configured (Sentry, etc.)
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Cookie settings appropriate for production
- [ ] Email sending works and domain verified
- [ ] Tested all authentication flows
- [ ] Reviewed and removed debug code
- [ ] Performance optimized
- [ ] Monitoring and alerts set up

### Maintenance Checklist

Regular maintenance tasks:

- [ ] Review and update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Review audit logs for suspicious activity
- [ ] Test disaster recovery procedures
- [ ] Review and update security policies
- [ ] Check for security advisories
- [ ] Monitor error rates and fix issues
- [ ] Review and optimize performance
- [ ] Update documentation

## 📚 Additional Resources

### Official Documentation

- **NextAuth.js**: https://authjs.dev
  - Complete auth framework documentation
  - Provider configurations
  - Advanced features

- **Prisma**: https://www.prisma.io/docs
  - Database setup and migrations
  - Schema design patterns
  - Performance optimization

- **Next.js**: https://nextjs.org/docs
  - App Router documentation
  - Middleware configuration
  - API routes

### Libraries Used

- **bcryptjs**: https://github.com/dcodeIO/bcrypt.js
  - Password hashing documentation

- **OTPAuth**: https://github.com/hectorm/otpauth
  - TOTP implementation details
  - QR code generation

- **QRCode**: https://github.com/soldair/node-qrcode
  - QR code customization options

- **Zod**: https://zod.dev
  - Schema validation patterns
  - Type inference

- **React Hook Form**: https://react-hook-form.com
  - Form management patterns
  - Validation integration

- **Resend**: https://resend.com/docs
  - Email API documentation
  - Email templates

### Community & Support

- **GitHub Discussions**: Ask questions and share solutions
- **Discord Communities**:
  - NextAuth.js Discord
  - Next.js Discord
- **Stack Overflow**: Search existing questions or ask new ones
- **Twitter/X**: Follow maintainers for updates

### Learning Resources

- **OWASP Authentication Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **Web Authentication API**: https://webauthn.guide
- **JWT Best Practices**: https://datatracker.ietf.org/doc/html/rfc8725

## 📄 License & Attribution

This implementation guide is provided as-is for educational and commercial use. Feel free to adapt it to your needs.

### Credits

- Built with Next.js, NextAuth.js, and Prisma
- Inspired by modern authentication best practices
- Community contributions welcome

## 🎉 Conclusion

You now have a comprehensive, production-ready authentication system for your Next.js application. This implementation provides:

✅ **Security**: Enterprise-grade security with encryption, hashing, and proper session management
✅ **Flexibility**: Multiple authentication methods (credentials, OAuth, magic links, TOTP)
✅ **Scalability**: Built on solid architecture that grows with your application
✅ **Maintainability**: Clean, typed code with clear separation of concerns
✅ **User Experience**: Responsive, accessible UI components

### Next Steps

1. **Customize**: Adapt the UI and flows to match your brand
2. **Extend**: Add additional features from the advanced features list
3. **Test**: Thoroughly test all authentication flows
4. **Deploy**: Follow the deployment checklist
5. **Monitor**: Set up logging and monitoring
6. **Iterate**: Gather user feedback and improve

### Stay Updated

Authentication best practices and libraries evolve. Regularly:

- Check for security updates
- Review new NextAuth features
- Update dependencies
- Monitor security advisories

### Contributing

Found an issue or want to improve this guide? Contributions are welcome:

- Report bugs and issues
- Suggest improvements
- Share your implementations
- Help others in the community

---

**Happy Building! 🚀**

_This authentication system provides enterprise-grade security with modern authentication methods. Customize it according to your specific requirements and always follow security best practices._
