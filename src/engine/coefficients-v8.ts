import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";

// The engine 8 candidate (`--coeffs v8`), kept as an independent deep copy of the live engine 8
// coefficients so calibration scripts and rule guards that import it keep working.
export const ENGINE_COEFFICIENTS_V8: EngineCoefficients = structuredClone(ENGINE_COEFFICIENTS);
