import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";
import {
  applyAction,
  createDraft,
  eligibleSpecies,
  encodeToken,
  speciesById,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type Seed,
  type SlotRef,
  type SpeciesId,
  type StarterIndex,
  type BenchIndex,
} from "@/engine";

export async function migratedDb(): Promise<{ db: Db; client: PGlite }> {
  const client = await PGlite.create();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, "../../../../drizzle") });
  return { db: db as unknown as Db, client };
}

const SLOTS: SlotRef[] = [
  ...Array.from({ length: 11 }, (_, i) => ({ kind: "starter", index: i as StarterIndex }) as const),
  ...Array.from({ length: 5 }, (_, i) => ({ kind: "bench", index: i as BenchIndex }) as const),
];

function firstPick(state: DraftState): SpeciesId {
  if (state.phase.kind !== "choosing") throw new Error(`no roll in ${state.phase.kind}`);
  const roll = state.phase.roll;
  if (roll.kind === "species") return roll.species;
  if (roll.offers !== null) return roll.offers[0]!;
  return eligibleSpecies(state).find((id) => {
    const sp = speciesById(id);
    return sp.region === roll.region && (sp.types as readonly string[]).includes(roll.type);
  })!;
}

// A fixed script with no bot logic: first legal species into each slot in order.
export function scriptedToken(settings: DraftSettings, seed: string): string {
  const actions: DraftAction[] = [];
  let state = createDraft(settings, seed as Seed);
  const push = (a: DraftAction): void => {
    actions.push(a);
    state = applyAction(state, a);
  };
  for (const slot of SLOTS) {
    if (settings.mode === "builder") {
      push({ type: "place", species: eligibleSpecies(state)[0]!, slot });
      continue;
    }
    if (settings.order === "positionFirst") push({ type: "chooseSlot", slot });
    const species = firstPick(state);
    push({ type: "pick", species, slot });
  }
  return encodeToken({ v: 1, settings, seed: seed as Seed, actions });
}
