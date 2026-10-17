import type { CupResult, CupRound, DraftState, GoalEvent, SpeciesId } from "@/engine";
import { FORMATIONS } from "@/engine/formations";
import { speciesById } from "@/engine/species";
import { pokedexById } from "@/data/pokedex";
import type { PokemonType } from "@/data/pokedex";
import { MOVE_TRAITS } from "@/scouting/move-traits";
import { ROUND_LABEL, ROUND_SHORT } from "@/ui/labels";
import { finalScore, type PlayedMatch } from "./format";
import { getAbilityMeta } from "./abilityEffects";

export interface MatchStar {
  readonly round: CupRound | "mvp";
  readonly roundLabel: string;
  readonly roundShort: string;
  readonly speciesId: SpeciesId;
  readonly name: string;
  readonly role: string;
  /** Decorative glyph shown before the headline; rendered aria-hidden. */
  readonly icon: string;
  readonly headline: string;
  readonly statSummary: string;
  readonly ability: string;
  readonly abilityFlavor: string;
  readonly element: PokemonType;
  readonly kickMove: string;
  readonly action: "attack" | "defend";
  readonly matchScore: string;
  readonly outcome: "W" | "D" | "L";
  readonly opponentName: string;
  readonly isTournamentMvp?: boolean;
}

function roleForSpecies(id: SpeciesId, draft: DraftState): string {
  const formation = FORMATIONS[draft.settings.formation];
  const starterIdx = draft.lineup.starters.indexOf(id);
  if (starterIdx >= 0 && starterIdx < formation.slots.length) {
    return formation.slots[starterIdx]!.role;
  }
  const benchIdx = draft.lineup.bench.indexOf(id);
  if (benchIdx >= 0) {
    return `SUB ${benchIdx + 1}`;
  }
  return "MID";
}

