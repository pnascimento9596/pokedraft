import { ENGINE_COEFFICIENTS } from "@/engine/coefficients";
import { FORMATIONS } from "@/engine/formations";
import { speciesById } from "@/engine/species";
import { covers } from "@/engine/type-chart";
import type {
  Lineup,
  SlotId,
  Species,
  SpeciesId,
  SynergyEdge,
  SynergyReason,
} from "@/engine/types";

export const SYNERGY_REASON_LABEL: Readonly<Record<SynergyReason, string>> = {
  sharedType: "Shared Type",
  evoLine: "Evo Line",
  sameGen: "Same Region",
  coverage: "Type Cover",
};

export interface PartialLineupRating {
  readonly edges: readonly SynergyEdge[];
  readonly synergy: number | null;
  readonly specialCount: number;
  readonly filledStarters: number;
}

function edgeReasons(a: Species, b: Species): SynergyReason[] {
  const reasons: SynergyReason[] = [];
  if (a.types.some((t) => (b.types as readonly string[]).includes(t))) reasons.push("sharedType");
  if (a.evoChainId === b.evoChainId) reasons.push("evoLine");
  if (a.gen === b.gen) reasons.push("sameGen");
  if (covers(a, b) || covers(b, a)) reasons.push("coverage");
  return reasons;
}

function edgeBetween(aSlot: SlotId, bSlot: SlotId, a: Species, b: Species): SynergyEdge {
  const c = ENGINE_COEFFICIENTS.team.synergy;
  const reasons = edgeReasons(a, b);
  const sum = reasons.reduce((total, r) => total + c[r], 0);
  return { a: aSlot, b: bSlot, reasons, value: Math.min(c.edgeCap, sum) };
}

export function ratePartialLineup(lineup: Lineup): PartialLineupRating {
  const formation = FORMATIONS[lineup.formation];
  const bySlot = new Map<SlotId, Species>();
  let specialCount = 0;

  for (let i = 0; i < formation.slots.length; i++) {
    const id = lineup.starters[i] ?? null;
    if (id === null) continue;
    const sp = speciesById(id);
    bySlot.set(formation.slots[i]!.id, sp);
    if (sp.special) specialCount += 1;
  }
  for (const id of lineup.bench) {
    if (id === null) continue;
    if (speciesById(id).special) specialCount += 1;
  }

  const edges: SynergyEdge[] = [];
  for (const [a, b] of formation.adjacency) {
    const spA = bySlot.get(a);
    const spB = bySlot.get(b);
    if (spA === undefined || spB === undefined) continue;
    edges.push(edgeBetween(a, b, spA, spB));
  }

  const synergy =
    edges.length === 0
      ? null
      : Math.min(
          1,
          edges.reduce((total, e) => total + e.value, 0) /
            (ENGINE_COEFFICIENTS.team.synergy.fullAt * formation.adjacency.length),
        );

  return {
    edges,
    synergy,
    specialCount,
    filledStarters: bySlot.size,
  };
}

export function previewCandidateEdges(
  lineup: Lineup,
  candidateId: SpeciesId,
): readonly SynergyEdge[] {
  const formation = FORMATIONS[lineup.formation];
  const candidate = speciesById(candidateId);
  const bySlot = new Map<SlotId, Species>();
  const emptySlots = new Set<SlotId>();

  for (let i = 0; i < formation.slots.length; i++) {
    const slotId = formation.slots[i]!.id;
    const id = lineup.starters[i] ?? null;
    if (id === null) {
      emptySlots.add(slotId);
    } else {
      bySlot.set(slotId, speciesById(id));
    }
  }

  const previews: SynergyEdge[] = [];
  for (const [a, b] of formation.adjacency) {
    if (emptySlots.has(a) && bySlot.has(b)) {
      const edge = edgeBetween(a, b, candidate, bySlot.get(b)!);
      if (edge.value > 0) previews.push(edge);
    } else if (bySlot.has(a) && emptySlots.has(b)) {
      const edge = edgeBetween(a, b, bySlot.get(a)!, candidate);
      if (edge.value > 0) previews.push(edge);
    }
  }
  return previews;
}
