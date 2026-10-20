import {
  speciesById,
  type FullLineup,
  type Lineup,
  type RunToken,
  type Seed,
  type SlotRef,
} from "@/engine";
import { draftFromBuilderToken } from "./builder-token";
import { emptyLineup, valueAt } from "./lineup";
import { readAnyToken } from "./read-token";
import type { RunRecord } from "./runs";

export interface ExhibitionQuery {
  readonly home: string | null;
  readonly away: string | null;
  readonly rematch: number;
  readonly legs: 1 | 2;
  readonly name: string | null;
}

export const NAME_LIMIT = 20;

function param(q: URLSearchParams, key: string): string | null {
  const value = q.get(key);
  return value === null || value === "" ? null : value;
}

function cleanName(raw: string | null): string | null {
  if (raw === null) return null;
  const name = [...raw.replace(/[\u0000-\u001f\u007f]/g, "").trim()].slice(0, NAME_LIMIT).join("");
  return name === "" ? null : name;
}

// Tokens hold a dot (pd6.<payload>), so home and away travel as named params, not one ex=a.b.n.
export function parseExhibitionQuery(q: URLSearchParams): ExhibitionQuery {
  const n = q.get("n");
  const rematch = n !== null && /^\d+$/.test(n) ? Number(n) : 0;
  return {
    home: param(q, "home"),
    away: param(q, "away"),
    rematch: Number.isSafeInteger(rematch) ? rematch : 0,
    legs: q.get("legs") === "2" ? 2 : 1,
    name: cleanName(q.get("name")),
  };
}

export function exhibitionHref(
  query: Partial<ExhibitionQuery> & { readonly away: string },
): string {
  const q = new URLSearchParams();
  if (query.home) q.set("home", query.home);
  q.set("away", query.away);
  if (query.rematch) q.set("n", String(query.rematch));
  if (query.legs === 2) q.set("legs", "2");
  if (query.name) q.set("name", query.name);
  return `/exhibition?${q.toString()}`;
}

export interface ExhibitionSquad {
  readonly lineup: FullLineup;
  readonly seed: Seed;
}

function swapped(lineup: Lineup, a: SlotRef, b: SlotRef): Lineup {
  return placed(placed(lineup, a, valueAt(lineup, b)), b, valueAt(lineup, a));
}

function placed(lineup: Lineup, ref: SlotRef, value: Lineup["starters"][number]): Lineup {
  const key = ref.kind === "starter" ? "starters" : "bench";
  const slots = lineup[key].map((v, i) => (i === ref.index ? value : v));
  return { ...lineup, [key]: slots };
}

// A drafted run's picks and swaps say where each species stands, so its squad is read without
// replaying the draft. That also covers retained tokens, whose rolls the live engine cannot redo.
function draftedLineup(run: RunToken): Lineup | null {
  let lineup = emptyLineup(run.settings.formation);
  let committed: SlotRef | null = null;
  for (const action of run.actions) {
    if (action.type === "chooseSlot") {
      committed = action.slot;
    } else if (action.type === "pick") {
      const slot = committed ?? action.slot;
      if (slot === null || valueAt(lineup, slot) !== null) return null;
      lineup = placed(lineup, slot, action.species);
      committed = null;
    } else if (action.type === "swap") {
      lineup = swapped(lineup, action.a, action.b);
    } else if (action.type !== "reroll") {
      return null;
    }
  }
  return lineup;
}

function full(lineup: Lineup): FullLineup | null {
  const ids = [...lineup.starters, ...lineup.bench];
  if (ids.some((id) => id === null) || new Set(ids).size !== ids.length) return null;
  try {
    for (const id of ids) speciesById(id!);
  } catch {
    return null;
  }
  return lineup as FullLineup;
}

export function squadFromToken(token: string): ExhibitionSquad | null {
  const run = readAnyToken(token);
  if (run === null) return null;
  if (run.settings.mode === "builder") {
    const draft = draftFromBuilderToken(token);
    const lineup = draft === null ? null : full(draft.lineup);
    return draft === null || lineup === null ? null : { lineup, seed: draft.seed };
  }
  const drafted = draftedLineup(run);
  const lineup = drafted === null ? null : full(drafted);
  return lineup === null ? null : { lineup, seed: run.seed };
}

export function sameSquad(a: FullLineup, b: FullLineup): boolean {
  return (
    a.formation === b.formation &&
    [...a.starters, ...a.bench].every((id, i) => id === [...b.starters, ...b.bench][i])
  );
}

export type Challenger =
  | { readonly kind: "history"; readonly token: string; readonly run: RunRecord }
  | { readonly kind: "builder"; readonly token: string };

// History is stored newest first, so the first qualifying record is the newest.
export function challengers(
  history: readonly RunRecord[],
  builderSave: unknown,
): readonly Challenger[] {
  const runs: Challenger[] = history
    .filter((run) => run.squadSpeciesIds?.length === 16 && squadFromToken(run.token) !== null)
    .map((run) => ({ kind: "history", token: run.token, run }));
  const builder =
    typeof builderSave === "string" &&
    !runs.some((run) => run.token === builderSave) &&
    squadFromToken(builderSave) !== null
      ? [{ kind: "builder" as const, token: builderSave }]
      : [];
  return [...runs, ...builder];
}

export function defaultChallenger(
  history: readonly RunRecord[],
  builderSave: unknown,
): string | null {
  return challengers(history, builderSave)[0]?.token ?? null;
}

export function awayName(name: string | null): string {
  return name === null ? "Their squad" : `${name}'s squad`;
}
