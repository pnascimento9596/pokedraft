#!/usr/bin/env node
// CI guard for creature image packs. Every folder under public/creatures/ needs a valid
// pack.json (with a non-empty author and license), files named <dexId 4 digits>.<format> for real
// Dex ids only, a coverage count that matches the files, and src/data/image-packs.json must equal
// what the importer would generate from the folders (so it was never hand-edited).

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPackList } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PACK_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
const text = (v) => typeof v === "string" && v.trim() !== "";
const pos = (v) => Number.isInteger(v) && v > 0;

/** Returns a list of problems, empty when every pack is sound. */
export function checkPacks(root = ROOT) {
  const problems = [];
  const creatures = path.join(root, "public/creatures");
  const dex = JSON.parse(readFileSync(path.join(root, "src/data/pokedex.json"), "utf8"));
  const ids = new Set(dex.map((s) => s.id));
  const entries = [];

  const dirs = existsSync(creatures)
    ? readdirSync(creatures, { withFileTypes: true }).filter((d) => d.isDirectory())
    : [];
  if (dirs.length === 0) problems.push("public/creatures has no pack folders");

  for (const d of dirs) {
    const at = `public/creatures/${d.name}`;
    const manifest = path.join(creatures, d.name, "pack.json");
    if (!existsSync(manifest)) {
      problems.push(`${at}: pack.json is missing`);
      continue;
    }
    let p;
    try {
      p = JSON.parse(readFileSync(manifest, "utf8"));
    } catch {
      problems.push(`${at}/pack.json: not valid JSON`);
      continue;
    }
    if (p.id !== d.name || !PACK_ID.test(String(p.id)))
      problems.push(`${at}: id must equal the folder name`);
    for (const k of ["label", "author", "license", "source"]) {
      if (!text(p[k])) problems.push(`${at}/pack.json: ${k} must be non-empty text`);
    }
    if (p.style !== "pixel" && p.style !== "art")
      problems.push(`${at}/pack.json: style must be pixel or art`);
    if (p.format !== "png" && p.format !== "webp")
      problems.push(`${at}/pack.json: format must be png or webp`);
    if (!pos(p.width) || !pos(p.height))
      problems.push(`${at}/pack.json: width and height must be positive integers`);

    const file = new RegExp(`^(\\d{4})\\.${p.format}$`);
    const covered = [];
    for (const f of readdirSync(path.join(creatures, d.name))) {
      if (f === "pack.json") continue;
      const m = file.exec(f);
      if (m === null) problems.push(`${at}/${f}: not a <dexId>.${p.format} file`);
      else if (!ids.has(Number(m[1]))) problems.push(`${at}/${f}: ${Number(m[1])} is not a Dex id`);
      else covered.push(Number(m[1]));
    }
    if (p.coverage !== covered.length) {
      problems.push(`${at}/pack.json: coverage ${p.coverage} but ${covered.length} image files`);
    }
    entries.push({ pack: p, ids: covered });
  }

  const listPath = path.join(root, "src/data/image-packs.json");
  if (!existsSync(listPath)) {
    problems.push("src/data/image-packs.json is missing");
  } else if (problems.length === 0) {
    const want = `${JSON.stringify(buildPackList(entries), null, 2)}\n`;
    if (readFileSync(listPath, "utf8") !== want) {
      problems.push(
        "src/data/image-packs.json does not match the pack folders; rerun the importer",
      );
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = checkPacks();
  if (problems.length > 0) {
    console.error(`Image pack check failed:\n${problems.map((p) => `- ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("image packs clean");
}
