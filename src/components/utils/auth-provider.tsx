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
