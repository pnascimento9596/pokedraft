import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";

// The engine 7 candidate (`--coeffs v7`), kept as an independent deep copy of the live engine 7
// coefficients so calibration scripts and rule guards that import it keep working.
export const ENGINE_COEFFICIENTS_V7: EngineCoefficients = structuredClone(ENGINE_COEFFICIENTS);

