import { describe, expect, it } from "vitest";
import { z } from "zod";
import rawPokedex from "../../src/data/pokedex.json";
import rawScouting from "../../src/data/scouting.json";
import { validatePokedex, validateScouting } from "./validate-artifacts";

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
});
