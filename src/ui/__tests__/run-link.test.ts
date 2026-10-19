import { describe, expect, it } from "vitest";
import { goalHref, runHref, runTokenFromUrl, watchAt } from "../run-link";

describe("message-safe run links", () => {
  it.each([
    ["pd1.W1-_", "/r/pd1?t=W1-_"],
    ["pd2.W1-_", "/r/pd2?t=W1-_"],
    ["pd3.W1-_", "/r/pd3?t=W1-_"],
  ])("moves only the external URL separator for %s", (token, href) => {
    expect(runHref(token)).toBe(href);
  });

  it.each([
    ["/r/pd3?t=W1-_", "pd3.W1-_"],
    ["/r/pd2.W1-_", "pd2.W1-_"],
    ["/r/pd1%2EW1-_", "pd1.W1-_"],
    ["/r/pd3.W1-_?t=other", "pd3.W1-_"],
    ["/r/pd3?t=W1-_&_rsc=123", "pd3.W1-_"],
  ])("reads the complete canonical token from %s", (href, token) => {
    expect(runTokenFromUrl(new URL(href, "https://pokedraft.test"))).toBe(token);
  });

  it.each([
    "/r/pd3",
    "/r/pd3?t=",
    "/r/pd3?t=abc&t=def",
    "/r/pd1?t=abc.def",
    "/r/pd2?t=abc%2Fdef",
    "/r/%ZZ",
    "/r/pd3/opengraph-image?t=abc",
    "/play?t=abc",
  ])("rejects an incomplete or ambiguous share destination %s", (href) => {
    expect(runTokenFromUrl(new URL(href, "https://pokedraft.test"))).toBeNull();
  });
});

describe("goal deep links (catches a goal link that breaks the run link or a bad query that is trusted)", () => {
  const cup = {
    matches: [
      { status: "played", extraTime: null },
      { status: "played", extraTime: { user: 0, opp: 0 } },
      { status: "not-played" },
    ],
  } as unknown as Parameters<typeof watchAt>[2];

  it("adds watch and at after the run payload, which keeps its own t", () => {
    expect(goalHref("pd6.W1-_", 1, 31)).toBe("/r/pd6?t=W1-_&watch=1&at=31");
  });

  it.each([
    ["0", "49", { matchIndex: 0, minute: 49 }],
    ["1", "120", { matchIndex: 1, minute: 120 }],
    ["0", "0", { matchIndex: 0, minute: 0 }],
  ])("reads watch=%s at=%s as a played match and a minute inside it", (watch, at, expected) => {
    expect(watchAt(watch, at, cup)).toEqual(expected);
  });

  it.each([
    ["0", "abc"],
    ["abc", "10"],
    ["0", "91"],
    ["2", "10"],
    ["0", "-1"],
    ["0", "1.5"],
    ["0", ""],
    ["0", undefined],
    [undefined, "10"],
    [["0", "1"], "10"],
    ["0", "0049"],
  ])("falls back to the normal page for watch=%s at=%s", (watch, at) => {
    expect(watchAt(watch, at, cup)).toBeNull();
  });
});
