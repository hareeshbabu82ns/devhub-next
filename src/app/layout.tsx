import type { Metadata, Viewport } from "next";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import { fontDisplay, fontSans, fontSansTelugu } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { ThemeProvider } from "@/components/utils/providers";
import { ThemeColorSync } from "@/components/utils/theme-color-sync";
import pwa from "@/config/pwa.json";
import { appearanceInitScript } from "@/config/themes";

// One launch image per iOS device, orientation and colour scheme; iOS picks by
// exact media match and shows a blank screen when nothing matches.
const appleStartupImages = pwa.appleDevices.flatMap(({ w, h, dpr }) =>
  (["portrait", "landscape"] as const).flatMap((orientation) =>
    (["light", "dark"] as const).map((scheme) => {
      const [pw, ph] =
        orientation === "portrait" ? [w * dpr, h * dpr] : [h * dpr, w * dpr];
      return {
        url: `/splash/apple-splash-${pw}x${ph}-${scheme}.png`,
        media: `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orientation}) and (prefers-color-scheme: ${scheme})`,
      };
    }),
  ),
);

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: pwa.colors.lightBackground },
    { media: "(prefers-color-scheme: dark)", color: pwa.colors.darkBackground },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
    startupImage: appleStartupImages,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon-180x180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceInitScript }} />
      </head>
      <body
        className={cn(
          fontSans.variable,
          fontSansTelugu.variable,
          fontDisplay.variable,
          "antialiased font-sans min-h-dvh bg-background text-foreground",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeColorSync />
          <main id="skip">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
