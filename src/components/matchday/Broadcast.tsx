"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import { FORMATIONS } from "@/engine";
import type { FullLineup, MatchResult, Side, SpeciesId } from "@/engine/types";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeIcon } from "@/components/TypeIcon";
import { TYPE_PALETTE } from "@/design/stadium";
import { typeLabel } from "@/ui/labels";
import { TACTIC_LABEL, nameplate } from "@/ui/matchday/copy";
import { cutInAt, type CutIn } from "@/ui/matchday/cutin";
import { isSpent, isTired } from "@/ui/matchday/fatigue";
import type { FrameFeed, LiveFrame } from "@/ui/matchday/feed";
import { beatKey, stageFrame, type Active } from "@/ui/matchday/player";
import {
  GOAL_LANDS,
  OPP_SHAPE,
  goalMouth,
  type PitchStage,
  type Point,
  type StagedPlayer,
  type Timeline,
} from "@/ui/matchday/timeline";
import { kicksShown, suddenDeath } from "@/ui/matchday/shootout";
import s from "./Broadcast.module.css";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Every type's palette colour, so each type's effects draw in its own family.
const TYPE_VARS = Object.fromEntries(
  Object.entries(TYPE_PALETTE).map(([type, color]) => [`--type-${type}`, color]),
) as CSSProperties;

const CUT_IN_LABEL: Readonly<Record<CutIn["kind"], string>> = {
  goal: "Goal",
  save: "Save",
  duel: "Key duel",
};

// Stage points are percent of width and height; the trails draw in the pitch's own 100 by 64 box.
const TRAIL_Y = 0.64;

function pct(p: Point) {
  return { left: `${p.x}%`, top: `${p.y}%` } as const;
}

const fixed = (n: number) => n.toFixed(2);

// A shallow smile under the sprite; its lit share is the player's energy out of 100.
const STAMINA_ARC = "M 2 2 Q 12 9 22 2";

// The shares of a goal's staging at which its card, effect and flash come and go.
const OPENS = [0.25, 0.35, GOAL_LANDS];
const CLOSES = [0.75, 0.9];

/**
 * What the broadcast renders that time alone changes: the beat on the pitch and its windows, the
 * cut-in, the trail, the play badge, the ball's carrier and the shootout's banner and kick dots. A frame whose key differs from the last
 * render asks for a render at once.
 */
function screenKey(
  active: Active | null,
  stage: PitchStage,
  cutIns: boolean,
  kicks: number,
  shots: number,
): string {
  const p = active?.beat.kind === "goal" ? active.progress : 0;
  const windows = OPENS.filter((w) => p >= w).length + CLOSES.filter((w) => p > w).length;
  const cut = cutIns ? cutInAt(active, stage.playCallout) : null;
  const { trail, playCallout: play } = stage;
  const carrier = stage.ball.carrier;
  return [
    active === null ? "" : beatKey(active.beat),
    windows,
    cut === null ? "" : `${cut.kind}:${cut.callout.text}`,
    trail === null ? "" : `${trail.kind}:${trail.effect ?? ""}`,
    play === null ? "" : `${play.side}${play.slot}:${play.callout.text}`,
    stage.ball.effect ?? "",
    carrier === null ? "" : `${carrier.side}${carrier.slot}`,
    // Who is walking off: a walk starting or ending adds or drops a sprite.
    (stage.leaving ?? []).map((p) => `${p.side}${p.slot}:${p.species ?? p.name}`).join(","),
    // The shootout: the kick in progress (and with it the sudden-death banner) and the kick dots.
    `${kicks}:${shots}`,
  ].join("|");
}

// One unit of the pitch's width is 1cqi of the broadcast; its height is 64 of those units.
function place(p: Point, anchor: string): string {
  return `transform: translate3d(${fixed(p.x)}cqi, ${fixed(p.y * TRAIL_Y)}cqi, 0) ${anchor}`;
}

function trailPath(trail: NonNullable<PitchStage["trail"]>): string {
  const midY =
    (trail.from.y + trail.to.y) / 2 - (trail.kind === "shot" || trail.kind === "pass" ? 3.5 : 0);
  return `M ${fixed(trail.from.x)} ${fixed(trail.from.y * TRAIL_Y)} Q ${fixed((trail.from.x + trail.to.x) / 2)} ${fixed(midY * TRAIL_Y)} ${fixed(trail.to.x)} ${fixed(trail.to.y * TRAIL_Y)}`;
}

