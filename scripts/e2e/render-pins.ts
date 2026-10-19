import { format, resolveConfig } from "prettier";
import { fullLineup } from "@/components/builder/model";
import { playSingle, playTwoLegs, exhibitionFixture } from "@/components/results/exhibition";
import { finalScore, goalLine } from "@/components/results/format";
import { candidatesFor } from "@/components/run/runState";
import { applyAction, createDraft, replay, runCup } from "@/engine";
import { toFullLineup } from "@/engine/draft";
import {
  ENGINE_VERSION,
  GENS,
  RUN_TOKEN_VERSION,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type ManagerAction,
  type Score,
  type Seed,
  type SlotRef,
} from "@/engine/types";
import { replay as replayV3 } from "@/engine/versions/v3/src/engine/replay";
import { GOLDEN_CUP8_V3, GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { decodeToken } from "@/engine/token";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";
import { builderToken, draftFromBuilderToken } from "@/ui/builder-token";
import { goalHref } from "@/ui/run-link";
import { ALL_REFS, BUILDER_URL_SEED, valueAt } from "@/ui/lineup";
import { parsePlayQuery } from "@/ui/settings";

export const PINS_PATH = "e2e/pins.ts";

// The seeded challenge runs the specs draft, by name. Each is drafted the way e2e/helpers.ts
// draftSixteen, the keyboard spec and the Position First spec all do it: the first offered
// player into the first open slot in DOM order (starters s0 to s10, then bench b0 to b4).
const RUNS = {
  RUN_151: "/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151",
  RUN_8_0: "/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=classic3&seed=e2e-80",
  RUN_KEYBOARD: "/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-kb",
  RUN_POSITION_FIRST:
    "/play?mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=open&seed=e2e-pf",
} as const;

function firstOpenSlot(state: DraftState): SlotRef {
  const slot = ALL_REFS.find((ref) => valueAt(state.lineup, ref) === null);
  if (slot === undefined) throw new Error("no open slot left");
  return slot;
}

function draftFirstOfferFirstSlot(settings: DraftSettings, seed: Seed): DraftAction[] {
  let state = createDraft(settings, seed);
  const actions: DraftAction[] = [];
  while (state.phase.kind !== "complete") {
    let action: DraftAction;
    if (state.phase.kind === "awaitingSlot") {
      action = { type: "chooseSlot", slot: firstOpenSlot(state) };
    } else if (state.phase.kind === "choosing") {
      const species = candidatesFor(state)[0];
      if (species === undefined) throw new Error(`round ${state.round} offers nobody`);
      action = { type: "pick", species, slot: state.phase.slot ?? firstOpenSlot(state) };
    } else {
      throw new Error(`a challenge draft never reaches ${state.phase.kind}`);
    }
    state = applyAction(state, action);
    actions.push(action);
  }
  return actions;
}

function seededRecord(url: string): string {
  const parsed = parsePlayQuery(new URL(url, "http://pokedraft.invalid").searchParams);
  if (parsed === null || parsed.seed === null) throw new Error(`${url} is not a seeded challenge`);
  const seed = parsed.seed as Seed;
  const actions = draftFirstOfferFirstSlot(parsed.settings, seed);
  const { cup } = replay({ v: RUN_TOKEN_VERSION, settings: parsed.settings, seed, actions });
  return `${cup.wins}-${cup.draws}-${cup.losses}`;
}

// e2e/your-calls.spec.ts: the manager-mode run with Attack picked at the 45' stop of match 0.
// Scores in the card's hyphen form, straight from the engine with and without that call.
const YOUR_CALLS_URL =
  "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";
const YOUR_CALLS_ACTION: ManagerAction = { type: "tactic", match: 0, minute: 45, tactic: "attack" };

function yourCalls() {
  const parsed = parsePlayQuery(new URL(YOUR_CALLS_URL, "http://pokedraft.invalid").searchParams);
  if (parsed === null || parsed.seed === null) throw new Error("the your-calls run is not seeded");
  const seed = parsed.seed as Seed;
  const actions = draftFirstOfferFirstSlot(parsed.settings, seed);
  const { draft } = replay({ v: RUN_TOKEN_VERSION, settings: parsed.settings, seed, actions });
  const lineup = toFullLineup(draft);
  const first = (manager: ManagerAction[]) => {
    const m = runCup(lineup, seed, parsed.settings.mode, undefined, manager).matches[0];
    if (m?.status !== "played" || m.shootout !== null)
      throw new Error("match 0 has no plain score");
    const s = finalScore(m);
    return `${s.user}-${s.opp}`;
  };
  return { url: YOUR_CALLS_URL, assistant: first([]), you: first([YOUR_CALLS_ACTION]) };
}

// e2e/replay-deep-links.spec.ts: the golden engine-5 cup8 draft under the live prefix, linked to
// the first goal it scores.
function deepLink() {
  const token = `pd${RUN_TOKEN_VERSION}.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
  const { cup } = replay(decodeToken(token));
  let watch = 0;
  for (const match of cup.matches) {
    if (match.status !== "played") continue;
    const goal = match.goals.find((g) => g.side === "user");
    if (goal !== undefined) {
      const before = match.goals.filter((g) => g.minute < goal.minute);
      const tally = (side: string) => before.filter((g) => g.side === side).length;
      return {
        token,
        href: goalHref(token, watch, goal.minute),
        minute: goal.minute,
        before: `${tally("user")}-${tally("opp")}`,
        after: `${tally("user") + 1}-${tally("opp")}`,
        opponent: match.opponent.name,
      };
    }
    watch++;
  }
  throw new Error("the golden run scores no goal");
}

const scoreText = (score: Score) => `${score.user}-${score.opp}`;
const REMATCH_LIMIT = 50;

// e2e/exhibition-two-legs.spec.ts: the golden engine-3 cup8 run saved as the Builder squad and
// played against itself from its own results page.
async function mirrorExhibition() {
  // The bundle itself, not replayAnyVersion, whose "server-only" marker throws outside Next.
  const opponent = replayV3(GOLDEN_CUP8_V3).draft as unknown as DraftState;
  const mirror = builderToken(
    { mode: "builder", formation: opponent.lineup.formation, gens: GENS, legendaries: true },
    opponent.lineup,
    BUILDER_URL_SEED,
  );
  const challenger = draftFromBuilderToken(mirror);
  const own = challenger === null ? null : fullLineup(challenger.lineup);
  const other = fullLineup(opponent.lineup);
  if (own === null || other === null) throw new Error("the mirror squad is incomplete");
  const fixture = exhibitionFixture(own, other);
  if (fixture === null) throw new Error("the mirror squad has no keeper");
  const scope = (rematch: number) => ({ seed: opponent.seed, own, other, rematch });
  const single = (rematch: number) => scoreText(finalScore(playSingle(fixture, scope(rematch))));

  const findRematch = (from: number, decidedBy: string) => {
    for (let rematch = from; rematch < REMATCH_LIMIT; rematch++) {
      if (playTwoLegs(fixture, scope(rematch)).decidedBy === decidedBy) return rematch;
    }
    throw new Error(`no ${decidedBy} tie in rematches ${from} to ${REMATCH_LIMIT - 1}`);
  };
  const extraTimeRematch = findRematch(0, "extra-time");
  const tie = playTwoLegs(fixture, scope(extraTimeRematch));
  const extraTimeGoal = tie.leg2.goals.filter((goal) => goal.minute > 90).at(-1);
  if (extraTimeGoal === undefined) throw new Error("extra time decided the tie without a goal");
  const aggregateRematch = findRematch(extraTimeRematch + 1, "aggregate");

  return {
    firstSingle: single(0),
    extraTimeRematch,
    extraTime: {
      leg1: scoreText(tie.legs[0].regulation),
      leg2: scoreText(tie.leg2.score),
      aggregate: scoreText(tie.aggregate),
      goal: goalLine(extraTimeGoal),
    },
    singleAtExtraTimeRematch: single(extraTimeRematch),
    aggregateRematch,
    aggregate: scoreText(playTwoLegs(fixture, scope(aggregateRematch)).aggregate),
  };
}

const HEADER = `// Generated by \`pnpm e2e:pins\` (scripts/e2e/generate-pins.mts) from the live engine. Do not edit.
// Every e2e expectation that moves when the live engine changes lives here, so an engine bump
// regenerates this one file. scripts/e2e/render-pins.test.ts fails when it is stale.
`;

export async function renderPins(): Promise<string> {
  const live = `pd${RUN_TOKEN_VERSION}`;
  const lines = [
    HEADER,
    `export const ENGINE_VERSION = ${JSON.stringify(ENGINE_VERSION)};`,
    `export const TOKEN_VERSIONS: readonly number[] = ${JSON.stringify([...RETAINED_TOKEN_VERSIONS, RUN_TOKEN_VERSION])};`,
    `/** A live run token, as the leaderboard receives it. */`,
    `export const LIVE_TOKEN = /^${live}\\./;`,
    `/** A copied share link, in the query form message apps keep. */`,
    `export const SHARE_LINK = /\\/r\\/${live}\\?t=[A-Za-z0-9_-]+$/;`,
    ``,
    `// Seeded challenges drafted with the first offered player into the first open slot.`,
  ];
  for (const [name, url] of Object.entries(RUNS)) {
    lines.push(
      `export const ${name} = { url: ${JSON.stringify(url)}, record: ${JSON.stringify(seededRecord(url))} } as const;`,
    );
  }
  lines.push(
    ``,
    `// The golden engine-3 cup8 squad saved as the Builder squad and played against itself.`,
    `export const MIRROR_EXHIBITION = ${JSON.stringify(await mirrorExhibition())} as const;`,
  );
  lines.push(
    ``,
    `// A manager-mode run with Attack at the 45' stop of match 0: the full-time card's two scores.`,
    `export const YOUR_CALLS = ${JSON.stringify(yourCalls())} as const;`,
  );
  lines.push(
    ``,
    `// The golden engine-5 cup8 draft under the live prefix, linked to its first goal.`,
    `export const DEEP_LINK = ${JSON.stringify(deepLink())} as const;`,
  );
  const options = await resolveConfig(PINS_PATH);
  return format(lines.join("\n"), { ...options, filepath: PINS_PATH });
}
