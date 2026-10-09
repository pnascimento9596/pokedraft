// Draws the scouting spot-audit sample: the 20 highest and 20 lowest species by overall fit
// (max over roles), plus 60 seeded-random species from the rest. Writes the audit packet to
// scripts/data/.cache/audit-packet.json. Deterministic for a given seed.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { POKEDEX } from "@/data/pokedex";
import { createRng } from "@/lib/rng";
import { SCOUTING } from "@/scouting/scouting-data";
import { ROLES } from "@/scouting/types";

const SEED = process.argv[2] ?? "pokedraft-audit-v1";
const overall = (id: number) => Math.max(...ROLES.map((r) => SCOUTING[id - 1]!.fits[r]));
const ranked = [...SCOUTING].sort((a, b) => overall(b.id) - overall(a.id) || a.id - b.id);
const highest = ranked.slice(0, 20).map((s) => s.id);
const lowest = ranked.slice(-20).map((s) => s.id);
const taken = new Set([...highest, ...lowest]);
const pool = SCOUTING.map((s) => s.id).filter((id) => !taken.has(id));
const rng = createRng(SEED);
const random: number[] = [];
while (random.length < 60) {
  const i = rng.int(pool.length);
  random.push(pool[i]!);
  pool.splice(i, 1);
}
random.sort((a, b) => a - b);

const entry = (id: number, bucket: string) => ({
  bucket,
  overall: overall(id),
  species: POKEDEX[id - 1],
  scouting: SCOUTING[id - 1],
});
const packet = {
  seed: SEED,
  sample: [
    ...highest.map((id) => entry(id, "highest-20")),
    ...lowest.map((id) => entry(id, "lowest-20")),
    ...random.map((id) => entry(id, "random-60")),
  ],
};
const dir = path.resolve(import.meta.dirname, ".cache");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "audit-packet.json"), JSON.stringify(packet, null, 1) + "\n");
console.log(`seed ${SEED}: ${packet.sample.length} species (20 highest, 20 lowest, 60 random)`);
