#!/usr/bin/env node
// Builds src/data/type-chart.json from PokéAPI's type efficacy CSV pinned to one upstream commit.
// Re-running on the cached CSVs produces byte-identical output.
// Usage: node scripts/data/build-type-chart.mjs [--refresh]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./build-pokedex.mjs";

const POKEAPI_COMMIT = "c80757193bd0889054e36f4209762360bdaa4b95";
const BASE_URL = `https://raw.githubusercontent.com/PokeAPI/pokeapi/${POKEAPI_COMMIT}/data/v2/csv`;
const SUPER_EFFECTIVE = "200";

const TYPES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
];

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const cacheDir = path.join(here, ".cache", POKEAPI_COMMIT);
const outPath = path.join(root, "src/data/type-chart.json");

async function loadCsv(name, refresh) {
  const file = path.join(cacheDir, `${name}.csv`);
  if (refresh || !existsSync(file)) {
    const res = await fetch(`${BASE_URL}/${name}.csv`);
    if (!res.ok) throw new Error(`fetch ${name}.csv failed with HTTP ${res.status}`);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return parseCsv(readFileSync(file).toString("utf8"));
}

export function buildTypeChart(types, efficacy) {
  const identById = new Map(types.map((t) => [t.id, t.identifier]));
  for (const t of TYPES) {
    if (![...identById.values()].includes(t)) throw new Error(`types.csv has no type ${t}`);
  }
  const chart = Object.fromEntries(TYPES.map((t) => [t, new Set()]));
  for (const row of efficacy) {
    const attacker = identById.get(row.damage_type_id);
    const defender = identById.get(row.target_type_id);
    if (attacker === undefined || defender === undefined) {
      throw new Error(`type_efficacy.csv references an unknown type id in ${JSON.stringify(row)}`);
    }
    if (!TYPES.includes(attacker) || !TYPES.includes(defender)) continue;
    if (row.damage_factor === SUPER_EFFECTIVE) chart[attacker].add(defender);
  }
  return Object.fromEntries(TYPES.map((t) => [t, TYPES.filter((d) => chart[t].has(d))]));
}

function serialize(chart) {
  const lines = Object.entries(chart).map(
    ([t, hits]) => `  ${JSON.stringify(t)}: ${JSON.stringify(hits)}`,
  );
  return "{\n" + lines.join(",\n") + "\n}\n";
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const types = await loadCsv("types", refresh);
  const efficacy = await loadCsv("type_efficacy", refresh);
  writeFileSync(outPath, serialize(buildTypeChart(types, efficacy)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
