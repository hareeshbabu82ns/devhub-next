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
          size="default"
          className={cn(
            "gap-2 sm:gap-3 transition-all duration-200 ease-in-out min-h-8 touch-manipulation",
            "hover:bg-sidebar-accent/20",
            "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
          )}
          onClick={() => router.push("/dashboard")}
        >
          <div className="flex aspect-square items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm group-data-[collapsible=icon]:size-8">
            <Icons.logo className="text-secondary-foreground group-data-[collapsible=icon]:size-6" />
          </div>
          <div className="flex flex-col flex-1 text-left justify-center min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-lg sm:text-xl leading-tight text-sidebar-primary truncate">
              DevHub
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
