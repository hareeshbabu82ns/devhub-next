// import { redirect } from "next/navigation"
// import { auth } from "@/lib/auth"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // const session = await auth()
  // if (session?.session) redirect("/dashboard")

  return <div className="flex flex-1">{children}</div>
}
