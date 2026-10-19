// Compares every PNG in two directories pixel by pixel and prints one JSON row per file: changed
// pixels, their share, the largest channel difference and the bounding box of the change.
//   pnpm exec tsx scripts/audit/pixel-diff.mts BEFORE_DIR AFTER_DIR [MASK_DIR]
// With MASK_DIR it also writes, for each changed file, the before shot dimmed with every changed
// pixel in magenta.
// Exits 1 when any file differs in size or pixels, or is missing on one side.
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [before, after, masks] = process.argv.slice(2);
if (!before || !after) throw new Error("usage: pixel-diff.mts BEFORE_DIR AFTER_DIR");

const pngs = (dir: string) => readdirSync(dir).filter((f) => f.endsWith(".png"));
const names = [...new Set([...pngs(before), ...pngs(after)])].sort();
let failed = false;
for (const name of names) {
  const load = (dir: string) =>
    sharp(path.join(dir, name))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .catch(() => null);
  const [a, b] = await Promise.all([load(before), load(after)]);
  if (a === null || b === null) {
    console.log(JSON.stringify({ name, missing: a === null ? "before" : "after" }));
    failed = true;
    continue;
  }
  const { width, height } = a.info;
  if (width !== b.info.width || height !== b.info.height) {
    console.log(JSON.stringify({ name, size: [width, height, b.info.width, b.info.height] }));
    failed = true;
    continue;
  }
  let changed = 0;
  let maxDelta = 0;
  const mask = Buffer.alloc(width * height * 4, 255);
  const box = [width, height, -1, -1];
  for (let i = 0; i < width * height; i++) {
    let delta = 0;
    for (let c = 0; c < 4; c++)
      delta = Math.max(delta, Math.abs(a.data[i * 4 + c]! - b.data[i * 4 + c]!));
    if (delta === 0) {
      const grey = Math.round((a.data[i * 4]! + a.data[i * 4 + 1]! + a.data[i * 4 + 2]!) / 9);
      mask.fill(grey, i * 4, i * 4 + 3);
      continue;
    }
    mask[i * 4 + 1] = 0;
    changed++;
    maxDelta = Math.max(maxDelta, delta);
    const x = i % width;
    const y = Math.floor(i / width);
    box[0] = Math.min(box[0]!, x);
    box[1] = Math.min(box[1]!, y);
    box[2] = Math.max(box[2]!, x);
    box[3] = Math.max(box[3]!, y);
  }
  if (changed > 0) {
    failed = true;
    if (masks) {
      mkdirSync(masks, { recursive: true });
      await sharp(mask, { raw: { width, height, channels: 4 } })
        .png()
        .toFile(path.join(masks, name));
    }
  }
  console.log(
    JSON.stringify({
      name,
      size: [width, height],
      changed,
      share: Number((changed / (width * height)).toFixed(6)),
      maxDelta,
      ...(changed > 0 ? { box } : {}),
    }),
  );
}
if (failed) process.exitCode = 1;
