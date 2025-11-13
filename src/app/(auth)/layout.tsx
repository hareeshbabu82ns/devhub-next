// import { redirect } from "next/navigation"
// import { auth } from "@/lib/auth"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const session = await auth()
  // if (session?.session) redirect("/dashboard")

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
