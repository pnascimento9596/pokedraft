import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SOURCE = "public/icons/icon.svg";

// The "any" icons get rounded corners for desktop installs and tabs. The maskable icon and the
// apple icon stay full bleed, because Android and iOS cut their own shape out of them.
const ICONS = [
  { out: "public/icons/icon-192.png", size: 192, rounded: true },
  { out: "public/icons/icon-512.png", size: 512, rounded: true },
  { out: "public/icons/icon-maskable-512.png", size: 512, rounded: false },
  { out: "src/app/apple-icon.png", size: 180, rounded: false },
];

function cornerMask(size) {
  const r = Math.round(size * 0.1875);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`,
  );
}

async function render(svg, { size, rounded }) {
  let image = sharp(svg, { density: Math.ceil((72 * size) / 512) * 4 }).resize(size, size);
  if (rounded) {
    const flat = await image.png().toBuffer();
    image = sharp(flat).composite([{ input: cornerMask(size), blend: "dest-in" }]);
  }
  return image.png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}

const svg = readFileSync(path.join(ROOT, SOURCE));
for (const icon of ICONS) {
  const png = await render(svg, icon);
  writeFileSync(path.join(ROOT, icon.out), png);
  console.log(`${icon.out} ${icon.size}x${icon.size} ${png.length} bytes`);
}
