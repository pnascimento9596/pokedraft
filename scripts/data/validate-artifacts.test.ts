import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import rawPokedex from "../../src/data/pokedex.json";
import rawScouting from "../../src/data/scouting.json";
import rawIndex from "../../src/data/species-index.json";
import {
  validatePokedex,
  validateScouting,
  validateScoutingContributions,
  validateSpeciesIndex,
  validateSpeciesChunk,
} from "./validate-artifacts";

describe("generated artifact build validation", () => {
  it("accepts all 1025 Pokedex records without changing their values", () => {
    const validated = validatePokedex(rawPokedex);
    expect(validated).toHaveLength(1025);
    expect(JSON.stringify(validated)).toBe(JSON.stringify(rawPokedex));
  });

  it("accepts all 1025 scouting records without changing their values", () => {
    const validated = validateScouting(rawScouting);
    expect(validated).toHaveLength(1025);
    expect(JSON.stringify(validated)).toBe(JSON.stringify(rawScouting));
  });

  it.each([
    ["a missing base stat", [{ ...rawPokedex[0], spe: undefined }], "invalid_type", [0, "spe"]],
    ["an out-of-range base stat", [{ ...rawPokedex[0], hp: 0 }], "too_small", [0, "hp"]],
    [
      "an unknown type",
      [{ ...rawPokedex[0], types: ["invented"] }],
      "invalid_value",
      [0, "types", 0],
    ],
    ["an extra species field", [{ ...rawPokedex[0], invented: true }], "unrecognized_keys", [0]],
    ["a non-array Pokedex", {}, "invalid_type", []],
  ])("rejects %s with the schema error and field path", (_name, input, code, errorPath) => {
    expect(() => validatePokedex(input)).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([expect.objectContaining({ code, path: errorPath })]),
      }),
    );
    expect(() => validatePokedex(input)).toThrowError(z.ZodError);
  });

  it.each([
    [
      "an out-of-range attribute",
      [{ ...rawScouting[0], attrs: { ...rawScouting[0].attrs, PAC: 100 } }],
      "too_big",
      [0, "attrs", "PAC"],
    ],
    [
      "an out-of-range role fit",
      [{ ...rawScouting[0], fits: { ...rawScouting[0].fits, GK: 101 } }],
      "too_big",
      [0, "fits", "GK"],
    ],
    [
      "a missing baseline attribute",
      [{ ...rawScouting[0], baseline: { ...rawScouting[0].baseline, PAC: undefined } }],
      "invalid_type",
      [0, "baseline", "PAC"],
    ],
    [
      "a rationale without data evidence",
      [{ ...rawScouting[0], rationale: "An invented account without any evidence." }],
      "invalid_format",
      [0, "rationale"],
    ],
    ["an extra scouting field", [{ ...rawScouting[0], invented: true }], "unrecognized_keys", [0]],
    ["non-array scouting", {}, "invalid_type", []],
  ])("rejects %s with the schema error and field path", (_name, input, code, errorPath) => {
    expect(() => validateScouting(input)).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([expect.objectContaining({ code, path: errorPath })]),
      }),
    );
    expect(() => validateScouting(input)).toThrowError(z.ZodError);
  });

  it.each(["baseline", "attrs", "fits"] as const)(
    "rejects an extra nested %s key that runtime parsing used to strip",
    (field) => {
      const input = [{ ...rawScouting[0], [field]: { ...rawScouting[0][field], invented: true } }];
      expect(() => validateScouting(input)).toThrowError(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({ code: "unrecognized_keys", path: [0, field] }),
          ]),
        }),
      );
      expect(() => validateScouting(input)).toThrowError(z.ZodError);
    },
  );

  it("accepts all 1025 scouting contribution records without changing their values", () => {
    const rawContributions = JSON.parse(
      readFileSync(
        path.resolve(import.meta.dirname, "../../src/data/scouting-contributions.json"),
        "utf8",
      ),
    );
    const validated = validateScoutingContributions(rawContributions);
    expect(validated).toHaveLength(1025);
    expect(JSON.stringify(validated)).toBe(JSON.stringify(rawContributions));
  });

  it.each([
    [
      "a zero ability contribution",
      [{ id: 143, abilities: { PHY: 0 }, moves: {} }],
      "custom",
      [0, "abilities", "PHY"],
    ],
    [
      "a zero move contribution",
      [{ id: 143, abilities: {}, moves: { SHO: 0 } }],
      "custom",
      [0, "moves", "SHO"],
    ],
    [
      "an out-of-range ability contribution",
      [{ id: 143, abilities: { PHY: 9 }, moves: {} }],
      "too_big",
      [0, "abilities", "PHY"],
    ],
    [
      "an unknown attribute key in abilities",
      [{ id: 143, abilities: { INVENTED: 2 }, moves: {} }],
      "unrecognized_keys",
      [0, "abilities"],
    ],
    [
      "an extra contribution entry field",
      [{ id: 143, abilities: {}, moves: {}, invented: true }],
      "unrecognized_keys",
      [0],
    ],
  ])(
    "rejects %s in scouting contributions with the schema error and field path",
    (_name, input, code, errorPath) => {
      expect(() => validateScoutingContributions(input)).toThrowError(
        expect.objectContaining({
          issues: expect.arrayContaining([expect.objectContaining({ code, path: errorPath })]),
        }),
      );
      expect(() => validateScoutingContributions(input)).toThrowError(z.ZodError);
    },
  );

  it("accepts all 1025 species-index records without changing their values", () => {
    const validated = validateSpeciesIndex(rawIndex);
    expect(validated).toHaveLength(1025);
    expect(JSON.stringify(validated)).toBe(JSON.stringify(rawIndex));
  });

  it.each([
    ["a missing name", [{ ...rawIndex[0], name: undefined }], "invalid_type", [0, "name"]],
    ["an out-of-range gen", [{ ...rawIndex[0], gen: 10 }], "too_big", [0, "gen"]],
    ["an unknown type", [{ ...rawIndex[0], types: ["invented"] }], "invalid_value", [0, "types", 0]],
    ["an extra index field", [{ ...rawIndex[0], invented: true }], "unrecognized_keys", [0]],
    ["a non-array index", {}, "invalid_type", []],
  ])("rejects %s in species-index with the schema error and field path", (_name, input, code, errorPath) => {
    expect(() => validateSpeciesIndex(input)).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([expect.objectContaining({ code, path: errorPath })]),
      }),
    );
    expect(() => validateSpeciesIndex(input)).toThrowError(z.ZodError);
  });

  it("accepts all 9 generation species chunks totaling 1025 records", () => {
    let total = 0;
    for (let g = 1; g <= 9; g++) {
      const rawChunk = JSON.parse(
        readFileSync(
          path.resolve(import.meta.dirname, `../../src/data/species-chunks/gen-${g}.json`),
          "utf8",
        ),
      );
      const validated = validateSpeciesChunk(rawChunk);
      expect(validated.length).toBeGreaterThan(0);
      expect(JSON.stringify(validated)).toBe(JSON.stringify(rawChunk));
      total += validated.length;
    }
    expect(total).toBe(1025);
  });

  it("rejects an extra field in species chunk entries", () => {
    const rawChunk1 = JSON.parse(
      readFileSync(
        path.resolve(import.meta.dirname, "../../src/data/species-chunks/gen-1.json"),
        "utf8",
      ),
    );
    const input = [{ ...rawChunk1[0], invented: true }];
    expect(() => validateSpeciesChunk(input)).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([expect.objectContaining({ code: "unrecognized_keys", path: [0] })]),
      }),
    );
  });
});
