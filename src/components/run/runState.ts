import {
  DraftError,
  RUN_TOKEN_VERSION,
  applyAction,
  createDraft,
  eligibleSpecies,
  encodeToken,
  speciesById,
  type DraftAction,
  type DraftErrorCode,
  type DraftSettings,
  type DraftState,
  type PokemonType,
  type Roll,
  type Seed,
  type SpeciesId,
} from "@/engine";
import type { RollCause } from "@/components/wheel/reel";

// The engine DraftState is the single source of truth. The action log doubles as the run token;
// `rollId` bumps whenever the engine produces a new roll so the wheel replays exactly once per roll.
export interface Run {
  readonly seed: Seed;
  readonly actions: readonly DraftAction[];
  readonly state: DraftState;
  readonly rollId: number;
  readonly cause: RollCause;
  readonly error: string | null;
}

const ERROR_COPY: Readonly<Partial<Record<DraftErrorCode, string>>> = {
  slotOccupied: "That slot is already filled. Pick an empty one.",
  slotMismatch: "This round's slot is locked in. Swap the other players instead.",
  slotRequired: "Tap an empty slot to place the player.",
  noRerolls: "No rerolls left.",
  wrongPhase: "Not right now. Finish the current step first.",
  notOffered: "That player was not rolled this round.",
  alreadyDrafted: "That player is already in your squad.",
  ineligible: "That player cannot join this squad.",
  noAlternatives: "Nothing else left to roll.",
};

export function startRun(settings: DraftSettings, seed: string): Run {
  return {
    seed: seed as Seed,
    actions: [],
    state: createDraft(settings, seed as Seed),
    rollId: 0,
    cause: "new",
    error: null,
  };
}

function rollOf(state: DraftState): Roll | null {
  return state.phase.kind === "choosing" ? state.phase.roll : null;
}

export function step(run: Run, action: DraftAction): Run {
  let next: DraftState;
  try {
    next = applyAction(run.state, action);
  } catch (e) {
    if (!(e instanceof DraftError)) throw e;
    return { ...run, error: ERROR_COPY[e.code] ?? "That move is not allowed." };
  }
  const roll = rollOf(next);
  const fresh = roll !== null && roll !== rollOf(run.state);
  return {
    ...run,
    actions: [...run.actions, action],
    state: next,
    rollId: fresh ? run.rollId + 1 : run.rollId,
    cause: fresh ? (action.type === "reroll" ? action.target : "new") : run.cause,
    error: null,
  };
}

export function withHint(run: Run, hint: string | null): Run {
  return { ...run, error: hint };
}

export function runToken(run: Run): string {
  return encodeToken({
    v: RUN_TOKEN_VERSION,
    settings: run.state.settings,
    seed: run.seed,
    actions: run.actions,
  });
}

export function candidatesFor(state: DraftState): readonly SpeciesId[] {
  const roll = rollOf(state);
  if (roll === null) return [];
  if (roll.kind === "species") return [roll.species];
  if (roll.offers !== null) return roll.offers;
  return eligibleSpecies(state).filter((id) => {
    const sp = speciesById(id);
    return sp.region === roll.region && (sp.types as readonly PokemonType[]).includes(roll.type);
  });
}