function capitalizeWords(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pickSignatureMove(
  moves: readonly string[] | undefined,
  defensive: boolean,
  fallback: string,
): string {
  if (!moves || moves.length === 0) return fallback;
  const preferred = defensive
    ? (["reflex", "header", "kick"] as const)
    : (["kick", "header"] as const);
  for (const trait of preferred) {
    const match = moves.find((m) => (MOVE_TRAITS[m] ?? "kick") === trait);
    if (match) return capitalizeWords(match);
  }
  return fallback;
}

function leftEarly(match: PlayedMatch, id: SpeciesId): boolean {
  return (match.incidents ?? []).some(
    (i) =>
      (i.kind === "sub" && i.out === id) ||
      ((i.kind === "injury" || i.kind === "red") && i.side === "user" && i.player === id),
  );
}

// The first player in formation order, keeper first, who held a starting slot for the whole
// match: a starter, or the stand-in for an absent one, and never one subbed, injured or sent off.
function fullMatchAnchor(match: PlayedMatch, draft: DraftState): SpeciesId {
  for (const starter of draft.lineup.starters) {
    const absence = match.absences.find((a) => a.out === starter);
    const id = absence ? absence.in : starter;
    if (id !== null && !leftEarly(match, id)) return id;
  }
  return draft.lineup.starters[0] ?? (1 as SpeciesId);
}

export function getMatchStar(match: PlayedMatch, draft: DraftState): MatchStar {
  const score = finalScore(match);
  const scoreline = `${score.user}-${score.opp}`;
  const userGoals = match.goals.filter(
    (g): g is Extract<GoalEvent, { side: "user" }> => g.side === "user",
  );

  let starId: SpeciesId = draft.lineup.starters[0] ?? (1 as SpeciesId);
  let icon = "";
  let headline = "";
  let statSummary = "";

  if (userGoals.length > 0) {
    const counts = new Map<
      SpeciesId,
      { goals: number; assists: number; latestMinute: number; isWinner: boolean }
    >();

    for (const g of userGoals) {
      const prev = counts.get(g.scorer) ?? {
        goals: 0,
        assists: 0,
        latestMinute: 0,
        isWinner: false,
      };
      counts.set(g.scorer, {
        ...prev,
        goals: prev.goals + 1,
        latestMinute: Math.max(prev.latestMinute, g.minute),
      });

      if (g.assist !== null) {
        const assistPrev = counts.get(g.assist) ?? {
          goals: 0,
          assists: 0,
          latestMinute: 0,
          isWinner: false,
        };
        counts.set(g.assist, {
          ...assistPrev,
          assists: assistPrev.assists + 1,
        });
      }
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => {
      if (b[1].goals !== a[1].goals) return b[1].goals - a[1].goals;
      if (b[1].assists !== a[1].assists) return b[1].assists - a[1].assists;
      return b[1].latestMinute - a[1].latestMinute;
    });

    const [topId, topStats] = sorted[0]!;
    starId = topId;

    icon = topStats.goals > 0 ? "⚽" : "🎯";
    if (topStats.goals >= 3) {
      headline = `Hat-Trick Hero (${topStats.goals} Goals)`;
    } else if (topStats.goals === 2) {
      headline = `Match Brace (${topStats.goals} Goals)`;
    } else if (topStats.goals === 1) {
      headline = `Goal Scorer (${topStats.latestMinute}')`;
    } else {
      headline = `Key Playmaker (${topStats.assists} Assist${topStats.assists > 1 ? "s" : ""})`;
    }

    const parts = [
      topStats.goals > 0 ? `${topStats.goals} ${topStats.goals === 1 ? "Goal" : "Goals"}` : null,
      topStats.assists > 0
        ? `${topStats.assists} ${topStats.assists === 1 ? "Assist" : "Assists"}`
        : null,
    ].filter(Boolean);
    statSummary = parts.join(" • ") || "Dominant attacking display";
  } else if (match.shootout !== null && match.outcome === "W") {
    starId = match.shootout.keeper;
    icon = "🧤";
    headline = "Shootout Hero";
    statSummary = "Decisive penalty shootout triumph";
  } else if (score.opp === 0 && match.shootout === null) {
    starId = fullMatchAnchor(match, draft);
    icon = "🧤";
    headline = "Clean Sheet Hero";
    statSummary = "Unbroken defensive shutout";
  } else {
    starId = fullMatchAnchor(match, draft);
    icon = "🌟";
    headline = "Squad Anchor";
    statSummary = "Battled through fierce pressure";
  }

  const species = speciesById(starId);
  const dex = pokedexById(starId);
  const abilityName = dex?.abilities[0]?.name ?? "Keen Eye";
  const abilityId = dex?.abilities[0]?.id ?? "keen-eye";
  const primaryType = (dex?.types[0] ?? species.types[0] ?? "normal") as PokemonType;
  const isDefensiveStar = userGoals.length === 0;
  const kickMove = pickSignatureMove(
    dex?.kickMoves,
    isDefensiveStar,
    isDefensiveStar ? "Reflex Save" : "Power Volley",
  );
  const abilityMeta = getAbilityMeta(abilityId, abilityName, primaryType);

  return {
    round: match.round,
    roundLabel: ROUND_LABEL[match.round],
    roundShort: ROUND_SHORT[match.round],
    speciesId: starId,
    name: species.name,
    role: roleForSpecies(starId, draft),
    icon,
    headline,
    statSummary,
    ability: abilityMeta.name,
    abilityFlavor: abilityMeta.flavor,
    element: primaryType,
    kickMove,
    action: isDefensiveStar ? "defend" : "attack",
    matchScore: scoreline,
    outcome: match.outcome,
    opponentName: match.opponent.name,
  };
}

export function getTournamentMvp(cup: CupResult, draft: DraftState): MatchStar {
  const pot = cup.awards.playerOfTournament;
  const starId = pot.species;
  const species = speciesById(starId);
  const dex = pokedexById(starId);
  const abilityName = dex?.abilities[0]?.name ?? "Mastery";
  const abilityId = dex?.abilities[0]?.id ?? "mastery";
  const primaryType = (dex?.types[0] ?? species.types[0] ?? "normal") as PokemonType;
  const defensive = pot.goals === 0 && pot.assists === 0;
  const kickMove = pickSignatureMove(
    dex?.kickMoves,
    defensive,
    defensive ? "Reflex Save" : "Champion Strike",
  );
  const abilityMeta = getAbilityMeta(abilityId, abilityName, primaryType);

  const statParts = [
    `${pot.goals} ${pot.goals === 1 ? "Goal" : "Goals"}`,
    `${pot.assists} ${pot.assists === 1 ? "Assist" : "Assists"}`,
    `${pot.appearances} Apps`,
  ];

  return {
    round: "mvp",
    roundLabel: "Tournament MVP",
    roundShort: "MVP",
    speciesId: starId,
    name: species.name,
    role: roleForSpecies(starId, draft),
    icon: "🏆",
    headline: "Player of the Tournament",
    statSummary: statParts.join(" • "),
    ability: abilityMeta.name,
    abilityFlavor: abilityMeta.flavor,
    element: primaryType,
    kickMove,
    action: defensive ? "defend" : "attack",
    matchScore: `${cup.wins}-${cup.draws}-${cup.losses}`,
    outcome: cup.wins > cup.losses ? "W" : cup.wins < cup.losses ? "L" : "D",
    opponentName: "Silph Cup",
    isTournamentMvp: true,
  };
}

export function getAllMatchStars(cup: CupResult, draft: DraftState): MatchStar[] {
  const stars: MatchStar[] = [];
  for (const m of cup.matches) {
    if (m.status === "played") {
      stars.push(getMatchStar(m, draft));
    }
  }
  stars.push(getTournamentMvp(cup, draft));
  return stars;
}
