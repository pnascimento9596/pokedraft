import { format, resolveConfig } from "prettier";
import { fullLineup } from "@/components/builder/model";
import {
  exhibitionFixture,
  playSingle,
  playTwoLegs,
  singleSeed,
} from "@/components/results/exhibition";
import { finalScore, goalLine } from "@/components/results/format";
import { candidatesFor } from "@/components/run/runState";
import { applyAction, createDraft, replay, runCup, speciesById } from "@/engine";
import { toFullLineup } from "@/engine/draft";
import {
  ENGINE_VERSION,
  GENS,
  RUN_TOKEN_VERSION,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type Lineup,
  type ManagerAction,
  type Score,
  type Seed,
  type SlotRef,
} from "@/engine/types";
import { replay as replayV3 } from "@/engine/versions/v3/src/engine/replay";
import {
  GOLDEN_CUP8_V3,
  GOLDEN_CUP8_V5,
  GOLDEN_KANTO151_V5,
} from "@/engine/versions/__tests__/fixtures";
import { decodeToken } from "@/engine/token";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";
import { builderToken, draftFromBuilderToken } from "@/ui/builder-token";
import { challengeHref } from "@/ui/challenge-href";
import { squadFromToken } from "@/ui/exhibition-route";
import { decideExhibition } from "@/ui/manager/exhibition-decide";
import { touchlineAt } from "@/ui/manager/touchline";
import type { BenchIndex, StarterIndex } from "@/engine/types";
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

function cupOf(url: string) {
  const parsed = parsePlayQuery(new URL(url, "http://pokedraft.invalid").searchParams);
  if (parsed === null || parsed.seed === null) throw new Error(`${url} is not a seeded challenge`);
  const seed = parsed.seed as Seed;
  const actions = draftFirstOfferFirstSlot(parsed.settings, seed);
  return replay({ v: RUN_TOKEN_VERSION, settings: parsed.settings, seed, actions }).cup;
}

function seededRecord(url: string): string {
  const cup = cupOf(url);
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

// e2e/head-to-head.spec.ts: each golden engine-5 draft under the live prefix is the run to beat
// on its own seed, and the challenger drafts the first offered player into the first open slot.
function headToHead(golden: string) {
  const theirs = `pd${RUN_TOKEN_VERSION}.${golden.replace(/^pd\d+\./, "")}`;
  const url = challengeHref(theirs);
  if (url === null) throw new Error("the golden run has no same-seed challenge");
  const them = replay(decodeToken(theirs)).cup;
  const you = cupOf(url);
  return {
    url,
    theirs,
    retained: golden,
    you: { record: `${you.wins}-${you.draws}-${you.losses}`, score: you.rating.score },
    them: { record: `${them.wins}-${them.draws}-${them.losses}`, score: them.rating.score },
  };
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
  const fixture = exhibitionFixture(own, other, "Their squad");
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

// e2e/exhibition-route.spec.ts: a Builder friendly of Pokedex 1 to 16 (4-3-3), as History saves
// it, against the golden engine-3 cup8 squad on that run's seed, and that squad against itself.
function routeSquads() {
  const ids = Array.from({ length: 16 }, (_, index) => index + 1);
  const friendly = builderToken(
    { mode: "builder", formation: "4-3-3", gens: GENS, legendaries: true },
    {
      formation: "4-3-3",
      starters: ids.slice(0, 11) as unknown as Lineup["starters"],
      bench: ids.slice(11) as unknown as Lineup["bench"],
    },
    "exhibition-route-friendly" as Seed,
  );
  const home = squadFromToken(friendly);
  const golden = squadFromToken(GOLDEN_CUP8_V3);
  if (home === null || golden === null)
    throw new Error("an exhibition route squad does not decode");
  return { friendly, home, golden };
}

function exhibitionRoute() {
  const { friendly, home, golden } = routeSquads();
  const score = (own: typeof home) => {
    const fixture = exhibitionFixture(own.lineup, golden.lineup, "Their squad");
    if (fixture === null) throw new Error("an exhibition route squad has no keeper");
    const scope = { seed: golden.seed, own: own.lineup, other: golden.lineup, rematch: 0 };
    return scoreText(finalScore(playSingle(fixture, scope)));
  };
  return { friendly, friendlyVsGolden: score(home), goldenMirror: score(golden) };
}

// e2e/exhibition-broadcast.spec.ts: the route's friendly against the golden squad in manager
// mode, with the touchline's default substitution confirmed at the half-time stop. The default
// takes off the last player on the pitch and brings on the first bench player still available.
function exhibitionBroadcast() {
  const { home, golden } = routeSquads();
  const fixture = exhibitionFixture(home.lineup, golden.lineup, "Their squad");
  if (fixture === null) throw new Error("an exhibition route squad has no keeper");
  const scope = { seed: golden.seed, own: home.lineup, other: golden.lineup, rematch: 0 };
  const assistant = playSingle(fixture, scope);
  const line = touchlineAt(assistant, 0, home.lineup, [], 45);
  const slot = line.onPitch.findLastIndex((id) => id !== null) as StarterIndex;
  const bench = line.bench.find((seat) => seat.available)?.index as BenchIndex | undefined;
  if (slot < 0 || bench === undefined) throw new Error("no default substitution at 45'");
  const verdict = decideExhibition({ fixture, seed: singleSeed(scope) }, assistant, [], 45, {
    kind: "sub",
    slot,
    bench,
  });
  if (!verdict.ok) throw new Error(verdict.reason);
  const sub = (verdict.match.incidents ?? []).find(
    (i) => i.kind === "sub" && i.minute === 45 && i.by === "manager",
  );
  if (sub?.kind !== "sub") throw new Error("the 45' substitution is not in the result");
  return {
    assistant: scoreText(finalScore(assistant)),
    withSub: scoreText(finalScore(verdict.match)),
    sub: `45' ${speciesById(sub.in).name} on for ${speciesById(sub.out).name} (tactical, your call)`,
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
    `// A Builder friendly and the golden engine-3 squad played from the exhibition route.`,
    `export const EXHIBITION_ROUTE = ${JSON.stringify(exhibitionRoute())} as const;`,
  );
  lines.push(
    ``,
    `// The route's friendly against the golden squad in manager mode, with a sub at the 45' stop.`,
    `export const EXHIBITION_BROADCAST = ${JSON.stringify(exhibitionBroadcast())} as const;`,
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
  lines.push(
    ``,
    `// The golden engine-5 drafts under the live prefix as the runs to beat on their own seeds.`,
    `export const HEAD_TO_HEAD = ${JSON.stringify({ cup8: headToHead(GOLDEN_CUP8_V5), kanto151: headToHead(GOLDEN_KANTO151_V5) })} as const;`,
  );
  const options = await resolveConfig(PINS_PATH);
  return format(lines.join("\n"), { ...options, filepath: PINS_PATH });
}
