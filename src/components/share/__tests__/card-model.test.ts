import { describe, expect, it } from "vitest";
import { replayAnyVersion } from "@/engine/versions";
import { cardModel } from "../card";

const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";
const PARTIAL_BUILDER =
  "pd1.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwiYnVpbGRlciIsW1sibCIsNjMwLCJzMCJdLFsibCIsODkzLCJzMSJdLFsibCIsNTU4LCJzMiJdLFsibCIsNjgxLCJzMyJdLFsibCIsNjUyLCJzNCJdLFsibCIsNDY4LCJzNSJdLFsibCIsMjMzLCJzNiJdLFsibCIsNzE3LCJzNyJdLFsibCIsNTczLCJzOCJdLFsibCIsNjYzLCJzOSJdLFsibCIsNjk3LCJzMTAiXV1d";

describe("cardModel run headline", () => {
  it("returns no model when asynchronous retained replay rejects", async () => {
    const model = await cardModel({ t: "pd1.invalid" }, async () => {
      throw new Error("invalid retained token");
    });
    expect(model).toBeNull();
  });

  it("carries wins, draws and losses as numbers so the card can draw W/D/L tiles instead of parsing '8-0-0'", async () => {
    const model = await cardModel({ t: FLAWLESS }, replayAnyVersion);
    expect(model?.headline).toMatchObject({
      kind: "run",
      wins: 8,
      draws: 0,
      losses: 0,
      finish: "champion",
    });
  });

  it("gives a builder lineup no record", async () => {
    const model = await cardModel({ b: PARTIAL_BUILDER }, replayAnyVersion);
    expect(model?.headline).toEqual({ kind: "lineup", score: null });
  });
});
