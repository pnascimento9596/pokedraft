import { z } from "zod";
import {
  decodeToken,
  replay,
  type CupResult,
  type DraftState,
} from "@/engine";
import { readSession, runSlotKey, writeSession, type RunSlot } from "@/ui/storage";
import { runToken, startRun, step, type Run } from "./runState";

// The tab keeps only the run token (settings, seed, actions) and which screen it was on. Everything
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

export function saveRun(slot: RunSlot, screen: Saved["screen"], token: string): void {
  const saved: Saved = { screen, token, daily: slot.daily };
  writeSession(runSlotKey(slot), JSON.stringify(saved));
}

export function forgetRun(slot: RunSlot): void {
  writeSession(runSlotKey(slot), null);
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
  const raw = readSession(runSlotKey(slot));
  if (raw === null) return null;
  const saved = parse(raw);
  if (saved === null || saved.daily !== slot.daily) {
    forgetRun(slot);
    return null;
  }
  const run = rebuild(slot, saved);
  if (run === null) return null;
  if (saved.screen === "draft") return { kind: "draft", run };
  try {
    const { draft, cup } = replay(saved.token);
    return { kind: "results", token: saved.token, draft, cup };
  } catch {
    return null;
  }
}
