import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";

// The engine 7 candidate: engine 6 plus each rule row's change. Only tests and scripts import it
// until the flip (ESLint keeps it out of src/ui, src/components and src/app). A deep copy, so a
// change here can never reach the live engine 6 object through a shared nested reference.
const base = structuredClone(ENGINE_COEFFICIENTS);

export const ENGINE_COEFFICIENTS_V7: EngineCoefficients = {
  ...base,
  manager: { ...base.manager, splitManaged: true },
};
