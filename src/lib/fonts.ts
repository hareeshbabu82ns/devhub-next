import {
  JetBrains_Mono as FontMono,
  Mandali as FontSansTelugu,
  Inter as FontSans,
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
