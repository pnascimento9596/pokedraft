import type { CupRound, Line } from "./types";

export interface EngineCoefficients {
  team: {
    lineWeights: Record<Line, number>;
    coreWeight: number;
    synergyWeight: number;
    benchWeight: number;
    curve: number;
    dragCount: number;
    dragWeight: number;
    synergy: {
      sharedType: number;
      evoLine: number;
      sameGen: number;
      coverage: number;
      edgeCap: number;
      fullAt: number;
    };
  };
  match: {
    shape: number;
    base: number;
    spread: number;
    minLambda: number;
    maxLambda: number;
    wDef: number;
    wGk: number;
    gammaMid: number;
    controlLo: number;
    controlHi: number;
    knockoutFactor: number;
    extraTimeFraction: number;
    chances: { regulation: number; extraTime: number; maxGoalProb: number };
    dispersion: {
      group: { outer: number; amplitude: number };
      knockout: { outer: number; amplitude: number };
    };
    penaltyShare: number;
    assistProb: number;
    scorerLineFactor: Record<Exclude<Line, "GK">, number>;
    assistLineFactor: Record<Line, number>;
    oppScorerWeights: readonly number[];
  };
  shootout: { kicks: number; maxSuddenDeath: number; base: number; band: number };
  availability: { eventProb: number; familiarityFloor: number };
  awards: { goal: number; assist: number; cleanSheet: { GK: number; DEF: number } };
  ladder: {
    score: Record<CupRound, number>;
    jitter: number;
    tilt: number;
  };
}

export const ENGINE_COEFFICIENTS: EngineCoefficients = {
  team: {
    lineWeights: { GK: 0.12, DEF: 0.3, MID: 0.3, ATT: 0.28 },
    coreWeight: 0.8,
    synergyWeight: 0.12,
    benchWeight: 0.08,
    curve: 0.4,
    dragCount: 3,
    dragWeight: 0.5,
    synergy: {
      sharedType: 0.5,
      evoLine: 1,
      sameGen: 0.25,
      coverage: 0.25,
      edgeCap: 1,
      fullAt: 0.8,
    },
  },
  match: {
    shape: 0.5,
    base: 1.1,
    spread: 5,
    minLambda: 0.1,
    maxLambda: 5,
    wDef: 0.7,
    wGk: 0.3,
    gammaMid: 1,
    controlLo: 0.85,
    controlHi: 1.15,
    knockoutFactor: 1,
    extraTimeFraction: 1 / 3,
    chances: { regulation: 50, extraTime: 17, maxGoalProb: 0.6 },
    dispersion: {
      group: { outer: 0.14, amplitude: 0.2 },
      knockout: { outer: 0.2, amplitude: 0.3 },
    },
    penaltyShare: 0.06,
    assistProb: 0.62,
    scorerLineFactor: { DEF: 0.25, MID: 0.6, ATT: 1 },
    assistLineFactor: { GK: 0.05, DEF: 0.4, MID: 1, ATT: 0.7 },
    oppScorerWeights: [0, 1, 1, 1, 1, 3, 3, 3, 6, 8, 6],
  },
  shootout: { kicks: 5, maxSuddenDeath: 20, base: 0.75, band: 0.1 },
  availability: { eventProb: 0.125, familiarityFloor: 0.85 },
  awards: { goal: 3, assist: 2, cleanSheet: { GK: 2, DEF: 1 } },
  ladder: {
    score: { G1: 300, G2: 320, G3: 340, R32: 360, R16: 480, QF: 760, SF: 850, F: 990 },
    jitter: 20,
    tilt: 5,
  },
};
