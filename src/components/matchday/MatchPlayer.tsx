"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { speciesById } from "@/engine";
import type { BenchIndex, FullLineup, ManagerAction, MatchResult, Tactic } from "@/engine/types";
import { ROUND_LABEL } from "@/ui/labels";
import type { MatchView } from "@/ui/settings";
import { injuries, touchlineAt, type Decision } from "@/ui/manager/touchline";
import { PACE, stopsFor, type Pace, type Stop } from "@/ui/matchday/clock";
import { TACTIC_LABEL, beatLine, kickLine, type Teams } from "@/ui/matchday/copy";
import {
  START,
  activeBeat,
  beatKey,
  decisionMinute,
  frameNow,
  landed,
  play,
  revealed,
  type PlayAction,
  type PlayEnv,
  type PlayState,
} from "@/ui/matchday/player";
import { frameSource, type LiveFrame } from "@/ui/matchday/feed";
import { PHASE_LEN, buildTimeline, frameAt, type Beat, type Kick } from "@/ui/matchday/timeline";
import { crowdGain, kickPassDue, penRoar, roarFor } from "@/ui/matchday/crowd";
import { kickCues, kickProgress, kicksShown, type KickCue } from "@/ui/matchday/shootout";
import {
  crowdRoar,
  playAbilitySound,
  playCardSound,
  playGoalHorn,
  playKickPass,
  playOppGoal,
  playSaveSound,
  playSubSound,
  playWhistle,
  setCrowdLevel,
  setSoundEnabled,
  startCrowdBed,
  stopCrowdBed,
  unlockAudio,
  useSoundEnabled,
} from "@/components/wheel/sound";
import { useReducedMotion } from "@/components/wheel/useReducedMotion";
import { buzz } from "./haptics";
import { Touchline } from "./Touchline";
import { setCamera, useCamera } from "./useCamera";
import { useMovesets } from "./useMovesets";
import s from "./MatchPlayer.module.css";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

const KICK_SOUND: Readonly<Record<KickCue, (kick: Kick, speed: number) => void>> = {
  whistle: () => playWhistle("foul"),
  strike: () => playKickPass(),
  roar: (kick, speed) => crowdRoar(penRoar(kick.side, speed)),
  horn: (kick) => (kick.side === "user" ? playGoalHorn() : playOppGoal()),
  glove: () => playSaveSound(),
};

// The broadcast loads only when a live match mounts.
const Broadcast = dynamic(() => import("./Broadcast").then((m) => m.Broadcast), {
  ssr: false,
  loading: () => <div className={s.broadcastLoading}>Loading the broadcast</div>,
});

export interface ManagerControls {
  readonly actions: readonly ManagerAction[];
  /** Records a decision at a match minute; returns why it was refused, or null. */
  readonly decide: (minute: number, d: Decision) => string | null;
}

const TEAMS_USER = "Your XI";

// While the clock runs, React renders the match screen this often; the broadcast moves the pitch on
// every frame in between. A beat that fires, a goal that lands, a new play or a new beat on the
// pitch renders at once.
const COMMIT_GAP = 100;

// The screen reader hears at most one announcement this often, and at most this many lines in it.
const ANNOUNCE_GAP = 1_500;
const ANNOUNCE_MAX = 3;

const STOP_COPY: Readonly<Record<Stop["kind"], { title: string; go: string } | null>> = {
  halftime: {
    title: "Half time. Make your changes for the second half.",
    go: "Start the second half",
  },
  extraTime: { title: "Level after 90 minutes. Extra time is next.", go: "Start extra time" },
  injury: null,
};

