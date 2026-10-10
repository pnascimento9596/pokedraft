import { describe, expect, it } from "vitest";
import { decodeToken, encodeToken } from "../token";
import type { DraftAction, RunToken, RunTokenErrorCode, Seed, SlotRef, SpeciesId } from "../types";

const GOLDEN_TOKEN =
  "pd2.W1siYyIsIjQtMi0zLTEiLCIxNCIsImMiLCJwIl0sImFiYyIsW1siYyIsInMzIl0sWyJyIiwidCJdLFsicCIsMjUsbnVsbF0sWyJ3IiwiczAiLCJiNCJdXV0";
const FULL_TOKEN_LENGTH = 407;
const id = (n: number): SpeciesId => n as SpeciesId;
const s = (index: number): SlotRef => ({ kind: "starter", index }) as SlotRef;
const b = (index: number): SlotRef => ({ kind: "bench", index }) as SlotRef;
const token = (body: unknown): string =>
  `pd2.${Buffer.from(JSON.stringify(body), "utf8").toString("base64url")}`;

function codeOf(fn: () => unknown): RunTokenErrorCode | "no error" {
  try {
    fn();
  } catch (e) {
    return (e as { code: RunTokenErrorCode }).code;
  }
  return "no error";
}

const GOLDEN: RunToken = {
  v: 2,
  settings: {
    mode: "cup8",
    formation: "4-2-3-1",
    gens: [1, 4],
    style: "classic3",
    order: "positionFirst",
  },
  seed: "abc" as Seed,
  actions: [
    { type: "chooseSlot", slot: s(3) },
    { type: "reroll", target: "type" },
    { type: "pick", species: id(25), slot: null },
    { type: "swap", a: s(0), b: b(4) },
  ],
};

describe("run token golden (catches drift in the compact token encoding)", () => {
  it("encodes the pinned token string", () => {
    expect(encodeToken(GOLDEN)).toBe(GOLDEN_TOKEN);
  });

  it("the body is base64url of the compact JSON, checked with Node's own decoder", () => {
    const body = encodeToken(GOLDEN).slice("pd2.".length);
    expect(Buffer.from(body, "base64url").toString("utf8")).toBe(
      '[["c","4-2-3-1","14","c","p"],"abc",[["c","s3"],["r","t"],["p",25,null],["w","s0","b4"]]]',
    );
  });
});

describe("run token round trip (catches lossy encoding of any action or setting)", () => {
  const cases: readonly RunToken[] = [
    GOLDEN,
    {
      v: 2,
      settings: { mode: "builder", formation: "5-3-2", gens: [2, 9], legendaries: true },
      seed: "builder seed é" as Seed,
      actions: [
        { type: "place", species: id(1025), slot: b(0) },
        { type: "place", species: id(152), slot: s(10) },
        { type: "clear", slot: s(10) },
        { type: "swap", a: b(0), b: s(7) },
      ],
    },
    {
      v: 2,
      settings: { mode: "kanto151", formation: "3-4-3", order: "squadFirst" },
      seed: "k" as Seed,
      actions: [
        { type: "reroll", target: "species" },
        { type: "pick", species: id(151), slot: b(2) },
        { type: "reroll", target: "region" },
      ],
    },
  ];

  it.each(cases.map((c) => [c.settings.mode, c] as const))("%s", (_, t) => {
    expect(decodeToken(encodeToken(t))).toEqual(t);
  });

  it("normalizes gens on decode the same way createDraft does", () => {
    expect(decodeToken(token([["b", "4-3-3", "31", 0], "x", []])).settings).toEqual({
      mode: "builder",
      formation: "4-3-3",
      gens: [1, 3],
      legendaries: false,
    });
  });

  it("a full 16-pick cup8 token stays short", () => {
    const picks: DraftAction[] = [...Array(11).keys()].map((i) => ({
      type: "pick",
      species: id(1000 + i),
      slot: s(i),
    }));
    const bench: DraftAction[] = [...Array(5).keys()].map((i) => ({
      type: "pick",
      species: id(900 + i),
      slot: b(i),
    }));
    const full: RunToken = {
      v: 2,
      settings: {
        mode: "cup8",
        formation: "4-3-3",
        gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        style: "open",
        order: "squadFirst",
      },
      seed: "2026-10-09" as Seed,
      actions: [...picks, ...bench],
    };
    expect(encodeToken(full).length).toBe(FULL_TOKEN_LENGTH);
  });
});

describe("run token errors (catches decoding untrusted input into an invalid run)", () => {
  it.each([
    ["a future version", "pd3.W10", "unknownVersion"],
    ["a retired version, replayed only by its retained bundle", "pd1.W10", "unknownVersion"],
    ["no prefix", "hello", "malformed"],
    ["bad base64url characters", "pd2.!!!!", "malformed"],
    ["non-zero trailing bits", "pd2.W11", "malformed"],
    ["non-JSON body", `pd2.${Buffer.from("not json").toString("base64url")}`, "malformed"],
    ["wrong top-level shape", token({ settings: 1 }), "malformed"],
    ["empty seed", token([["k", "4-3-3", "s"], " ", []]), "malformed"],
    ["unknown mode", token([["z", "4-3-3", "s"], "x", []]), "invalidSettings"],
    ["unknown formation", token([["k", "9-9-9", "s"], "x", []]), "invalidSettings"],
    ["empty gens", token([["c", "4-3-3", "", "o", "s"], "x", []]), "invalidSettings"],
    ["duplicate gens", token([["c", "4-3-3", "11", "o", "s"], "x", []]), "invalidSettings"],
    ["species id 0", token([["k", "4-3-3", "s"], "x", [["p", 0, "s0"]]]), "invalidAction"],
    ["slot s11", token([["k", "4-3-3", "s"], "x", [["p", 25, "s11"]]]), "invalidAction"],
    ["unknown action", token([["k", "4-3-3", "s"], "x", [["z"]]]), "invalidAction"],
  ] as const)("%s -> %s", (_, input, code) => {
    expect(codeOf(() => decodeToken(input))).toBe(code);
  });
});
