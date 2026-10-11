import { describe, expect, it } from "vitest";
import { DEFAULT_PANEL, parsePlayQuery, playHref, type PanelSettings } from "../settings";

const POSITION_CLASSIC: PanelSettings = {
  ...DEFAULT_PANEL,
  formation: "3-5-2",
  gens: [1, 2, 3],
  style: "classic3",
  order: "positionFirst",
};

function parse(href: string) {
  return parsePlayQuery(new URL(href, "http://x").searchParams);
}

describe("playHref and parsePlayQuery (catches a home Start link that loses the chosen order, style or gens)", () => {
  it("writes the 8-0 link with order, gens and style", () => {
    expect(playHref("cup8", DEFAULT_PANEL)).toBe(
      "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open",
    );
    expect(playHref("cup8", POSITION_CLASSIC, "s1")).toBe(
      "/play?mode=cup8&f=3-5-2&order=positionFirst&g=123&style=classic3&seed=s1",
    );
  });

  it("writes the 151 link with the order and no gens or style", () => {
    expect(playHref("kanto151", DEFAULT_PANEL)).toBe(
      "/play?mode=kanto151&f=4-3-3&order=squadFirst",
    );
    expect(playHref("kanto151", POSITION_CLASSIC)).toBe(
      "/play?mode=kanto151&f=3-5-2&order=positionFirst",
    );
  });

  it("reads each 8-0 link back to the settings it was made from", () => {
    expect(parse(playHref("cup8", DEFAULT_PANEL))).toEqual({
      settings: {
        mode: "cup8",
        formation: "4-3-3",
        gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        style: "open",
        order: "squadFirst",
      },
      seed: null,
    });
    expect(parse(playHref("cup8", POSITION_CLASSIC, "s1"))).toEqual({
      settings: {
        mode: "cup8",
        formation: "3-5-2",
        gens: [1, 2, 3],
        style: "classic3",
        order: "positionFirst",
      },
      seed: "s1",
    });
  });

  it("reads each 151 link back to the settings it was made from", () => {
    expect(parse(playHref("kanto151", DEFAULT_PANEL))).toEqual({
      settings: { mode: "kanto151", formation: "4-3-3", order: "squadFirst" },
      seed: null,
    });
    expect(parse(playHref("kanto151", POSITION_CLASSIC))).toEqual({
      settings: { mode: "kanto151", formation: "3-5-2", order: "positionFirst" },
      seed: null,
    });
  });

  it("refuses a link with no formation or a builder mode", () => {
    expect(parse("/play?mode=cup8&order=squadFirst")).toBeNull();
    expect(parse("/play?mode=builder&formation=4-3-3&gens=1")).toBeNull();
  });
});