export function MatchPlayer({
  match,
  matchIndex,
  seed,
  lineup,
  view,
  manager,
  autoStart = false,
  footer,
}: {
  readonly match: PlayedMatch;
  readonly matchIndex: number;
  readonly seed: string;
  readonly lineup: FullLineup;
  readonly view: MatchView;
  /** Present in manager mode: the touchline, its stops and the decisions so far. */
  readonly manager?: ManagerControls;
  readonly autoStart?: boolean;
  /** Shown under the scoreboard once the match is over. */
  readonly footer?: ReactNode;
}) {
  // Quick is a still pitch with beat sounds only, so only a live broadcast with motion stages.
  const motion = !useReducedMotion() && view === "live";
  const soundOn = useSoundEnabled();
  const cameraChoice = useCamera();
  const movesOf = useMovesets();
  const timeline = useMemo(
    () => buildTimeline(match, { matchIndex, seed, lineup, movesOf }),
    [match, matchIndex, seed, lineup, movesOf],
  );
  const stops = useMemo(
    () => (manager === undefined ? [] : stopsFor(match, lineup)),
    [manager, match, lineup],
  );
  const env: PlayEnv = useMemo(
    () => ({ timeline, stops, pace: PACE[view] }),
    [timeline, stops, view],
  );
  const [state, setState] = useState<PlayState>(() => ({
    ...START,
    running: autoStart || manager !== undefined,
  }));
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  // The play state of the newest frame, ahead of `state` between renders.
  const live = useRef(state);
  const [feed] = useState(frameSource);
  const envRef = useRef(env);
  useEffect(() => {
    envRef.current = env;
  }, [env]);

  const send = (action: PlayAction) => {
    const next = play(live.current, action);
    live.current = next;
    const t = "now" in action ? action.now : (feed.latest()?.now ?? 0);
    feed.publish(frameOf(next, t, envRef.current.pace));
    setState(next);
    // A resume moves every fired time on; the goals that had landed must stay landed meanwhile.
    if ("now" in action) setNow(frameNow(next, action.now));
  };

  // What the match screen shows that time alone changes: the minute on the clock, the goals that
  // have landed, the play the phase sounds follow, the beat on the pitch, and the penalty's cues
  // (its sounds and the shootout score). A change renders at once, not on the next gap.
  const glanceRef = useRef<(st: PlayState, t: number) => string>(() => "");
  useEffect(() => {
    glanceRef.current = (st, t) => {
      let goals = 0;
      for (const b of timeline.beats) {
        if (b.kind === "goal" && revealed(b, st.minute) && landed(b, st.fired, t, motion, st.speed))
          goals++;
      }
      const on = activeBeat(timeline, st.fired, t, motion, st.minute, st.speed);
      const phase = view === "live" ? Math.floor(st.minute / PHASE_LEN) : 0;
      const kick = kickProgress(st, t, envRef.current.pace);
      const cues = kickCues(true, motion).filter((c) => c.at <= kick).length;
      return `${Math.floor(st.minute)}|${goals}|${phase}|${on === null ? "" : beatKey(on.beat)}|${cues}`;
    };
  }, [timeline, motion, view]);

  // The clock holds at kickoff until the movesets settle, so every callout and sound is canon.
  const moving =
    movesOf !== null &&
    state.running &&
    !state.uiHold &&
    state.stage !== "done" &&
    state.stop === null;
  useEffect(() => {
    if (!moving) return;
    let raf = 0;
    let last = performance.now();
    let shownAt = last;
    let glance = glanceRef.current(live.current, last);
    const frame = (t: number) => {
      const dt = Math.min(100, t - last);
      last = t;
      const prev = live.current;
      const next = play(prev, { type: "tick", now: t, dt, env: envRef.current });
      live.current = next;
      const asked = feed.publish(frameOf(next, t, envRef.current.pace));
      const seen = glanceRef.current(next, t);
      if (asked || changed(prev, next) || seen !== glance || t - shownAt >= COMMIT_GAP) {
        glance = seen;
        shownAt = t;
        setState(next);
        setNow(t);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [moving, feed]);

  // The broadcast keeps staging effects while a stop or a pause holds the clock.
  useEffect(() => {
    if (moving || !motion) return;
    let raf = 0;
    let shownAt = -Infinity;
    let glance = "";
    const frame = (t: number) => {
      const at = frameNow(live.current, t);
      const asked = feed.publish(frameOf(live.current, t, envRef.current.pace));
      const seen = glanceRef.current(live.current, at);
      if (asked || seen !== glance || t - shownAt >= COMMIT_GAP) {
        glance = seen;
        shownAt = t;
        setNow(at);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const stopAt = window.setTimeout(() => cancelAnimationFrame(raf), 3_000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(stopAt);
    };
  }, [moving, motion, feed]);

  // The crowd only fills a live broadcast while its clock runs: Quick, a pause, a stop, full time,
  // leaving the matchday and the sound toggle all silence it.
  const crowd = soundOn && view === "live" && moving;
  useEffect(() => {
    if (!crowd) return;
    startCrowdBed();
    return stopCrowdBed;
  }, [crowd]);
  const onBall = useCallback((x: number) => setCrowdLevel(crowdGain(x)), []);

  // Haptics ride on the beat sounds' fired sets, so a beat already played never buzzes again.
  const haptics = soundOn && view === "live";
  const sounded = useRef(new Set<string>());
  const horned = useRef(new Set<string>());
  useEffect(() => {
    const fresh: Beat[] = [];
    const scored: Extract<Beat, { kind: "goal" }>[] = [];
    for (const b of timeline.beats) {
      const key = beatKey(b);
      if (state.fired[key] === undefined) continue;
      if (!sounded.current.has(key)) {
        sounded.current.add(key);
        fresh.push(b);
      }
      if (
        b.kind === "goal" &&
        !horned.current.has(key) &&
        landed(b, state.fired, now, motion, state.speed)
      ) {
        horned.current.add(key);
        scored.push(b);
      }
    }
    if (fresh.length === 0 && scored.length === 0) return;
    if (state.stage === "done" && fresh.length > 4) {
      playWhistle("fulltime");
      if (haptics) buzz("final");
      return;
    }
    for (const b of scored) {
      if (b.side === "user") {
        playGoalHorn();
        if (haptics) buzz("goal");
      } else playOppGoal();
      if (view === "live") crowdRoar(roarFor(b, state.speed));
    }
    for (const b of fresh) {
      if (b.kind === "goal") {
        playAbilitySound(b.callout.effect);
      } else if (b.kind === "save") {
        playSaveSound();
      } else if (b.kind === "card") {
        playCardSound(b.color);
        if (haptics && b.color === "red" && b.side === "user") buzz("red");
      } else if (b.kind === "sub") {
        playSubSound();
      } else if (b.kind === "whistle") {
        const wKind =
          b.label === "Kick off"
            ? "kickoff"
            : b.label === "Half time" || b.label === "Extra time half time"
              ? "halftime"
              : "fulltime";
        playWhistle(wKind);
        if (haptics && (b.label === "Full time" || b.label === "End of extra time")) buzz("final");
      }
    }
  }, [state.fired, state.stage, state.speed, timeline, now, motion, view, haptics]);

  const lastPhase = useRef(-1);
  const lastKick = useRef<number | null>(null);
  useEffect(() => {
    if (!moving || view !== "live") return;
    const idx = Math.floor(state.minute / PHASE_LEN);
    if (idx === lastPhase.current || idx < 0 || idx >= timeline.plays.length) return;
    lastPhase.current = idx;
    const phase = timeline.plays[idx];
    if (phase === undefined) return;
    if (phase.callout !== null) {
      playAbilitySound(phase.callout.effect);
    } else if (kickPassDue(idx, phase, lastKick.current)) {
      lastKick.current = idx;
      playKickPass();
    }
  }, [moving, view, state.minute, timeline.plays]);

  const progress = kickProgress(state, now, env.pace);
  const cued = useRef(new Set<string>());
  useEffect(() => {
    if (timeline.kicks.length === 0 || state.stage === "play") return;
    const due: { key: string; kick: Kick; cue: KickCue }[] = [];
    const last = Math.min(state.kicks, timeline.kicks.length - 1);
    for (let i = 0; i <= last; i++) {
      const kick = timeline.kicks[i]!;
      const at = i < state.kicks ? 1 : progress;
      for (const c of kickCues(kick.scored, motion)) {
        const key = `${i}:${c.cue}`;
        if (c.at <= at && !cued.current.has(key)) due.push({ key, kick, cue: c.cue });
      }
    }
    for (const d of due) cued.current.add(d.key);
    // A skip resolves every remaining kick at once and gets no burst of sounds.
    if (new Set(due.map((d) => d.kick.index)).size > 1) return;
    for (const { kick, cue } of due) KICK_SOUND[cue](kick, state.speed);
  }, [timeline, state.stage, state.kicks, state.speed, progress, motion]);

  const teams: Teams = { user: TEAMS_USER, opp: match.opponent.name };
  const clock = state.minute;
  const shown = timeline.beats.filter(
    (b) => revealed(b, clock) && landed(b, state.fired, now, motion, state.speed),
  );
  const goals = shown.filter((b) => b.kind === "goal");
  const score = goals.at(-1)?.kind === "goal" ? goals.at(-1)!.score : { user: 0, opp: 0 };
  const kicks = timeline.kicks.slice(
    0,
    kicksShown(timeline.kicks.length, state.kicks, progress, motion),
  );
  const pens = kicks.at(-1)?.score ?? null;
  const done = state.stage === "done";
  const minuteLabel = done
    ? "FT"
    : state.stage === "pens"
      ? "Pens"
      : clock === 0
        ? "KO"
        : `${Math.floor(clock)}'`;

  const at = decisionMinute(timeline, clock);
  const line =
    manager === undefined ? null : touchlineAt(match, matchIndex, lineup, manager.actions, at);
  const closeSheet = () => {
    if (live.current.uiHold) send({ type: "sheet", open: false, now: performance.now() });
  };
  const decide = (d: Decision) => {
    if (manager === undefined) return;
    const why = manager.decide(at, d);
    setError(why);
    if (why === null && d.kind === "sub") closeSheet();
  };
  const sheet = manager !== undefined && !done;
  const { sheetRef, pitchRef, playerRef, spacerRef } = useSheet(
    sheet,
    state.uiHold,
    state.stop?.key ?? null,
    closeSheet,
  );

  const snapWindow =
    match.windows?.find((w) => w.minute >= Math.max(5, Math.ceil(clock / 5) * 5)) ??
    match.windows?.at(-1);
  const latestTactic = (side: "user" | "opp"): Tactic | null => {
    for (let i = shown.length - 1; i >= 0; i--) {
      const b = shown[i]!;
      if (b.kind === "tactic" && b.side === side) return b.tactic;
    }
    return null;
  };
  const userTactic: Tactic =
    line?.tactic ?? latestTactic("user") ?? snapWindow?.tactic.user ?? "balanced";
  const oppTactic: Tactic = latestTactic("opp") ?? snapWindow?.tactic.opp ?? "balanced";
  const userShots = shown.filter(
    (b) => (b.kind === "goal" && b.side === "user") || (b.kind === "save" && b.side === "opp"),
  ).length;
  const oppShots = shown.filter(
    (b) => (b.kind === "goal" && b.side === "opp") || (b.kind === "save" && b.side === "user"),
  ).length;
  const lean = frameAt(timeline, clock)?.ball ?? 0;
  const userMomentum = Math.round(50 + lean * 28);
  const oppMomentum = 100 - userMomentum;

  const hintId = useId();
  const stop = state.stop;
  const injury =
    stop?.kind === "injury"
      ? (injuries(match, lineup).find((c) => `injury:${c.minute}:${c.slot}` === stop.key) ?? null)
      : null;

  return (
    <section
      ref={playerRef}
      className={s.player}
      aria-label={`${ROUND_LABEL[match.round]} against ${match.opponent.name}`}
      data-testid="match-player"
      data-view={view}
      data-stage={state.stage}
      data-minute={Math.floor(clock)}
    >
      <div className={s.scoreboard} data-testid="matchday-scoreboard">
        <span className={s.team}>{TEAMS_USER}</span>
        <span className={s.center}>
          <span className={`num ${s.clock}`} data-testid="matchday-clock">
            {minuteLabel}
          </span>
          <span className={`num ${s.score}`} role="status" data-testid="matchday-score">
            {score.user} - {score.opp}
          </span>
          {pens !== null ? (
            <span className={`num ${s.pens}`} data-testid="matchday-pens">
              Pens {pens.user} - {pens.opp}
            </span>
          ) : null}
        </span>
        <span className={`${s.team} ${s.teamOpp}`}>{match.opponent.name}</span>
      </div>
      <div className={s.progress} aria-hidden="true">
        <span style={{ width: `${Math.min(100, (clock / timeline.finalMinute) * 100)}%` }} />
      </div>

      <div className={s.hud} data-testid="match-hud">
        <div className={s.hudSide}>
          <span className={s.hudBadge} data-side="user">
            {TACTIC_LABEL[userTactic]}
          </span>
          <span className={`num ${s.hudStat}`}>{userShots} SoT</span>
        </div>
        <div className={s.momentum} aria-label="Match momentum">
          <span className={`num ${s.momentumPct}`}>{userMomentum}%</span>
          <span className={s.momentumTrack} aria-hidden="true">
            <span className={s.momentumFill} style={{ width: `${userMomentum}%` }} />
          </span>
          <span className={`num ${s.momentumPct}`}>{oppMomentum}%</span>
        </div>
        <div className={`${s.hudSide} ${s.hudSideOpp}`}>
          <span className={`num ${s.hudStat}`}>{oppShots} SoT</span>
          <span className={s.hudBadge} data-side="opp">
            {TACTIC_LABEL[oppTactic]}
          </span>
        </div>
      </div>

      <div ref={pitchRef} className={s.pitch}>
        <Broadcast
          match={match}
          timeline={timeline}
          lineup={lineup}
          clock={clock}
          now={now}
          fired={state.fired}
          kicks={state.kicks}
          kickProgress={progress}
          motion={motion}
          speed={state.speed}
          feed={feed}
          cutIns={view === "live"}
          camera={view === "live" ? cameraChoice : "full"}
          onBall={crowd ? onBall : undefined}
        />
      </div>

      <div className={s.controls}>
        {!done ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="play-toggle"
              disabled={stop !== null}
              onClick={() => {
                unlockAudio();
                send({ type: "toggle", now: performance.now() });
              }}
            >
              {state.running ? "Pause" : clock === 0 ? "Kick off" : "Resume"}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              aria-pressed={state.speed === 2}
              data-testid="speed-toggle"
              onClick={() => send({ type: "speed" })}
            >
              2x speed
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid="skip-ft"
              onClick={() => send({ type: "skip", env })}
            >
              Skip to full time
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          aria-pressed={soundOn}
          aria-describedby={hintId}
          data-testid="sound-toggle"
          onClick={() => {
            const next = !soundOn;
            setSoundEnabled(next);
            if (next) unlockAudio();
          }}
        >
          {soundOn ? "Sound and haptics on" : "Sound and haptics off"}
        </button>
        {view === "live" ? (
          <div className={s.camera} role="group" aria-label="Camera">
            <button
              type="button"
              className="btn btn--sm"
              aria-pressed={cameraChoice === "full"}
              data-testid="camera-full"
              onClick={() => setCamera("full")}
            >
              Full pitch
            </button>
            <button
              type="button"
              className="btn btn--sm"
              aria-pressed={cameraChoice === "follow"}
              data-testid="camera-follow"
              onClick={() => setCamera("follow")}
            >
              Follow
            </button>
          </div>
        ) : null}
        <p id={hintId} className={s.controlHint} data-testid="haptics-hint">
          Haptics work on Android phones only.
        </p>
      </div>

      {sheet ? (
        <div ref={sheetRef} className={s.sheet} data-testid="touchline-sheet">
          {stop !== null && stop.kind !== "injury" ? (
            <div
              className={s.prompt}
              role="dialog"
              aria-label={STOP_COPY[stop.kind]!.go}
              data-testid={`stop-${stop.kind}`}
            >
              <p className={s.promptTitle}>{STOP_COPY[stop.kind]!.title}</p>
              <button
                type="button"
                className="btn btn--primary"
                data-testid="stop-go"
                onClick={() => {
                  unlockAudio();
                  setError(null);
                  closeSheet();
                  send({ type: "answer", key: stop.key });
                }}
              >
                {STOP_COPY[stop.kind]!.go}
              </button>
            </div>
          ) : null}

          {stop?.kind === "injury" && injury !== null ? (
            <InjuryPrompt
              key={stop.key}
              name={speciesById(injury.player).name}
              minute={injury.minute}
              autoPick={injury.autoPick}
              options={injury.options.map((b) => ({
                index: b.index,
                name: speciesById(b.species).name,
              }))}
              onConfirm={(bench) => {
                if (bench !== injury.autoPick && manager !== undefined) {
                  const why = manager.decide(injury.minute, {
                    kind: "sub",
                    slot: injury.slot,
                    bench,
                  });
                  setError(why);
                  if (why !== null) return;
                }
                closeSheet();
                send({ type: "answer", key: stop.key });
              }}
              error={error}
            />
          ) : null}

          {line !== null ? (
            <Touchline
              key={matchIndex}
              line={line}
              formation={lineup.formation}
              onDecide={decide}
              error={stop?.kind === "injury" ? null : error}
              sheet={{
                expanded: state.uiHold,
                onExpand: (open) => send({ type: "sheet", open, now: performance.now() }),
              }}
            />
          ) : null}
        </div>
      ) : null}

      {done && footer !== undefined ? <div className={s.footer}>{footer}</div> : null}

      <Ticker shown={shown} teams={teams} kicks={kicks} />
      {sheet ? <div ref={spacerRef} className={s.sheetSpacer} aria-hidden="true" /> : null}
    </section>
  );
}

function frameOf(st: PlayState, now: number, pace: Pace): LiveFrame {
  const at = frameNow(st, now);
  return {
    clock: st.minute,
    now: at,
    fired: st.fired,
    kicks: st.kicks,
    kickProgress: kickProgress(st, at, pace),
    speed: st.speed,
  };
}

// Under an open sheet or a stop the scoreboard, the HUD and the pitch stay in view, so the sheet
// takes at most the room below the pitch with the match player at the top of the screen.
const PITCH_GAP = 8;
const MIN_SHEET_ROOM = 120;

/**
 * Below 600px the touchline is a fixed bottom sheet. The spacer under the page keeps the ticker
 * reachable above it, and opening the sheet or a stop brings the pitch back into view. Turning the
 * phone to a layout without the sheet closes it, since nothing there could close it again.
 */
function useSheet(present: boolean, expanded: boolean, stopKey: string | null, close: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const wasFixed = useRef(false);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    const sheet = sheetRef.current;
    const spacer = spacerRef.current;
    if (!present || sheet === null || spacer === null || typeof ResizeObserver === "undefined")
      return;
    const observer = new ResizeObserver(() => {
      spacer.style.height = `${sheet.getBoundingClientRect().height}px`;
    });
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [present]);

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const pitch = pitchRef.current;
    const player = playerRef.current;
    const spacer = spacerRef.current;
    if (!present || sheet === null || pitch === null || player === null || spacer === null) return;
    const fit = (bringIntoView: boolean) => {
      const fixed = getComputedStyle(sheet).position === "fixed";
      if (!fixed && wasFixed.current && expanded) closeRef.current();
      wasFixed.current = fixed;
      if (!fixed) return;
      const top = player.getBoundingClientRect().top;
      const box = pitch.getBoundingClientRect();
      const room = Math.max(MIN_SHEET_ROOM, innerHeight - (box.bottom - top) - PITCH_GAP);
      sheet.style.setProperty("--sheet-room", `${room}px`);
      const sheetBox = sheet.getBoundingClientRect();
      // The page must be long enough to scroll the player to the top before the observer runs.
      spacer.style.height = `${sheetBox.height}px`;
      if (bringIntoView && (box.top < 0 || box.bottom > sheetBox.top)) {
        window.scrollTo({ top: scrollY + top, behavior: "instant" });
      }
    };
    fit(expanded || stopKey !== null);
    const onResize = () => fit(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [present, expanded, stopKey]);

  return { sheetRef, pitchRef, playerRef, spacerRef };
}

// Whether a tick changed anything but the minute: a beat fired, a hold, a stop, the shootout.
function changed(prev: PlayState, next: PlayState): boolean {
  return (
    prev.fired !== next.fired ||
    prev.hold !== next.hold ||
    prev.stop !== next.stop ||
    prev.stage !== next.stage ||
    prev.kicks !== next.kicks
  );
}

function Ticker({
  shown,
  teams,
  kicks,
}: {
  readonly shown: readonly ReturnType<typeof buildTimeline>["beats"][number][];
  readonly teams: Teams;
  readonly kicks: readonly ReturnType<typeof buildTimeline>["kicks"][number][];
}) {
  const lines = [
    ...shown.map((b) => ({
      key: beatKey(b),
      kind: b.kind,
      side: "side" in b ? b.side : undefined,
      text: beatLine(b, teams),
    })),
    ...kicks.map((k) => ({
      key: `kick:${k.index}`,
      kind: "kick" as const,
      side: k.side,
      text: kickLine(k, teams),
    })),
  ].reverse();
  const latest = useAnnouncement(lines);
  return (
    <div className={s.ticker}>
      <p className={s.srOnly} aria-live="polite" data-testid="ticker-latest">
        {latest}
      </p>
      <ol className={s.tickerList} aria-label="Match events" data-testid="ticker">
        {lines.map((l, i) => (
          <li key={l.key} data-kind={l.kind} data-side={l.side} data-latest={i === 0 || undefined}>
            {l.text}
          </li>
        ))}
      </ol>
    </div>
  );
}

function InjuryPrompt({
  name,
  minute,
  autoPick,
  options,
  onConfirm,
  error,
}: {
  readonly name: string;
  readonly minute: number;
  readonly autoPick: BenchIndex | null;
  readonly options: readonly { readonly index: BenchIndex; readonly name: string }[];
  readonly onConfirm: (bench: BenchIndex) => void;
  readonly error: string | null;
}) {
  const [choice, setChoice] = useState<BenchIndex | null>(autoPick ?? options[0]?.index ?? null);
  return (
    <div className={s.prompt} role="dialog" aria-label="Injury" data-testid="stop-injury">
      <p className={s.promptTitle}>
        {minute}&apos; {name} is injured. Choose who comes on.
      </p>
      <fieldset className={s.choices}>
        <legend className={s.srOnly}>Replacement for {name}</legend>
        {options.map((o) => (
          <label key={o.index} className={s.choice}>
            <input
              type="radio"
              name="injury-choice"
              checked={choice === o.index}
              onChange={() => setChoice(o.index)}
            />
            <span>
              {o.name}
              {o.index === autoPick ? " (assistant's pick)" : ""}
            </span>
          </label>
        ))}
      </fieldset>
      {error !== null ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn--primary"
        data-testid="injury-confirm"
        disabled={choice === null}
        onClick={() => {
          if (choice !== null) onConfirm(choice);
        }}
      >
        Send them on
      </button>
    </div>
  );
}

/**
 * The live region's text: every event line not yet announced, oldest first, at most one
 * announcement per gap so a fast replay does not flood the screen reader.
 */
function useAnnouncement(lines: readonly { readonly key: string; readonly text: string }[]) {
  const [text, setText] = useState("");
  const said = useRef({ keys: new Set<string>(), at: -Infinity });
  const latest = useRef(lines);
  useEffect(() => {
    latest.current = lines;
  });
  const count = lines.length;
  useEffect(() => {
    if (count === 0) return;
    const wait = Math.max(0, said.current.at + ANNOUNCE_GAP - performance.now());
    const timer = window.setTimeout(() => {
      const fresh = latest.current.filter((l) => !said.current.keys.has(l.key));
      if (fresh.length === 0) return;
      for (const l of fresh) said.current.keys.add(l.key);
      said.current.at = performance.now();
      setText(
        fresh
          .slice(0, ANNOUNCE_MAX)
          .reverse()
          .map((l) => l.text)
          .join(" "),
      );
    }, wait);
    return () => window.clearTimeout(timer);
  }, [count]);
  return text;
}
