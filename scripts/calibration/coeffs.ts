import { readFileSync } from "node:fs";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "@/engine/coefficients";
import { ENGINE_COEFFICIENTS_V7 } from "@/engine/coefficients-v7";
import { ENGINE_COEFFICIENTS_V8 } from "@/engine/coefficients-v8";

type Json = number | string | boolean | null | Json[] | { [k: string]: Json };

function deepMerge(base: Json, patch: Json, at: string): Json {
  const isObject = (v: Json): v is { [k: string]: Json } =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  if (!isObject(patch)) {
    if (
      isObject(base) ||
      typeof base !== typeof patch ||
      Array.isArray(base) !== Array.isArray(patch)
    ) {
      throw new TypeError(
        `--coeffs ${at || "root"}: expected ${JSON.stringify(base)}-shaped value`,
      );
    }
    return patch;
  }
  if (!isObject(base))
    throw new TypeError(`--coeffs ${at}: expected a ${typeof base}, got an object`);
  const out: { [k: string]: Json } = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in base)) throw new TypeError(`--coeffs ${at}.${k}: unknown coefficient`);
    out[k] = deepMerge(base[k]!, v, `${at}.${k}`);
  }
  return out;
}

/**
 * The runtime coefficients with a JSON patch file deep-merged in. A key the live object lacks,
 * or a type change, throws; arrays are replaced whole. `v7` names the engine 7 candidate module
 * instead of a file, so calibration never runs a hand-kept copy of its numbers.
 */
export function loadCoefficients(patchPath: string | undefined): EngineCoefficients {
  if (patchPath === undefined) return ENGINE_COEFFICIENTS;
  if (patchPath === "v7") return ENGINE_COEFFICIENTS_V7;
  if (patchPath === "v8") return ENGINE_COEFFICIENTS_V8;
  return deepMerge(
    ENGINE_COEFFICIENTS as unknown as Json,
    JSON.parse(readFileSync(patchPath, "utf8")) as Json,
    "",
  ) as unknown as EngineCoefficients;
}
