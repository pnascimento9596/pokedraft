import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(import.meta.dirname, "../..");
const pokedexPath = path.join(root, "src/data/pokedex.json");
const scoutingPath = path.join(root, "src/data/scouting.json");
const indexPath = path.join(root, "src/data/species-index.json");
const chunksDir = path.join(root, "src/data/species-chunks");

interface RawPokedexEntry {
  readonly id: number;
  readonly name: string;
  readonly gen: number;
  readonly region: string;
  readonly types: readonly [string] | readonly [string, string];
  readonly legendary: boolean;
  readonly mythical: boolean;
  readonly evoChainId: number;
}

interface RawScoutingEntry {
  readonly id: number;
  readonly name: string;
  readonly gen: number;
  readonly attrs: Record<string, number>;
  readonly fits: Record<string, number>;
  readonly bestRoles: readonly string[];
  readonly worstRoles: readonly string[];
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
}

export function buildSpeciesSplit() {
  const pokedex: readonly RawPokedexEntry[] = JSON.parse(readFileSync(pokedexPath, "utf8"));
  const scouting: readonly RawScoutingEntry[] = JSON.parse(readFileSync(scoutingPath, "utf8"));

  if (pokedex.length !== 1025 || scouting.length !== 1025) {
    throw new Error(`expected 1025 records, got ${pokedex.length} and ${scouting.length}`);
  }

  const dexMap = new Map<number, RawPokedexEntry>(pokedex.map((p) => [p.id, p]));

  // 1. Build slim index
  const index = pokedex.map((p) => {
    const sc = scouting.find((s) => s.id === p.id);
    if (!sc) throw new Error(`scouting record missing for species ${p.id}`);
    if (sc.name !== p.name || sc.gen !== p.gen) {
      throw new Error(`scouting and pokedex disagree on species ${p.id}`);
    }
    return {
      id: p.id,
      name: p.name,
      types: p.types,
      gen: p.gen,
      special: p.legendary || p.mythical,
    };
  });

  writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");

  // 2. Build 9 generation chunks
  mkdirSync(chunksDir, { recursive: true });
  for (let g = 1; g <= 9; g++) {
    const genScouting = scouting.filter((s) => s.gen === g);
    const chunk = genScouting.map((s) => {
      const p = dexMap.get(s.id)!;
      return {
        id: s.id,
        evoChainId: p.evoChainId,
        attrs: s.attrs,
        fits: s.fits,
        bestRoles: s.bestRoles,
        worstRoles: s.worstRoles,
        strengths: s.strengths,
        weaknesses: s.weaknesses,
      };
    });
    const chunkPath = path.join(chunksDir, `gen-${g}.json`);
    writeFileSync(chunkPath, JSON.stringify(chunk, null, 2) + "\n", "utf8");
  }

  return { indexCount: index.length, chunksCount: 9 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildSpeciesSplit();
  console.log(
    `Generated species index (${result.indexCount} records) and ${result.chunksCount} generation chunks`,
  );
}
