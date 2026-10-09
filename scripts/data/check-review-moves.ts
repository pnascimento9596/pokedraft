// Checks that every move a Layer 2 rationale names is in that species' learnset at the pinned
// PokéAPI commit. Reads the CSV cache that `pnpm data:pokedex` fills; exits 1 on any finding.
// Usage: pnpm data:check-moves
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { POKEDEX, TYPES } from "@/data/pokedex";
import { REVIEWS as SHIPPED } from "@/scouting/reviews";

// MOVES_CHECK_EXTRA injects extra JSON review entries, used only as a negative control.
const REVIEWS = [
  ...SHIPPED,
  ...(JSON.parse(process.env.MOVES_CHECK_EXTRA ?? "[]") as typeof SHIPPED),
];

async function main() {
  const { parseCsv } = (await import("./build-pokedex.mjs")) as {
    parseCsv: (text: string) => Record<string, string>[];
  };
  const sources = JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, "../../src/data/pokedex.sources.json"), "utf8"),
  ) as { pokeapiCommit: string };
  const cache = path.resolve(import.meta.dirname, ".cache", sources.pokeapiCommit);
  const read = (name: string): Record<string, string>[] => {
    const file = path.join(cache, `${name}.csv`);
    if (!existsSync(file)) throw new Error(`missing ${file}; run pnpm data:pokedex first`);
    return parseCsv(readFileSync(file, "utf8"));
  };

  const ENGLISH = "9";
  const ident = new Map(read("moves").map((m) => [m.id!, m.identifier!]));
  const names = new Map<string, string>();
  for (const r of read("move_names")) {
    if (r.local_language_id === ENGLISH) names.set(r.name!, ident.get(r.move_id!)!);
  }
  const defaultPokemon = new Map(
    read("pokemon")
      .filter((p) => p.is_default === "1")
      .map((p) => [p.id!, Number(p.species_id)]),
  );
  const learnset = new Map<number, Set<string>>();
  for (const m of read("pokemon_moves")) {
    const species = defaultPokemon.get(m.pokemon_id!);
    if (species === undefined) continue;
    if (!learnset.has(species)) learnset.set(species, new Set());
    learnset.get(species)!.add(ident.get(m.move_id!)!);
  }

  // Move names that are also everyday words, types, abilities, or species names are skipped when
  // they appear without the word "move"; they are not reliable as citations.
  const typeWords = new Set(TYPES.map((t) => t[0]!.toUpperCase() + t.slice(1)));
  const speciesWords = new Set(POKEDEX.map((s) => s.name));
  const abilityWords = new Set(POKEDEX.flatMap((s) => s.abilities.map((a) => a.name)));
  const ambiguous = (n: string) =>
    typeWords.has(n) || speciesWords.has(n) || abilityWords.has(n) || !n.includes(" ");

  const findings: string[] = [];
  let citations = 0;
  for (const r of REVIEWS) {
    const knows = learnset.get(r.id) ?? new Set<string>();
    const cited = new Set<string>();
    for (const [name, id] of names) {
      const re = new RegExp(
        `(?<![\\w'’-])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w'’-])`,
      );
      const m = re.exec(r.rationale);
      if (!m) continue;
      const explicit = new RegExp(`${name}\\s+(?:move|attack)|(?:move|signature)\\s+${name}`).test(
        r.rationale,
      );
      if (ambiguous(name) && !explicit) continue;
      cited.add(id);
    }
    for (const m of r.rationale.matchAll(/\b[a-z]+(?:-[a-z]+)+\b/g)) {
      if ([...names.values()].includes(m[0])) cited.add(m[0]);
    }
    citations += cited.size;
    for (const id of cited) {
      if (!knows.has(id)) findings.push(`${r.id} ${r.name}: cites ${id}, not in its learnset`);
    }
  }

  for (const f of findings) console.log(f);
  console.log(
    `${REVIEWS.length} rationales, ${citations} move citations, ${findings.length} not learnable`,
  );
  if (findings.length > 0) process.exit(1);
}

void main();
