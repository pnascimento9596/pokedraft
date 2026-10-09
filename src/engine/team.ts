import { familiarity } from "@/scouting/fit";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { FORMATIONS } from "./formations";
import { speciesById } from "./species";
import { covers } from "./type-chart";
import {
  LINES,
  type Eleven,
  type FullLineup,
  type Line,
  type LineStrength,
  type Role,
  type SlotId,
  type SlotRating,
  type Species,
  type SynergyEdge,
  type SynergyReason,
  type TeamRating,
} from "./types";

const SCORE_SCALE = 1000;
const LINE_SCALE = 100;

function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function edgeReasons(a: Species, b: Species): SynergyReason[] {
  const reasons: SynergyReason[] = [];
  if (a.types.some((t) => (b.types as readonly string[]).includes(t))) reasons.push("sharedType");
  if (a.evoChainId === b.evoChainId) reasons.push("evoLine");
  if (a.gen === b.gen) reasons.push("sameGen");
  if (covers(a, b) || covers(b, a)) reasons.push("coverage");
  return reasons;
}

export function benchQuality(species: Species, roles: readonly Role[]): number {
  return Math.max(...roles.map((r) => species.quality[r]));
}

export function rateTeam(
  lineup: FullLineup,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): TeamRating {
  const formation = FORMATIONS[lineup.formation];
  const starters = lineup.starters.map(speciesById);
  const slots = formation.slots.map((slot, i): SlotRating => {
    const species = starters[i]!;
    return {
      slot: slot.id,
      species: species.id,
      role: slot.role,
      fit: species.fits[slot.role],
      familiarity: familiarity(species.bestRoles, slot.role),
      quality: species.quality[slot.role],
    };
  }) as unknown as Eleven<SlotRating>;

  const lineQuality = (line: Line): number =>
    mean(slots.filter((_, i) => formation.slots[i]!.line === line).map((s) => s.quality));
  const lines = Object.fromEntries(
    LINES.map((l) => [l, LINE_SCALE * lineQuality(l)]),
  ) as unknown as LineStrength;
  const core = LINES.reduce((sum, l) => sum + c.team.lineWeights[l] * lineQuality(l), 0);

  const teamMean = mean(slots.map((s) => s.quality));
  const lowest = slots
    .map((s, index) => ({ s, index }))
    .sort((a, b) => a.s.quality - b.s.quality || a.index - b.index)
    .slice(0, c.team.dragCount);
  const drag = c.team.dragWeight * mean(lowest.map(({ s }) => Math.max(0, teamMean - s.quality)));

  const bySlot = new Map<SlotId, Species>(
    formation.slots.map((slot, i) => [slot.id, starters[i]!]),
  );
  const edges = formation.adjacency.map(([a, b]): SynergyEdge => {
    const reasons = edgeReasons(bySlot.get(a)!, bySlot.get(b)!);
    const sum = reasons.reduce((total, r) => total + c.team.synergy[r], 0);
    return { a, b, reasons, value: Math.min(c.team.synergy.edgeCap, sum) };
  });
  const synergy = Math.min(
    1,
    edges.reduce((total, e) => total + e.value, 0) / (c.team.synergy.fullAt * edges.length),
  );

  const roles = [...new Set(formation.slots.map((s) => s.role))];
  const bench = mean(lineup.bench.map((id) => benchQuality(speciesById(id), roles)));

  const blend =
    c.team.coreWeight * (core - drag) + c.team.synergyWeight * synergy + c.team.benchWeight * bench;

  return {
    score: Math.round(SCORE_SCALE * clamp01(blend)),
    core,
    drag,
    synergy,
    bench,
    lines,
    slots,
    weakest: lowest.map(({ s }) => s.slot),
    edges,
  };
}

export function matchLines(
  rating: TeamRating,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): LineStrength {
  const centre = rating.score / (SCORE_SCALE / LINE_SCALE);
  const lineMean = mean(LINES.map((l) => rating.lines[l]));
  return Object.fromEntries(
    LINES.map((l) => [l, centre + c.match.shape * (rating.lines[l] - lineMean)]),
  ) as unknown as LineStrength;
}
