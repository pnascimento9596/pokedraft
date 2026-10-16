"use client";

import { useEffect, useMemo, useState } from "react";
import { FORMATIONS } from "@/engine";
import type { FormationId, FullLineup, MatchResult, Side } from "@/engine/types";
import type { Moveset } from "@/data/movesets";
import { PlayerImage } from "@/components/PlayerImage";
import { TACTIC_LABEL } from "@/ui/matchday/copy";
import { beatKey } from "@/ui/matchday/player";
import {
  ambientBall,
  buildTimeline,
  driftPoint,
  frameAt,
  goalBall,
  goalMouth,
  slotPoint,
  xiAt,
  type Beat,
  type Point,
  type Timeline,
} from "@/ui/matchday/timeline";
import s from "./Broadcast.module.css";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
type MovesOf = (id: number) => Moveset | null;

// Bosses without a recorded shape line up in a 4-3-3.
const OPP_SHAPE: FormationId = "4-3-3";

// How long each beat stays on the pitch, in real milliseconds.
const SHOW: Readonly<Record<Beat["kind"], number>> = {
  whistle: 1_200,
  goal: 2_600,
  save: 1_100,
  card: 1_600,
  injury: 1_800,
  sub: 1_800,
  tactic: 2_000,
};

function useMovesets(): MovesOf | null {
  const [movesOf, setMovesOf] = useState<MovesOf | null>(null);
  useEffect(() => {
    let live = true;
    void import("@/data/movesets").then((m) => {
      if (!live) return;
      setMovesOf(() => (id: number) => {
        try {
          return m.movesetFor(id);
        } catch {
          return null;
        }
      });
    });
    return () => {
      live = false;
    };
  }, []);
  return movesOf;
}

interface Active {
  readonly beat: Beat;
  /** 0 to 1 through its time on screen; 1 when motion is reduced. */
  readonly progress: number;
}

/** The latest beat still on screen. With reduced motion, the latest beat shown at all. */
function activeBeat(
  timeline: Timeline,
  fired: Readonly<Record<string, number>>,
  now: number,
  motion: boolean,
): Active | null {
  let best: Active | null = null;
  let bestAt = -Infinity;
  for (const beat of timeline.beats) {
    const at = fired[beatKey(beat)];
    if (at === undefined) continue;
    if (!motion) {
      if (beat.kind !== "whistle" || best === null) best = { beat, progress: 1 };
      continue;
    }
    const age = now - at;
    if (age < 0 || age > SHOW[beat.kind]) continue;
    if (at >= bestAt) {
      bestAt = at;
      best = { beat, progress: age / SHOW[beat.kind] };
    }
  }
  return best;
}

function pct(p: Point) {
  return { left: `${p.x}%`, top: `${p.y}%` } as const;
}

