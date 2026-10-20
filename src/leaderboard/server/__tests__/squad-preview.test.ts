import { describe, expect, it } from "vitest";
import {
  GOLDEN_CUP8_V1,
  GOLDEN_CUP8_V2,
  GOLDEN_CUP8_V3,
  GOLDEN_CUP8_V4,
  GOLDEN_CUP8_V5,
} from "@/engine/versions/__tests__/fixtures";
import { readStoredToken } from "../squad-preview";

describe("server squad membership previews", () => {
  // pd6 shares the pd5 payload, so the live-version case reuses the engine-5 golden's payload.
  it.each([
    GOLDEN_CUP8_V1,
    GOLDEN_CUP8_V2,
    GOLDEN_CUP8_V3,
    GOLDEN_CUP8_V4,
    GOLDEN_CUP8_V5,
    GOLDEN_CUP8_V5.replace(/^pd5\./, "pd6."),
  ])(
    "reads all16 real picked species from a retained or live token without cup replay (catches pd5+ boards with no squad)",
    (token) => {
      expect(readStoredToken(token).squadSpeciesIds).toEqual([
        849, 315, 272, 691, 453, 754, 785, 175, 663, 188, 807, 784, 703, 942, 145, 884,
      ]);
    },
  );
  it("marks malformed, incomplete and unknown versions unavailable", () => {
    expect(readStoredToken("pd3.e30").squadSpeciesIds).toBeUndefined();
    expect(readStoredToken(GOLDEN_CUP8_V3.replace(/^pd3/, "pd99")).squadSpeciesIds).toBeUndefined();
  });
});