const written = new WeakMap<Element, Map<string, string>>();

// Writes an attribute only when it changed, so a still player costs no DOM mutation.
function put(el: Element | null, name: string, value: string): void {
  if (el === null) return;
  let mine = written.get(el);
  if (mine === undefined) {
    mine = new Map();
    written.set(el, mine);
  }
  if (mine.get(name) === value) return;
  mine.set(name, value);
  el.setAttribute(name, value);
}

/** A player sprite: their slot, and whether they are walking off rather than playing in it. */
interface Tracked {
  readonly side: Side;
  readonly slot: number;
  readonly leaving: boolean;
}

interface PitchNodes {
  readonly players: Map<HTMLElement, Tracked>;
  readonly ball: RefObject<HTMLDivElement | null>;
  readonly trail: RefObject<SVGSVGElement | null>;
  readonly playEffect: RefObject<HTMLDivElement | null>;
  readonly playBadge: RefObject<HTMLDivElement | null>;
}

/** Moves every staged thing on the pitch to where `stage` puts it. */
function paint(nodes: PitchNodes, stage: PitchStage): void {
  for (const [el, { side, slot, leaving }] of nodes.players) {
    const p = leaving
      ? stage.leaving?.find((w) => w.side === side && w.slot === slot)
      : stage.players[side][slot];
    if (p) put(el, "style", place(p.point, "translate(-50%, -70%)"));
  }
  const { ball } = stage;
  put(
    nodes.ball.current,
    "style",
    `${place(ball, "translate(-50%, -50%)")}; --loft: ${fixed(ball.loft)}; --spin: ${ball.spin}`,
  );
  const trail = nodes.trail.current;
  if (trail !== null && stage.trail !== null) {
    const d = trailPath(stage.trail);
    const [glow, line, origin] = trail.children;
    put(glow ?? null, "d", d);
    put(line ?? null, "d", d);
    put(origin ?? null, "cx", fixed(stage.trail.from.x));
    put(origin ?? null, "cy", fixed(stage.trail.from.y * TRAIL_Y));
  }
  if (stage.playCallout !== null) {
    const { point } = stage.playCallout;
    const at = `left: ${fixed(point.x)}%; top: ${fixed(point.y)}%`;
    put(nodes.playEffect.current, "style", at);
    put(nodes.playBadge.current, "style", at);
  }
}

// The lines and stripes never change, so React never diffs them again.
const PITCH_LINES = (
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
);

const Sprite = memo(function Sprite({ dexId }: { readonly dexId: SpeciesId }) {
  return <PlayerImage dexId={dexId} size={80} alt="" eager />;
});

