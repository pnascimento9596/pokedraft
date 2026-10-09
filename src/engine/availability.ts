import { familiarity } from "@/scouting/fit";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { FORMATIONS } from "./formations";
import { canonicalSortBy, createEngineRng, deriveSubseed } from "./rng";
import { speciesById } from "./species";
import { STARTERS, type Absence, type FullLineup, type Seed } from "./types";

export interface MatchLineup {
  readonly lineup: FullLineup;
  readonly absence: Absence | null;
}

export function matchLineup(
  lineup: FullLineup,
  seed: Seed,
  matchIndex: number,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): MatchLineup {
  const rng = createEngineRng(deriveSubseed(seed, "availability", `match:${matchIndex}`));
  if (rng.next() >= c.availability.eventProb) return { lineup, absence: null };

  const index = rng.int(STARTERS);
  const slot = FORMATIONS[lineup.formation].slots[index]!;
  const bench = lineup.bench.map((id, benchIndex) => ({ species: speciesById(id), benchIndex }));
  const cover = bench.filter(
    (b) => familiarity(b.species.bestRoles, slot.role) >= c.availability.familiarityFloor,
  );
  const [replacement] = canonicalSortBy(cover.length > 0 ? cover : bench, (b) => [
    -b.species.quality[slot.role],
    b.species.id,
  ]);
  const out = lineup.starters[index]!;
  const starters = lineup.starters.with(index, replacement!.species.id);
  const benchIds = lineup.bench.with(replacement!.benchIndex, out);
  return {
    lineup: {
      formation: lineup.formation,
      starters: starters as unknown as FullLineup["starters"],
      bench: benchIds as unknown as FullLineup["bench"],
    },
    absence: { slot: slot.id, out, in: replacement!.species.id },
  };
}
