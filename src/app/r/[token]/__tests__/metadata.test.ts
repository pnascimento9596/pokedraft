import { describe, expect, it } from "vitest";
import { replayAnyVersion } from "@/engine/versions";
import { runMetadata } from "../title";

// The e2e/share.spec.ts run: cup8 Open 4-3-3 on engine 3, observed 1-1-1, Team Score 283, out in
// the group stage.
const GROUP_EXIT =
  "pd3.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwiMDE0OGVhNzFlMWFjNTFlMyIsW1sicCIsNzQ5LCJzMCJdLFsicCIsNjMsInMxIl0sWyJwIiw5NDQsInMyIl0sWyJwIiwyNywiczMiXSxbInAiLDgyMSwiczQiXSxbInAiLDY1NiwiczUiXSxbInAiLDIwMCwiczYiXSxbInAiLDUyNCwiczciXSxbInAiLDI2OSwiczgiXSxbInAiLDQzMywiczkiXSxbInAiLDU0MywiczEwIl0sWyJwIiw5NDgsImIwIl0sWyJwIiw1MjksImIxIl0sWyJwIiw4MzQsImIyIl0sWyJwIiwzOTMsImIzIl0sWyJwIiwyNSwiYjQiXV1d";
// Engine 1, cup8 Open 4-3-3 seed "seed-9": 8-0-0, Team Score 845, champions.
const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

describe("run link preview metadata (catches a preview with no description or a card alt that hides the result)", () => {
  it("describes the finish and formation and puts the record and score in the image alt", async () => {
    const meta = runMetadata(GROUP_EXIT, await replayAnyVersion(GROUP_EXIT));
    const description = "Out in the group stage with 4-3-3. Draft your own XI on pokedraft.";
    const image = {
      url: `/r/${GROUP_EXIT}/opengraph-image`,
      width: 1200,
      height: 630,
      alt: "pokedraft run card: 1-1-1, Team Score 283",
    };
    expect(meta).toEqual({
      title: "pokedraft run: 1-1-1, Team Score 283",
      description,
      openGraph: { title: "pokedraft run: 1-1-1, Team Score 283", description, images: [image] },
      twitter: {
        card: "summary_large_image",
        title: "pokedraft run: 1-1-1, Team Score 283",
        description,
        images: [image],
      },
    });
  });

  it("says Champions for a cup winner", async () => {
    const meta = runMetadata(FLAWLESS, await replayAnyVersion(FLAWLESS));
    expect([meta.description, meta.openGraph?.images]).toEqual([
      "Champions with 4-3-3. Draft your own XI on pokedraft.",
      [
        {
          url: `/r/${FLAWLESS}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "pokedraft run card: 8-0-0, Team Score 845",
        },
      ],
    ]);
  });

  it("gives a broken link no description and the broken card's own words as alt", () => {
    const meta = runMetadata("pd3.garbage", null);
    expect([meta.title, meta.description, meta.openGraph?.images]).toEqual([
      "pokedraft: broken run link",
      undefined,
      [
        {
          url: "/r/pd3.garbage/opengraph-image",
          width: 1200,
          height: 630,
          alt: "pokedraft: broken run link",
        },
      ],
    ]);
  });
});
