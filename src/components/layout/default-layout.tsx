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
  useSidebar,
} from "@/components/ui/sidebar";
import AudioPlayer from "../audio-player/player";
// Import the new playlist components
import { PlaylistSheet } from "../audio-player/PlaylistSheet";
import { PlaylistSheetProvider } from "@/hooks/use-playlist-sheet";
import { PlaylistTrigger } from "../audio-player/PlaylistTrigger";
import QuickAccessMenuTrigger from "./QuickAccessMenuTrigger";
import QuickSettingsTrigger from "@/app/(app)/settings/_components/QuickSettingsTrigger";
import { useSidebarMinimized } from "@/hooks/use-config";
import { cn } from "@/lib/utils";
import { DictionaryPopupWidget } from "@/components/features/dictionary/DictionaryPopupWidget";

/**
 * Backdrop overlay for sidebar on desktop/tablet
 * Shows semi-transparent overlay when sidebar is open and allows closing by clicking
 */
const SidebarBackdrop = () => {
  const { open: isSidebarOpened, isMobile, setOpen } = useSidebar();

  // Don't show backdrop on mobile (Sheet component handles its own overlay)
  // Only show on desktop/tablet when sidebar is open
  if (isMobile || !isSidebarOpened) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-9 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-in-out md:block"
      onClick={() => setOpen(false)}
      aria-hidden="true"
    />
  );
};

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
          <SidebarBackdrop />
          <AppSidebar variant="inset" />
          <SidebarInset className="flex flex-col">
            <TopNavBar />
            <main className="flex flex-1 flex-col gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 pt-0">
              <div className="@container/main-content min-h-[calc(100vh-5rem)] flex-1 flex w-full">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>

        {/* Render the playlist sheet at the root level */}
        <PlaylistSheet />
        
        {/* T114: Dictionary Quick Lookup Popup - global availability */}
        <DictionaryPopupWidget />
      </PlaylistSheetProvider>
    </ReactFlowProvider>
  );
};

const TopNavBar = () => {
  const { open: isSidebarOpened, isMobile } = useSidebar();
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14">
      <div className="flex flex-1 items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 justify-between">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator
            orientation="vertical"
            className="mr-1 sm:mr-2 h-4 shrink-0"
          />
          <AudioPlayer
            className={cn(
              "hidden min-w-0",
              isMobile ? "hidden" : "md:flex",
              isSidebarOpened && "xl:hidden",
            )}
            isMini
          />
        </div>
        <div className="flex flex-row gap-1 sm:gap-2 shrink-0">
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
