/**
 * Reading themes. Keep ids in step with the `[data-paper]`, `[data-board]`
 * and `[data-accent]` blocks in src/app/globals.css. Swatch colours are only
 * used to draw the picker previews.
 */
export type ThemeOption = {
  id: string;
  label: string;
  hint: string;
  /** [background, text] preview colours */
  swatch: [string, string];
};

export type AccentOption = {
  id: string;
  label: string;
  /** [on light surfaces, on dark surfaces] */
  swatch: [string, string];
};

export const PAPER_THEMES: ThemeOption[] = [
  {
    id: "chandan",
    label: "Chandan",
    hint: "Sandalwood paper",
    swatch: ["#f7f1e5", "#46352a"],
  },
  {
    id: "talapatra",
    label: "Talapatra",
    hint: "Palm-leaf sepia",
    swatch: ["#e3d8c4", "#412d20"],
  },
];

export const BOARD_THEMES: ThemeOption[] = [
  {
    id: "chalkboard",
    label: "Chalkboard",
    hint: "Green slate, chalk text",
    swatch: ["#222f2a", "#dcd7c6"],
  },
  {
    id: "deepam",
    label: "Deepam",
    hint: "Lamp-lit night",
    swatch: ["#221a16", "#d9ccb9"],
  },
];

export const ACCENTS: AccentOption[] = [
  { id: "saffron", label: "Saffron", swatch: ["#b84a14", "#f0b06a"] },
  { id: "kumkum", label: "Kumkum", swatch: ["#99243a", "#ec8894"] },
  { id: "lotus", label: "Lotus", swatch: ["#a5316a", "#e89cbd"] },
  { id: "turmeric", label: "Turmeric", swatch: ["#915e0d", "#ecd164"] },
  { id: "tulsi", label: "Tulsi", swatch: ["#2c6844", "#86c692"] },
  { id: "peacock", label: "Peacock", swatch: ["#196571", "#75c9cc"] },
];

export const APPEARANCE_DEFAULTS = {
  paper: PAPER_THEMES[0].id,
  board: BOARD_THEMES[0].id,
  accent: ACCENTS[0].id,
} as const;

export type AppearanceKey = keyof typeof APPEARANCE_DEFAULTS;

export const APPEARANCE_STORAGE_PREFIX = "devhub-appearance-";

/**
 * Runs in <head> before first paint so the saved surface and accent are on
 * <html> before anything is drawn (next-themes does the same for the mode).
 */
export const appearanceInitScript = `(function(){try{var d=document.documentElement;${Object.keys(
  APPEARANCE_DEFAULTS,
)
  .map(
    (k) =>
      `var ${k}=localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_PREFIX + k)});if(${k})d.setAttribute("data-${k}",${k});`,
  )
  .join("")}}catch(e){}})();`;
