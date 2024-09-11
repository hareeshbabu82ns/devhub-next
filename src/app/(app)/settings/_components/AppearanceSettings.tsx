"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const AppearanceSettings = () => {
  const { setTheme } = useTheme();
  return (
    <div className="my-4 p-4 space-y-4 border rounded-sm ">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-muted-foreground text-sm">
          Customize the appearance of the app. Automatically switch between day
          and night themes.
        </p>
      </div>
      <Button
        asChild
        variant={"ghost"}
        className="size-fit"
        onClick={() => setTheme("light")}
      >
        <div className="flex flex-col">
          <div className="border-muted hover:border-accent items-center rounded-md border-2 p-1">
            <div className="space-y-2 rounded-sm bg-white/60 p-2">
              <div className="space-y-2 rounded-md bg-white/70 p-2 shadow-sm">
                <div className="h-2 w-[80px] rounded-lg bg-muted" />
                <div className="h-2 w-[100px] rounded-lg bg-muted" />
              </div>
              <div className="flex items-center space-x-2 rounded-md bg-white/70 p-2 shadow-sm">
                <div className="size-4 rounded-full bg-muted" />
                <div className="h-2 w-[100px] rounded-lg bg-muted" />
              </div>
              <div className="flex items-center space-x-2 rounded-md bg-white/70 p-2 shadow-sm">
                <div className="size-4 rounded-full bg-muted" />
                <div className="h-2 w-[100px] rounded-lg bg-muted" />
              </div>
            </div>
          </div>
          <span className="block w-full p-2 text-center font-normal">
            Light
          </span>
        </div>
      </Button>
      <Button
        asChild
        variant={"ghost"}
        onClick={() => setTheme("dark")}
        className="size-fit"
      >
        <div className="flex flex-col">
          <div className="border-muted bg-popover hover:bg-accent hover:text-accent-foreground items-center rounded-md border-2 p-1">
            <div className="space-y-2 rounded-sm bg-neutral-950 p-2">
              <div className="space-y-2 rounded-md bg-neutral-800 p-2 shadow-sm">
                <div className="h-2 w-[80px] rounded-lg bg-neutral-400" />
                <div className="h-2 w-[100px] rounded-lg bg-neutral-400" />
              </div>
              <div className="flex items-center space-x-2 rounded-md bg-neutral-800 p-2 shadow-sm">
                <div className="size-4 rounded-full bg-neutral-400" />
                <div className="h-2 w-[100px] rounded-lg bg-neutral-400" />
              </div>
              <div className="flex items-center space-x-2 rounded-md bg-neutral-800 p-2 shadow-sm">
                <div className="size-4 rounded-full bg-neutral-400" />
                <div className="h-2 w-[100px] rounded-lg bg-neutral-400" />
              </div>
            </div>
          </div>
          <span className="block w-full p-2 text-center font-normal">Dark</span>
        </div>
      </Button>
      <Button
        asChild
        variant={"ghost"}
        onClick={() => setTheme("system")}
        className="size-fit"
      >
        <div className="flex flex-col">
          <div className="border-muted bg-popover hover:bg-accent hover:text-accent-foreground items-center rounded-md border-2 p-1">
            <div className="space-y-2 rounded-sm bg-neutral-300 p-2">
              <div className="space-y-2 rounded-md bg-neutral-600 p-2 shadow-sm">
                <div className="h-2 w-[80px] rounded-lg bg-neutral-400" />
                <div className="h-2 w-[100px] rounded-lg bg-neutral-400" />
              </div>
              <div className="flex items-center space-x-2 rounded-md bg-neutral-600 p-2 shadow-sm">
                <div className="size-4 rounded-full bg-neutral-400" />
                <div className="h-2 w-[100px] rounded-lg bg-neutral-400" />
              </div>
              <div className="flex items-center space-x-2 rounded-md bg-neutral-600 p-2 shadow-sm">
                <div className="size-4 rounded-full bg-neutral-400" />
                <div className="h-2 w-[100px] rounded-lg bg-neutral-400" />
              </div>
            </div>
          </div>
          <span className="block w-full p-2 text-center font-normal">
            System
          </span>
        </div>
      </Button>
    </div>
  );
};

export default AppearanceSettings;
