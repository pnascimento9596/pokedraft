import { z } from "zod";
import { decodeToken, replay, type CupResult, type DraftState } from "@/engine";
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
// the one that was played.
const savedSchema = z.object({
  screen: z.enum(["draft", "results"]),
  token: z.string(),
  daily: z.string().nullable(),
});
type Saved = z.infer<typeof savedSchema>;

export type Restored =
  | { readonly kind: "draft"; readonly run: Run }
  | {
      readonly kind: "results";
      readonly token: string;
      readonly draft: DraftState;
      readonly cup: CupResult;
    };

export type { RunSlot };

function snapshot(slot: RunSlot, screen: Saved["screen"], token: string): string {
  const saved: Saved = { screen, token, daily: slot.daily };
  return JSON.stringify(saved);
}

export function saveRun(slot: RunSlot, screen: Saved["screen"], token: string): void {
  const raw = snapshot(slot, screen, token);
  writeSession(runSlotKey(slot), raw);
  writeRunCheckpoint(slot, raw);
}

export function forgetRun(slot: RunSlot, own?: Pick<Saved, "screen" | "token">): void {
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
    const { seed, actions } = decodeToken(saved.token);
    if (slot.seed !== null && seed !== slot.seed) return null;
    const run = actions.reduce(step, startRun(slot.settings, seed));
    return runToken(run) === saved.token ? run : null;
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
  if (saved.screen === "draft") {
    writeSession(runSlotKey(slot), raw);
    if (readRunCheckpoint(slot) === null) writeRunCheckpoint(slot, raw);
    return { kind: "draft", run };
  }
  // An unseeded challenge run entered without an active session token must not
  // restore an old completed run's results page from durable localStorage.
  if (slot.seed === null && slot.daily === null && session === null) {
    return null;
  }
  try {
    const { draft, cup } = replay(saved.token);
    writeSession(runSlotKey(slot), raw);
    if (readRunCheckpoint(slot) === null) writeRunCheckpoint(slot, raw);
    return { kind: "results", token: saved.token, draft, cup };
  } catch {
    return null;
  }
}
