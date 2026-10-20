import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";

// The engine 7 candidate: engine 6 plus each rule row's change. Only tests and scripts import it
// until the flip (ESLint keeps it out of src/ui, src/components and src/app).
export const ENGINE_COEFFICIENTS_V7: EngineCoefficients = {
  ...ENGINE_COEFFICIENTS,
  manager: { ...ENGINE_COEFFICIENTS.manager, splitManaged: true },
};
