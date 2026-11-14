import { cn } from "@/lib/utils";

const petal = (r0: number, r1: number, w: number) => {
  const d = r1 - r0;
  return `M0 ${-r0}C${w} ${-(r0 + d * 0.45)} ${w * 0.5} ${-(r0 + d * 0.8)} 0 ${-r1}C${-w * 0.5} ${-(r0 + d * 0.8)} ${-w} ${-(r0 + d * 0.45)} 0 ${-r0}Z`;
};

const rings = [
  { n: 8, r0: 22, r1: 58, w: 16 },
  { n: 16, r0: 64, r1: 98, w: 11 },
  { n: 24, r0: 106, r1: 138, w: 9 },
  { n: 32, r0: 146, r1: 176, w: 8 },
];

/** Decorative line-art mandala. Colour comes from `currentColor`. */
export function Mandala({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-200 -200 400 400"
      fill="none"
      stroke="currentColor"
      strokeWidth={0.8}
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
    >
      <circle r={14} />
      {rings.map(({ n, r0, r1, w }) => (
        <g key={n}>
          <circle r={r1 + 4} />
          {Array.from({ length: n }, (_, i) => (
            <path
              key={i}
              d={petal(r0, r1, w)}
              transform={`rotate(${(360 / n) * i})`}
            />
          ))}
        </g>
      ))}
      <circle r={190} strokeDasharray="1 7" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** Thin rule with a lotus bud at its centre, for separating sections. */
export function OrnamentDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-3 text-gold", className)}
    >
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-current opacity-60" />
      <svg viewBox="0 0 48 24" className="h-4 w-8 shrink-0" fill="currentColor">
        <path d="M24 2c4 5 4 12 0 18c-4-6-4-13 0-18z" />
        <path d="M11 8c6 1 10 5 11 12c-6-1-10-5-11-12zM37 8c-6 1-10 5-11 12c6-1 10-5 11-12z" opacity=".75" />
        <path d="M2 16c6-2 12-1 17 5c-7 1-13 0-17-5zM46 16c-6-2-12-1-17 5c7 1 13 0 17-5z" opacity=".5" />
      </svg>
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-current opacity-60" />
    </div>
  );
}
