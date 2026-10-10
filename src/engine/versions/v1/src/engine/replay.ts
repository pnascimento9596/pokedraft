import { runCup } from "./cup";
import { isComplete, runDraft, toFullLineup } from "./draft";
import { decodeToken } from "./token";
import { DraftError, RunTokenError, type CupResult, type DraftState, type RunToken } from "./types";

export function replay(token: string | RunToken): { draft: DraftState; cup: CupResult } {
  const run = typeof token === "string" ? decodeToken(token) : token;
  let draft: DraftState;
  try {
    draft = runDraft(run.settings, run.seed, run.actions);
  } catch (e) {
    if (!(e instanceof DraftError)) throw e;
    const code = e.code === "invalidSettings" ? "invalidSettings" : "invalidAction";
    throw new RunTokenError(code, e.message);
  }
  if (!isComplete(draft)) {
    throw new RunTokenError("invalidAction", "the actions do not complete the draft");
  }
  return { draft, cup: runCup(toFullLineup(draft), run.seed, draft.settings.mode) };
}
