import { describe, expect, it } from "vitest";
import { confirmPlay, settingsSummary } from "../settingsSummary";
import { DEFAULT_PANEL, parsePlayQuery, playHref, type PanelSettings } from "../settings";

const PICKED: PanelSettings = {
  ...DEFAULT_PANEL,
  formation: "3-5-2",
  gens: [1, 2],
  style: "classic3",
  order: "positionFirst",
};

describe("confirmPlay (catches a confirmation that lists settings the run will not use)", () => {
  it("lists formation, regions, style and order for the 8-0 challenge and links to the same /play URL", () => {
    expect(confirmPlay("cup8", PICKED)).toEqual({
      href: "/play?mode=cup8&f=3-5-2&order=positionFirst&g=12&style=classic3",
      items: [
        { label: "Formation", value: "3-5-2" },
        { label: "Regions", value: "Kanto, Johto" },
        { label: "Style", value: "Classic" },
        { label: "Order", value: "Position First" },
      ],
      settings: {
        formation: "3-5-2",
        gens: [1, 2],
        mode: "cup8",
        order: "positionFirst",
        style: "classic3",
      },
    });
  });

  it("lists only formation and order for the 151 challenge, which ignores regions and style", () => {
    expect(confirmPlay("kanto151", PICKED)).toEqual({
      href: "/play?mode=kanto151&f=3-5-2&order=positionFirst",
      items: [
        { label: "Formation", value: "3-5-2" },
        { label: "Order", value: "Position First" },
      ],
      settings: {
        formation: "3-5-2",
        mode: "kanto151",
        order: "positionFirst",
      },
    });
  });

  it("says All regions when every generation is on", () => {
    expect(confirmPlay("cup8", DEFAULT_PANEL).items[1]).toEqual({
      label: "Regions",
      value: "All regions",
    });
  });
});

describe("settingsSummary (the /play start page and the confirmation share one list)", () => {
  it("reads the same items back from the /play URL as the confirmation shows", () => {
    const parsed = parsePlayQuery(new URL(playHref("cup8", PICKED), "http://x").searchParams);
    expect(settingsSummary(parsed!.settings)).toEqual([
      { label: "Formation", value: "3-5-2" },
      { label: "Regions", value: "Kanto, Johto" },
      { label: "Style", value: "Classic" },
      { label: "Order", value: "Position First" },
    ]);
  });
});
