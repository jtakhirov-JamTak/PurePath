/**
 * Generate PWA icons as minimal SVG-based PNGs.
 * Uses inline SVG converted to data URI, then writes PNG via canvas in a Node script.
 *
 * Since we can't easily use canvas in Node without native deps, we generate
 * SVG files that browsers accept as valid PWA icons.
 *
 * Note: These are placeholder SVG icons. Replace with designed artwork before app store submission.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const ICON_DIR = join(__dirname, "..", "client", "public", "icons");

function generateSvgIcon(size: number): string {
  const padding = Math.round(size * 0.1);
  const leafSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = leafSize / 2;

  // Leaf shape paths scaled to the icon size
  const scale = leafSize / 100;
  const tx = padding;
  const ty = padding;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#50C878"/>
  <g transform="translate(${cx - 12 * scale}, ${cy - 16 * scale}) scale(${scale * 0.24})">
    <path d="M50 10 C20 30, 10 70, 50 95 C90 70, 80 30, 50 10Z" fill="white" opacity="0.95"/>
    <path d="M50 25 L50 85" stroke="#50C878" stroke-width="3" fill="none" opacity="0.4"/>
    <path d="M50 45 L35 35" stroke="#50C878" stroke-width="2" fill="none" opacity="0.3"/>
    <path d="M50 60 L65 48" stroke="#50C878" stroke-width="2" fill="none" opacity="0.3"/>
  </g>
</svg>`;
}

mkdirSync(ICON_DIR, { recursive: true });

for (const size of [192, 512]) {
  const svg = generateSvgIcon(size);
  const path = join(ICON_DIR, `leaf-${size}.svg`);
  writeFileSync(path, svg);
  console.log(`Generated ${path}`);
}

console.log(
  "\nNote: SVG icons generated. For full PWA compliance, convert to PNG or update manifest to use SVG."
);
console.log("Modern browsers (Chrome 107+, Edge 107+) support SVG maskable icons.");
