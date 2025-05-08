"use client";

import * as React from "react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/utils/icons";
import { useRouter } from "next/navigation";

export function BaseHeader() {
  const router = useRouter();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          onClick={() => router.push( "/dashboard" )}
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/50 text-sidebar-primary-foreground">
            <Icons.logo className="size-6" />
          </div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-semibold text-lg leading-5">DevHub</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
