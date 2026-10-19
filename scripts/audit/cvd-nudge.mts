// Finds the smallest change to a type palette that puts every pair at least MINIMUM apart in every
// vision the CVD audit checks. It tries each smallest set of colours that touches every failing
// pair, moves only those, and keeps the set whose total change is least.
//   pnpm exec tsx scripts/audit/cvd-nudge.mts type-palette
//   pnpm exec tsx scripts/audit/cvd-nudge.mts dark-tokens
// Search: each moving colour steps through every 8-bit colour within RADIUS per channel, nearest
// first (Oklab distance to its original, normal vision); the colours take turns until none moves.
import { readFileSync } from "node:fs";
import {
  distance,
  kitDistance,
  simulate,
  VISIONS,
  type Rgb,
} from "../../src/design/color-distance";
import { PITCH_KIT, TYPE_PALETTE } from "../../src/design/stadium";
import { hexRgb, palette } from "./theme-contrast.mjs";
import { MINIMUM } from "./theme-cvd.mjs";

const RADIUS = 40;
const hex = (rgb: Rgb) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

function failingPairs(colors: Record<string, string>) {
  const names = Object.keys(colors);
  const pairs: [string, string][] = [];
  for (let a = 0; a < names.length; a++)
    for (let b = a + 1; b < names.length; b++)
      if (kitDistance(colors[names[a]!]!, colors[names[b]!]!) < MINIMUM)
        pairs.push([names[a]!, names[b]!]);
  return pairs;
}

/** Every smallest set of names that holds at least one end of each pair. */
function smallestCovers(pairs: [string, string][]) {
  const names = [...new Set(pairs.flat())].sort();
  for (let size = 1; size <= names.length; size++) {
    const covers: string[][] = [];
    const pick = (start: number, chosen: string[]) => {
      if (chosen.length === size) {
        if (pairs.every(([a, b]) => chosen.includes(a) || chosen.includes(b)))
          covers.push([...chosen]);
        return;
      }
      for (let i = start; i < names.length; i++) pick(i + 1, [...chosen, names[i]!]);
    };
    pick(0, []);
    if (covers.length > 0) return covers;
  }
  return [];
}

interface Candidate {
  readonly hex: string;
  readonly change: number;
  readonly seen: readonly Rgb[];
}

function candidates(original: string): Candidate[] {
  const origin = hexRgb(original);
  const out: Candidate[] = [];
  for (let r = origin[0] - RADIUS; r <= origin[0] + RADIUS; r++)
    for (let g = origin[1] - RADIUS; g <= origin[1] + RADIUS; g++)
      for (let b = origin[2] - RADIUS; b <= origin[2] + RADIUS; b++) {
        if ([r, g, b].some((v) => v < 0 || v > 255)) continue;
        const rgb: Rgb = [r, g, b];
        out.push({
          hex: hex(rgb),
          change: distance(origin, rgb),
          seen: VISIONS.map((vision) => simulate(rgb, vision)),
        });
      }
  return out.sort((x, y) => x.change - y.change || (x.hex < y.hex ? -1 : 1));
}

function search(
  colors: Record<string, string>,
  moving: readonly string[],
  allowed: (name: string, hex: string) => boolean,
) {
  const current = { ...colors };
  const pool = new Map(moving.map((name) => [name, candidates(colors[name]!)]));
  const seenOf = (value: string) => VISIONS.map((vision) => simulate(hexRgb(value), vision));
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (const name of moving) {
      const others = Object.entries(current)
        .filter(([other]) => other !== name)
        .map(([, value]) => seenOf(value));
      const next = pool
        .get(name)!
        .find(
          (c) =>
            allowed(name, c.hex) &&
            others.every((o) => c.seen.every((s, v) => distance(s, o[v]!) >= MINIMUM)),
        );
      if (next === undefined) return null;
      if (next.hex !== current[name]) {
        current[name] = next.hex;
        moved = true;
      }
    }
    if (!moved) break;
  }
  if (failingPairs(current).length > 0) return null;
  const changes = Object.fromEntries(
    moving.map((name) => [name, distance(hexRgb(colors[name]!), hexRgb(current[name]!))]),
  );
  return {
    moving,
    changes,
    total: Object.values(changes).reduce((sum, value) => sum + value, 0),
    current,
  };
}

const target = process.argv[2];
let colors: Record<string, string>;
let allowed: (name: string, hex: string) => boolean = () => true;
if (target === "type-palette") {
  colors = { ...TYPE_PALETTE };
  // The kit fallback ring must stay at least 12 from every type colour (PITCH_KIT's promise).
  allowed = (_, value) => kitDistance(value, PITCH_KIT.clash) >= 12;
} else if (target === "dark-tokens") {
  const css = readFileSync(new URL("../../src/design/tokens.css", import.meta.url), "utf8");
  colors = Object.fromEntries(
    Object.entries(palette(css, "dark")).filter(([role]) => /^--type-[a-z]+$/.test(role)),
  ) as Record<string, string>;
} else throw new Error("usage: cvd-nudge.mts type-palette|dark-tokens");

const failing = failingPairs(colors);
console.log(`failing pairs: ${failing.map(([a, b]) => `${a}/${b}`).join(", ") || "none"}`);
const results = smallestCovers(failing)
  .map((cover) => search(colors, cover, allowed))
  .filter((result) => result !== null)
  .sort((a, b) => a.total - b.total);
for (const result of results)
  console.log(
    `${result.total.toFixed(3)} total: ${result.moving
      .map(
        (name) =>
          `${name} ${colors[name]} -> ${result.current[name]} (${result.changes[name]!.toFixed(3)})`,
      )
      .join(", ")}`,
  );
if (results.length === 0) process.exitCode = 1;
