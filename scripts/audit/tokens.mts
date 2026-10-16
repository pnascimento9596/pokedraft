// Run tokens for the audit tools. Two sources:
//   goldenCup8Token()  the pinned share-link fixture. It replays the same fixed action script as
//                      src/engine/__tests__/goldens.test.ts and must hash to the golden digest.
//   botCup8Token(seed) a valid, bot-drafted, non-daily cup8 token for the POST and /card timings.
// CLI: pnpm exec tsx scripts/audit/tokens.mts --write-fixtures   (rewrites fixtures.json)
//      pnpm exec tsx scripts/audit/tokens.mts --check            (verifies fixtures.json)
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { applyAction, createDraft, slotRefs } from "@/engine/draft";
import { createEngineRng } from "@/engine/rng";
import { replay } from "@/engine/replay";
import { encodeToken } from "@/engine/token";
import {
  DraftError,
  ENGINE_VERSION,
  GENS,
  RUN_TOKEN_VERSION,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type Seed,
} from "@/engine/types";
import { BOTS, type BotName } from "../calibration/bots";

export const GOLDEN_CUP8_TOKEN_SHA256 =
  "d3a15998448b19a8e7f8489363d4514de2547a1bdac4a1891524de09f3253b25";

const GOLDEN_SETTINGS: DraftSettings = {
  mode: "cup8",
  formation: "4-2-3-1",
  gens: GENS,
  style: "classic3",
  order: "squadFirst",
};
const GOLDEN_SEED = "golden-cup8" as Seed;

// classic3 + squadFirst is never a daily board shape, so a seed from here always lands on the
// all-time board of its mode.
export const POST_SETTINGS: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: GENS,
  style: "classic3",
  order: "squadFirst",
};

const MAX_STEPS = 200;

export const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

function rolled(state: DraftState): number {
  if (state.phase.kind !== "choosing") throw new Error(`expected a roll, got ${state.phase.kind}`);
  const roll = state.phase.roll;
  return roll.kind === "species" ? roll.species : roll.offers![0]!;
}

export function goldenCup8Token(): string {
  const actions: DraftAction[] = [];
  let state = createDraft(GOLDEN_SETTINGS, GOLDEN_SEED);
  const push = (action: DraftAction): void => {
    actions.push(action);
    state = applyAction(state, action);
  };
  slotRefs().forEach((slot, round) => {
    if (round === 0) push({ type: "reroll", target: "type" });
    if (round === 6) push({ type: "reroll", target: "region" });
    push({ type: "pick", species: rolled(state) as never, slot });
  });
  return encodeToken({
    v: RUN_TOKEN_VERSION,
    settings: GOLDEN_SETTINGS,
    seed: GOLDEN_SEED,
    actions,
  });
}

function firstApplicable(
  state: DraftState,
  candidates: readonly DraftAction[],
): { state: DraftState; action: DraftAction } {
  for (const action of candidates) {
    try {
      return { state: applyAction(state, action), action };
    } catch (e) {
      if (action.type === "reroll" && e instanceof DraftError && e.code === "noAlternatives") {
        continue;
      }
      throw e;
    }
  }
  throw new Error("every candidate action was refused");
}

export function botCup8Token(seed: string, bot: BotName = "good"): string {
  const rng = createEngineRng(`audit:${seed}`);
  const actions: DraftAction[] = [];
  let state = createDraft(POST_SETTINGS, seed as Seed);
  for (let step = 0; state.phase.kind !== "complete"; step++) {
    if (step >= MAX_STEPS) throw new Error(`draft ${seed} did not finish`);
    const next = firstApplicable(state, BOTS[bot].decide(state, rng));
    actions.push(next.action);
    state = next.state;
  }
  const token = encodeToken({
    v: RUN_TOKEN_VERSION,
    settings: POST_SETTINGS,
    seed: seed as Seed,
    actions,
  });
  replay(token);
  return token;
}

export function describeRun(token: string): { score: number; record: string; finish: string } {
  const { cup } = replay(token);
  return {
    score: cup.rating.score,
    record: `${cup.wins}-${cup.draws}-${cup.losses}`,
    finish: cup.finish,
  };
}

function buildFixtures() {
  const token = goldenCup8Token();
  const digest = sha256(token);
  if (digest !== GOLDEN_CUP8_TOKEN_SHA256) {
    throw new Error(`golden-cup8 token digest ${digest} does not match the golden digest`);
  }
  return {
    engineVersion: ENGINE_VERSION,
    shareRun: {
      name: "golden-cup8",
      token,
      tokenSha256: digest,
      expected: describeRun(token),
      source:
        "Rebuilt by scripts/audit/tokens.mts from the action script in src/engine/__tests__/goldens.test.ts.",
    },
    postTiming: {
      settings: POST_SETTINGS,
      bot: "good",
      seedPattern: "audit-<label>-<n>",
      nicknamePattern: "bl-<n>",
      count: 30,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    options: { "write-fixtures": { type: "boolean" }, check: { type: "boolean" } },
  });
  const file = new URL("./fixtures.json", import.meta.url);
  if (values["write-fixtures"]) {
    writeFileSync(file, `${JSON.stringify(buildFixtures(), null, 2)}\n`);
    console.log(`wrote ${file.pathname}`);
  } else if (values.check) {
    const saved = JSON.parse(readFileSync(file, "utf8"));
    const fresh = buildFixtures();
    if (JSON.stringify(saved) !== JSON.stringify(fresh)) {
      console.error("fixtures.json is stale; run with --write-fixtures");
      process.exit(1);
    }
    console.log("fixtures.json matches the engine");
  } else {
    console.error("usage: tokens.mts --write-fixtures | --check");
    process.exit(2);
  }
}
