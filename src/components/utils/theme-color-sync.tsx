"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { APPEARANCE_CHANGE_EVENT } from "@/hooks/use-appearance";

/**
 * The server-rendered theme-color metas only know the OS colour scheme and the
 * default surfaces. Point them at whatever background is actually showing, so
 * the browser / status bar chrome matches the chosen mode and reading theme.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const apply = () => {
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();
      if (!color) return;
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((meta) => meta.setAttribute("content", color));
    };
    apply();
    window.addEventListener(APPEARANCE_CHANGE_EVENT, apply);
    return () => window.removeEventListener(APPEARANCE_CHANGE_EVENT, apply);
  }, [resolvedTheme]);

  return null;
}
