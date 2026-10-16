import { parseArgs } from "node:util";
import { runCup } from "@/engine/cup";
import { applyAction, createDraft, toFullLineup } from "@/engine/draft";
import { createEngineRng, dailySeed, toIsoDate } from "@/engine/rng";
import { encodeToken } from "@/engine/token";
import { ENGINE_VERSION, RUN_TOKEN_VERSION, type DraftAction } from "@/engine/types";
import { dailySettings } from "@/leaderboard/daily";
import { parseNickname } from "@/leaderboard/nickname";
import { BOTS } from "../calibration/bots";

const { values } = parseArgs({
  options: {
    date: { type: "string" },
    nickname: { type: "string" },
    label: { type: "string" },
  },
});
if (!values.date || !values.nickname || !values.label) {
  throw new Error(
    "usage: release-submission.mts --date YYYY-MM-DD --nickname <name> --label <seed>",
  );
}
const date = toIsoDate(values.date);
const nick = parseNickname(values.nickname);
if (!nick.ok) throw new Error(`Invalid verification nickname: ${nick.reason}`);
const settings = dailySettings("4-3-3");
const seed = dailySeed(date);
const rng = createEngineRng(`release-proof:${values.label}`);
const actions: DraftAction[] = [];
let draft = createDraft(settings, seed);
for (let step = 0; draft.phase.kind !== "complete"; step++) {
  if (step >= 200) throw new Error("Verification draft did not finish");
  const action = BOTS.random.decide(draft, rng)[0];
  if (action === undefined) throw new Error("Verification bot had no legal action");
  draft = applyAction(draft, action);
  actions.push(action);
}
const lineup = toFullLineup(draft);
const cup = runCup(lineup, seed, settings.mode);
console.log(
  JSON.stringify({
    date,
    label: values.label,
    payload: {
      nickname: nick.nickname,
      token: encodeToken({ v: RUN_TOKEN_VERSION, settings, seed, actions }),
      engineVersion: ENGINE_VERSION,
    },
    expected: {
      teamScore: cup.rating.score,
      wins: cup.wins,
      draws: cup.draws,
      losses: cup.losses,
      squadSpeciesIds: [...lineup.starters, ...lineup.bench],
    },
  }),
);
