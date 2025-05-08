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
            "gap-3 transition-all duration-200 ease-in-out",
            "hover:bg-sidebar-accent/20",
            "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          )}
          onClick={() => router.push( "/dashboard" )}
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Icons.logo className="size-6 text-secondary-foreground" />
          </div>
          <div className="flex flex-col flex-1 text-left justify-center">
            <span className="font-bold text-xl leading-tight text-sidebar-primary">DevHub</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
