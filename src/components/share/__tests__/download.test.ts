import { describe, expect, it } from "vitest";
import { cardHref } from "../download";

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
});
