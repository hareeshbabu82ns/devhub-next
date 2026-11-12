"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CircleCheck,
  CircleAlert,
  Clock,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PanchangamData } from "@/types/panchangam";
import {
  buildDayModel,
  isActive,
  type DayModel,
  type TimelineCategory,
  type TimelineItem,
} from "@/lib/panchangam/day-model";
import { formatDuration, minToTime } from "@/lib/panchangam/time";
import { TimeText } from "./TimeText";

type Filter = "all" | "muhurta" | "auspicious" | "inauspicious" | "sky";

const CATEGORY_STYLE: Record<
  TimelineCategory,
  { dot: string; text: string; soft: string; bar: string; label: string }
> = {
  auspicious: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    soft: "bg-emerald-500/10 border-emerald-500/30",
    bar: "bg-emerald-500/70 hover:bg-emerald-500",
    label: "Auspicious",
  },
  inauspicious: {
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    soft: "bg-rose-500/10 border-rose-500/30",
    bar: "bg-rose-500/70 hover:bg-rose-500",
    label: "Inauspicious",
  },
  sun: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    soft: "bg-amber-500/10 border-amber-500/30",
    bar: "bg-amber-500",
    label: "Sun",
  },
  moon: {
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
    soft: "bg-sky-500/10 border-sky-500/30",
    bar: "bg-sky-500",
    label: "Moon",
  },
  transition: {
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-400",
    soft: "bg-violet-500/10 border-violet-500/30",
    bar: "bg-violet-500",
    label: "Transition",
  },
};

const CATEGORY_ICON: Record<TimelineCategory, React.ElementType> = {
  auspicious: CircleCheck,
  inauspicious: CircleAlert,
  sun: Sun,
  moon: Moon,
  transition: ArrowRightLeft,
};

export interface DayTimelineProps {
  data: PanchangamData;
  /** minutes since local midnight, only when viewing today */
  nowMin?: number;
  /** ask the timeline to reveal an item; bump `seq` to re-trigger */
  focusRequest?: { id: string; seq: number } | null;
  className?: string;
}

