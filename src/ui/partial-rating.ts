import { ENGINE_COEFFICIENTS } from "@/engine/coefficients";
import { FORMATIONS } from "@/engine/formations";
import { speciesById } from "@/engine/species";
import { benchQuality } from "@/engine/team";
import { covers } from "@/engine/type-chart";
import { LINES, type Line } from "@/engine/types";
import type {
  Lineup,
  SlotId,
  SlotRef,
  Species,
  SpeciesId,
  SynergyEdge,
  SynergyReason,
} from "@/engine/types";
import { ALL_REFS, valueAt } from "./lineup";

export { SYNERGY_REASON_LABEL } from "./chemistry-labels";

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

export interface PartialLineRating {
  readonly line: Line;
  readonly filled: number;
  readonly total: number;
  readonly strength: number | null;
}

export function ratePartialLines(lineup: Lineup): readonly PartialLineRating[] {
  const slots = FORMATIONS[lineup.formation].slots;
  return LINES.map((line) => {
    const inLine = slots.flatMap((slot, index) =>
      slot.line === line ? [{ slot, id: lineup.starters[index] }] : [],
    );
    const qualities = inLine.flatMap(({ slot, id }) =>
      id == null ? [] : [speciesById(id).quality[slot.role]],
    );
    return {
      line,
      filled: qualities.length,
      total: inLine.length,
      strength:
        qualities.length === 0
          ? null
          : (100 * qualities.reduce((sum, quality) => sum + quality, 0)) / qualities.length,
    };
  });
}

const SCORE_SCALE = 1000;

function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// rateTeam's formula over the filled slots only. Every operation runs in rateTeam's order, so a
// full lineup gives the engine's exact score; a missing line or an empty bench drops out with its
// weight renormalised, and an empty slot is never assumed to hold anyone.
export function provisionalTeamScore(lineup: Lineup): number | null {
  const c = ENGINE_COEFFICIENTS.team;
  const formation = FORMATIONS[lineup.formation];
  const filled = formation.slots.flatMap((slot, index) => {
    const id = lineup.starters[index] ?? null;
    return id === null ? [] : [{ line: slot.line, quality: speciesById(id).quality[slot.role] }];
  });
  if (filled.length === 0) return null;

  const present = LINES.filter((l) => filled.some((s) => s.line === l));
  const lineQuality = (line: Line): number =>
    mean(filled.filter((s) => s.line === line).map((s) => s.quality));
  const weighted = present.reduce((sum, l) => sum + c.lineWeights[l] * lineQuality(l), 0);
  const core =
    present.length === LINES.length
      ? weighted
      : weighted / present.reduce((sum, l) => sum + c.lineWeights[l], 0);

  const teamMean = mean(filled.map((s) => s.quality));
  const lowest = filled
    .map((s, index) => ({ s, index }))
    .sort((a, b) => a.s.quality - b.s.quality || a.index - b.index)
    .slice(0, c.dragCount);
  const drag = c.dragWeight * mean(lowest.map(({ s }) => Math.max(0, teamMean - s.quality)));

  const synergy = ratePartialLineup(lineup).synergy ?? 0;

  const roles = [...new Set(formation.slots.map((s) => s.role))];
  const benchIds = lineup.bench.filter((id): id is SpeciesId => id !== null);
  const blend =
    benchIds.length === 0
      ? (c.coreWeight * (core - drag) + c.synergyWeight * synergy) /
        (c.coreWeight + c.synergyWeight)
      : c.coreWeight * (core - drag) +
        c.synergyWeight * synergy +
        c.benchWeight * mean(benchIds.map((id) => benchQuality(speciesById(id), roles)));

  const x = Math.max(0, Math.min(1, blend));
  return Math.round(SCORE_SCALE * (x + c.curve * x * (1 - x)));
}

function withCandidate(lineup: Lineup, ref: SlotRef, id: SpeciesId): Lineup {
  if (ref.kind === "starter") {
    const starters = [...lineup.starters];
    starters[ref.index] = id;
    return { ...lineup, starters: starters as unknown as Lineup["starters"] };
  }
  const bench = [...lineup.bench];
  bench[ref.index] = id;
  return { ...lineup, bench: bench as unknown as Lineup["bench"] };
}

export interface CandidateDelta {
  readonly slot: SlotRef;
  readonly delta: number;
}

// The change in the live Team Score from signing `candidate` into `slot`, or into the empty slot
// that scores best (the first in slot order on a tie) when `slot` is null.
export function candidateScoreDelta(
  lineup: Lineup,
  candidate: SpeciesId,
  slot: SlotRef | null,
): CandidateDelta | null {
  const current = provisionalTeamScore(lineup);
  if (current === null) return null;
  let best: CandidateDelta | null = null;
  for (const ref of slot === null ? ALL_REFS : [slot]) {
    if (valueAt(lineup, ref) !== null) continue;
    const delta = provisionalTeamScore(withCandidate(lineup, ref, candidate))! - current;
    if (best === null || delta > best.delta) best = { slot: ref, delta };
  }
  return best;
}

export function formatDelta(delta: number): string {
  return delta < 0 ? `-${-delta}` : `+${delta}`;
}
