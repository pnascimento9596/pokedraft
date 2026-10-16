#!/usr/bin/env node
// Builds src/data/movesets.json, a presentation-only signature moveset per species, from PokéAPI
// CSVs pinned to one upstream commit. Nothing in src/engine or src/scouting reads it.
// Re-running on the cached CSVs produces byte-identical output.
// Usage: node scripts/data/build-movesets.mjs [--refresh]

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
import { parseCsv } from "./build-pokedex.mjs";

const POKEAPI_COMMIT = "c80757193bd0889054e36f4209762360bdaa4b95";
const BASE_URL = `https://raw.githubusercontent.com/PokeAPI/pokeapi/${POKEAPI_COMMIT}/data/v2/csv`;
const MAX_SPECIES = 1025;
const ENGLISH = "9";
const SLOTS = 4;
const PER_TYPE = 2;
const NULL_ACCURACY = 101;

const CSV_FILES = [
  "pokemon",
  "pokemon_types",
  "pokemon_moves",
  "pokemon_move_methods",
  "moves",
  "move_names",
  "move_damage_classes",
  "types",
  "version_groups",
];

export const KEEPER_MOVES = [
  "protect",
  "detect",
  "reflect",
  "light-screen",
  "barrier",
  "iron-defense",
  "harden",
  "withdraw",
  "defense-curl",
  "agility",
];

export const ABOUT =
  "Presentation-only canon movesets for the match broadcast; the engine and scouting never read this file. " +
  "Source: PokéAPI CSVs at the pinned commit, default form of each species. " +
  "Version groups are ordered by version_groups.order. " +
  "Candidate tiers, in order: level-up moves in the debut version group (the earliest where the species has any level-up move); " +
  "then level-up moves in the newest version group where it has any level-up move; then machine moves in the newest version group where it has any machine move. " +
  "Tiers are added only while fewer than 4 damaging moves (physical or special with non-null power) are pooled; a move keeps its first tier. " +
  "Rank: earlier tier, then STAB (move type is one of the species types), then higher power, then higher accuracy (null counts as 101), then lower move id. " +
  "Pick in rank order taking at most 2 moves per type, then fill any open slot from the skipped moves in rank order. " +
  "When the tiers hold fewer than 4 damaging moves, the open slots take the species' other canon moves from the same tiers (status moves, or damaging moves with variable power, which keep power null) by the same rank. " +
  "keeperMove is the first of protect, detect, reflect, light-screen, barrier, iron-defense, harden, withdraw, defense-curl, agility that the default form learns by any method in its debut version group; " +
  "failing that, the first of them it learns by any method in its newest level-up version group; else null.";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const cacheDir = path.join(here, ".cache", POKEAPI_COMMIT);
const outPath = path.join(root, "src/data/movesets.json");
const sourcesPath = path.join(root, "src/data/movesets.sources.json");

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

function required(value, what) {
  if (value === undefined || value === null || value === "") throw new Error(`missing ${what}`);
  return value;
}

function idOf(rows, identifier, file) {
  return required(rows.find((r) => r.identifier === identifier)?.id, `${identifier} in ${file}`);
}

function isDamaging(move) {
  return move.damageClass !== "status" && move.power !== null;
}

export function rankKey(move, tier, speciesTypes) {
  return [
    tier,
    speciesTypes.includes(move.type) ? 0 : 1,
    -(move.power ?? 0),
    -(move.accuracy ?? NULL_ACCURACY),
    move.numericId,
  ];
}

