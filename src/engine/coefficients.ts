import type { CupRound, Line, Role, Tactic } from "./types";

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
    // Scorers and creators use separate tactical role weights.
    roleFactor: Record<Role, number>;
    assistRoleFactor: Record<Role, number>;
    oppScorerWeights: readonly number[];
  };
  shootout: { kicks: number; maxSuddenDeath: number; base: number; band: number };
  /**
   * Engine 7: with `missable`, each side may be awarded a penalty in each five-minute window, with
   * probability `awardShare` times that window's expected goals, and it scores with the shootout's
   * conversion chance. `match.penaltyShare` then relabels nothing. Off, penalties are goals
   * relabelled by `match.penaltyShare`, as in engine 6.
   */
  penalty: { missable: boolean; awardShare: number };
  /** Engine 7: a nominated free-kick taker's weight in the scorer pick for a free-kick goal. */
  takers: { freeKickWeight: number };
  availability: { eventProb: number; familiarityFloor: number };
  awards: {
    goal: number;
    assist: number;
    cleanSheet: Partial<Record<Role, number>>;
    minutesPerPoint: number;
  };
  ladder: {
    score: Record<CupRound, number>;
    jitter: number;
    tilt: number;
  };
  // Engine 6: the touchline. Design parameters for a fun game, not a real-world calibration.
  manager: {
    windowMinutes: number;
    maxSubs: number;
    /** [own goal-rate multiplier, multiplier on the other side's goal rate]. */
    tactics: Record<Tactic, readonly [number, number]>;
    /** Replaces `tactics` for the user's choice against an opponent of this tactical style. */
    styleEdges: Record<
      "pressing" | "possession" | "direct",
      Partial<Record<Tactic, readonly [number, number]>>
    >;
    /** Energy lost per minute is drain * (1.4 - STA / 100), times pressDrain when pressing. */
    drain: number;
    pressDrain: number;
    /** A player's line contribution is scaled by tiredFloor + (1 - tiredFloor) * energy / 100. */
    tiredFloor: number;
    /** Each empty slot (red card, injury with no sub left) scales [own, other side's] rate. */
    vacancy: readonly [number, number];
    injuriesPerMatch: number;
    yellowsPerMatch: number;
    redsPerMatch: number;
    /** Card and injury hazard multiplier while pressing. */
    pressHazard: number;
    /** A booked player eases off: their yellow hazard is scaled by this for the rest of the match. */
    bookedCaution: number;
    cardLineWeight: Record<Line, number>;
    /** The auto coach brings on fresh legs once a starter's energy falls below this. */
    autoSubEnergy: number;
    autoSubMinutes: readonly number[];
    /**
     * Engine 7: a tactic from 45' on hands tactics to the manager and any substitution hands subs
     * to them, each on its own. Off, any decision hands both over.
     */
    splitManaged: boolean;
    /** Engine 7: Counter's own multiplier is scaled by this while the side leads. */
    counterLead: number;
    /**
     * Engine 7: Press's own multiplier loses perPoint for each point the side's mean outfield
     * energy sits below `below`.
     */
    pressFade: { below: number; perPoint: number };
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
    // Tuned from the dispatch 6 starting table so ST, W and AM score 70 to 80% of user goals
    // in 4-3-3, 4-2-3-1 and 3-4-3 (docs/decisions/dispatch-6.md).
    // docs/calibration.md has the measured shares per formation under "Goals by role (dispatch 6)"
    // and the start and tuned values in the `match.roleFactor` row of "The coefficients and why".
    roleFactor: {
      ST: 1,
      W: 0.85,
      AM: 0.6,
      WM: 0.45,
      CM: 0.22,
      DM: 0.2,
      WB: 0.1,
      FB: 0.08,
      CB: 0.08,
      GK: 0,
    },
    assistRoleFactor: {
      GK: 0,
      CB: 0.12,
      FB: 0.55,
      WB: 0.7,
      DM: 0.65,
      CM: 1,
      AM: 1.1,
      WM: 1,
      W: 0.9,
      ST: 0.45,
    },
    oppScorerWeights: [0, 1, 1, 1, 1, 3, 3, 3, 6, 8, 6],
  },
  shootout: { kicks: 5, maxSuddenDeath: 200, base: 0.75, band: 0.1 },
  penalty: { missable: false, awardShare: 0 },
  takers: { freeKickWeight: 1 },
  availability: { eventProb: 0.125, familiarityFloor: 0.85 },
  awards: { goal: 3, assist: 2, cleanSheet: { GK: 2, CB: 1, FB: 1, DM: 1 }, minutesPerPoint: 180 },
  ladder: {
    score: { G1: 280, G2: 300, G3: 355, R32: 480, R16: 605, QF: 730, SF: 855, F: 985 },
    jitter: 20,
    tilt: 5,
  },
  manager: {
    windowMinutes: 5,
    maxSubs: 5,
    tactics: {
      balanced: [1, 1],
      attack: [1.25, 1.3],
      defend: [0.65, 0.7],
      press: [1.1, 1.02],
      counter: [0.85, 0.85],
    },
    styleEdges: {
      // A pressing side leaves space behind it: counters bite, a slugfest favours nobody.
      pressing: { counter: [0.95, 0.85], attack: [1.3, 1.35] },
      // A possession side is hurt by a press and by counters that skip its build-up.
      possession: { press: [1.18, 0.98], counter: [0.92, 0.82] },
      // A direct side punishes a high line and struggles to break down a low block.
      direct: { defend: [0.65, 0.62], press: [1.05, 1.12] },
    },
    drain: 0.3,
    pressDrain: 1.4,
    tiredFloor: 0.8,
    vacancy: [0.82, 1.18],
    injuriesPerMatch: 0.3,
    yellowsPerMatch: 1.6,
    redsPerMatch: 0.04,
    pressHazard: 1.3,
    bookedCaution: 0.25,
    cardLineWeight: { GK: 0, DEF: 1.3, MID: 1.1, ATT: 0.6 },
    autoSubEnergy: 82,
    autoSubMinutes: [60, 75],
    splitManaged: false,
    counterLead: 1,
    pressFade: { below: 70, perPoint: 0 },
  },
};
