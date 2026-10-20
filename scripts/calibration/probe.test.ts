import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "@/engine/coefficients";
import { ENGINE_COEFFICIENTS_V7 } from "@/engine/coefficients-v7";
import { tacticEdge } from "@/ui/manager/intel";
import { DEFAULT_BOTS, PROBE_MODES, informedTactic, runProbe } from "./probe-modes";
import { difference, quartileOf, wilson } from "./stats";

const PROPORTION = {
  count: expect.any(Number),
  n: expect.any(Number),
  p: expect.any(Number),
  lo: expect.any(Number),
  hi: expect.any(Number),
};
const INTERVAL = {
  value: expect.any(Number),
  lo: expect.any(Number),
  hi: expect.any(Number),
  method: expect.any(String),
};
const RATES = { n: expect.any(Number), win: PROPORTION, draw: PROPORTION, loss: PROPORTION };

const SHAPES: Record<(typeof PROBE_MODES)[number], object> = {
  manager: {
    matches: expect.any(Number),
    flipShare: PROPORTION,
    table: expect.objectContaining({
      auto: expect.objectContaining({ win: PROPORTION, winMinusAuto: INTERVAL }),
      informed: expect.objectContaining({ win: PROPORTION, winMinusAuto: INTERVAL }),
      oracle: expect.objectContaining({ win: PROPORTION, winMinusAuto: INTERVAL }),
      styleRule: expect.objectContaining({ win: PROPORTION }),
    }),
  },
  informed: { auto: RATES, arm: RATES, winMinusAuto: INTERVAL },
  noop: { auto: RATES, arm: RATES, winMinusAuto: INTERVAL },
  oracle: { auto: RATES, oracle: RATES, winMinusAuto: INTERVAL },
  luck: {
    cups: 4,
    meanWins: INTERVAL,
    champion: PROPORTION,
    squadShareOfVariance: INTERVAL,
  },
  upsets: { curve: expect.any(Array), knockout: expect.objectContaining({ shootout: PROPORTION }) },
  formations: { meanWins: INTERVAL, meanScore: INTERVAL, champion: PROPORTION },
  shootouts: {
    cups: 4,
    shootoutRate: PROPORTION,
    quartiles: expect.any(Array),
    topMinusBottom: INTERVAL,
  },
  kinds: {
    user: expect.objectContaining({ share: expect.objectContaining({ header: PROPORTION }) }),
    penalty: expect.objectContaining({ conversion: PROPORTION }),
    injuries: expect.objectContaining({ matchesWithOppInjury: PROPORTION }),
    headerShareByAttackerAer: expect.objectContaining({ quartiles: expect.any(Array) }),
  },
};

describe("probe modes at n 2", () => {
  for (const mode of PROBE_MODES) {
    it(`${mode} reports every number with its interval`, () => {
      const report = runProbe(mode, {
        n: 2,
        seeds: 2,
        bots: DEFAULT_BOTS[mode],
        formation: "4-3-3",
        c: ENGINE_COEFFICIENTS,
      });
      expect(report.mode).toBe(mode);
      expect(report.seedScheme).toContain("probe-<formation>-<bot>-<i>");
      const first = report.results[0];
      expect(Array.isArray(first) ? first[0] : first).toMatchObject(SHAPES[mode]);
    });
  }
});

// probe-4-3-3-good-28 match 4 goes to a shootout after a Boss Club reserve came on, so the
// opponent's takers must include the reserve, not the injured starter.
describe("shootouts probe under V7 (catches the taker order ignoring opponent injuries)", () => {
  it("n 28 reconstructs every taker: 107 knockout matches, 9 shootouts, 3 won", () => {
    const report = runProbe("shootouts", {
      n: 28,
      seeds: 1,
      bots: ["good"],
      formation: "4-3-3",
      c: ENGINE_COEFFICIENTS_V7,
    });
    expect(report.results[0]).toMatchObject({
      knockoutMatches: 107,
      shootouts: 9,
      userWin: { count: 3, n: 9 },
    });
  });
});

describe("informedTactic", () => {
  it("picks the scout's best favourable tactic per style from the engine 6 table", () => {
    expect(informedTactic("pressing", ENGINE_COEFFICIENTS)).toBe("counter");
    expect(informedTactic("possession", ENGINE_COEFFICIENTS)).toBe("press");
    expect(informedTactic("direct", ENGINE_COEFFICIENTS)).toBe("defend");
    expect(informedTactic("balanced", ENGINE_COEFFICIENTS)).toBe("balanced");
    expect(informedTactic(undefined, ENGINE_COEFFICIENTS)).toBe("balanced");
  });

  it("names only tactics the Touchline marks favourable, so the probe and the UI agree", () => {
    for (const style of ["pressing", "possession", "direct"] as const) {
      expect(tacticEdge(style, informedTactic(style, ENGINE_COEFFICIENTS))).toBe("favourable");
    }
  });

  it("falls back to Balanced when the best tactic is under the 4% edge margin", () => {
    const flat: EngineCoefficients = {
      ...ENGINE_COEFFICIENTS,
      manager: {
        ...ENGINE_COEFFICIENTS.manager,
        tactics: {
          balanced: [1, 1],
          attack: [1, 1],
          defend: [1, 1],
          press: [1.03, 1],
          counter: [1, 1],
        },
        styleEdges: { pressing: {}, possession: {}, direct: {} },
      },
    };
    expect(informedTactic("possession", flat)).toBe("balanced");
  });
});

describe("stats", () => {
  it("wilson 5 of 10 is the textbook [0.2366, 0.7634]", () => {
    const w = wilson(5, 10);
    expect(w.lo).toBeCloseTo(0.2366, 4);
    expect(w.hi).toBeCloseTo(0.7634, 4);
  });

  it("difference matches Newcombe 1998's worked example, 56/70 minus 48/80 is [0.0524, 0.3339]", () => {
    const d = difference(wilson(56, 70), wilson(48, 80));
    expect(d.value).toBeCloseTo(0.2, 10);
    expect(d.lo).toBeCloseTo(0.0524, 4);
    expect(d.hi).toBeCloseTo(0.3339, 4);
  });

  it("quartileOf puts a value equal to a cut into the lower quartile", () => {
    expect(quartileOf(1, [1, 2, 3])).toBe(0);
    expect(quartileOf(2.5, [1, 2, 3])).toBe(2);
    expect(quartileOf(4, [1, 2, 3])).toBe(3);
  });
});
