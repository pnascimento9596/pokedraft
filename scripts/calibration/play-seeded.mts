// Plays N seeded cup8 drafts with the calibration bots and prints one line block per run, so a
// person can read the ratings for oddities. Read-only: it changes nothing and retunes nothing.
//   pnpm exec tsx scripts/calibration/play-seeded.mts [--n 20] [--prefix finish]
import { parseArgs } from "node:util";
import { runCup } from "@/engine/cup";
import { applyAction, createDraft, toFullLineup } from "@/engine/draft";
import { createEngineRng } from "@/engine/rng";
import { speciesById } from "@/engine/species";
import { DraftError, GENS, type DraftAction, type DraftSettings, type Seed } from "@/engine/types";
import { BOTS, type BotName } from "./bots";

const { values } = parseArgs({
  options: { n: { type: "string", default: "20" }, prefix: { type: "string", default: "finish" } },
});
const N = Number(values.n);
const SETTINGS: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: GENS,
  style: "classic3",
  order: "squadFirst",
};
const MAX_STEPS = 200;
const name = (id: number) => speciesById(id as never).name;

function firstApplicable(
  state: ReturnType<typeof createDraft>,
  candidates: readonly DraftAction[],
) {
  for (const action of candidates) {
    try {
      return applyAction(state, action);
    } catch (e) {
      if (action.type === "reroll" && e instanceof DraftError && e.code === "noAlternatives")
        continue;
      throw e;
    }
  }
  throw new Error("every candidate action was refused");
}

for (let i = 1; i <= N; i++) {
  const bot: BotName = i % 2 === 1 ? "good" : "random";
  const seed = `${values.prefix}-${i}` as Seed;
  const rng = createEngineRng(`play:${values.prefix}:${i}`);
  let state = createDraft(SETTINGS, seed);
  for (let step = 0; state.phase.kind !== "complete"; step++) {
    if (step >= MAX_STEPS) throw new Error(`draft ${seed} did not finish`);
    state = firstApplicable(state, BOTS[bot].decide(state, rng));
  }
  const cup = runCup(toFullLineup(state), seed, SETTINGS.mode);
  const r = cup.rating;
  console.log(
    `## ${seed} bot=${bot} rerolls=${state.rerollsUsed} specials=${toFullLineup(state).starters.filter((id) => speciesById(id).special).length} score=${r.score} core=${r.core} drag=${r.drag} synergy=${r.synergy} bench=${r.bench}`,
  );
  console.log(
    `lines GK=${r.lines.GK} DEF=${r.lines.DEF} MID=${r.lines.MID} ATT=${r.lines.ATT} weakest=${r.weakest.join(",")}`,
  );
  console.log(
    `cup ${cup.wins}-${cup.draws}-${cup.losses} finish=${cup.finish} flawless=${cup.flawless}`,
  );
  console.log(
    r.slots
      .map(
        (s) =>
          `${s.slot}:${s.role}:${name(s.species)} fit=${s.fit} fam=${s.familiarity} q=${s.quality}`,
      )
      .join(" | "),
  );
  const roleOf = (id: number) => r.slots.find((x) => x.species === id)?.role ?? "bench";
  const a = cup.awards;
  const line = (
    p: { species: number; goals: number; assists: number; appearances: number } | null,
  ) =>
    p === null
      ? "none"
      : `${name(p.species)} (${roleOf(p.species)}) g${p.goals} a${p.assists} app${p.appearances}`;
  console.log(
    `awards boot=${line(a.goldenBoot)} assist=${line(a.topAssister)} potT=${line(a.playerOfTournament)}`,
  );
  console.log(
    `matches ${cup.matches
      .map((m) =>
        m.status === "played"
          ? `${m.round} v${m.opponent.score} ${m.regulation.user}-${m.regulation.opp}${m.extraTime ? " aet" : ""}${m.shootout ? ` pens ${m.shootout.user}-${m.shootout.opp}` : ""} ${m.outcome}`
          : `${m.round} -`,
      )
      .join(", ")}`,
  );
  console.log("");
}
