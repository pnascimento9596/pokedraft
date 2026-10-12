import type { Role, Species } from "@/engine";
import { qualityScore, versusLabel } from "./labels";

export interface Rating {
  readonly role: Role;
  readonly best: Role | null;
  readonly score: number;
  readonly versus: string;
  readonly raw: string;
}

// Where the player ranks for the slot's role among all Pokémon, 0 to 100 (the engine's quality),
// with the raw fit as its description. A bench slot has no role, so it rates the player at their
// best one and says so.
export function ratingFor(sp: Species, role: Role | null, slotLabel: string): Rating {
  const rated: Role = role ?? sp.bestRoles[0]!;
  return {
    role: rated,
    best: role === null ? rated : null,
    score: qualityScore(sp.quality[rated]),
    versus: versusLabel(rated),
    raw: `Raw fit ${sp.fits[rated]} of 100 for ${role === null ? rated : slotLabel}`,
  };
}
