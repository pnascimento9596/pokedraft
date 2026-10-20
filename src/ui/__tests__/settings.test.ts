import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PANEL,
  loadPanel,
  parsePlayQuery,
  playHref,
  playsMatchday,
  savePanel,
  type PanelSettings,
} from "../settings";

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
      vs: null,
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
      vs: null,
    });
  });

  it("reads each 151 link back to the settings it was made from", () => {
    expect(parse(playHref("kanto151", DEFAULT_PANEL))).toEqual({
      settings: { mode: "kanto151", formation: "4-3-3", order: "squadFirst" },
      seed: null,
      vs: null,
    });
    expect(parse(playHref("kanto151", POSITION_CLASSIC))).toEqual({
      settings: { mode: "kanto151", formation: "3-5-2", order: "positionFirst" },
      seed: null,
      vs: null,
    });
  });

  it("refuses a link with no formation or a builder mode", () => {
    expect(parse("/play?mode=cup8&order=squadFirst")).toBeNull();
    expect(parse("/play?mode=builder&formation=4-3-3&gens=1")).toBeNull();
  });
});

function storedPanel(json: string | null) {
  const store = new Map<string, string>();
  if (json !== null) store.set("pokedraft:panel", json);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  });
  return store;
}

describe("showChallengeRatings (catches a saved panel that turns challenge ratings on by accident, or ties them to the builder setting)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is off by default, so challenges stay blind", () => {
    expect(DEFAULT_PANEL.showChallengeRatings).toBe(false);
    storedPanel(null);
    expect(loadPanel().showChallengeRatings).toBe(false);
  });

  it("loads false from a panel saved before the setting existed", () => {
    storedPanel('{"formation":"4-4-2","showRatings":true}');
    const panel = loadPanel();
    expect(panel.showChallengeRatings).toBe(false);
    expect(panel.formation).toBe("4-4-2");
  });

  it("loads a stored true", () => {
    storedPanel('{"showChallengeRatings":true}');
    expect(loadPanel().showChallengeRatings).toBe(true);
  });

  it("loads false when the stored value is not a boolean", () => {
    for (const bad of ['"true"', "1", "null", "{}"]) {
      storedPanel(`{"showChallengeRatings":${bad}}`);
      expect(loadPanel().showChallengeRatings).toBe(false);
    }
  });

  it("keeps the builder setting independent of it, in both directions", () => {
    storedPanel('{"showRatings":true}');
    expect(loadPanel()).toMatchObject({ showRatings: true, showChallengeRatings: false });
    storedPanel('{"showChallengeRatings":true}');
    expect(loadPanel()).toMatchObject({ showRatings: false, showChallengeRatings: true });
  });

  it("round-trips through savePanel", () => {
    const store = storedPanel(null);
    savePanel({ ...DEFAULT_PANEL, showChallengeRatings: true });
    expect(JSON.parse(store.get("pokedraft:panel")!)).toMatchObject({
      showChallengeRatings: true,
      showRatings: false,
    });
    expect(loadPanel().showChallengeRatings).toBe(true);
  });
});

describe("managerMode and matchView (catches a saved panel that silently turns on the matchday or keeps an unknown view)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("defaults to the quick results with no touchline, so an old player sees no change", () => {
    storedPanel('{"formation":"4-4-2"}');
    expect(loadPanel()).toMatchObject({ managerMode: false, matchView: "quick" });
    expect(playsMatchday(loadPanel())).toBe(false);
  });

  it("loads stored values and drops ones of the wrong type", () => {
    storedPanel('{"managerMode":true,"matchView":"live"}');
    expect(loadPanel()).toMatchObject({ managerMode: true, matchView: "live" });
    for (const [manager, view] of [
      ['"true"', '"Live"'],
      ["1", "null"],
      ["null", '"broadcast"'],
    ]) {
      storedPanel(`{"managerMode":${manager},"matchView":${view}}`);
      expect(loadPanel()).toMatchObject({ managerMode: false, matchView: "quick" });
    }
  });

  it("plays the matchday when either the touchline or the live view is on", () => {
    expect(playsMatchday({ managerMode: true, matchView: "quick" })).toBe(true);
    expect(playsMatchday({ managerMode: false, matchView: "live" })).toBe(true);
    expect(playsMatchday({ managerMode: false, matchView: "quick" })).toBe(false);
  });

  it("round-trips through savePanel", () => {
    const store = storedPanel(null);
    savePanel({ ...DEFAULT_PANEL, managerMode: true, matchView: "live" });
    expect(JSON.parse(store.get("pokedraft:panel")!)).toMatchObject({
      managerMode: true,
      matchView: "live",
    });
  });
});

describe("spinSpeed (catches a saved panel that resets on upgrade or turns fast spins on by accident)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("an old panel without spinSpeed parses as normal", () => {
    storedPanel('{"formation":"4-4-2","managerMode":true,"matchView":"live"}');
    expect(loadPanel()).toMatchObject({
      formation: "4-4-2",
      managerMode: true,
      matchView: "live",
      spinSpeed: "normal",
    });
  });

  it("loads a stored fast and drops values of the wrong type", () => {
    storedPanel('{"spinSpeed":"fast"}');
    expect(loadPanel().spinSpeed).toBe("fast");
    for (const bad of ['"Fast"', '"turbo"', "1", "true", "null"]) {
      storedPanel(`{"spinSpeed":${bad}}`);
      expect(loadPanel().spinSpeed).toBe("normal");
    }
  });

  it("round-trips through savePanel", () => {
    const store = storedPanel(null);
    savePanel({ ...DEFAULT_PANEL, spinSpeed: "fast" });
    expect(JSON.parse(store.get("pokedraft:panel")!)).toMatchObject({ spinSpeed: "fast" });
    expect(loadPanel().spinSpeed).toBe("fast");
  });
});
