import { describe, expect, it } from "vitest";
import { GOLDEN_CUP8_V5, GOLDEN_KANTO151_V5 } from "@/engine/versions/__tests__/fixtures";
import { versusHref } from "../challenge-href";
import { parsePlayQuery } from "../settings";
import { challengeText, retainedLine, seedVerdict, VERDICT_LINE } from "../versus";

const CUP8_URL =
  "/play?mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3&seed=golden-cup8";
const LIVE_CUP8 = GOLDEN_CUP8_V5.replace(/^pd5\./, "pd8.");

function parse(href: string) {
  return parsePlayQuery(new URL(href, "http://x").searchParams);
}

const line = (wins: number, draws: number, score: number) => ({ wins, draws, rating: { score } });

describe("seedVerdict (catches a head-to-head that ranks two runs differently from the board)", () => {
  it("gives the seed to more wins, whatever the draws and Team Score", () => {
    expect(seedVerdict(line(5, 0, 400), line(4, 3, 900))).toBe("win");
    expect(seedVerdict(line(1, 1, 406), line(5, 0, 593))).toBe("loss");
  });

  it("breaks level wins on draws, then on Team Score", () => {
    expect(seedVerdict(line(3, 2, 300), line(3, 1, 700))).toBe("win");
    expect(seedVerdict(line(3, 1, 700), line(3, 1, 701))).toBe("loss");
    expect(seedVerdict(line(3, 1, 702), line(3, 1, 701))).toBe("win");
  });

  it("calls it level only when wins, draws and Team Score all tie", () => {
    expect(seedVerdict(line(5, 0, 593), line(5, 0, 593))).toBe("level");
  });

  it("words each verdict", () => {
    expect(VERDICT_LINE).toEqual({
      win: "You win the seed",
      loss: "They win the seed",
      level: "Level on the seed",
    });
  });
});

describe("the vs param on /play (catches a challenge that compares runs from different seeds)", () => {
  it("reads a live token on the same seed and settings", () => {
    expect(parse(`${CUP8_URL}&vs=${LIVE_CUP8}`)).toEqual({
      settings: {
        mode: "cup8",
        formation: "4-2-3-1",
        gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        style: "classic3",
        order: "squadFirst",
      },
      seed: "golden-cup8",
      vs: { kind: "live", token: LIVE_CUP8 },
    });
  });

  it("reads a retained token as the engine that played it, with no replay", () => {
    expect(parse(`${CUP8_URL}&vs=${GOLDEN_CUP8_V5}`)?.vs).toEqual({
      kind: "retained",
      token: GOLDEN_CUP8_V5,
      engine: 5,
    });
  });

  it("ignores a vs from another seed", () => {
    const other = CUP8_URL.replace("seed=golden-cup8", "seed=other-seed");
    expect(parse(`${other}&vs=${LIVE_CUP8}`)).toEqual({
      settings: {
        mode: "cup8",
        formation: "4-2-3-1",
        gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        style: "classic3",
        order: "squadFirst",
      },
      seed: "other-seed",
      vs: null,
    });
  });

  it("ignores a vs from another mode, formation, style, order or gens on the same seed", () => {
    for (const href of [
      "/play?mode=kanto151&f=4-2-3-1&order=squadFirst&seed=golden-cup8",
      CUP8_URL.replace("f=4-2-3-1", "f=4-3-3"),
      CUP8_URL.replace("style=classic3", "style=open"),
      CUP8_URL.replace("order=squadFirst", "order=positionFirst"),
      CUP8_URL.replace("g=123456789", "g=1234"),
    ]) {
      expect(parse(`${href}&vs=${LIVE_CUP8}`)?.vs).toBeNull();
    }
  });

  it("ignores a vs on a link with no seed, and a vs that is not a run token", () => {
    expect(parse(`${CUP8_URL.replace("&seed=golden-cup8", "")}&vs=${LIVE_CUP8}`)?.vs).toBeNull();
    expect(parse(`${CUP8_URL}&vs=pd8.e30`)?.vs).toBeNull();
    expect(parse(`${CUP8_URL}&vs=${LIVE_CUP8.replace("pd8.", "pd99.")}`)?.vs).toBeNull();
  });
});

describe("challenge links (catches a Challenge a friend link that drops the run to beat)", () => {
  it("is the same-seed challenge plus the run itself", () => {
    expect(versusHref(LIVE_CUP8)).toBe(`${CUP8_URL}&vs=${LIVE_CUP8}`);
    expect(versusHref(GOLDEN_KANTO151_V5)).toBe(
      `/play?mode=kanto151&f=3-5-2&order=positionFirst&seed=golden-kanto151&vs=${GOLDEN_KANTO151_V5}`,
    );
  });

  it("dares the friend with the record", () => {
    expect(challengeText({ wins: 1, draws: 1, losses: 2 })).toBe(
      "I went 1-1-2. Can you beat it on the same seed?",
    );
  });

  it("names the engine of a retained run", () => {
    expect(retainedLine(5)).toBe("Their run used engine v5, so there is no side by side.");
  });
});
