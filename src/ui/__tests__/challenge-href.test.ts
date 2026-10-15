import { describe, expect, it } from "vitest";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import { challengeHref } from "../challenge-href";

describe("history and board seed challenges", () => {
  it("reads retained settings without replay and launches a current same-seed challenge", () => {
    expect(challengeHref(GOLDEN_CUP8_V3)).toBe("/play?mode=cup8&formation=4-2-3-1&gens=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9&style=classic3&order=squadFirst&seed=golden-cup8");
  });
  it("offers no challenge for malformed or future-version settings", () => {
    expect(challengeHref("pd3.e30")).toBeNull();
    expect(challengeHref(GOLDEN_CUP8_V3.replace("pd3.", "pd99."))).toBeNull();
  });
});
