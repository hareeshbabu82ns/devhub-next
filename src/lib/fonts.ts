import {
  JetBrains_Mono as FontMono,
  Mandali as FontSansTelugu,
  Inter as FontSans,
  Eczar as FontDisplay,
  // Roboto_Condensed as FontSans,
} from "next/font/google";

export const fontSansTelugu = FontSansTelugu({
  subsets: ["latin", "telugu"],
  variable: "--font-telugu",
  weight: ["400"],
});

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Display serif for page and section titles. Designed for Latin + Devanagari,
// so IAST diacritics and Sanskrit headings render in the same face.
export const fontDisplay = FontDisplay({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});
