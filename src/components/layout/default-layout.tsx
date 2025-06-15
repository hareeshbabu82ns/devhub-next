"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { AppSidebar } from "../sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AudioPlayer from "../audio-player/player";
// Import the new playlist components
import { PlaylistSheet } from "../audio-player/PlaylistSheet";
import { PlaylistSheetProvider } from "@/hooks/use-playlist-sheet";
import { PlaylistTrigger } from "../audio-player/PlaylistTrigger";
import QuickAccessMenuTrigger from "./QuickAccessMenuTrigger";
import QuickSettingsTrigger from "@/app/(app)/settings/_components/QuickSettingsTrigger";
import { useSidebarMinimized } from "@/hooks/use-config";

const WithDefaultLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname();
  const { value: sidebarDefaultOpen, setValue: setSidebarDefaultOpen } =
    useSidebarMinimized();

  return (
    <ReactFlowProvider>
      <PlaylistSheetProvider>
        <SidebarProvider
          open={sidebarDefaultOpen}
          onOpenChange={setSidebarDefaultOpen}
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <TopNavBar />
            <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
              <div className="@container/main-content min-h-[100vh] flex-1 md:min-h-min flex">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>

        {/* Render the playlist sheet at the root level */}
        <PlaylistSheet />
      </PlaylistSheetProvider>
    </ReactFlowProvider>
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
        </div>
        <div className="flex flex-row gap-2">
          {/* Use the simplified PlaylistTrigger component */}
          <PlaylistTrigger />
          <QuickAccessMenuTrigger />
          <QuickSettingsTrigger />
        </div>
      </div>
    </header>
  );
};

export default WithDefaultLayout;
