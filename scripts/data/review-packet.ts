// Writes the Layer 2 reviewer packet for one generation:
// scripts/data/.cache/review-packets/gen-<n>.json. Usage: pnpm tsx scripts/data/review-packet.ts <gen>
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { POKEDEX } from "@/data/pokedex";
import { ABILITY_TRAITS } from "@/scouting/ability-traits";
import { computeBaselines } from "@/scouting/attributes";
import { roleBlend } from "@/scouting/fit";
import { ATTRS, ROLES } from "@/scouting/types";

const gen = Number(process.argv[2]);
if (!Number.isInteger(gen) || gen < 1 || gen > 9)
  throw new Error("usage: review-packet.ts <gen 1..9>");

const baselines = computeBaselines(POKEDEX, ABILITY_TRAITS);
const blendsAll = new Map(
  POKEDEX.map((s) => [
    s.id,
    Object.fromEntries(ROLES.map((r) => [r, Math.round(roleBlend(baselines.get(s.id)!.attrs, r))])),
  ]),
);
const species = POKEDEX.filter((s) => s.gen === gen).map((s) => {
  const b = baselines.get(s.id)!;
  const layer1Mods = Object.fromEntries(
    ATTRS.map((a) => {
      const d = b.breakdown[a];
      return [a, Math.round(d.shape + d.heavy + d.baby + d.moves + d.abilities + d.type)];
    }).filter(([, v]) => v !== 0),
  );
  return { ...s, baseline: b.attrs, layer1Mods, roleBlends: blendsAll.get(s.id) };
});
const dir = path.resolve(import.meta.dirname, ".cache/review-packets");
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `gen-${gen}.json`);
writeFileSync(file, JSON.stringify({ gen, count: species.length, species }, null, 1) + "\n");
console.log(`wrote ${species.length} species to ${path.relative(process.cwd(), file)}`);
