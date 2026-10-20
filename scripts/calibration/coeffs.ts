import { readFileSync } from "node:fs";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "@/engine/coefficients";

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
 * or a type change, throws; arrays are replaced whole.
 */
export function loadCoefficients(patchPath: string | undefined): EngineCoefficients {
  if (patchPath === undefined) return ENGINE_COEFFICIENTS;
  return deepMerge(
    ENGINE_COEFFICIENTS as unknown as Json,
    JSON.parse(readFileSync(patchPath, "utf8")) as Json,
    "",
  ) as unknown as EngineCoefficients;
}
