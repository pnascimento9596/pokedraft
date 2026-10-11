import {
  DraftError,
  applyAction,
  createDraft,
  eligibleSpecies,
  type DraftSettings,
  type DraftState,
  type Lineup,
  type SpeciesId,
} from "@/engine";
import { createRng } from "@/lib/rng";
import { ALL_REFS, valueAt } from "@/ui/lineup";

// Everything the builder does with the species data. The home page loads this module with
// import() on first use, so its first load draws the empty pitch without the data.
export { applyAction, createDraft, eligibleSpecies, rateTeam, replay, speciesById } from "@/engine";
export { builderToken, draftFromBuilderToken } from "@/ui/builder-token";
export { swapMessage } from "@/ui/swap-message";
export { ResultsView } from "@/components/results/ResultsView";
export { Picker } from "./Picker";

// Rebuilds the draft under new settings and keeps every species that is still eligible there.
export function rebuildDraft(settings: DraftSettings, lineup: Lineup, seed: DraftState["seed"]) {
  let state = createDraft(settings, seed);
  for (const slot of ALL_REFS) {
    const species = valueAt(lineup, slot);
    if (species === null) continue;
    try {
      state = applyAction(state, { type: "place", species, slot });
    } catch (e) {
      if (!(e instanceof DraftError)) throw e;
    }
  }
  return state;
}

export function randomDraft(settings: DraftSettings, seed: DraftState["seed"], rngSeed: string) {
  const rng = createRng(rngSeed);
  const pool = [...eligibleSpecies(createDraft(settings, seed))];
  let state = createDraft(settings, seed);
  for (const slot of ALL_REFS) {
    if (pool.length === 0) break;
    const [species] = pool.splice(rng.int(pool.length), 1) as [SpeciesId];
    state = applyAction(state, { type: "place", species, slot });
  }
  return state;
}
