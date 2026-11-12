import { cn } from "@/lib/utils";
import { minToTime } from "@/lib/panchangam/time";

/** "HH:mm" with a small "+1" when the time falls on the next calendar day */
export function TimeText({
  min,
  className,
}: {
  min: number;
  className?: string;
}) {
  const nextDay = min >= 1440;
  return (
    <span
      className={cn("tabular-nums whitespace-nowrap", className)}
      title={nextDay ? "Next day (after midnight)" : undefined}
    >
      {minToTime(min)}
      {nextDay && (
        <sup className="ml-0.5 text-[0.65em] font-medium text-muted-foreground">
          +1
        </sup>
      )}
    </span>
  );
}
