// Pure helpers for scripts/images/import-pack.mjs. No filesystem or image access here, so the
// mapping rules and the pack-list rules can be unit tested directly.

const IMAGE_FILE = /^(.+)\.(png|webp|jpe?g)$/i;
const NUMERIC_BASE = /^\d+$/;

/** Four-digit file stem for a Dex id: 25 -> "0025". */
export function dexStem(id) {
  return String(id).padStart(4, "0");
}

/** Parses a `filename,dexId` CSV (header optional, blank lines and `#` comments skipped). */
export function parseMapCsv(text) {
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const comma = line.lastIndexOf(",");
    if (comma < 0) throw new Error(`map CSV line has no comma: "${line}"`);
    const file = line.slice(0, comma).trim().replace(/^"|"$/g, "");
    const idText = line.slice(comma + 1).trim();
    if (file.toLowerCase() === "file" || file.toLowerCase() === "filename") continue;
    if (!NUMERIC_BASE.test(idText)) throw new Error(`map CSV id is not a number: "${line}"`);
    if (map.has(file)) throw new Error(`map CSV lists "${file}" twice`);
    map.set(file, Number(idText));
  }
  return map;
}

/**
 * Maps source file names to Dex ids. Nothing is guessed:
 *  - a CSV row wins, and its id must exist in the Dex;
 *  - a numeric name maps directly when the id exists in the Dex;
 *  - any other name must equal an English species name exactly (case-insensitive, nothing else
 *    stripped), so "1012-artisan" or "pikachu-cosplay" stay unmatched.
 * Two files that map to the same id are both rejected.
 *
 * @param {readonly string[]} files base names, e.g. "25.png"
 * @param {readonly {id:number,name:string}[]} dex
 * @param {ReadonlyMap<string,number>} [csv]
 */
export function mapFiles(files, dex, csv = new Map()) {
  const ids = new Set(dex.map((s) => s.id));
  const byName = new Map();
  for (const s of dex) byName.set(s.name.toLowerCase(), s.id);

  const claimed = new Map();
  const unmatched = [];
  const sorted = [...files].sort();
  for (const file of sorted) {
    const m = IMAGE_FILE.exec(file);
    if (m === null) {
      unmatched.push({ file, reason: "not an image file" });
      continue;
    }
    const base = m[1];
    let id;
    let via;
    if (csv.has(file)) {
      id = csv.get(file);
      via = "csv";
    } else if (NUMERIC_BASE.test(base)) {
      id = Number(base);
      via = "number";
    } else if (byName.has(base.toLowerCase())) {
      id = byName.get(base.toLowerCase());
      via = "name";
    } else {
      unmatched.push({ file, reason: "name is not an exact English species name" });
      continue;
    }
    if (!ids.has(id)) {
      unmatched.push({ file, reason: `id ${id} is not in the Dex` });
      continue;
    }
    const list = claimed.get(id) ?? [];
    list.push({ file, via });
    claimed.set(id, list);
  }

  const mapped = new Map();
  const rejected = [];
  for (const [id, list] of [...claimed].sort((a, b) => a[0] - b[0])) {
    if (list.length === 1) {
      mapped.set(id, list[0]);
    } else {
      for (const { file } of list) {
        rejected.push({
          file,
          reason: `duplicate: ${list.map((x) => x.file).join(", ")} all map to ${id}`,
        });
      }
    }
  }
  return { mapped, unmatched, rejected };
}

/** Collapses sorted ids into [[from, to], ...] inclusive ranges. */
export function toRanges(ids) {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  const ranges = [];
  for (const id of sorted) {
    const last = ranges[ranges.length - 1];
    if (last !== undefined && last[1] === id - 1) last[1] = id;
    else ranges.push([id, id]);
  }
  return ranges;
}

/** Pixel packs list first; the first pack is the default. */
export function sortPacks(packs) {
  const rank = (p) => (p.style === "pixel" ? 0 : 1);
  return [...packs].sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The generated src/data/image-packs.json document. */
export function buildPackList(entries) {
  const sorted = sortPacks(entries.map((e) => e.pack));
  const byId = new Map(entries.map((e) => [e.pack.id, e]));
  return {
    default: sorted[0]?.id ?? null,
    packs: sorted.map((pack) => ({ ...pack, covered: toRanges(byId.get(pack.id).ids) })),
  };
}

/** Bounding box of pixels with alpha > 0, or null for a fully transparent image. */
export function opaqueBounds(rgba, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Pixel canvas plan. `side` is the largest trimmed edge in the pack. The integer scale is the
 * biggest whole number that keeps the canvas at or under `target`, never below 1.
 */
export function pixelPlan(side, target = 96) {
  const scale = Math.max(1, Math.floor(target / Math.max(1, side)));
  const canvas = side * scale;
  return { scale, canvas: canvas + (canvas % 2) };
}

/** Art canvas plan: one shared scale so relative creature sizes survive. */
export function artPlan(side, max = 256) {
  const scale = Math.min(1, max / Math.max(1, side));
  return { scale, canvas: Math.min(max, Math.ceil(side * scale)) };
}

/** Where a trimmed w x h image lands on a square canvas: centered, standing on the bottom. */
export function bottomAlign(canvas, w, h) {
  return { left: Math.floor((canvas - w) / 2), top: canvas - h };
}
