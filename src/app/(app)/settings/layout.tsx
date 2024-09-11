"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SettingsPage = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname();
  const pathPrefix = pathname === "/settings" ? `${pathname}/` : "";
  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 md:gap-8 ">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Settings</h1>
      </div>
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <nav className="grid gap-4 text-sm text-muted-foreground">
          <Link
            href={`${pathPrefix}general`}
            className="font-semibold text-primary"
          >
            General
          </Link>
          <Link href={`${pathPrefix}security`}>Security</Link>
          <Link href={`${pathPrefix}advanced`}>Advanced</Link>
        </nav>
        {children}
      </div>
    </main>
  );
};

export default SettingsPage;
