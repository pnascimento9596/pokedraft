import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";

// The engine 7 candidate: engine 6 plus each rule row's change. Only tests and scripts import it
// until the flip (ESLint keeps it out of src/ui, src/components and src/app). A deep copy, so a
// change here can never reach the live engine 6 object through a shared nested reference.
const base = structuredClone(ENGINE_COEFFICIENTS);

export const ENGINE_COEFFICIENTS_V7: EngineCoefficients = {
  ...base,
  manager: {
    ...base.manager,
    splitManaged: true,
    // Calibrated in 6b8 (docs/decisions/engine-7-calibration.md): 6b2's starting edges with every
    // distance from 1 scaled by 1.15, the largest scale that keeps hindsight (P2) within 10 points.
    styleEdges: {
      pressing: { counter: [1.115, 0.8275], attack: [1.345, 1.46] },
      possession: { press: [1.2875, 0.9425], counter: [1.0, 0.77] },
      direct: { defend: [0.655, 0.4825], press: [1.0, 1.2875] },
    },
    counterLead: 1.1,
    pressFade: { below: 70, perPoint: 0.004 },
  },
  // A +100 edge converts at 0.93. Also sets in-match penalty conversion (6b6).
  shootout: { ...base.shootout, band: 0.18 },
  // 0.0745 holds penalty goals per match at engine 6's 0.204 under the 0.18 band (6b8).
  penalty: { missable: true, awardShare: 0.0745 },
  takers: { freeKickWeight: 1.5 },
  opponent: { injuries: true },
  goalKind: { weighted: true, header: 1, solo: 1 },
  // The Final Boss 7 points stronger than engine 6's 985 brings the 840, 900 and 950 flawless
  // buckets back inside the v4 intervals (6b8); goal rate and dispersion barely move the 840 one.
  ladder: { ...base.ladder, score: { ...base.ladder.score, F: 992 } },
};
