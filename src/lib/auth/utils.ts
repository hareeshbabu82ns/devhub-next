// import GithubProvider from "next-auth/providers/github"
import { type UserRole } from "@prisma/client";
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

// this is partial to be used in middleware
// need to add additional providers before adding to NextAuth
export const authOptionsPartial: NextAuthConfig = {
  providers: [],
  basePath: apiRoutePrefix,
  debug: process.env.NODE_ENV === "development",
  secret: process.env.AUTH_SECRET,
  // does not work with credentials provider or middleware
  // session: {
  //   strategy: "database",
  // },
  session: {
    strategy: "jwt", // needed for credentials provider or middleware
  },
  pages: {
    signIn: "/sign-in",
    signOut: "/",
    error: "/sign-in",
  },
};
