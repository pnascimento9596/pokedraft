import { describe, expect, it } from "vitest";
import { settingsSummary } from "../settingsSummary";
import {
  DEFAULT_PANEL,
  parsePlayQuery,
  playHref,
  playTarget,
  type PanelSettings,
} from "../settings";

const PICKED: PanelSettings = {
  ...DEFAULT_PANEL,
  formation: "3-5-2",
  gens: [1, 2],
  style: "classic3",
  order: "positionFirst",
};

const SIM_QUICK = { managerMode: false, matchView: "quick" } as const;

describe("playTarget (catches a Play button that clears a different run than /play starts)", () => {
  it("returns the 8-0 /play link and the settings /play reads back from it", () => {
    expect(playTarget("cup8", PICKED)).toEqual({
      href: "/play?mode=cup8&f=3-5-2&order=positionFirst&g=12&style=classic3",
      settings: {
        formation: "3-5-2",
        gens: [1, 2],
        mode: "cup8",
        order: "positionFirst",
        style: "classic3",
      },
    });
  });

  it("drops regions and style for the 151 challenge, which ignores them", () => {
    expect(playTarget("kanto151", PICKED)).toEqual({
      href: "/play?mode=kanto151&f=3-5-2&order=positionFirst",
      settings: { formation: "3-5-2", mode: "kanto151", order: "positionFirst" },
    });
  });
});

describe("settingsSummary (catches a start card that hides how the cup will be played)", () => {
  it("lists formation, regions, style, order and Matchday for the 8-0 challenge", () => {
    const parsed = parsePlayQuery(new URL(playHref("cup8", PICKED), "http://x").searchParams);
    expect(settingsSummary(parsed!.settings, SIM_QUICK)).toEqual([
      { label: "Formation", value: "3-5-2" },
      { label: "Regions", value: "Kanto, Johto" },
      { label: "Style", value: "Classic" },
      { label: "Order", value: "Position First" },
      { label: "Matchday", value: "Sim, Quick" },
    ]);
  });

  it("lists only formation, order and Matchday for the 151 challenge", () => {
    expect(settingsSummary(playTarget("kanto151", PICKED).settings, SIM_QUICK)).toEqual([
      { label: "Formation", value: "3-5-2" },
      { label: "Order", value: "Position First" },
      { label: "Matchday", value: "Sim, Quick" },
    ]);
  });

  it("says All regions when every generation is on", () => {
    expect(settingsSummary(playTarget("cup8", DEFAULT_PANEL).settings, SIM_QUICK)[1]).toEqual({
      label: "Regions",
      value: "All regions",
    });
  });

  it("settingsSummary includes Matchday: Manager, Live when manager mode is on over a saved Quick choice", () => {
    const items = settingsSummary(playTarget("cup8", DEFAULT_PANEL).settings, {
      managerMode: true,
      matchView: "quick",
    });
    expect(items.at(-1)).toEqual({ label: "Matchday", value: "Manager, Live" });
  });

  it("says Sim, Live for a live match without manager mode", () => {
    const items = settingsSummary(playTarget("kanto151", DEFAULT_PANEL).settings, {
      managerMode: false,
      matchView: "live",
    });
    expect(items.at(-1)).toEqual({ label: "Matchday", value: "Sim, Live" });
  });
});
