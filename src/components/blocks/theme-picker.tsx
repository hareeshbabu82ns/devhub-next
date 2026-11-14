"use client";

import { Check, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  ACCENTS,
  BOARD_THEMES,
  PAPER_THEMES,
  type ThemeOption,
} from "@/config/themes";
import { useAppearance } from "@/hooks/use-appearance";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "light", label: "Light", icon: SunIcon },
  { id: "dark", label: "Dark", icon: MoonIcon },
  { id: "system", label: "Auto", icon: MonitorIcon },
] as const;

function SurfaceTile({
  option,
  accent,
  selected,
  onSelect,
}: {
  option: ThemeOption;
  accent: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [bg, fg] = option.swatch;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "min-w-0 rounded-xl border-2 p-1 text-left transition-colors touch-manipulation",
        selected ? "border-primary" : "border-border hover:border-primary/50",
      )}
    >
      <span
        className="flex flex-col gap-1.5 rounded-lg p-3"
        style={{ backgroundColor: bg, color: fg }}
      >
        <span className="font-display text-base font-semibold leading-none">
          {option.label}
        </span>
        <span className="h-1 w-4/5 rounded-full bg-current opacity-70" />
        <span className="h-1 w-3/5 rounded-full bg-current opacity-45" />
        <span
          className="mt-0.5 h-2.5 w-10 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </span>
      <span className="block truncate px-1 pt-1.5 text-xs text-muted-foreground">
        {option.hint}
      </span>
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

/**
 * Mode, light surface, dark surface and accent colour. The four choices are
 * independent, so any surface can be mixed with any accent.
 */
export default function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [paper, setPaper] = useAppearance("paper");
  const [board, setBoard] = useAppearance("board");
  const [accent, setAccent] = useAppearance("accent");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeAccent = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];

  return (
    <div className={cn("space-y-5", className)}>
      <Group label="Mode">
        <div
          role="radiogroup"
          aria-label="Mode"
          className="inline-flex rounded-lg border bg-muted p-1"
        >
          {MODES.map(({ id, label, icon: Icon }) => {
            const selected = mounted && theme === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(id)}
                className={cn(
                  "flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm touch-manipulation",
                  selected
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </div>
      </Group>

      <Group label="Light theme">
        <div role="radiogroup" aria-label="Light theme" className="grid grid-cols-2 gap-2">
          {PAPER_THEMES.map((option) => (
            <SurfaceTile
              key={option.id}
              option={option}
              accent={activeAccent.swatch[0]}
              selected={paper === option.id}
              onSelect={() => {
                setPaper(option.id);
                setTheme("light");
              }}
            />
          ))}
        </div>
      </Group>

      <Group label="Dark theme">
        <div role="radiogroup" aria-label="Dark theme" className="grid grid-cols-2 gap-2">
          {BOARD_THEMES.map((option) => (
            <SurfaceTile
              key={option.id}
              option={option}
              accent={activeAccent.swatch[1]}
              selected={board === option.id}
              onSelect={() => {
                setBoard(option.id);
                setTheme("dark");
              }}
            />
          ))}
        </div>
      </Group>

      <Group label="Accent colour">
        <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-2">
          {ACCENTS.map((option) => {
            const selected = accent === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                title={option.label}
                onClick={() => setAccent(option.id)}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 touch-manipulation",
                  selected ? "border-foreground" : "border-transparent",
                )}
              >
                <span
                  className="flex size-7 items-center justify-center rounded-full text-white"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${option.swatch[0]} 50%, ${option.swatch[1]} 50%)`,
                  }}
                >
                  {selected && <Check className="size-4" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{activeAccent.label}</p>
      </Group>
    </div>
  );
}
