"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import React from "react";
import { useState, useEffect } from "react";
import { Icons } from "../utils/icons";
import QuickSettingsTrigger from "@/app/(app)/settings/_components/QuickSettingsTrigger";
import QuickAccessMenuTrigger from "./QuickAccessMenuTrigger";

export default function HeaderLinks(props: { [x: string]: any }) {
  const { onOpen } = props;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-row gap-2">
      <QuickAccessMenuTrigger />
      <QuickSettingsTrigger />
      <Button
        variant="outline"
        size="icon"
        onClick={onOpen}
        className="xl:hidden"
      >
        <Icons.sidebarMenu className="size-4" />
      </Button>
    </div>
  );
}
