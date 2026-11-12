"use client";

import { useAtom } from "jotai";
import { MapPin } from "lucide-react";
import { panchangamPlaceAtom } from "@/hooks/use-config";
import { useNow } from "@/hooks/use-panchangam";
import { PANCHANGAM_PLACES } from "@/lib/constants";
import { minToTime, nowInTimezone, timezoneAbbr } from "@/lib/panchangam/time";
import { cn } from "@/lib/utils";

/**
 * Segmented place picker. Each option shows the city, region and its
 * current local time so it is obvious which "today" you are looking at.
 */
export function PlaceSwitcher({ className }: { className?: string }) {
  const [selected, setSelected] = useAtom(panchangamPlaceAtom);
  const now = useNow(30_000);

  return (
    <div
      role="radiogroup"
      aria-label="Place"
      className={cn(
        "grid gap-1 rounded-lg bg-muted p-1",
        PANCHANGAM_PLACES.length <= 3
          ? "grid-flow-col auto-cols-fr"
          : "grid-cols-2",
        className,
      )}
    >
      {PANCHANGAM_PLACES.map((place) => {
        const active = place.id === selected;
        const local = nowInTimezone(place.timezone, now);
        return (
          <button
            key={place.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setSelected(place.id)}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
            )}
          >
            <MapPin
              className={cn(
                "size-4 shrink-0",
                active ? "text-primary" : "opacity-60",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-tight">
                {place.label}
              </span>
              <span className="block truncate text-[11px] leading-tight opacity-80">
                {place.region}
              </span>
            </span>
            <span className="shrink-0 text-right tabular-nums">
              <span
                className="block text-sm font-semibold leading-tight"
                suppressHydrationWarning
              >
                {minToTime(local.minutes)}
              </span>
              <span
                className="block text-[10px] leading-tight opacity-70"
                suppressHydrationWarning
              >
                {timezoneAbbr(place.timezone, now)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
