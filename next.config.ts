import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import packageJson from "./package.json";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  // Dynamic fs paths (process.cwd()) make the tracer pull in the whole repo,
  // including the multi-GB data/ folder and .env. Keep them out of standalone.
  outputFileTracingExcludes: {
    "*": [
      "./data/**",
      "./docs/**",
      "./specs/**",
      "./scripts/**",
      "./.specify/**",
      "./.github/**",
      "./.vscode/**",
      "./.env*",
      "./*.md",
      "./*.tsbuildinfo",
      "./Dockerfile",
      "./docker-entrypoint.sh",
      "./pnpm-lock.yaml",
      "./test-transliteration.js",
      "./jest.*",
      "./src/**/*.{ts,tsx,css}",
      // Prisma client + engine is copied into the image explicitly (Dockerfile)
      "./src/app/generated/**",
      // Image is Alpine (musl): drop sharp's glibc binaries
      "./node_modules/.pnpm/@img+sharp-libvips-linux-*/**",
      "./node_modules/.pnpm/@img+sharp-linux-*/**",
    ],
  },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // swcMinify: true,
  images: {
    localPatterns: [
      {
        pathname: "**/assets/**",
      },
      {
        pathname: "/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "terabits.io",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*",
        port: "",
        pathname: "/**",
      },
    ],
    // Custom loader for API-served images
    loader: undefined,
    // Allow all image sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default withBundleAnalyzer(nextConfig);
