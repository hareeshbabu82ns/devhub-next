import type { Metadata } from "next";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import { fontSans, fontSansTelugu } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { ThemeProvider } from "@/components/utils/providers";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  // themeColor: [
  //   { media: "(prefers-color-scheme: light)", color: "white" },
  //   { media: "(prefers-color-scheme: dark)", color: "black" },
  // ],
  // icons: {
  //   // icon: "/favicon.ico",
  //   icon: "/pwa-64x64.png",
  //   shortcut: "/pwa-16x16.png",
  //   apple: "/apple-touch-icon-180x180.png",
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          fontSans.variable,
          fontSansTelugu.variable,
          "antialiased font-sans min-h-screen bg-background text-foreground",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main id="skip">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
