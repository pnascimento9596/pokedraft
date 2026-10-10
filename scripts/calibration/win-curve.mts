import { readFileSync } from "node:fs";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "@/engine/coefficients";
import { simulateMatch, type MatchStarter } from "@/engine/match";
import { FORMATIONS } from "@/engine/formations";
import { speciesById } from "@/engine/species";
import type { LineStrength, Opponent, Seed } from "@/engine/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function merge<T>(base: T, over: unknown): T {
  if (over === null || typeof over !== "object" || Array.isArray(over)) return over as T;
  const out = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (!(k in out)) throw new Error(`unknown coefficient key ${k}`);
    out[k] = merge(out[k], v);
  }
  return out as T;
}

const c: EngineCoefficients = arg("coeffs")
  ? merge(ENGINE_COEFFICIENTS, JSON.parse(readFileSync(arg("coeffs")!, "utf8")))
  : ENGINE_COEFFICIENTS;
const n = Number(arg("n") ?? 4000);
const base = Number(arg("score") ?? 800);

const formation = FORMATIONS["4-3-3"];
const ids = [9, 59, 149, 130, 3, 80, 6, 55, 26, 85, 135];
const starters: MatchStarter[] = ids.map((id, i) => ({
  species: speciesById(id),
  line: formation.slots[i]!.line,
}));
const flat = (score: number): LineStrength => ({
  GK: score / 10,
  DEF: score / 10,
  MID: score / 10,
  ATT: score / 10,
});

console.log(`| gap | group W | group D | KO W |`);
console.log(`|---|---|---|---|`);
const step = Number(arg("step") ?? 50);
for (let gap = Number(arg("from") ?? -300); gap <= Number(arg("to") ?? 500); gap += step) {
  const opponent: Opponent = { id: "probe", name: "Probe FC", score: base - gap, lines: flat(base - gap) };
  let gw = 0;
  let gd = 0;
  let kw = 0;
  for (let i = 0; i < n; i++) {
    for (const phase of ["group", "knockout"] as const) {
      const m = simulateMatch(
        {
          matchIndex: 0,
          round: phase === "group" ? "G1" : "QF",
          phase,
          seed: `curve:${gap}:${i}` as Seed,
          rating: base,
          userLines: flat(base),
          starters,
          keeper: starters[0]!.species,
          opponent,
          absences: [],
        },
        c,
      );
      if (phase === "group") {
        if (m.outcome === "W") gw++;
        if (m.outcome === "D") gd++;
      } else if (m.outcome === "W") kw++;
    }
  }
  console.log(`| ${gap} | ${(gw / n).toFixed(3)} | ${(gd / n).toFixed(3)} | ${(kw / n).toFixed(3)} |`);
}
