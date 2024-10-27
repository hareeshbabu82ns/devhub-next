"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { AppSidebar } from "../sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AudioPlayer from "../audio-player/player";
import PlayListTrigger from "../audio-player/PlayListTrigger";
import QuickAccessMenuTrigger from "./QuickAccessMenuTrigger";
import QuickSettingsTrigger from "@/app/(app)/settings/_components/QuickSettingsTrigger";

const WithDefaultLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNavBar />
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="@container/main-content min-h-[100vh] flex-1 md:min-h-min">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

const TopNavBar = () => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2 px-4 justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <AudioPlayer className="hidden md:flex xl:hidden" isMini />
          {/* <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb> */}
        </div>
        <div className="flex flex-row gap-2">
          <PlayListTrigger className="md:hidden" />
          <QuickAccessMenuTrigger />
          <QuickSettingsTrigger />
        </div>
      </div>
    </header>
  );
};

export default WithDefaultLayout;