export function Broadcast({
  match,
  timeline,
  lineup,
  clock,
  now,
  fired,
  kicks,
  kickProgress = 0,
  motion,
  speed,
  feed,
  cutIns = false,
  onBall,
}: {
  readonly match: PlayedMatch;
  /** The one timeline the match player clocks, sounds and stages from. */
  readonly timeline: Timeline;
  readonly lineup: FullLineup;
  readonly clock: number;
  readonly now: number;
  readonly fired: Readonly<Record<string, number>>;
  readonly kicks: number;
  /** How far through the kick in progress the shootout is, 0 to 1. */
  readonly kickProgress?: number;
  readonly motion: boolean;
  /** The player's speed: 2x stages every beat in half the time, matching its hold. */
  readonly speed: number;
  /** Lower-third cards for shots on target and key duels: live broadcasts only, never Quick. */
  readonly cutIns?: boolean;
  /** The live frame source; without it the pitch stands where the props put it. */
  readonly feed?: FrameFeed;
  /** Hears where the staged ball is along the pitch, 0 to 100, after each render (about 10 Hz). */
  readonly onBall?: (x: number) => void;
}) {
  const userSlots = FORMATIONS[lineup.formation].slots;
  const oppSlots = FORMATIONS[match.opponent.formation ?? OPP_SHAPE].slots;
  const oppLabels = useMemo(
    () => match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
    [match.opponent.roster],
  );

  const frameAt = (f: LiveFrame) =>
    stageFrame(timeline, {
      clock: f.clock,
      fired: f.fired,
      now: f.now,
      kicks: f.kicks,
      kickProgress: f.kickProgress,
      motion,
      speed: f.speed,
      userSlots,
      oppSlots,
      oppLabels,
      windows: match.windows,
    });
  const { active, stage } = frameAt({ clock, now, fired, kicks, kickProgress, speed });

  const players = useRef(new Map<HTMLElement, Tracked>());
  const ballRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<SVGSVGElement>(null);
  const playEffectRef = useRef<HTMLDivElement>(null);
  const playBadgeRef = useRef<HTMLDivElement>(null);
  const track = useCallback((el: HTMLDivElement) => {
    const map = players.current;
    map.set(el, {
      side: el.dataset.side as Side,
      slot: Number(el.dataset.slot),
      leaving: el.dataset.leaving !== undefined,
    });
    return () => {
      map.delete(el);
    };
  }, []);

  // After every commit, and then on every frame the feed publishes while motion is on, the pitch
  // moves to the newest frame. React renders which things are on the pitch; this places them, and
  // asks for a render when the newest frame shows something this render does not.
  useLayoutEffect(() => {
    const nodes: PitchNodes = {
      players: players.current,
      ball: ballRef,
      trail: trailRef,
      playEffect: playEffectRef,
      playBadge: playBadgeRef,
    };
    const props: LiveFrame = { clock, now, fired, kicks, kickProgress, speed };
    const shotsOf = (f: LiveFrame) =>
      kicksShown(timeline.kicks.length, f.kicks, f.kickProgress, motion);
    const rendered = screenKey(active, stage, cutIns, kicks, shotsOf(props));
    const draw = () => {
      const f = feed?.latest() ?? props;
      const latest = frameAt(f);
      paint(nodes, latest.stage);
      return screenKey(latest.active, latest.stage, cutIns, f.kicks, shotsOf(f)) !== rendered;
    };
    draw();
    if (feed === undefined || !motion) return;
    return feed.subscribe(draw);
  });
  const ballX = stage.ball.x;
  useEffect(() => {
    onBall?.(ballX);
  }, [onBall, ballX]);
  const goal = active?.beat.kind === "goal" ? active.beat : null;
  const cutIn = cutIns ? cutInAt(active, stage.playCallout) : null;
  const progress = active?.progress ?? 0;
  const shown = (from: number, to = 1) => !motion || (progress >= from && progress <= to);
  const kickList = timeline.kicks.slice(
    0,
    kicksShown(timeline.kicks.length, kicks, kickProgress, motion),
  );
  const shootout = timeline.kicks.length > 0 && clock >= timeline.finalMinute;

  const renderPlayer = (p: StagedPlayer | null, keyPrefix: string, leaving = false) => {
    if (p === null) return null;
    const ref = p.side === "opp" ? match.opponent.roster[p.slot] : undefined;
    return (
      <div
        key={`${keyPrefix}${p.slot}`}
        ref={track}
        className={s.player}
        data-side={p.side}
        data-slot={p.slot}
        data-leaving={leaving || undefined}
        data-pose={p.pose}
        data-facing={p.facing}
        data-ball={p.hasBall || undefined}
        data-hot={p.hot || undefined}
        data-effect={p.callout?.effect ?? undefined}
        data-tired={isTired(p.energy) || undefined}
      >
        <span className={s.body}>
          <span className={s.playerSprite}>
            {p.species !== null ? (
              <Sprite dexId={p.species} />
            ) : (
              <span className={s.shirt}>{ref?.kind === "shirt" ? ref.number : ""}</span>
            )}
          </span>
        </span>
        {isTired(p.energy) ? (
          <span
            className={s.sweatPip}
            data-testid={`pitch-sweat-${p.side}-${p.slot}`}
            aria-hidden="true"
          />
        ) : null}
        {isSpent(p.energy) ? (
          <svg
            className={s.stamina}
            viewBox="0 0 24 8"
            data-testid={`pitch-stamina-${p.side}-${p.slot}`}
            aria-hidden="true"
          >
            <path className={s.staminaTrack} d={STAMINA_ARC} pathLength={100} />
            <path
              className={s.staminaLeft}
              d={STAMINA_ARC}
              pathLength={100}
              strokeDasharray={`${p.energy} 100`}
            />
          </svg>
        ) : null}
        {p.yellowCards > 0 ? (
          <span
            className={s.cardPip}
            data-testid={`pitch-card-${p.side}-${p.slot}`}
            aria-hidden="true"
          />
        ) : null}
        {p.hasBall ? (
          <span className={s.carrierBadge} data-testid="ball-carrier">
            {nameplate(p.name)}
          </span>
        ) : null}
      </div>
    );
  };

  const trail = stage.trail;

  return (
    <div
      className={s.broadcast}
      data-testid="broadcast"
      data-motion={motion ? "on" : "off"}
      data-goals-only={timeline.goalsOnly || undefined}
      style={TYPE_VARS}
    >
      <div className={s.pitch} aria-hidden="true">
        {PITCH_LINES}

        {trail !== null ? (
          <svg
            ref={trailRef}
            className={s.trails}
            viewBox="0 0 100 64"
            data-testid="pitch-trails"
            data-kind={trail.kind}
            data-effect={trail.effect ?? undefined}
          >
            <path className={s.trailGlow} />
            <path className={s.trailLine} />
            <circle r={1.1} className={s.trailOrigin} />
          </svg>
        ) : null}

        {stage.players.user.map((p) => renderPlayer(p, "u"))}
        {stage.players.opp.map((p) => renderPlayer(p, "o"))}
        {stage.leaving?.map((p) => renderPlayer(p, `off-${p.side}-`, true))}

        {stage.playCallout !== null ? (
          <>
            <div
              ref={playEffectRef}
              className={s.playEffect}
              data-effect={stage.playCallout.callout.effect}
            />
            <div
              ref={playBadgeRef}
              className={s.playBadge}
              data-side={stage.playCallout.side}
              data-effect={stage.playCallout.callout.effect}
              data-testid="pitch-ability"
            >
              {stage.playCallout.callout.text}
            </div>
          </>
        ) : null}

        <div
          ref={ballRef}
          className={s.ball}
          data-effect={stage.ball.effect ?? undefined}
          data-testid="broadcast-ball"
        >
          <span className={s.ballShadow} />
          <svg viewBox="0 0 32 32" className={s.ballSvg} data-testid="soccer-ball-svg">
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
        {cutIn !== null ? (
          <div
            className={s.cutIn}
            data-testid="cut-in"
            data-kind={cutIn.kind}
            data-side={cutIn.side}
            data-effect={cutIn.callout.effect}
          >
            <span className={s.cutInSprite}>
              {cutIn.species !== null ? (
                <PlayerImage dexId={cutIn.species} size={80} alt="" eager />
              ) : null}
            </span>
            <span className={s.cutInText}>
              <span className={s.cutInKind}>{CUT_IN_LABEL[cutIn.kind]}</span>
              <span
                className={s.cutInMove}
                data-testid={
                  cutIn.kind === "goal"
                    ? "move-callout"
                    : cutIn.kind === "save"
                      ? "save-callout"
                      : "duel-callout"
                }
              >
                {cutIn.callout.text}
              </span>
            </span>
            {cutIn.callout.type !== null ? (
              <span
                className={s.cutInType}
                data-testid="cut-in-type"
                data-type={cutIn.callout.type}
              >
                <TypeIcon type={cutIn.callout.type} size={16} decorative />
                <span className={s.cutInTypeName}>{typeLabel(cutIn.callout.type)}</span>
              </span>
            ) : null}
          </div>
        ) : null}
        {!cutIns && goal !== null && shown(0.25, 1) ? (
          <p className={s.callout} data-effect={goal.callout.effect} data-testid="move-callout">
            {goal.callout.text}
          </p>
        ) : null}
        {!cutIns && active?.beat.kind === "save" ? (
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
        {shootout && kicks < timeline.kicks.length && suddenDeath(kicks) ? (
          <p className={s.banner} data-testid="sudden-death">
            Sudden death
          </p>
        ) : null}
        {shootout ? (
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
