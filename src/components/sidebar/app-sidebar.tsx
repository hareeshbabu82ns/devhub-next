"use client";

import * as React from "react";

import { NavMain } from "@/components/sidebar/components/nav-main";
import { NavUser } from "@/components/sidebar/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { BaseHeader } from "./components/base-header";
import { Icons } from "../utils/icons";
import AudioPlayer from "../audio-player/player";

const data = {
  navMain: [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: <Icons.home className="size-4 stroke-2 text-inherit" />,
    },
    {
      title: "Gods",
      path: "/entities?type=GOD&offset=0",
      activeSearchParams: { type: "GOD" },
      icon: <Icons.god className="size-4 stroke-2 text-inherit" />,
    },
    {
      title: "Authors",
      path: "/entities?type=AUTHOR&offset=0",
      activeSearchParams: { type: "AUTHOR" },
      icon: <Icons.artist className="size-4 stroke-2 text-inherit" />,
    },
    {
      title: "Dictionary",
      path: "/dictionary",
      icon: <Icons.dictionary className="size-4 stroke-2 text-inherit" />,
    },
    {
      title: "Assets",
      path: "/assets",
      icon: <Icons.assetsExplorer className="size-4 stroke-2 text-inherit" />,
    },
    {
      title: "Scraper",
      path: "/scraper",
      icon: <Icons.scraper className="size-4 stroke-2 text-inherit" />,
    },
    {
      title: "Sanscript",
      path: "#",
      icon: <Icons.sanscript className="size-4 stroke-2 text-inherit" />,
      isActive: true,
      items: [
        {
          title: "Editor",
          path: "/sanscript?tab=editor",
          activeSearchParams: { tab: "editor" },
        },
        {
          title: "Converter",
          path: "/sanscript?tab=transConv",
          activeSearchParams: { tab: "transConv" },
        },
      ],
    },
    {
      title: "Settings",
      path: "#",
      icon: <Icons.settings className="size-4 stroke-2 text-inherit" />,
      isActive: true,
      items: [
        {
          title: "General",
          path: "/settings/general",
        },
        {
          title: "Security",
          path: "/settings/security",
        },
        {
          title: "Advanced",
          path: "/settings/advanced",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <BaseHeader />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter className="">
        {/* <SidebarDocs /> */}
        <AudioPlayer className="hidden xl:flex" isSidebar />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
