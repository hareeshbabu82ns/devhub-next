"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SettingsPage = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname();
  const pathPrefix = pathname === "/settings" ? `${pathname}/` : "";

  const isActivePath = (path: string): boolean => {
    if (pathname === "/settings" && path === "profile") {
      return true;
    }
    return pathname.endsWith(`/${path}`);
  };

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.20))] flex-1 flex-col gap-4 md:gap-8 ">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Settings</h1>
      </div>
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <nav className="grid gap-1 text-sm text-muted-foreground p-1">
          <Link
            href={`${pathPrefix}profile`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
              isActivePath("profile") ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
            )}
          >
            Profile
          </Link>
          <Link
            href={`${pathPrefix}general`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
              isActivePath("general") ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
            )}
          >
            General
          </Link>
          <Link
            href={`${pathPrefix}security`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
              isActivePath("security") ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
            )}
          >
            Security
          </Link>
          <Link
            href={`${pathPrefix}advanced`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
              isActivePath("advanced") ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
            )}
          >
            Advanced
          </Link>
        </nav>
        {children}
      </div>
    </main>
  );
};

export default SettingsPage;
