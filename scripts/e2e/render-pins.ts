import { readFileSync } from "node:fs";
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
  type CupResult,
  type CupRound,
  type DraftState,
  type GoalKind,
  type Lineup,
  type ManagerAction,
  type MatchResult,
  type Score,
  type Seed,
  type SlotRef,
  type SpeciesId,
} from "@/engine/types";
import { replay as replayV3 } from "@/engine/versions/v3/src/engine/replay";
import {
  GOLDEN_CUP8_V3,
  GOLDEN_CUP8_V5,
  GOLDEN_KANTO151_V5,
} from "@/engine/versions/__tests__/fixtures";
import { decodeToken, encodeToken } from "@/engine/token";
import { movesetFor, type Moveset } from "@/data/movesets";
import { ACHIEVEMENT_LABEL, chipAchievement, runAchievements } from "@/ui/achievements";
import { stopsFor } from "@/ui/matchday/clock";
import { clubShort } from "@/ui/matchday/copy";
import { energyAt, isSpent, isTired } from "@/ui/matchday/fatigue";
import { kitsFor } from "@/ui/matchday/kit";
import { beatKey, stageFrame, type FrameView } from "@/ui/matchday/player";
import {
  OPP_SHAPE,
  buildTimeline,
  frameAt,
  type Beat,
  type Timeline,
} from "@/ui/matchday/timeline";
import { botCup8Token } from "../audit/tokens.mjs";
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

const ENGINE_V4_FIXTURE: { readonly token: string } = JSON.parse(
  readFileSync("scripts/audit/engine-v4-fixtures.json", "utf8"),
);

const LIVE_PREFIX = `pd${RUN_TOKEN_VERSION}.`;
/** A retained token's draft under the live prefix, so the live engine replays it. */
const asLive = (token: string) => `${LIVE_PREFIX}${token.replace(/^pd\d+\./, "")}`;
const LIVE_GOLDEN_CUP8 = asLive(GOLDEN_CUP8_V5);
const LIVE_GOLDEN_KANTO151 = asLive(GOLDEN_KANTO151_V5);

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

function seededRun(url: string) {
  const parsed = parsePlayQuery(new URL(url, "http://pokedraft.invalid").searchParams);
  if (parsed === null || parsed.seed === null) throw new Error(`${url} is not a seeded challenge`);
  const seed = parsed.seed as Seed;
  const actions = draftFirstOfferFirstSlot(parsed.settings, seed);
  return replay({ v: RUN_TOKEN_VERSION, settings: parsed.settings, seed, actions });
}

const cupOf = (url: string) => seededRun(url).cup;

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
  const token = LIVE_GOLDEN_CUP8;
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
  const theirs = asLive(golden);
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

type Played = Extract<MatchResult, { status: "played" }>;
type Run = ReturnType<typeof replay>;
type GoalBeat = Extract<Beat, { kind: "goal" }>;

const liveRun = (token: string): Run => replay(decodeToken(token));
const dex = (id: SpeciesId) => String(id).padStart(4, "0");
const nameOf = (id: SpeciesId) => speciesById(id).name;
const recordOf = (cup: CupResult) => `${cup.wins}-${cup.draws}-${cup.losses}`;

function playedIn(run: Run, round: CupRound): { match: Played; index: number } {
  const index = run.cup.matches.findIndex((m) => m.round === round);
  const match = run.cup.matches[index];
  if (match?.status !== "played") throw new Error(`${round} of the run was not played`);
  return { match, index };
}

function played(run: Run): { match: Played; index: number }[] {
  return run.cup.matches.flatMap((match, index) =>
    match.status === "played" ? [{ match, index }] : [],
  );
}

function movesOf(id: number): Moveset | null {
  try {
    return movesetFor(id);
  } catch {
    return null;
  }
}

/** The broadcast's timeline of one match, with the canon movesets the browser loads. */
function timelineOf(run: Run, index: number): Timeline {
  const match = run.cup.matches[index];
  if (match?.status !== "played") throw new Error(`match ${index} was not played`);
  return buildTimeline(match, {
    matchIndex: index,
    seed: run.cup.seed,
    lineup: toFullLineup(run.draft),
    movesOf,
  });
}

