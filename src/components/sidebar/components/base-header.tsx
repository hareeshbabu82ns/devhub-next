"use client";

import * as React from "react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/utils/icons";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function BaseHeader() {
  const router = useRouter();
  return (
    <SidebarMenu className="pb-2">
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className={cn(
            "gap-3 transition-all duration-300 ease-in-out min-h-12 touch-manipulation",
            "hover:bg-primary/5 active:scale-[0.98]",
            "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-2xl",
          )}
          onClick={() => router.push("/dashboard")}
        >
          <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-300 group-data-[collapsible=icon]:size-8 group-hover:scale-105">
            <Icons.logo className="size-6 text-white group-data-[collapsible=icon]:size-4" />
          </div>
          <div className="flex flex-col flex-1 text-left justify-center min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-xl tracking-tight leading-tight text-foreground truncate">
              DevHub
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none">
              Control Panel
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
