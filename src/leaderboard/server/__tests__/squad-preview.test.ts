import { describe, expect, it } from "vitest";
import { GOLDEN_CUP8_V1, GOLDEN_CUP8_V2, GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import { squadPreview } from "../squad-preview";

describe("server squad membership previews", () => {
  it.each([GOLDEN_CUP8_V1, GOLDEN_CUP8_V2, GOLDEN_CUP8_V3])("reads all16 real picked species from a retained token without cup replay", (token) => {
    expect(squadPreview(token)).toEqual([849, 315, 272, 691, 453, 754, 785, 175, 663, 188, 807, 784, 703, 942, 145, 884]);
  });
  it("marks malformed, incomplete and unknown versions unavailable", () => {
    expect(squadPreview("pd3.e30")).toBeUndefined();
    expect(squadPreview(GOLDEN_CUP8_V3.replace(/^pd3/, "pd99"))).toBeUndefined();
  });
});
