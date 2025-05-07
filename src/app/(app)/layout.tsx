import WithDefaultLayout from "@/components/layout/default-layout";
import NextAuthProvider from "@/components/utils/auth-provider";

export default async function AppLayout( {
  children,
}: Readonly<{
  children: React.ReactNode;
}> ) {
  return (
    <NextAuthProvider>
      <WithDefaultLayout>{children}</WithDefaultLayout>
    </NextAuthProvider>
  );
}
