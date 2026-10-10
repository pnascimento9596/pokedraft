// Draws the spot-audit sample for a scouting change: the N species whose role fits moved most
// between a base revision's scouting.json and the working tree's. Movement is the largest
// single-role |fit change|, then the summed |change|, then id. Writes the packet to
// scripts/data/.cache/audit-moved-packet.json. Deterministic for a given base and tree.
//
// Usage: pnpm tsx scripts/data/audit-moved.ts <base-rev> [n=60]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { POKEDEX } from "@/data/pokedex";
import { SCOUTING } from "@/scouting/scouting-data";
import { ROLES } from "@/scouting/types";

const base = process.argv[2];
if (base === undefined) throw new Error("pass the base revision, for example origin/main");
const n = Number(process.argv[3] ?? 60);
const old = JSON.parse(
  execFileSync("git", ["show", `${base}:src/data/scouting.json`], { encoding: "utf8" }),
) as typeof SCOUTING;

const moved = SCOUTING.map((s) => {
  const before = old[s.id - 1]!;
  const delta = Object.fromEntries(ROLES.map((r) => [r, s.fits[r] - before.fits[r]]));
  const abs = ROLES.map((r) => Math.abs(delta[r]!));
  return { id: s.id, max: Math.max(...abs), sum: abs.reduce((a, b) => a + b, 0), delta, before };
}).sort((a, b) => b.max - a.max || b.sum - a.sum || a.id - b.id);

const sample = moved.slice(0, n).map((m) => ({
  maxMove: m.max,
  sumMove: m.sum,
  fitDelta: m.delta,
  before: { attrs: m.before.attrs, fits: m.before.fits },
  species: POKEDEX[m.id - 1],
  scouting: SCOUTING[m.id - 1],
}));
const dir = path.resolve(import.meta.dirname, ".cache");
mkdirSync(dir, { recursive: true });
writeFileSync(
  path.join(dir, "audit-moved-packet.json"),
  JSON.stringify({ base, n, sample }, null, 1) + "\n",
);
const changed = moved.filter((m) => m.max > 0).length;
console.log(
  `base ${base}: ${changed} species changed a fit; top ${n} moved ${sample[0]!.maxMove} to ${sample.at(-1)!.maxMove}`,
);
