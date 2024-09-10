"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import { usePathname } from "next/navigation";
import React from "react";
import Navbar from "@/components/layout/Navbar";
import { routes } from "@/components/utils/routes";
import { getActiveRoute } from "@/components/utils/navigation";

const WithDefaultLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex size-full">
      <Sidebar routes={routes} open={open} setOpen={() => setOpen(!open)} />
      <div className="flex size-full flex-col xl:ml-80">
        <Navbar
          onOpen={() => setOpen(!open)}
          brandText={getActiveRoute(routes, pathname)}
        />
        <main className="mx-2.5 flex-none transition-all">
          <div className="@container/main-content min-h-screen overflow-y-auto p-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default WithDefaultLayout;
