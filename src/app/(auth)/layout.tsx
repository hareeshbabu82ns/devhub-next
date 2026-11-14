// import { redirect } from "next/navigation"
// import { auth } from "@/lib/auth"
import { Icons } from "@/components/utils/icons";
import Link from "next/link";
import { Mandala } from "@/components/shared/mandala";
import { siteConfig } from "@/config/site";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const session = await auth()
  // if (session?.session) redirect("/dashboard")

  return (
    <div className="relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="bg-sunrise relative hidden h-full flex-col overflow-hidden p-10 text-[#fff6e0] lg:flex">
        <Mandala className="animate-mandala absolute -bottom-40 -right-40 size-176 text-[#fff6e0]/25" />
        <Link href="/" className="font-display relative z-20 flex items-center gap-2 text-xl font-semibold">
          <Icons.logo className="size-8" />
          {siteConfig.name}
        </Link>
        <div className="relative z-20 mt-auto max-w-md">
          <blockquote className="space-y-3">
            <p lang="sa" className="font-shobhika text-2xl leading-relaxed">
              असतो मा सद्गमय ।<br />
              तमसो मा ज्योतिर्गमय ।<br />
              मृत्योर्मा अमृतं गमय ॥
            </p>
            <p className="text-base text-[#fff6e0]/90">
              Lead me from the unreal to the real, from darkness to light, from
              death to immortality.
            </p>
            <footer className="text-sm text-[#fff6e0]/75">
              Bṛhadāraṇyaka Upaniṣad 1.3.28
            </footer>
          </blockquote>
        </div>
      </div>
      <div className="p-4 sm:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-87.5">
          {children}
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