// e2e/haptics.spec.ts: a group match where the user scores before the opponent's first goal, so
// the score at that goal shows how many buzzes fired, and every later user goal buzzes too.
function haptics() {
  const round = "G3";
  const { match } = playedIn(liveRun(LIVE_GOLDEN_CUP8), round);
  const conceded = match.goals.find((g) => g.side === "opp");
  const user = match.goals.filter((g) => g.side === "user");
  const before = user.filter((g) => conceded !== undefined && g.minute < conceded.minute).length;
  if (conceded === undefined || before === 0)
    throw new Error(`${round} has no user goal before the first goal conceded`);
  return { round, scoreAtConceded: `${before}-1`, goalsBefore: before, goals: user.length };
}

// e2e/injury-staging.spec.ts: the run's first injury the assistant answers with a substitute.
function injuryStaging() {
  const run = liveRun(LIVE_GOLDEN_CUP8);
  for (const { match } of played(run)) {
    for (const injury of match.incidents ?? []) {
      if (injury.kind !== "injury") continue;
      const sub = (match.incidents ?? []).find(
        (i) =>
          i.kind === "sub" &&
          i.reason === "injury" &&
          i.minute === injury.minute &&
          i.slot === injury.slot,
      );
      if (sub?.kind !== "sub") continue;
      return {
        round: match.round,
        minute: injury.minute,
        slot: injury.slot,
        injured: nameOf(injury.player),
        injuredDex: dex(injury.player),
        sub: nameOf(sub.in),
        subDex: dex(sub.in),
      };
    }
  }
  throw new Error("the golden run has no injury answered with a substitute");
}

// e2e/smooth-movement.spec.ts: the run's first red card for the user.
function redCard() {
  for (const { match } of played(liveRun(LIVE_GOLDEN_CUP8))) {
    const red = (match.incidents ?? []).find((i) => i.kind === "red" && i.side === "user");
    if (red?.kind === "red") return { round: match.round, minute: red.minute, slot: red.slot };
  }
  throw new Error("the golden run has no user red card");
}

// e2e/continuous-ball.spec.ts: a save the 2x ball bound is probed through. The minute is chosen
// by hand; this only checks the live engine still saves a shot there.
function continuousBall() {
  const round = "G1";
  const save = 59;
  const { match } = playedIn(liveRun(LIVE_GOLDEN_CUP8), round);
  if (!(match.saves ?? []).some((s) => s.minute === save))
    throw new Error(`${round} has no save at ${save}': pick another save to probe`);
  return { round, save };
}

// e2e/fullscreen-score-bug.spec.ts: the opponent's name on the scoreboard and the score bug.
function fullscreenScoreBug() {
  const round = "G1";
  const { name } = playedIn(liveRun(LIVE_GOLDEN_CUP8), round).match.opponent;
  return { round, opponent: name, short: clubShort(name) };
}

