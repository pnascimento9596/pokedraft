import { FORMATIONS } from "@/engine/formations";
import type { FormationId, Role, SlotRef, Species } from "@/engine/types";
import { SCOUTING_BY_ID } from "@/scouting/scouting-data";

export type PositionSuitability = "recommended" | "ok" | "bad";

/**
 * Evaluates how well a Pokémon fits a given position on the pitch.
 * - "recommended": Strongest position(s) the Pokémon can play in based on attributes/roles.
 * - "bad": Positions where the Pokémon would perform poorly (worst roles, weak defensive/GK fit, etc.).
 * - "ok": Decent positions where the Pokémon fits well, but not top tier.
 */
export function getSlotSuitability(
  species: Species,
  formation: FormationId,
  ref: SlotRef,
): PositionSuitability {
  if (ref.kind === "bench") {
    // Bench slots accommodate any player adequately.
    return "ok";
  }

  const slot = FORMATIONS[formation].slots[ref.index];
  if (!slot) return "ok";

  const role: Role = slot.role;
  const sc = SCOUTING_BY_ID.get(species.id);
  const worstRoles: readonly Role[] = sc?.worstRoles ?? [];
  const starterSlots = FORMATIONS[formation].slots;
  const maxFormationFit = Math.max(...starterSlots.map((s) => species.fits[s.role]));

  // Check for "bad" positions first
  const isWorstRole = worstRoles.includes(role);
  const isKeeperDisaster =
    role === "GK" && !species.bestRoles.includes("GK") && species.fits.GK < 40;
  const isLowQuality = species.quality[role] < 0.22;
  const isLowFit = species.fits[role] < 34;

  if (isWorstRole || isKeeperDisaster || (isLowQuality && isLowFit)) {
    return "bad";
  }

  // Check for "recommended" positions
  const isPrimaryBest = species.bestRoles[0] === role;
  const isTopBestInFormation =
    species.bestRoles.includes(role) && species.fits[role] >= maxFormationFit - 2;
  const isHighestFit = species.fits[role] === maxFormationFit && maxFormationFit >= 40;

  if (isPrimaryBest || isTopBestInFormation || isHighestFit) {
    return "recommended";
  }

  return "ok";
}
