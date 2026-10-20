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
    // Starting values (6b2); 6b8 tunes them. Each right read moves own over gives by 25 to 32%,
    // and Press into a direct side hands it 25% more.
    styleEdges: {
      pressing: { counter: [1.1, 0.85], attack: [1.3, 1.4] },
      possession: { press: [1.25, 0.95], counter: [1.0, 0.8] },
      direct: { defend: [0.7, 0.55], press: [1.0, 1.25] },
    },
    counterLead: 1.1,
    pressFade: { below: 70, perPoint: 0.004 },
  },
};
