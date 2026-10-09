#!/usr/bin/env node
// Builds src/data/pokedex.json from PokéAPI CSVs pinned to one upstream commit.
// Re-running on the cached CSVs produces byte-identical output.
// Usage: node scripts/data/build-pokedex.mjs [--refresh]

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const POKEAPI_COMMIT = "c80757193bd0889054e36f4209762360bdaa4b95";
const BASE_URL = `https://raw.githubusercontent.com/PokeAPI/pokeapi/${POKEAPI_COMMIT}/data/v2/csv`;
const MAX_SPECIES = 1025;
const ENGLISH = "9";

const CSV_FILES = [
  "pokemon",
  "pokemon_species",
  "pokemon_species_names",
  "pokemon_stats",
  "pokemon_types",
  "pokemon_shapes",
  "pokemon_abilities",
  "ability_names",
  "pokemon_moves",
  "move_names",
  "pokemon_evolution",
  "stats",
  "types",
  "abilities",
  "moves",
  "generations",
  "regions",
];

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const cacheDir = path.join(here, ".cache", POKEAPI_COMMIT);
const outPath = path.join(root, "src/data/pokedex.json");
const sourcesPath = path.join(root, "src/data/pokedex.sources.json");
const moveTraitsPath = path.join(here, "move-traits.json");

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body
    .filter((r) => r.length > 1 || r[0] !== "")
    .map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""])));
}

async function loadCsv(name, refresh) {
  const file = path.join(cacheDir, `${name}.csv`);
  if (refresh || !existsSync(file)) {
    const res = await fetch(`${BASE_URL}/${name}.csv`);
    if (!res.ok) throw new Error(`fetch ${name}.csv failed with HTTP ${res.status}`);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const bytes = readFileSync(file);
  return {
    rows: parseCsv(bytes.toString("utf8")),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function indexBy(rows, key) {
  return new Map(rows.map((r) => [r[key], r]));
}

function groupBy(rows, key) {
  const out = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(r);
  }
  return out;
}

function required(value, what) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`missing ${what}`);
  }
  return value;
}

export function buildPokedex(csv, moveTraits) {
  const statIds = new Map(csv.stats.map((s) => [s.id, s.identifier]));
  const typeIds = new Map(csv.types.map((t) => [t.id, t.identifier]));
  const shapeIds = new Map(csv.pokemon_shapes.map((s) => [s.id, s.identifier]));
  const abilityIdent = new Map(csv.abilities.map((a) => [a.id, a.identifier]));
  const moveIdent = new Map(csv.moves.map((m) => [m.id, m.identifier]));
  const regionIdent = new Map(csv.regions.map((r) => [r.id, r.identifier]));
  const genRegion = new Map(csv.generations.map((g) => [g.id, regionIdent.get(g.main_region_id)]));

  const speciesNames = new Map();
  for (const r of csv.pokemon_species_names) {
    if (r.local_language_id === ENGLISH) speciesNames.set(r.pokemon_species_id, r);
  }
  const abilityNames = new Map();
  for (const r of csv.ability_names) {
    if (r.local_language_id === ENGLISH) abilityNames.set(r.ability_id, r.name);
  }

  const species = indexBy(csv.pokemon_species, "id");
  const defaultPokemon = new Map();
  for (const p of csv.pokemon) {
    if (p.is_default === "1" && Number(p.species_id) <= MAX_SPECIES) {
      defaultPokemon.set(p.species_id, p);
    }
  }
  const statsBy = groupBy(csv.pokemon_stats, "pokemon_id");
  const typesBy = groupBy(csv.pokemon_types, "pokemon_id");
  const abilitiesBy = groupBy(csv.pokemon_abilities, "pokemon_id");

  const traitMoveIds = new Set();
  for (const [id, ident] of moveIdent) if (ident in moveTraits) traitMoveIds.add(id);
  const traitMovesBy = new Map();
  for (const m of csv.pokemon_moves) {
    if (!traitMoveIds.has(m.move_id)) continue;
    if (!traitMovesBy.has(m.pokemon_id)) traitMovesBy.set(m.pokemon_id, new Set());
    traitMovesBy.get(m.pokemon_id).add(moveIdent.get(m.move_id));
  }

  function evoStage(s) {
    let stage = 1;
    let cur = s;
    while (cur.evolves_from_species_id !== "") {
      stage++;
      cur = required(species.get(cur.evolves_from_species_id), `parent of ${s.identifier}`);
    }
    return stage;
  }

  const out = [];
  for (let id = 1; id <= MAX_SPECIES; id++) {
    const sid = String(id);
    const s = required(species.get(sid), `species ${sid}`);
    const p = required(defaultPokemon.get(sid), `default pokemon for species ${sid}`);
    const names = required(speciesNames.get(sid), `English name for species ${sid}`);

    const stats = {};
    for (const st of statsBy.get(p.id) ?? []) stats[statIds.get(st.stat_id)] = Number(st.base_stat);
    const statOf = (k) => required(stats[k], `${k} for ${s.identifier}`);

    const types = (typesBy.get(p.id) ?? [])
      .slice()
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((t) => required(typeIds.get(t.type_id), `type ${t.type_id}`));

    const abilities = (abilitiesBy.get(p.id) ?? [])
      .slice()
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((a) => ({
        id: required(abilityIdent.get(a.ability_id), `ability ${a.ability_id}`),
        name: required(abilityNames.get(a.ability_id), `ability name ${a.ability_id}`),
        hidden: a.is_hidden === "1",
      }));

    const kickMoves = [...(traitMovesBy.get(p.id) ?? [])].sort();

    out.push({
      id,
      name: required(names.name, `name ${sid}`),
      genus: required(names.genus, `genus ${sid}`),
      gen: Number(s.generation_id),
      region: required(genRegion.get(s.generation_id), `region for gen ${s.generation_id}`),
      types,
      hp: statOf("hp"),
      atk: statOf("attack"),
      def: statOf("defense"),
      spa: statOf("special-attack"),
      spd: statOf("special-defense"),
      spe: statOf("speed"),
      heightDm: Number(p.height),
      weightHg: Number(p.weight),
      shape: required(shapeIds.get(s.shape_id), `shape for ${s.identifier}`),
      abilities,
      legendary: s.is_legendary === "1",
      mythical: s.is_mythical === "1",
      isBaby: s.is_baby === "1",
      evoChainId: Number(s.evolution_chain_id),
      evoStage: evoStage(s),
      kickMoves,
    });
  }
  return out;
}

export function serialize(entries) {
  return "[\n" + entries.map((e) => JSON.stringify(e)).join(",\n") + "\n]\n";
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const csv = {};
  const sources = { pokeapiCommit: POKEAPI_COMMIT, files: {} };
  for (const name of CSV_FILES) {
    const { rows, sha256 } = await loadCsv(name, refresh);
    csv[name] = rows;
    sources.files[`${name}.csv`] = sha256;
  }
  const traitsDoc = JSON.parse(readFileSync(moveTraitsPath, "utf8"));
  const moveTraits = Object.fromEntries(
    Object.entries(traitsDoc.moves).map(([k, v]) => [k, v.trait]),
  );
  const entries = buildPokedex(csv, moveTraits);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, serialize(entries));
  writeFileSync(sourcesPath, JSON.stringify(sources, null, 2) + "\n");
  console.log(`wrote ${entries.length} species to ${path.relative(root, outPath)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
