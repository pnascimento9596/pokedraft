import { z } from "zod";
import {
  decodeToken,
  encodeToken,
  replay,
  type CupResult,
  type DraftState,
  type ManagerAction,
} from "@/engine";
import { MATCH_VIEWS, type MatchView } from "@/ui/settings";
import {
  forgetRunSnapshot,
  readRunCheckpoint,
  readSession,
  RUN_CLEARED,
  runSlotKey,
  writeRunCheckpoint,
  writeSession,
  type RunSlot,
} from "@/ui/storage";
import { runToken, startRun, step, type Run } from "./runState";

// Snapshots keep only the run token (settings, seed, actions) and which screen it was on. Everything
// else is rebuilt by replaying the actions through the engine, so a restored run cannot drift from
// the one that was played. A matchday snapshot's token carries the touchline decisions so far.
const matchdaySchema = z.object({
  match: z.number().int().nonnegative(),
  view: z.enum(MATCH_VIEWS),
  managerMode: z.boolean(),
});
const savedSchema = z.union([
  z.object({
    screen: z.enum(["draft", "results"]),
    token: z.string(),
    daily: z.string().nullable(),
  }),
  z.object({
    screen: z.literal("matchday"),
    token: z.string(),
    daily: z.string().nullable(),
    matchday: matchdaySchema,
  }),
]);
type Saved = z.infer<typeof savedSchema>;

/** Where a matchday stood: the match on screen and how it is being played. */
export type MatchdayAt = z.infer<typeof matchdaySchema>;

export type Restored =
  | { readonly kind: "draft"; readonly run: Run }
  | {
      readonly kind: "results";
      readonly token: string;
      readonly draft: DraftState;
      readonly cup: CupResult;
    }
  | {
      readonly kind: "matchday";
      readonly run: Run;
      /** The draft's own token, without the touchline decisions. */
      readonly token: string;
      readonly draft: DraftState;
      /** The cup as the decisions so far play it. */
      readonly cup: CupResult;
      readonly actions: readonly ManagerAction[];
      readonly match: number;
      readonly view: MatchView;
      readonly managerMode: boolean;
    };

export type { RunSlot };

type SettledScreen = "draft" | "results";

function snapshot(slot: RunSlot, screen: SettledScreen, token: string, at?: undefined): string;
function snapshot(slot: RunSlot, screen: "matchday", token: string, at: MatchdayAt): string;
function snapshot(slot: RunSlot, screen: Saved["screen"], token: string, at?: MatchdayAt): string {
  const saved: Saved =
    screen === "matchday"
      ? { screen, token, daily: slot.daily, matchday: at! }
      : { screen, token, daily: slot.daily };
  return JSON.stringify(saved);
}

export function saveRun(slot: RunSlot, screen: SettledScreen, token: string): void;
export function saveRun(slot: RunSlot, screen: "matchday", token: string, at: MatchdayAt): void;
export function saveRun(
  slot: RunSlot,
  screen: Saved["screen"],
  token: string,
  at?: MatchdayAt,
): void {
  const raw =
    screen === "matchday" ? snapshot(slot, screen, token, at!) : snapshot(slot, screen, token);
  writeSession(runSlotKey(slot), raw);
  writeRunCheckpoint(slot, raw);
}

export function forgetRun(
  slot: RunSlot,
  own?: { readonly screen: SettledScreen; readonly token: string },
): void {
  forgetRunSnapshot(slot, own === undefined ? undefined : snapshot(slot, own.screen, own.token));
}

function parse(raw: string): Saved | null {
  try {
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Replays the stored actions on this page's settings. The rebuilt token must equal the stored one,
// which proves the settings, the seed and every action match; anything else is not this page's run.
function rebuild(slot: RunSlot, saved: Saved): Run | null {
  try {
    const decoded = decodeToken(saved.token);
    const { seed, actions } = decoded;
    if (slot.seed !== null && seed !== slot.seed) return null;
    const run = actions.reduce(step, startRun(slot.settings, seed));
    // A coached run carries its touchline decisions after the draft; the draft part must still
    // rebuild exactly, and the whole token must be in the form this build writes.
    if (runToken(run) !== encodeToken({ ...decoded, manager: [] })) return null;
    return encodeToken(decoded) === saved.token ? run : null;
  } catch {
    return null;
  }
}

/**
 * A friendly's matchday from the home builder, saved in the builder slot. The page has no settings
 * of its own, so the saved token names them.
 */
export function restoreFriendly(slot: RunSlot): Extract<Restored, { kind: "matchday" }> | null {
  const session = readSession(runSlotKey(slot));
  const raw = session !== null && session !== RUN_CLEARED ? session : readRunCheckpoint(slot);
  const saved = raw === null ? null : parse(raw);
  if (saved?.screen !== "matchday") return null;
  try {
    const { settings } = decodeToken(saved.token);
    if (settings.mode !== slot.settings.mode) return null;
    const restored = restoreRun({ ...slot, settings });
    return restored?.kind === "matchday" ? restored : null;
  } catch {
    return null;
  }
}

export function restoreRun(slot: RunSlot): Restored | null {
  const session = readSession(runSlotKey(slot));
  if (session === RUN_CLEARED) return null;
  const raw = session !== null && parse(session) !== null ? session : readRunCheckpoint(slot);
  if (raw === null) return null;
  const saved = parse(raw);
  if (saved === null || saved.daily !== slot.daily) return null;
  const run = rebuild(slot, saved);
  if (run === null) return null;
  const keep = () => {
    writeSession(runSlotKey(slot), raw);
    if (readRunCheckpoint(slot) === null) writeRunCheckpoint(slot, raw);
  };
  if (saved.screen === "draft") {
    keep();
    return { kind: "draft", run };
  }
  // A matchday is a run still in progress, so it comes back from a durable checkpoint like a draft.
  if (saved.screen === "matchday") {
    try {
      const { draft, cup } = replay(saved.token);
      if (cup.matches[saved.matchday.match]?.status !== "played") return null;
      keep();
      return {
        kind: "matchday",
        run,
        token: runToken(run),
        draft,
        cup,
        actions: decodeToken(saved.token).manager ?? [],
        ...saved.matchday,
      };
    } catch {
      return null;
    }
  }
  // An unseeded challenge run entered without an active session token must not
  // restore an old completed run's results page from durable localStorage.
  if (slot.seed === null && slot.daily === null && session === null) {
    return null;
  }
  try {
    const { draft, cup } = replay(saved.token);
    keep();
    return { kind: "results", token: saved.token, draft, cup };
  } catch {
    return null;
  }
}
