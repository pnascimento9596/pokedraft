import { describe, expect, it } from "vitest";
import { RUN_TOKEN_VERSION } from "@/engine";
import { draftFromBuilderToken, filledCount } from "../lineup";

// A partial builder lineup shared as /?b=... under engine-1 (src/app/card/__tests__ at 90fa976).
const BUILDER_V1 =
  "pd1.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwiYnVpbGRlciIsW1sibCIsNjMwLCJzMCJdLFsibCIsODkzLCJzMSJdLFsibCIsNTU4LCJzMiJdLFsibCIsNjgxLCJzMyJdLFsibCIsNjUyLCJzNCJdLFsibCIsNDY4LCJzNSJdLFsibCIsMjMzLCJzNiJdLFsibCIsNzE3LCJzNyJdLFsibCIsNTczLCJzOCJdLFsibCIsNjYzLCJzOSJdLFsibCIsNjk3LCJzMTAiXV1d";

describe("draftFromBuilderToken (catches old shared builder links opening an empty builder)", () => {
  it("reads a builder lineup shared under a retained engine version", () => {
    expect(RUN_TOKEN_VERSION).not.toBe(1);
    const draft = draftFromBuilderToken(BUILDER_V1);
    expect(draft === null ? null : [draft.settings.mode, filledCount(draft.lineup)]).toEqual([
      "builder",
      10,
    ]);
  });

  it("still rejects a version no engine issued", () => {
    expect(draftFromBuilderToken(BUILDER_V1.replace(/^pd1\./, "pd99."))).toBeNull();
  });
});
