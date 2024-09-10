import NextAuth from "next-auth";
import { authOptionsPartial } from "@/lib/auth/utils";
import {
  apiRoutePrefix,
  DEFAULT_LOGIN_REDIRECT,
  // privateRoutes,
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

  if (isLoggedIn && nextUrl.pathname === "/sign-in") {
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

  return;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