export function Broadcast({
  match,
  matchIndex,
  seed,
  lineup,
  clock,
  now,
  fired,
  kicks,
  motion,
}: {
  readonly match: PlayedMatch;
  readonly matchIndex: number;
  readonly seed: string;
  readonly lineup: FullLineup;
  readonly clock: number;
  readonly now: number;
  readonly fired: Readonly<Record<string, number>>;
  readonly kicks: number;
  readonly motion: boolean;
}) {
  const movesOf = useMovesets();
  const timeline = useMemo(
    () => buildTimeline(match, { matchIndex, seed, lineup, movesOf }),
    [match, matchIndex, seed, lineup, movesOf],
  );
  const userSlots = FORMATIONS[lineup.formation].slots;
  const oppSlots = FORMATIONS[match.opponent.formation ?? OPP_SHAPE].slots;
  const frame = frameAt(timeline, clock);
  const line = frame?.line ?? { user: 0, opp: 0 };
  const userXI = xiAt(timeline, "user", clock);
  const oppXI = xiAt(timeline, "opp", clock);

  const spot = (side: Side, slot: number): Point => {
    const slots = side === "user" ? userSlots : oppSlots;
    const home = slotPoint(side, slots[slot] ?? { x: 50, y: 50 }, line[side]);
    const d = timeline.drift[side][slot];
    return d === undefined ? home : driftPoint(home, d, clock, motion);
  };

  const active = activeBeat(timeline, fired, now, motion);
  const goal = active?.beat.kind === "goal" ? active.beat : null;
  let ball = ambientBall(timeline, clock, motion);
  if (goal !== null && goal.scorer.slot !== null) {
    const scorer = spot(goal.side, goal.scorer.slot);
    const from = goal.assist?.slot != null ? spot(goal.side, goal.assist.slot) : { x: 50, y: 50 };
    ball = goalBall(from, scorer, goalMouth(goal.side), motion ? active!.progress : 1);
  } else if (goal !== null) {
    ball = goalMouth(goal.side);
  } else if (active?.beat.kind === "save") {
    ball = goalMouth(active.beat.side === "user" ? "opp" : "user");
  }
  const progress = active?.progress ?? 0;
  const shown = (from: number, to = 1) => !motion || (progress >= from && progress <= to);

  const kickList = timeline.kicks.slice(0, kicks);
  const highlight = (side: Side, slot: number): boolean => {
    const b = active?.beat;
    if (b === undefined) return false;
    if (b.kind === "goal")
      return b.side === side && (b.scorer.slot === slot || b.assist?.slot === slot);
    if (b.kind === "save") return b.side === side && b.keeper.slot === slot;
    if (b.kind === "card") return b.side === side && b.player.slot === slot;
    if (b.kind === "injury" || b.kind === "sub")
      return side === "user" && (b.kind === "injury" ? b.player.slot : b.slot) === slot;
    return false;
  };

  return (
    <div
      className={s.broadcast}
      data-testid="broadcast"
      data-motion={motion ? "on" : "off"}
      data-goals-only={timeline.goalsOnly || undefined}
    >
      <div className={s.pitch} aria-hidden="true">
        <svg className={s.lines} viewBox="0 0 100 64" preserveAspectRatio="none">
          {Array.from({ length: 10 }, (_, i) => (
            <rect
              key={i}
              x={i * 10}
              y={0}
              width={10}
              height={64}
              className={i % 2 ? s.stripeB : s.stripeA}
            />
          ))}
          <rect x={1.5} y={1.5} width={97} height={61} className={s.mark} />
          <line x1={50} y1={1.5} x2={50} y2={62.5} className={s.mark} />
          <circle cx={50} cy={32} r={8} className={s.mark} />
          <rect x={1.5} y={17} width={14} height={30} className={s.mark} />
          <rect x={84.5} y={17} width={14} height={30} className={s.mark} />
          <rect x={0} y={27} width={1.5} height={10} className={s.goal} />
          <rect x={98.5} y={27} width={1.5} height={10} className={s.goal} />
        </svg>

        {userXI.map((id, slot) =>
          id === null ? null : (
            <div
              key={`u${slot}`}
              className={s.player}
              data-side="user"
              data-hot={highlight("user", slot) || undefined}
              style={pct(spot("user", slot))}
            >
              <PlayerImage dexId={id} size={80} alt="" />
            </div>
          ),
        )}
        {oppXI.map((id, slot) => {
          const ref = match.opponent.roster[slot];
          return ref === undefined || (id === null && ref.kind === "species") ? null : (
            <div
              key={`o${slot}`}
              className={s.player}
              data-side="opp"
              data-hot={highlight("opp", slot) || undefined}
              style={pct(spot("opp", slot))}
            >
              {id !== null ? (
                <PlayerImage dexId={id} size={80} alt="" />
              ) : (
                <span className={s.shirt}>{ref.kind === "shirt" ? ref.number : ""}</span>
              )}
            </div>
          );
        })}

        <div className={s.ball} style={pct(ball)} data-testid="broadcast-ball" />

        {goal !== null && shown(0.35, 0.75) ? (
          <div
            className={s.effect}
            data-effect={goal.callout.effect}
            style={pct(goalMouth(goal.side))}
          />
        ) : null}
        {active?.beat.kind === "save" ? (
          <div
            className={s.effect}
            data-effect={active.beat.callout.effect}
            style={pct(goalMouth(active.beat.side === "user" ? "opp" : "user"))}
          />
        ) : null}
        {goal !== null && shown(0.6, 0.9) ? (
          <div className={s.flash} data-side={goal.side} data-testid="goal-flash">
            GOAL
          </div>
        ) : null}
      </div>

      <div className={s.overlay}>
        {goal !== null && shown(0.25, 1) ? (
          <p className={s.callout} data-effect={goal.callout.effect} data-testid="move-callout">
            {goal.callout.text}
          </p>
        ) : null}
        {active?.beat.kind === "save" ? (
          <p
            className={s.callout}
            data-effect={active.beat.callout.effect}
            data-testid="save-callout"
          >
            {active.beat.callout.text}
          </p>
        ) : null}
        {active?.beat.kind === "card" ? (
          <p className={s.banner} data-testid="card-flash">
            <span className={s.card} data-color={active.beat.color} />
            {active.beat.color === "red" ? "Red card" : "Yellow card"}: {active.beat.player.name}
          </p>
        ) : null}
        {active?.beat.kind === "injury" ? (
          <p className={s.banner} data-testid="medic">
            <span className={s.medic} />
            {active.beat.player.name} is down
          </p>
        ) : null}
        {active?.beat.kind === "sub" ? (
          <p className={s.banner} data-testid="sub-board">
            <span className={s.board}>
              <span data-dir="on">{active.beat.in.name}</span>
              <span data-dir="off">{active.beat.out.name}</span>
            </span>
          </p>
        ) : null}
        {active?.beat.kind === "tactic" ? (
          <p className={s.banner} data-testid="tactic-banner">
            {active.beat.side === "user" ? "Your side" : match.opponent.name} switch to{" "}
            {TACTIC_LABEL[active.beat.tactic]}
          </p>
        ) : null}
        {active?.beat.kind === "whistle" && motion ? (
          <p className={s.banner} data-testid="whistle">
            {active.beat.label}
          </p>
        ) : null}
        {timeline.kicks.length > 0 && clock >= timeline.finalMinute ? (
          <ol className={s.kicks} aria-label="Penalty shootout" data-testid="shootout">
            {timeline.kicks.map((k, i) => (
              <li
                key={k.index}
                data-side={k.side}
                data-state={i < kickList.length ? (k.scored ? "scored" : "missed") : "waiting"}
              />
            ))}
          </ol>
        ) : null}
      </div>
      {timeline.goalsOnly ? (
        <p className={s.note}>This run was recorded before match events. Only goals are shown.</p>
      ) : null}
    </div>
  );
}
