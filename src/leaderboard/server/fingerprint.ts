import "server-only";
import { createHash } from "node:crypto";
import type { CupResult, DraftState } from "@/engine";

// Bump the tag when the recipe changes; stored rows keep the fingerprint they were written with.
const RECIPE = "pdfp1";

/**
 * The identity of a run's outcome, for refusing copies: lowercase hex sha256 of a JSON array of
 * the recipe tag, mode, seed, formation, starters in slot order, bench in order, W-D-L, Team
 * Score, and per match either "x" (not played) or its regulation and extra-time goals as
 * [side, minute]. Nickname, token bytes, manager actions, engine version and shootout kicks are
 * left out, so a no-op manager edit of someone else's run hashes the same.
 */
export function runFingerprint(draft: DraftState, cup: CupResult): string {
  const preimage = [
    RECIPE,
    draft.settings.mode,
    draft.seed,
    draft.lineup.formation,
    draft.lineup.starters,
    draft.lineup.bench,
    cup.wins,
    cup.draws,
    cup.losses,
    cup.rating.score,
    cup.matches.map((m) => (m.status === "played" ? m.goals.map((g) => [g.side, g.minute]) : "x")),
  ];
  return createHash("sha256").update(JSON.stringify(preimage), "utf8").digest("hex");
}