// e2e/team-readability.spec.ts: each side's kit ring as the browser computes it.
function teamReadability() {
  const round = "G1";
  const run = liveRun(LIVE_GOLDEN_CUP8);
  const kits = kitsFor(toFullLineup(run.draft).starters, playedIn(run, round).match.opponent.theme);
  const rgb = (hex: string) =>
    `rgb(${[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
  return { round, user: rgb(kits.user), opp: rgb(kits.opp) };
}

// e2e/set-pieces.spec.ts: each run's first user goal of a kind, staged as the broadcast stages it.
const FIRED_AT = 10_000;

function goalScene(run: Run, kind: GoalKind) {
  const lineup = toFullLineup(run.draft);
  for (const { match, index } of played(run)) {
    const goal = match.goals.find((g) => g.side === "user" && g.kind === kind);
    if (goal === undefined) continue;
    const timeline = timelineOf(run, index);
    const beat = timeline.beats.find(
      (b): b is GoalBeat => b.kind === "goal" && b.side === "user" && b.minute === goal.minute,
    );
    if (beat?.scorer.slot == null) throw new Error(`the ${kind} goal has no scorer on the pitch`);
    const view: FrameView = {
      clock: goal.minute,
      fired: { [beatKey(beat)]: FIRED_AT },
      now: FIRED_AT,
      kicks: 0,
      motion: true,
      speed: 1,
      userSlots: lineup.formation,
      oppSlots: match.opponent.formation ?? OPP_SHAPE,
      oppLabels: match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
    };
    const at = (age: number) => stageFrame(timeline, { ...view, now: FIRED_AT + age }).stage;
    return { round: match.round, minute: goal.minute, slot: beat.scorer.slot, beat, at };
  }
  throw new Error(`the run scores no ${kind} goal`);
}

function setPieces() {
  const cup8 = liveRun(LIVE_GOLDEN_CUP8);
  const solo = goalScene(cup8, "solo");
  // The defender who steps in presses mid-run, ahead of the scorer before and behind them after.
  const x = (age: number, side: "user" | "opp", slot: number) =>
    solo.at(age).players[side][slot]?.point.x ?? Number.NaN;
  const pressers = solo
    .at(520)
    .players.opp.flatMap((p) =>
      p?.pose === "press" &&
      x(260, "opp", p.slot) > x(260, "user", solo.slot) &&
      x(910, "user", solo.slot) > x(910, "opp", p.slot)
        ? [p.slot]
        : [],
    );
  if (pressers.length !== 1) throw new Error(`the solo goal has ${pressers.length} pressers`);
  const header = goalScene(cup8, "header");
  const penalty = goalScene(cup8, "penalty");
  const freeKick = goalScene(liveRun(LIVE_GOLDEN_KANTO151), "free-kick");
  const wall = freeKick
    .at(780)
    .players.opp.flatMap((p) =>
      p !== null &&
      p.slot !== 0 &&
      p.point.x > 75 &&
      p.point.x < 98 &&
      Math.abs(p.point.y - 50) <= 4
        ? [{ slot: p.slot, y: Math.round(p.point.y) }]
        : [],
    )
    .sort((a, b) => a.y - b.y);
  if (wall.length !== 3) throw new Error(`the free kick has ${wall.length} players in the wall`);
  return {
    solo: {
      round: solo.round,
      minute: solo.minute,
      slot: solo.slot,
      scorer: solo.beat.scorer.name,
      presser: pressers[0],
    },
    header: { round: header.round, minute: header.minute },
    penalty: {
      round: penalty.round,
      minute: penalty.minute,
      slot: penalty.slot,
      taker: penalty.beat.scorer.name,
    },
    freeKick: { round: freeKick.round, minute: freeKick.minute, wall },
  };
}

// e2e/matchday-carryovers.spec.ts: the first key duel's card, which reduced motion stages still.
function matchdayCarryovers() {
  const round = "G1";
  const run = liveRun(LIVE_GOLDEN_CUP8);
  const duel = timelineOf(run, playedIn(run, round).index).plays.find(
    (p) => p.moment === "key-duel" && p.callout !== null,
  );
  if (duel?.callout == null) throw new Error(`${round} has no key duel`);
  return { round, duel: duel.callout.text };
}

// e2e/honest-momentum.spec.ts: the momentum bar's text in the first window and the next, as
// MatchPlayer rounds the frame's lean (50 + lean * 28).
function honestMomentum() {
  const round = "G1";
  const run = liveRun(LIVE_GOLDEN_CUP8);
  const timeline = timelineOf(run, playedIn(run, round).index);
  const bar = (minute: number) => {
    const user = Math.round(50 + (frameAt(timeline, minute)?.ball ?? 0) * 28);
    return `${user}%${100 - user}%`;
  };
  const kickoff = bar(0);
  const second = bar(6);
  if (kickoff !== "50%50%" || second === kickoff)
    throw new Error(`${round} does not lean after its first window`);
  return { round, kickoff, second };
}

// The property pins: each searches a seed family in order and keeps the first run that has what
// its spec needs, so an engine bump finds a new run instead of a hand hunt.
const SEARCH_LIMIT = 200;

function search<T>(family: string, from: number, find: (seed: string) => T | null): T {
  for (let i = from; i < from + SEARCH_LIMIT; i++) {
    const hit = find(`${family}-${i}`);
    if (hit !== null) return hit;
  }
  throw new Error(`no ${family} seed from ${from} to ${from + SEARCH_LIMIT - 1} has the property`);
}

const botUrl = (seed: string) =>
  `/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=${seed}`;

// e2e/achievements.spec.ts: a bot-drafted run that earns Hat-trick hero, Comeback and Giant
// killer, and no First Flawless.
const GIANT_KILLER_EARNS = ["hat-trick-hero", "comeback", "giant-killer"];

function giantKiller() {
  return search("achievements", 0, (seed) => {
    const token = botCup8Token(seed);
    const { draft, cup } = liveRun(token);
    const earned = runAchievements(draft, cup);
    if (JSON.stringify(earned) !== JSON.stringify(GIANT_KILLER_EARNS)) return null;
    const chip = chipAchievement(earned);
    return { url: botUrl(seed), token, earned, chip: chip && ACHIEVEMENT_LABEL[chip] };
  });
}

// e2e/results-reveal.spec.ts: a bot-drafted champion, for the trophy and the count-up.
function champion() {
  return search("e2e-reveal", 0, (seed) => {
    const token = botCup8Token(seed);
    const { cup } = liveRun(token);
    if (cup.finish !== "champion") return null;
    return {
      url: botUrl(seed),
      token,
      score: String(cup.rating.score),
      record: recordOf(cup),
      mvp: nameOf(cup.awards.playerOfTournament.species),
    };
  });
}

// e2e/shootout-suspense.spec.ts and e2e/touchline-sheet.spec.ts: the engine-v4 fixture squad on a
// Builder seed whose shootout opens with a user goal and an opponent miss and reaches sudden death.
function shootout() {
  const squad = decodeToken(asLive(ENGINE_V4_FIXTURE.token));
  return search("shootout", 0, (seed) => {
    const token = encodeToken({ ...squad, seed: seed as Seed });
    for (const match of liveRun(token).cup.matches) {
      if (match.status !== "played" || match.shootout === null) continue;
      const [first, second] = match.shootout.kicks;
      const opens =
        first?.side === "user" && first.scored && second?.side === "opp" && !second.scored;
      if (opens && match.shootout.kicks.length > 10) return { token, round: match.round };
    }
    return null;
  });
}

// e2e/a11y.spec.ts and e2e/keyboard.spec.ts: a seeded challenge whose first match stops for one
// injury and then for half time. The search starts at the seed the specs were written against.
function injuryStop() {
  return search("e2e-a11y", 47, (seed) => {
    const url = botUrl(seed);
    const run = seededRun(url);
    const first = run.cup.matches[0];
    if (first?.status !== "played") return null;
    const stops = stopsFor(first, toFullLineup(run.draft)).map((s) => s.kind);
    return stops[0] === "injury" && stops[1] === "halftime" ? { url } : null;
  });
}

// e2e/fatigue.spec.ts: a Builder squad of fifteen strong players and Magikarp (STA 19) in slot 2,
// pressing all match. Late in the first extra time it plays, one slot is spent and one more tired.
const FATIGUE_STARTERS = [784, 1009, 129, 289, 887, 373, 1010, 998, 1022, 1018, 1006];
const FATIGUE_BENCH = [993, 706, 248, 1023, 989];
const FATIGUE_MINUTE = 116;

function fatigue() {
  const place =
    (kind: "starter" | "bench") =>
    (species: number, index: number): DraftAction => ({
      type: "place",
      species: species as SpeciesId,
      slot: { kind, index } as SlotRef,
    });
  const token = encodeToken({
    v: RUN_TOKEN_VERSION,
    settings: { mode: "builder", formation: "4-3-3", gens: GENS, legendaries: false },
    seed: "fatigue-1" as Seed,
    actions: [...FATIGUE_STARTERS.map(place("starter")), ...FATIGUE_BENCH.map(place("bench"))],
    manager: Array.from({ length: 6 }, (_, match): ManagerAction => ({
      type: "tactic",
      match,
      minute: 0,
      tactic: "press",
    })),
  });
  for (const { match } of played(liveRun(token))) {
    if (match.extraTime === null) continue;
    const windows = match.windows ?? [];
    const last = windows.filter((w) => w.minute <= FATIGUE_MINUTE).at(-1);
    if (last === undefined) continue;
    const energy = (slot: number) =>
      energyAt(windows, slot, last.onPitch[slot] ?? null, FATIGUE_MINUTE);
    const slots = last.onPitch.map((_, slot) => slot);
    const spent = slots.filter((slot) => isSpent(energy(slot)));
    const tired = slots.filter((slot) => isTired(energy(slot)) && !isSpent(energy(slot)));
    if (spent.length !== 1 || tired.length !== 1)
      throw new Error(
        `${match.round} at ${FATIGUE_MINUTE}' has ${spent.length} spent and ${tired.length} tired slots`,
      );
    return { token, round: match.round, minute: FATIGUE_MINUTE, spent: spent[0], tired: tired[0] };
  }
  throw new Error("the fatigue squad never plays extra time");
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
    `/** The live token prefix, for tokens the specs build or fake. */`,
    `export const LIVE_PREFIX = ${JSON.stringify(LIVE_PREFIX)};`,
    `/** The golden engine-5 drafts under the live prefix, so the live engine replays them. */`,
    `export const LIVE_GOLDEN_CUP8 = ${JSON.stringify(LIVE_GOLDEN_CUP8)};`,
    `export const LIVE_GOLDEN_KANTO151 = ${JSON.stringify(LIVE_GOLDEN_KANTO151)};`,
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
    ``,
    `// The golden cup8 match where the user scores before conceding: the score then, and the goals.`,
    `export const HAPTICS = ${JSON.stringify(haptics())} as const;`,
    ``,
    `// The golden cup8 run's first injury answered with a substitute.`,
    `export const INJURY_STAGING = ${JSON.stringify(injuryStaging())} as const;`,
    ``,
    `// The golden cup8 run's first user red card.`,
    `export const RED_CARD = ${JSON.stringify(redCard())} as const;`,
    ``,
    `// A golden cup8 save the 2x ball bound is probed through.`,
    `export const CONTINUOUS_BALL = ${JSON.stringify(continuousBall())} as const;`,
    ``,
    `// The golden cup8 opponent on the scoreboard and the score bug.`,
    `export const FULLSCREEN_SCORE_BUG = ${JSON.stringify(fullscreenScoreBug())} as const;`,
    ``,
    `// Each side's kit ring in a golden cup8 match, as computed CSS.`,
    `export const TEAM_READABILITY = ${JSON.stringify(teamReadability())} as const;`,
    ``,
    `// The golden runs' first user goal of each set-piece kind, as the broadcast stages it.`,
    `export const SET_PIECES = ${JSON.stringify(setPieces())} as const;`,
    ``,
    `// The first key duel's cut-in in a golden cup8 match.`,
    `export const MATCHDAY_CARRYOVERS = ${JSON.stringify(matchdayCarryovers())} as const;`,
    ``,
    `// The momentum bar in a golden cup8 match's first window and the one after.`,
    `export const HONEST_MOMENTUM = ${JSON.stringify(honestMomentum())} as const;`,
    ``,
    `// A bot-drafted cup8 run that earns Hat-trick hero, Comeback and Giant killer.`,
    `export const GIANT_KILLER = ${JSON.stringify(giantKiller())} as const;`,
    ``,
    `// A bot-drafted cup8 champion.`,
    `export const CHAMPION = ${JSON.stringify(champion())} as const;`,
    ``,
    `// A Builder run whose shootout opens with a user goal and an opponent miss and reaches sudden death.`,
    `export const SHOOTOUT = ${JSON.stringify(shootout())} as const;`,
    ``,
    `// A seeded challenge whose first match stops for one injury and then for half time.`,
    `export const INJURY_STOP = ${JSON.stringify(injuryStop())} as const;`,
    ``,
    `// A pressing Builder squad with one spent and one tired slot late in extra time.`,
    `export const FATIGUE = ${JSON.stringify(fatigue())} as const;`,
  );
  const options = await resolveConfig(PINS_PATH);
  return format(lines.join("\n"), { ...options, filepath: PINS_PATH });
}
