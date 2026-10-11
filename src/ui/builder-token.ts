import {
  DraftError,
  RUN_TOKEN_VERSION,
  RunTokenError,
  decodeToken,
  encodeToken,
  runDraft,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type Lineup,
  type Seed,
} from "@/engine";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";
import { ALL_REFS, valueAt } from "./lineup";

export function builderToken(settings: DraftSettings, lineup: Lineup, seed: Seed): string {
  const actions: DraftAction[] = ALL_REFS.flatMap((slot) => {
    const species = valueAt(lineup, slot);
    return species === null ? [] : [{ type: "place" as const, species, slot }];
  });
  return encodeToken({ v: RUN_TOKEN_VERSION, settings, seed, actions });
}

// A builder token only names a lineup; it replays no cup. So one shared under a retained
// engine (same token format) opens on today's engine, which rates the lineup afresh.
function asLiveToken(token: string): string {
  const m = /^pd(\d+)\./.exec(token);
  return m !== null && RETAINED_TOKEN_VERSIONS.includes(Number(m[1]))
    ? `pd${RUN_TOKEN_VERSION}.${token.slice(m[0].length)}`
    : token;
}

export function draftFromBuilderToken(token: string): DraftState | null {
  try {
    const run = decodeToken(asLiveToken(token));
    if (run.settings.mode !== "builder") return null;
    return runDraft(run.settings, run.seed, run.actions);
  } catch (e) {
    if (e instanceof RunTokenError || e instanceof DraftError) return null;
    throw e;
  }
}
