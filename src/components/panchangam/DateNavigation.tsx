/**
 * DateNavigation: week strip + day stepping + calendar picker for Panchangam
 */

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { useState } from "react";

export interface DateNavigationProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  /** "today" in the selected place's timezone */
  today?: Date;
  className?: string;
}

/**
 * Two rows:
 *  1. Calendar picker (full date) + "Today"
 *  2. ‹ week strip › — arrows step one day, the strip follows the week
 */
export function DateNavigation({
  date,
  onDateSelect,
  onPreviousDay,
  onNextDay,
  onToday,
  today = new Date(),
  className,
}: DateNavigationProps) {
  const [open, setOpen] = useState(false);
  const selected = date ?? today;
  const weekStart = startOfWeek(selected, { weekStartsOn: 0 });
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isToday = isSameDay(selected, today);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-11 min-w-0 flex-1 justify-start gap-2 px-3 font-normal sm:h-10"
            >
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              {/* short label on phones, full label from sm up */}
              <span className="truncate sm:hidden">
                <span className="font-semibold">{format(selected, "EEE")}</span>
                <span className="text-muted-foreground">
                  {", "}
                  {format(selected, "d MMM yyyy")}
                </span>
              </span>
              <span className="hidden truncate sm:inline">
                <span className="font-semibold">
                  {format(selected, "EEEE")}
                </span>
                <span className="text-muted-foreground">
                  {", "}
                  {format(selected, "d MMMM yyyy")}
                </span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected}
              onSelect={(d) => {
                if (d) onDateSelect(d);
                setOpen(false);
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          onClick={onToday}
          variant={isToday ? "secondary" : "default"}
          size="sm"
          className="h-11 shrink-0 px-4 sm:h-10"
          disabled={isToday}
        >
          Today
        </Button>
      </div>

      <div
        className="flex items-stretch gap-1"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onPreviousDay();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onNextDay();
          }
        }}
      >
        <Button
          onClick={onPreviousDay}
          variant="ghost"
          size="icon"
          className="h-auto w-9 shrink-0"
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div
          role="listbox"
          aria-label="Select day"
          className="grid min-w-0 flex-1 grid-cols-7 gap-0.5 sm:gap-1"
        >
          {week.map((day) => {
            const active = isSameDay(day, selected);
            const dayIsToday = isSameDay(day, today);
            return (
              <button
                key={day.toISOString()}
                type="button"
                role="option"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "relative flex min-w-0 flex-col items-center rounded-md py-1.5 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wide",
                    active ? "opacity-90" : "text-muted-foreground",
                  )}
                >
                  {format(day, "EEE")}
                </span>
                <span className="text-base font-semibold tabular-nums leading-tight">
                  {format(day, "d")}
                </span>
                <span
                  className={cn(
                    "mt-0.5 size-1 rounded-full",
                    dayIsToday
                      ? active
                        ? "bg-primary-foreground"
                        : "bg-primary"
                      : "bg-transparent",
                  )}
                  aria-hidden
                />
                {dayIsToday && <span className="sr-only">(today)</span>}
              </button>
            );
          })}
        </div>

        <Button
          onClick={onNextDay}
          variant="ghost"
          size="icon"
          className="h-auto w-9 shrink-0"
          aria-label="Next day"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
