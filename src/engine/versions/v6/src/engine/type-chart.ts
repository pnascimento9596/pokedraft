import { z } from "zod";
import raw from "../../../_blobs/acfc00493f2b5d80edacf06271bfc935f5f8adc99bbb32f7dae1b89fa95f7cb1.json";
import { TYPES } from "../data/pokedex";
import type { PokemonType, Species } from "./types";

const TypeChartSchema = z
  .object(
    Object.fromEntries(TYPES.map((t) => [t, z.array(z.enum(TYPES))])) as Record<
      PokemonType,
      z.ZodArray<z.ZodEnum<{ [K in PokemonType]: K }>>
    >,
  )
  .strict();

function byType<V>(f: (t: PokemonType) => V): Readonly<Record<PokemonType, V>> {
  return Object.fromEntries(TYPES.map((t) => [t, f(t)])) as Record<PokemonType, V>;
}

const PARSED = TypeChartSchema.parse(raw);
const CHART = byType((t): ReadonlySet<PokemonType> => new Set(PARSED[t]));
const WEAK_TO = byType((d) => TYPES.filter((a) => CHART[a].has(d)));

export function superEffective(attacker: PokemonType, defender: PokemonType): boolean {
  return CHART[attacker].has(defender);
}

export function covers(a: Species, b: Species): boolean {
  return b.types.some((tb) =>
    WEAK_TO[tb].some((threat) => a.types.some((ta) => superEffective(ta, threat))),
  );
}
