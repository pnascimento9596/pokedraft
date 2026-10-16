import { describe, expect, it } from "vitest";
import { GOLDEN_CUP8_V3, GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { challengeHref } from "../challenge-href";

describe("history and board seed challenges", () => {
  it("reads retained settings without replay and launches a current same-seed challenge", () => {
    expect(challengeHref(GOLDEN_CUP8_V3)).toBe(
      "/play?mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3&seed=golden-cup8",
    );
  });
  it.each([GOLDEN_CUP8_V5, GOLDEN_CUP8_V5.replace(/^pd5\./, "pd6.")])(
    "offers the same-seed challenge for engine-5 and live runs too (catches pd5+ runs with no Challenge button)",
    (token) => {
      expect(challengeHref(token)).toBe(
        "/play?mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3&seed=golden-cup8",
      );
    },
  );
  it("offers no challenge for malformed or future-version settings", () => {
    expect(challengeHref("pd3.e30")).toBeNull();
    expect(challengeHref(GOLDEN_CUP8_V3.replace("pd3.", "pd99."))).toBeNull();
  });
});
