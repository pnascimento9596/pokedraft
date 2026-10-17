"use client";

import { useMemo } from "react";
import { FORMATIONS } from "@/engine";
import type { FormationId, FullLineup, MatchResult } from "@/engine/types";
import { PlayerImage } from "@/components/PlayerImage";
import { TACTIC_LABEL } from "@/ui/matchday/copy";
import { activeBeat } from "@/ui/matchday/player";
import {
  GOAL_LANDS,
  goalMouth,
  stagePitch,
  type Point,
  type StagedPlayer,
  type Timeline,
} from "@/ui/matchday/timeline";
import s from "./Broadcast.module.css";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Bosses without a recorded shape line up in a 4-3-3.
const OPP_SHAPE: FormationId = "4-3-3";

function pct(p: Point) {
  return { left: `${p.x}%`, top: `${p.y}%` } as const;
}

export function Broadcast({
  match,
  timeline,
  lineup,
  clock,
  now,
  fired,
  kicks,
  motion,
}: {
  readonly match: PlayedMatch;
  /** The one timeline the match player clocks, sounds and stages from. */
  readonly timeline: Timeline;
  readonly lineup: FullLineup;
  readonly clock: number;
  readonly now: number;
  readonly fired: Readonly<Record<string, number>>;
  readonly kicks: number;
  readonly motion: boolean;
}) {
  const userSlots = FORMATIONS[lineup.formation].slots;
  const oppSlots = FORMATIONS[match.opponent.formation ?? OPP_SHAPE].slots;
  const oppLabels = useMemo(
    () => match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
    [match.opponent.roster],
  );

  const active = activeBeat(timeline, fired, now, motion, clock);
  const stage = stagePitch(timeline, {
    clock,
    active,
    kicks,
    motion,
    userSlots,
    oppSlots,
    oppLabels,
  });
  const goal = active?.beat.kind === "goal" ? active.beat : null;
  const progress = active?.progress ?? 0;
  const shown = (from: number, to = 1) => !motion || (progress >= from && progress <= to);
  const kickList = timeline.kicks.slice(0, kicks);

  const renderPlayer = (p: StagedPlayer | null, keyPrefix: string) => {
    if (p === null) return null;
    const ref = p.side === "opp" ? match.opponent.roster[p.slot] : undefined;
    return (
      <div
        key={`${keyPrefix}${p.slot}`}
        className={s.player}
        data-side={p.side}
        data-slot={p.slot}
        data-pose={p.pose}
        data-facing={p.facing}
        data-ball={p.hasBall || undefined}
        data-hot={p.hot || undefined}
        data-effect={p.callout?.effect ?? undefined}
        style={pct(p.point)}
      >
        <span className={s.playerSprite}>
          {p.species !== null ? (
            <PlayerImage dexId={p.species} size={80} alt="" />
          ) : (
            <span className={s.shirt}>{ref?.kind === "shirt" ? ref.number : ""}</span>
          )}
        </span>
        {p.yellowCards > 0 ? (
          <span
            className={s.cardPip}
            data-testid={`pitch-card-${p.side}-${p.slot}`}
            aria-hidden="true"
          />
        ) : null}
        {p.hasBall ? (
          <span className={s.carrierBadge} data-testid="ball-carrier">
            {p.name}
          </span>
        ) : null}
      </div>
    );
  };

  const trail = stage.trail;
  const trailMidY =
    trail === null
      ? 50
      : (trail.from.y + trail.to.y) / 2 -
        (trail.kind === "shot" || trail.kind === "pass" ? 3.5 : 0);
  const trailPath =
    trail === null
      ? ""
      : `M ${trail.from.x} ${trail.from.y} Q ${(trail.from.x + trail.to.x) / 2} ${trailMidY} ${trail.to.x} ${trail.to.y}`;

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
          <circle cx={50} cy={32} r={0.55} className={s.spot} />
          <rect x={1.5} y={14} width={14.5} height={36} className={s.mark} />
          <rect x={84} y={14} width={14.5} height={36} className={s.mark} />
          <rect x={1.5} y={23} width={5.2} height={18} className={s.mark} />
          <rect x={93.3} y={23} width={5.2} height={18} className={s.mark} />
          <circle cx={11} cy={32} r={0.5} className={s.spot} />
          <circle cx={89} cy={32} r={0.5} className={s.spot} />
          <path d="M 16 25.5 A 7.5 7.5 0 0 1 16 38.5" className={s.mark} />
          <path d="M 84 25.5 A 7.5 7.5 0 0 0 84 38.5" className={s.mark} />
          <path d="M 1.5 3.3 A 1.8 1.8 0 0 0 3.3 1.5" className={s.mark} />
          <path d="M 96.7 1.5 A 1.8 1.8 0 0 0 98.5 3.3" className={s.mark} />
          <path d="M 1.5 60.7 A 1.8 1.8 0 0 1 3.3 62.5" className={s.mark} />
          <path d="M 98.5 60.7 A 1.8 1.8 0 0 0 96.7 62.5" className={s.mark} />
          <rect x={0} y={26.5} width={1.5} height={11} className={s.goal} />
          <rect x={98.5} y={26.5} width={1.5} height={11} className={s.goal} />
        </svg>

        {trail !== null ? (
          <svg
            className={s.trails}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            data-testid="pitch-trails"
            data-kind={trail.kind}
            data-effect={trail.effect ?? undefined}
          >
            <path d={trailPath} className={s.trailGlow} />
            <path d={trailPath} className={s.trailLine} />
            <circle cx={trail.from.x} cy={trail.from.y} r={1.1} className={s.trailOrigin} />
          </svg>
        ) : null}

        {stage.players.user.map((p) => renderPlayer(p, "u"))}
        {stage.players.opp.map((p) => renderPlayer(p, "o"))}

        {stage.playCallout !== null ? (
          <>
            <div
              className={s.playEffect}
              data-effect={stage.playCallout.callout.effect}
              style={pct(stage.playCallout.point)}
            />
            <div
              className={s.playBadge}
              data-side={stage.playCallout.side}
              data-effect={stage.playCallout.callout.effect}
              data-testid="pitch-ability"
              style={pct(stage.playCallout.point)}
            >
              {stage.playCallout.callout.text}
            </div>
          </>
        ) : null}

        <div
          className={s.ball}
          style={pct(stage.ball)}
          data-effect={stage.ball.effect ?? undefined}
          data-testid="broadcast-ball"
        >
          <span
            className={s.ballShadow}
            style={{
              transform: `translate(-50%, -50%) scale(${(1 - stage.ball.loft * 0.25).toFixed(2)})`,
              opacity: Math.max(0.28, 0.72 - stage.ball.loft * 0.35),
            }}
          />
          <svg
            viewBox="0 0 32 32"
            className={s.ballSvg}
            data-testid="soccer-ball-svg"
            style={{
              transform: `translateY(${(-stage.ball.loft * 11).toFixed(1)}px) scale(${(1 + stage.ball.loft * 0.28).toFixed(2)}) rotate(${stage.ball.spin}deg)`,
            }}
          >
            <circle cx="16" cy="16" r="14.5" className={s.ballSphere} />
            <circle cx="11.5" cy="11" r="9.5" className={s.ballHighlight} />
            <path
              className={s.ballSeam}
              d="M16 9.2 L16 2.2 M22.4 13.8 L29.2 11.4 M20 21.4 L24.6 27.2 M12 21.4 L7.4 27.2 M9.6 13.8 L2.8 11.4"
            />
            <polygon className={s.ballPanel} points="16,9.2 22.4,13.8 20,21.4 12,21.4 9.6,13.8" />
            <path
              className={s.ballPanel}
              d="M11.8 2.4 L16 5.4 L20.2 2.4 A14.2 14.2 0 0 0 11.8 2.4 Z"
            />
            <path
              className={s.ballPanel}
              d="M27.6 7.8 L25.8 12.6 L29.8 15.8 A14.2 14.2 0 0 0 27.6 7.8 Z"
            />
            <path
              className={s.ballPanel}
              d="M27.2 24.6 L22.2 24.2 L20.2 29.2 A14.2 14.2 0 0 0 27.2 24.6 Z"
            />
            <path
              className={s.ballPanel}
              d="M11.8 29.2 L9.8 24.2 L4.8 24.6 A14.2 14.2 0 0 0 11.8 29.2 Z"
            />
            <path
              className={s.ballPanel}
              d="M2.2 15.8 L6.2 12.6 L4.4 7.8 A14.2 14.2 0 0 0 2.2 15.8 Z"
            />
            <circle cx="16" cy="16" r="14.5" className={s.ballRim} />
          </svg>
        </div>

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
        {goal !== null && shown(GOAL_LANDS, 0.9) ? (
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
