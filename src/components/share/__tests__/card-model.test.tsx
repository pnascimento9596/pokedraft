import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { decodeToken, encodeToken } from "@/engine/token";
import { replayAnyVersion } from "@/engine/versions";
import { scriptedToken } from "@/leaderboard/server/__tests__/fixtures";
import { Card, cardModel } from "../card";

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

const PLAIN_V6 = scriptedToken(
  {
    mode: "cup8",
    formation: "4-3-3",
    gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    style: "open",
    order: "squadFirst",
  },
  "card-coached",
);
const COACHED_V6 = encodeToken({
  ...decodeToken(PLAIN_V6),
  manager: [{ type: "tactic", match: 0, minute: 0, tactic: "attack" }],
});

function chips(markup: string): string[] {
  return [...markup.matchAll(/<div style="display:flex;padding:5px 12px[^>]*>([^<]*)<\/div>/g)].map(
    (m) => m[1]!,
  );
}

describe("Coached chip on the run card (catches a coached run's card looking like an uncoached one)", () => {
  it("marks a coached token's card and puts the chip after the formation", async () => {
    const model = await cardModel({ t: COACHED_V6 }, replayAnyVersion);
    expect(model?.headline).toMatchObject({ kind: "run", coached: true });
    expect(chips(renderToStaticMarkup(<Card model={model!} />))).toEqual([
      "8-0 Challenge, Open",
      "4-3-3",
      "Coached",
    ]);
  });

  it("leaves the chip off an uncoached token's card", async () => {
    const model = await cardModel({ t: PLAIN_V6 }, replayAnyVersion);
    expect(model?.headline).toMatchObject({ kind: "run", coached: false });
    expect(chips(renderToStaticMarkup(<Card model={model!} />))).toEqual([
      "8-0 Challenge, Open",
      "4-3-3",
    ]);
  });
});