export function DayTimeline({
  data,
  nowMin,
  focusRequest,
  className,
}: DayTimelineProps) {
  const model = useMemo(() => buildDayModel(data), [data]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inWindow =
    nowMin !== undefined &&
    nowMin >= model.windowStart &&
    nowMin <= model.windowEnd;
  const now = inWindow ? nowMin : undefined;

  const select = (id: string) => {
    setSelectedId(id);
    // make sure the item is visible in the current filter
    const item = model.items.find((i) => i.id === id);
    if (item && !matchesFilter(item, filter)) setFilter("all");
    requestAnimationFrame(() =>
      document
        .getElementById(`tl-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  useEffect(() => {
    if (focusRequest) select(focusRequest.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.seq]);

  const longItems = model.items.filter((i) => i.long);
  const agenda = model.items.filter((i) => !i.long && matchesFilter(i, filter));

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <OverviewBar
        model={model}
        nowMin={now}
        selectedId={selectedId}
        onSelect={select}
      />

      {longItems.length > 0 && (
        <section aria-label="Day-long periods">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Spanning the day
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {longItems.map((item) => (
              <li key={item.id}>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                    CATEGORY_STYLE[item.category].soft,
                    now !== undefined &&
                      isActive(item, now) &&
                      "ring-1 ring-primary/50",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      CATEGORY_STYLE[item.category].dot,
                    )}
                  />
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground">
                    <TimeText min={item.startMin} /> –{" "}
                    <TimeText min={item.endMin!} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Day agenda" className="flex flex-col gap-2">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={filter}
          onValueChange={(v) => v && setFilter(v as Filter)}
          className="flex-wrap justify-start"
        >
          <ToggleGroupItem value="all" className="h-8 px-3 text-xs">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="muhurta" className="h-8 px-3 text-xs">
            Muhurtas
          </ToggleGroupItem>
          <ToggleGroupItem value="auspicious" className="h-8 px-3 text-xs">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Good
          </ToggleGroupItem>
          <ToggleGroupItem value="inauspicious" className="h-8 px-3 text-xs">
            <span className="size-1.5 rounded-full bg-rose-500" />
            Avoid
          </ToggleGroupItem>
          <ToggleGroupItem value="sky" className="h-8 px-3 text-xs">
            Sun · Moon · Changes
          </ToggleGroupItem>
        </ToggleGroup>

        <Agenda
          items={agenda}
          nowMin={now}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </section>
    </div>
  );
}

function matchesFilter(item: TimelineItem, filter: Filter) {
  switch (filter) {
    case "all":
      return true;
    case "muhurta":
      return item.category === "auspicious" || item.category === "inauspicious";
    case "auspicious":
    case "inauspicious":
      return item.category === filter;
    case "sky":
      return (
        item.category === "sun" ||
        item.category === "moon" ||
        item.category === "transition"
      );
  }
}

// ---------------------------------------------------------------------------
// Overview bar (sunrise → next sunrise at a glance)
// ---------------------------------------------------------------------------

function OverviewBar({
  model,
  nowMin,
  selectedId,
  onSelect,
}: {
  model: DayModel;
  nowMin?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { windowStart, windowEnd, sunrise, sunset } = model;
  const span = windowEnd - windowStart;
  const pct = (m: number) =>
    `${((Math.min(Math.max(m, windowStart), windowEnd) - windowStart) / span) * 100}%`;
  const width = (a: number, b: number) =>
    `${((Math.min(b, windowEnd) - Math.max(a, windowStart)) / span) * 100}%`;

  const ticks: number[] = [];
  for (let m = Math.ceil(windowStart / 180) * 180; m <= windowEnd; m += 180) {
    ticks.push(m);
  }

  const lanes: { key: TimelineCategory; label: string }[] = [
    { key: "auspicious", label: "Good" },
    { key: "inauspicious", label: "Avoid" },
  ];

  return (
    <section aria-label="Day at a glance" className="select-none">
      <div className="flex">
        {/* lane labels */}
        <div className="flex w-10 shrink-0 flex-col pt-0 text-[10px] text-muted-foreground">
          <div className="flex h-6 items-center">Sky</div>
          {lanes.map((l) => (
            <div key={l.key} className="flex h-7 items-center">
              {l.label}
            </div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* sky: night / day */}
          <div className="relative h-6 overflow-hidden rounded-t-md bg-slate-800/80 dark:bg-slate-900">
            {sunrise !== undefined && sunset !== undefined && (
              <div
                className="absolute inset-y-0 bg-linear-to-r from-amber-300 via-sky-300 to-orange-300 dark:from-amber-600/80 dark:via-sky-700/80 dark:to-orange-600/80"
                style={{ left: pct(sunrise), width: width(sunrise, sunset) }}
              />
            )}
            {/* limb transitions */}
            {model.items
              .filter((i) => i.category === "transition")
              .map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => onSelect(i.id)}
                  title={`${minToTime(i.startMin)} ${i.title}: ${i.subtitle ?? ""}`}
                  aria-label={`${i.title} at ${minToTime(i.startMin)}`}
                  className="absolute top-0 h-full w-5 -translate-x-1/2"
                  style={{ left: pct(i.startMin) }}
                >
                  <span className="mx-auto block h-full w-0.5 bg-violet-500" />
                </button>
              ))}
          </div>

          {/* period lanes */}
          {lanes.map((lane, li) => (
            <div
              key={lane.key}
              className={cn(
                "relative h-7 border-x bg-muted/40",
                li === lanes.length - 1 && "rounded-b-md border-b",
              )}
            >
              {model.items
                .filter(
                  (i) => i.category === lane.key && i.endMin !== undefined,
                )
                .map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => onSelect(i.id)}
                    title={`${i.title} ${minToTime(i.startMin)}–${minToTime(i.endMin!)}`}
                    aria-label={`${i.title} ${minToTime(i.startMin)} to ${minToTime(i.endMin!)}`}
                    className={cn(
                      "absolute rounded-sm transition-colors",
                      i.long ? "bottom-0 h-1 opacity-60" : "inset-y-1",
                      CATEGORY_STYLE[lane.key].bar,
                      selectedId === i.id &&
                        "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                    )}
                    style={{
                      left: pct(i.startMin),
                      width: width(i.startMin, i.endMin!),
                      minWidth: 3,
                    }}
                  />
                ))}
            </div>
          ))}

          {/* hour ticks */}
          <div className="relative h-4">
            {ticks.map((m) => (
              <span
                key={m}
                className={cn(
                  "absolute top-0.5 -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground",
                  m % 360 !== 0 && "hidden sm:block",
                )}
                style={{ left: pct(m) }}
              >
                {minToTime(m).slice(0, 2)}
              </span>
            ))}
          </div>

          {/* now line */}
          {nowMin !== undefined && (
            <div
              className="pointer-events-none absolute -top-1 bottom-4 z-10 w-0.5 -translate-x-1/2 bg-primary"
              style={{ left: pct(nowMin) }}
            >
              <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Now / up next
// ---------------------------------------------------------------------------

/**
 * "Right now" card: active muhurtas/kalams and what comes next.
 * Renders nothing when `nowMin` is outside the day's window.
 */
export function NowStatus({
  data,
  nowMin,
  onSelect,
  className,
}: {
  data: PanchangamData;
  nowMin?: number;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const model = useMemo(() => buildDayModel(data), [data]);
  if (
    nowMin === undefined ||
    nowMin < model.windowStart ||
    nowMin > model.windowEnd
  ) {
    return null;
  }
  const periods = model.items.filter(
    (i) =>
      !i.long &&
      i.endMin !== undefined &&
      (i.category === "auspicious" || i.category === "inauspicious"),
  );
  const active = periods.filter((i) => isActive(i, nowMin));
  const next = periods.find((i) => i.startMin > nowMin);

  return (
    <section
      aria-label="Right now"
      aria-live="polite"
      className={cn("rounded-lg border bg-muted/30 p-3", className)}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Clock className="size-3.5" />
        Now · <span className="tabular-nums">{minToTime(nowMin)}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {active.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No special muhurta or kalam right now.
          </div>
        )}
        {active.map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => onSelect?.(i.id)}
            className={cn(
              "flex min-h-10 flex-wrap items-center justify-between gap-x-2 rounded-md border px-2.5 py-1.5 text-left text-sm",
              CATEGORY_STYLE[i.category].soft,
            )}
          >
            <span
              className={cn("font-semibold", CATEGORY_STYLE[i.category].text)}
            >
              {i.title}
            </span>
            <span className="text-xs text-muted-foreground">
              ends <TimeText min={i.endMin!} /> ·{" "}
              {formatDuration(i.endMin! - nowMin)} left
            </span>
          </button>
        ))}
        {next && (
          <button
            type="button"
            onClick={() => onSelect?.(next.id)}
            className="flex min-h-9 flex-wrap items-center justify-between gap-x-2 px-1 text-left text-sm"
          >
            <span>
              <span className="text-muted-foreground">Up next: </span>
              <span
                className={cn(
                  "font-medium",
                  CATEGORY_STYLE[next.category].text,
                )}
              >
                {next.title}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              <TimeText min={next.startMin} /> · in{" "}
              {formatDuration(next.startMin - nowMin)}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Agenda list
// ---------------------------------------------------------------------------

function Agenda({
  items,
  nowMin,
  selectedId,
  onSelect,
}: {
  items: TimelineItem[];
  nowMin?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing in this view.
      </p>
    );
  }

  const nowIndex =
    nowMin === undefined ? -1 : items.findIndex((i) => i.startMin > nowMin);

  return (
    <ol className="relative">
      {items.map((item, idx) => {
        const style = CATEGORY_STYLE[item.category];
        const Icon = CATEGORY_ICON[item.category];
        const isPeriod = item.endMin !== undefined;
        const active =
          nowMin !== undefined && isPeriod && isActive(item, nowMin);
        const past =
          nowMin !== undefined && (item.endMin ?? item.startMin) <= nowMin;
        const progress =
          active && item.endMin !== undefined
            ? ((nowMin! - item.startMin) / (item.endMin - item.startMin)) * 100
            : 0;

        return (
          <React.Fragment key={item.id}>
            {idx === nowIndex && <NowDivider nowMin={nowMin!} />}
            <li
              id={`tl-${item.id}`}
              className={cn(
                "grid scroll-mt-4 grid-cols-[3.25rem_1fr] gap-2",
                past && !active && "opacity-50",
              )}
            >
              <div className="pt-2 text-right text-xs leading-tight">
                <TimeText min={item.startMin} className="font-semibold" />
              </div>
              <div className="relative border-l border-border pb-2 pl-4">
                <span
                  className={cn(
                    "absolute -left-[5px] top-2.5 size-2.5 rounded-full ring-2 ring-background",
                    style.dot,
                  )}
                />
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "w-full rounded-md text-left transition-colors",
                    isPeriod
                      ? cn("border px-2.5 py-1.5", style.soft)
                      : "px-1 py-1.5 hover:bg-muted/50",
                    active && "ring-2 ring-primary/60",
                    selectedId === item.id && "ring-2 ring-foreground/70",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("size-3.5 shrink-0", style.text)} />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        isPeriod
                          ? cn("font-semibold", style.text)
                          : "font-medium",
                      )}
                    >
                      {item.title}
                    </span>
                    {active && (
                      <span className="rounded bg-primary px-1 text-[10px] font-semibold uppercase text-primary-foreground">
                        now
                      </span>
                    )}
                  </div>
                  {(isPeriod || item.subtitle) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {isPeriod && (
                        <span>
                          <TimeText min={item.startMin} /> –{" "}
                          <TimeText min={item.endMin!} />
                          {" · "}
                          {formatDuration(item.endMin! - item.startMin)}
                        </span>
                      )}
                      {item.subtitle && <span>{item.subtitle}</span>}
                    </div>
                  )}
                  {active && (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/70">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </button>
              </div>
            </li>
          </React.Fragment>
        );
      })}
      {nowIndex === -1 && nowMin !== undefined && (
        <NowDivider nowMin={nowMin} />
      )}
    </ol>
  );
}

function NowDivider({ nowMin }: { nowMin: number }) {
  return (
    <li
      aria-label={`Current time ${minToTime(nowMin)}`}
      className="grid grid-cols-[3.25rem_1fr] items-center gap-2 py-1"
    >
      <span className="text-right text-xs font-bold tabular-nums text-primary">
        {minToTime(nowMin)}
      </span>
      <span className="relative h-0.5 rounded-full bg-primary">
        <span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-primary" />
      </span>
    </li>
  );
}
