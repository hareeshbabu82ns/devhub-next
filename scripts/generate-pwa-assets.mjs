#!/usr/bin/env node
/**
 * Generates every installable-app image from one emblem so all devices match:
 *   public/favicon.svg, favicon.ico
 *   public/pwa-{64,192,512}.png, maskable-icon-{192,512}.png, apple-touch-icon-180x180.png
 *   public/splash/apple-splash-<w>x<h>-<light|dark>.png  (one per device in src/config/pwa.json)
 *
 * Usage: pnpm pwa:assets
 * Colours and the device list live in src/config/pwa.json, which the app
 * (manifest, theme-color, startup-image links) reads too.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = (...p) => path.join(root, "public", ...p);
const { colors, appleDevices } = JSON.parse(
  await readFile(path.join(root, "src/config/pwa.json"), "utf8"),
);

// The temple glyph is the existing logo; its path sits in a 24x24 box at (24,24).
const logoSvg = await readFile(pub("logo.svg"), "utf8");
const templePath = logoSvg.match(/\sd="([^"]+)"/s)[1].replace(/\s+/g, " ");

/** Ring of `n` lotus petals around (0,0), tips at radius r1, bases at r0. */
function petals(n, r0, r1, width) {
  const petal = `M0 ${-r0}C${width} ${-(r0 + (r1 - r0) * 0.45)} ${width * 0.5} ${-(r0 + (r1 - r0) * 0.8)} 0 ${-r1}C${-width * 0.5} ${-(r0 + (r1 - r0) * 0.8)} ${-width} ${-(r0 + (r1 - r0) * 0.45)} 0 ${-r0}Z`;
  return Array.from(
    { length: n },
    (_, i) => `<path d="${petal}" transform="rotate(${(360 / n) * i})"/>`,
  ).join("");
}

/**
 * The emblem, drawn in a 512 box.
 * shape: "rounded" (transparent corners), "square" (full bleed, for maskable / iOS).
 * glyphScale: fraction of the box the temple occupies (smaller for maskable safe zone).
 */
function emblem({ shape = "rounded", glyphScale = 0.56 } = {}) {
  const rx = shape === "rounded" ? 112 : 0;
  const g = 512 * glyphScale;
  const s = g / 24;
  const off = (512 - g) / 2;
  const ring = glyphScale * 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${colors.saffron}"/>
      <stop offset="0.5" stop-color="${colors.kesari}"/>
      <stop offset="1" stop-color="${colors.kumkum}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.46" r="0.5">
      <stop offset="0" stop-color="${colors.gold}" stop-opacity="0.75"/>
      <stop offset="0.55" stop-color="${colors.gold}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${colors.gold}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#sky)"/>
  <circle cx="256" cy="246" r="${ring * 0.78}" fill="url(#glow)"/>
  <g transform="translate(256 256)" fill="none" stroke="${colors.gold}" stroke-opacity="0.45" stroke-width="3">
    ${petals(16, ring * 0.62, ring * 0.8, ring * 0.085)}
    <circle r="${ring * 0.6}"/>
  </g>
  <g transform="translate(${off} ${off}) scale(${s}) translate(-24 -24)" fill="${colors.cream}">
    <path d="${templePath}"/>
  </g>
</svg>`;
}

/** Launch screen: flat themed background, faint mandala, emblem in the middle. */
function splash(w, h, theme) {
  const bg = theme === "dark" ? colors.darkBackground : colors.lightBackground;
  const line = theme === "dark" ? colors.gold : colors.kesari;
  const size = Math.round(Math.min(w, h) * 0.26);
  const r = size * 0.5;
  const inner = emblem({ shape: "rounded" }).replace(
    "<svg ",
    `<svg x="${(w - size) / 2}" y="${(h - size) / 2}" width="${size}" height="${size}" `,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <g transform="translate(${w / 2} ${h / 2})" fill="none" stroke="${line}" stroke-opacity="${theme === "dark" ? 0.22 : 0.2}" stroke-width="${Math.max(2, size / 110)}">
    ${petals(24, r * 1.35, r * 1.75, r * 0.13)}
    <circle r="${r * 1.3}"/>
    ${petals(32, r * 1.9, r * 2.2, r * 0.1)}
    <circle r="${r * 1.85}"/>
  </g>
  ${inner}
</svg>`;
}

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

/** Minimal ICO container holding PNG-encoded entries. */
function ico(entries) {
  const header = Buffer.alloc(6 + 16 * entries.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach(({ size, data }, i) => {
    const o = 6 + 16 * i;
    header.writeUInt8(size === 256 ? 0 : size, o);
    header.writeUInt8(size === 256 ? 0 : size, o + 1);
    header.writeUInt16LE(1, o + 4);
    header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(data.length, o + 8);
    header.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...entries.map((e) => e.data)]);
}

const rounded = emblem({ shape: "rounded" });
const square = emblem({ shape: "square" });
// Maskable: Android may crop to a circle of 80% diameter, so shrink the glyph.
const maskable = emblem({ shape: "square", glyphScale: 0.44 });

await writeFile(pub("favicon.svg"), rounded);
for (const size of [64, 192, 512]) {
  await writeFile(pub(`pwa-${size}x${size}.png`), await png(rounded, size));
}
for (const size of [192, 512]) {
  await writeFile(
    pub(`maskable-icon-${size}x${size}.png`),
    await png(maskable, size),
  );
}
// iOS rounds the corners itself and renders transparency as black: full bleed.
await writeFile(pub("apple-touch-icon-180x180.png"), await png(square, 180));
await writeFile(
  pub("favicon.ico"),
  ico(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, data: await png(rounded, size) })),
    ),
  ),
);

await rm(pub("splash"), { recursive: true, force: true });
await mkdir(pub("splash"), { recursive: true });
let count = 0;
for (const { w, h, dpr } of appleDevices) {
  for (const [pw, ph] of [
    [w * dpr, h * dpr],
    [h * dpr, w * dpr],
  ]) {
    for (const theme of ["light", "dark"]) {
      const file = pub("splash", `apple-splash-${pw}x${ph}-${theme}.png`);
      await sharp(Buffer.from(splash(pw, ph, theme)))
        .png({ compressionLevel: 9, palette: true, colours: 128 })
        .toFile(file);
      count++;
    }
  }
}
console.log(`Icons written; ${count} splash screens in public/splash`);
