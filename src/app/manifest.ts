import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import pwa from "@/config/pwa.json";

// Served at /manifest.webmanifest. Icons come from `pnpm pwa:assets`.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: "en",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    // No orientation lock: phones stay usable in portrait, iPads in landscape.
    orientation: "any",
    background_color: pwa.colors.lightBackground,
    theme_color: pwa.colors.lightBackground,
    categories: ["books", "education", "lifestyle"],
    icons: [
      { src: "/pwa-64x64.png", sizes: "64x64", type: "image/png" },
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/maskable-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard" },
      { name: "Dictionary", url: "/dictionary" },
      { name: "Ask AI", url: "/ask" },
    ],
  };
}
