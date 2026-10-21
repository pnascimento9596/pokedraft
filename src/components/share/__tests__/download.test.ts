import { describe, expect, it } from "vitest";
import { canonicalCardQuery, cardHref, type CardLook, type CardSource } from "../download";

describe("cardHref", () => {
  it("keeps the old URL when no look is given", () => {
    expect(cardHref({ t: "pd1.abc" })).toBe("/card?t=pd1.abc");
  });

  it("carries the player's pack so the export matches the screen", () => {
    expect(cardHref({ b: "pd1.xyz" }, { pack: "pokeapi-art", mirror: true })).toBe(
      "/card?b=pd1.xyz&pack=pokeapi-art",
    );
  });

  it("says mirror=0 only when the player turned mirroring off", () => {
    expect(cardHref({ t: "pd1.abc" }, { pack: null, mirror: false })).toBe(
      "/card?t=pd1.abc&mirror=0",
    );
  });

  it.each<[CardSource, CardLook | undefined, string]>([
    [{ t: "pd1.abc" }, undefined, "/card?t=pd1.abc"],
    [{ t: "pd1.abc" }, { pack: "pokeapi-pixel", mirror: true }, "/card?t=pd1.abc"],
    [{ t: "pd1.abc" }, { pack: "pokeapi-pixel", mirror: false }, "/card?t=pd1.abc&mirror=0"],
    [{ t: "pd1.abc" }, { pack: "nope", mirror: true }, "/card?t=pd1.abc"],
    [{ t: "pd1.abc" }, { pack: "pokeapi-art", mirror: true }, "/card?t=pd1.abc&pack=pokeapi-art"],
    [
      { t: "pd1.abc" },
      { pack: "pokeapi-art", mirror: false },
      "/card?t=pd1.abc&pack=pokeapi-art&mirror=0",
    ],
    [{ b: "pd1.xyz" }, { pack: "pokeapi-pixel", mirror: false }, "/card?b=pd1.xyz&mirror=0"],
    [
      { b: "pd1.xyz" },
      { pack: "pokeapi-art", mirror: false },
      "/card?b=pd1.xyz&pack=pokeapi-art&mirror=0",
    ],
  ])(
    "emits only canonical URLs so the app never builds a /card href that the route would redirect (%o, %o -> %s)",
    (source, look, expected) => {
      const href = cardHref(source, look);
      const canonical = canonicalCardQuery(new URL(href, "http://localhost").searchParams);
      expect([href, `/card?${canonical}`]).toEqual([expected, expected]);
    },
  );
});

describe("canonicalCardQuery", () => {
  it.each<[string, string | null]>([
    ["t=pd1.abc", "t=pd1.abc"],
    ["b=pd1.xyz", "b=pd1.xyz"],
    ["t=pd1.abc&utm=1", "t=pd1.abc"],
    ["mirror=1&t=pd1.abc", "t=pd1.abc"],
    ["t=pd1.abc&mirror=0&pack=pokeapi-art", "t=pd1.abc&pack=pokeapi-art&mirror=0"],
    ["t=pd1.abc&pack=pokeapi-pixel", "t=pd1.abc"],
    ["t=pd1.abc&pack=nope", "t=pd1.abc"],
    ["t=pd1.abc&b=pd1.xyz", "t=pd1.abc"],
    ["b=pd1.xyz&t=pd1.abc", "t=pd1.abc"],
    ["t=&b=pd1.xyz", "b=pd1.xyz"],
    ["t=pd1.abc&t=pd1.other", "t=pd1.abc"],
    ["", null],
    ["t=", null],
    ["b=", null],
    ["t=&b=", null],
    ["pack=pokeapi-art&mirror=0", null],
  ])("normalizes %j to %j", (raw, expected) => {
    expect(canonicalCardQuery(new URLSearchParams(raw))).toBe(expected);
  });
});
