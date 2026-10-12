import { describe, expect, it } from "vitest";
import { runHref, runTokenFromUrl } from "../run-link";

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