function compareKeys(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function rank(entries, speciesTypes) {
  return entries
    .map(([move, tier]) => ({ move, key: rankKey(move, tier, speciesTypes) }))
    .sort((a, b) => compareKeys(a.key, b.key))
    .map((e) => e.move);
}

export function pickVaried(ranked, slots) {
  const picked = [];
  const perType = new Map();
  for (const m of ranked) {
    if (picked.length === slots) break;
    const n = perType.get(m.type) ?? 0;
    if (n < PER_TYPE) {
      picked.push(m);
      perType.set(m.type, n + 1);
    }
  }
  for (const m of ranked) {
    if (picked.length === slots) break;
    if (!picked.includes(m)) picked.push(m);
  }
  return ranked.filter((m) => picked.includes(m));
}

export function buildMovesets(csv, maxSpecies = MAX_SPECIES) {
  const levelUp = idOf(csv.pokemon_move_methods, "level-up", "pokemon_move_methods.csv");
  const machine = idOf(csv.pokemon_move_methods, "machine", "pokemon_move_methods.csv");
  const typeIdent = new Map(csv.types.map((t) => [t.id, t.identifier]));
  const classIdent = new Map(csv.move_damage_classes.map((c) => [c.id, c.identifier]));
  const vgOrder = new Map(
    csv.version_groups.map((v) => [v.id, Number(required(v.order, `order of ${v.id}`))]),
  );
  if (new Set(vgOrder.values()).size !== vgOrder.size)
    throw new Error("version_groups.order has ties");

  const englishName = new Map();
  for (const r of csv.move_names)
    if (r.local_language_id === ENGLISH) englishName.set(r.move_id, r.name);

  const moves = new Map();
  for (const m of csv.moves) {
    moves.set(m.id, {
      numericId: Number(m.id),
      id: m.identifier,
      type: typeIdent.get(m.type_id),
      damageClass: classIdent.get(m.damage_class_id),
      power: m.power === "" ? null : Number(m.power),
      accuracy: m.accuracy === "" ? null : Number(m.accuracy),
    });
  }
  const moveByIdent = new Map([...moves.values()].map((m) => [m.id, m]));
  for (const k of KEEPER_MOVES) required(moveByIdent.get(k), `keeper move ${k} in moves.csv`);

  const defaultPokemon = new Map();
  for (const p of csv.pokemon) {
    if (p.is_default === "1" && Number(p.species_id) <= maxSpecies)
      defaultPokemon.set(p.species_id, p.id);
  }
  const typesBy = new Map();
  for (const t of csv.pokemon_types) {
    if (!typesBy.has(t.pokemon_id)) typesBy.set(t.pokemon_id, []);
    typesBy.get(t.pokemon_id).push(required(typeIdent.get(t.type_id), `type ${t.type_id}`));
  }
  const learnsBy = new Map();
  for (const r of csv.pokemon_moves) {
    if (!learnsBy.has(r.pokemon_id)) learnsBy.set(r.pokemon_id, []);
    learnsBy.get(r.pokemon_id).push(r);
  }

  const used = new Map();
  const cite = (m) => {
    const name = required(englishName.get(String(m.numericId)), `English name for move ${m.id}`);
    required(m.type, `type of move ${m.id}`);
    required(m.damageClass, `damage class of move ${m.id}`);
    used.set(m.id, { name, type: m.type, damageClass: m.damageClass, power: m.power });
    return m.id;
  };

  const species = [];
  for (let id = 1; id <= maxSpecies; id++) {
    const pid = required(defaultPokemon.get(String(id)), `default pokemon for species ${id}`);
    const speciesTypes = required(typesBy.get(pid), `types for pokemon ${pid}`);
    const learns = learnsBy.get(pid) ?? [];

    const groups = (method) => {
      const out = new Map();
      for (const r of learns) {
        if (r.pokemon_move_method_id !== method) continue;
        if (!out.has(r.version_group_id)) out.set(r.version_group_id, new Set());
        out.get(r.version_group_id).add(r.move_id);
      }
      return [...out.entries()].sort((a, b) => vgOrder.get(a[0]) - vgOrder.get(b[0]));
    };
    const levelGroups = groups(levelUp);
    const debut = levelGroups[0];
    const newest = levelGroups.at(-1);
    const newestMachine = groups(machine).at(-1);
    const tiers = [debut, newest === debut ? undefined : newest, newestMachine]
      .filter((g) => g !== undefined)
      .map(([, ids]) => ids);

    const pool = new Map();
    for (let t = 0; t < tiers.length; t++) {
      if ([...pool.values()].filter(([m]) => isDamaging(m)).length >= SLOTS) break;
      for (const mid of tiers[t]) {
        if (!pool.has(mid)) pool.set(mid, [required(moves.get(mid), `move ${mid}`), t]);
      }
    }
    const entries = [...pool.values()];
    let picked = pickVaried(
      rank(
        entries.filter(([m]) => isDamaging(m)),
        speciesTypes,
      ),
      SLOTS,
    );
    if (picked.length < SLOTS) {
      const rest = rank(
        entries.filter(([m]) => !isDamaging(m)),
        speciesTypes,
      );
      picked = [...picked, ...rest.slice(0, SLOTS - picked.length)];
    }
    if (picked.length === 0) throw new Error(`species ${id} learns no move`);

    const learnedIn = (group) =>
      new Set(
        learns
          .filter((r) => group !== undefined && r.version_group_id === group[0])
          .map((r) => moves.get(r.move_id)?.id),
      );
    const inDebut = learnedIn(debut);
    const inNewest = learnedIn(newest);
    const keeper =
      KEEPER_MOVES.find((k) => inDebut.has(k)) ?? KEEPER_MOVES.find((k) => inNewest.has(k));

    species.push({
      id,
      moves: picked.map(cite),
      keeperMove: keeper ? cite(moveByIdent.get(keeper)) : null,
    });
  }

  const moveTable = Object.fromEntries(
    [...used.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  return { about: ABOUT, pokeapiCommit: POKEAPI_COMMIT, moves: moveTable, species };
}

export function serialize(doc) {
  const moveLines = Object.entries(doc.moves).map(
    ([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`,
  );
  const speciesLines = doc.species.map((s) => `    ${JSON.stringify(s)}`);
  return (
    "{\n" +
    `  "about": ${JSON.stringify(doc.about)},\n` +
    `  "pokeapiCommit": ${JSON.stringify(doc.pokeapiCommit)},\n` +
    `  "moves": {\n${moveLines.join(",\n")}\n  },\n` +
    `  "species": [\n${speciesLines.join(",\n")}\n  ]\n` +
    "}\n"
  );
}

function readPins() {
  if (!existsSync(sourcesPath)) return {};
  const doc = JSON.parse(readFileSync(sourcesPath, "utf8"));
  return doc.pokeapiCommit === POKEAPI_COMMIT ? doc.files : {};
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const pins = readPins();
  const csv = {};
  const sources = { pokeapiCommit: POKEAPI_COMMIT, files: {} };
  for (const name of CSV_FILES) {
    const { rows, sha256 } = await loadCsv(name, refresh);
    const pinned = pins[`${name}.csv`];
    if (pinned !== undefined && pinned !== sha256) {
      throw new Error(`${name}.csv sha256 ${sha256} does not match the pinned ${pinned}`);
    }
    csv[name] = rows;
    sources.files[`${name}.csv`] = sha256;
  }
  const doc = buildMovesets(csv);
  const { MovesetsArtifactSchema } = await tsImport(
    "../../src/data/movesets-schema.ts",
    import.meta.url,
  );
  MovesetsArtifactSchema.parse(doc);
  writeFileSync(outPath, serialize(doc));
  writeFileSync(sourcesPath, JSON.stringify(sources, null, 2) + "\n");
  console.log(
    `wrote ${doc.species.length} species and ${Object.keys(doc.moves).length} moves to ${path.relative(root, outPath)}`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
