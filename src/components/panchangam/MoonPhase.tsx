import { cn } from "@/lib/utils";

/**
 * Moon phase glyph. `phase`: 0 = new moon, 0.5 = full moon, (0,0.5) waxing.
 */
export function MoonPhase({
  phase,
  className,
  title,
}: {
  phase: number;
  className?: string;
  title?: string;
}) {
  const r = 10;
  const p = ((phase % 1) + 1) % 1;
  const k = Math.cos(2 * Math.PI * p); // 1 new, -1 full
  const rx = Math.abs(k) * r;
  const waxing = p <= 0.5;
  const crescent = k > 0;
  const outerSweep = waxing ? 1 : 0;
  const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  const lit = `M 0 ${-r} A ${r} ${r} 0 0 ${outerSweep} 0 ${r} A ${rx} ${r} 0 0 ${termSweep} 0 ${-r} Z`;

  return (
    <svg
      viewBox="-12 -12 24 24"
      className={cn("size-10 shrink-0", className)}
      role="img"
      aria-label={title ?? "Moon phase"}
    >
      {title && <title>{title}</title>}
      <circle r={r} className="fill-slate-300 dark:fill-slate-700" />
      <path d={lit} className="fill-amber-100 dark:fill-amber-50" />
      <circle
        r={r}
        className="fill-none stroke-slate-400/60 dark:stroke-slate-500"
        strokeWidth={0.6}
      />
    </svg>
  );
}
