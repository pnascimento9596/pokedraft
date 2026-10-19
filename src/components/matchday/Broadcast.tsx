"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { FORMATIONS } from "@/engine";
import type { FullLineup, MatchResult, Side, SpeciesId } from "@/engine/types";
import { PlayerImage } from "@/components/PlayerImage";
import { TypeIcon } from "@/components/TypeIcon";
import { SIDE_COPY, type ResultsVariant } from "@/components/results/format";
import { TYPE_PALETTE } from "@/design/stadium";
import { typeLabel } from "@/ui/labels";
import { badgeCorner, keepInside, type Box, type Size } from "@/ui/matchday/badge";
import {
  cameraAt,
  cameraTransform,
  framesWhole,
  projectPoint,
  seeks,
  stepCamera,
  visibleRect,
  type Camera,
  type CameraMode,
} from "@/ui/matchday/camera";
import { TACTIC_LABEL, nameplate } from "@/ui/matchday/copy";
import { cutInAt, stillCutInAt, type CutIn } from "@/ui/matchday/cutin";
import { isSpent, isTired } from "@/ui/matchday/fatigue";
import type { FrameFeed, LiveFrame } from "@/ui/matchday/feed";
import { kitsFor } from "@/ui/matchday/kit";
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
  cut: CutIn | null,
  kicks: number,
  shots: number,
): string {
  const p = active?.beat.kind === "goal" ? active.progress : 0;
  const windows = OPENS.filter((w) => p >= w).length + CLOSES.filter((w) => p > w).length;
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

export function trailPath(trail: NonNullable<PitchStage["trail"]>): string {
  const bend = trail.via ?? {
    x: (trail.from.x + trail.to.x) / 2,
    y: (trail.from.y + trail.to.y) / 2 - (trail.kind === "shot" || trail.kind === "pass" ? 3.5 : 0),
  };
  return `M ${fixed(trail.from.x)} ${fixed(trail.from.y * TRAIL_Y)} Q ${fixed(bend.x)} ${fixed(bend.y * TRAIL_Y)} ${fixed(trail.to.x)} ${fixed(trail.to.y * TRAIL_Y)}`;
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
  readonly pitch: RefObject<HTMLDivElement | null>;
  readonly players: Map<HTMLElement, Tracked>;
  readonly ball: RefObject<HTMLDivElement | null>;
  readonly trail: RefObject<SVGSVGElement | null>;
  readonly playEffect: RefObject<HTMLDivElement | null>;
  readonly playBadge: RefObject<HTMLDivElement | null>;
}

const UNMEASURED: Size = { w: 0, h: 0 };

/** The ball carrier's nameplate, measured in its player's box when it renders. */
interface Plate {
  readonly el: HTMLElement;
  readonly player: HTMLElement;
  /** The nameplate's box from its player's top left corner, untransformed. */
  readonly box: Box;
  readonly playerSize: Size;
}

const WHOLE_PITCH = { x: 0, y: 0, w: 100, h: 100 };

/**
 * Moves every staged thing on the pitch to where `stage` puts it. The play badge sits outside the
 * zoomed pitch at its own size, so its player's spot goes through the follow camera `cam` first.
 * The carrier's nameplate moves the least that keeps it on the part of the pitch in view.
 */
function paint(
  nodes: PitchNodes,
  stage: PitchStage,
  badge: Size,
  pitch: Size,
  cam: Camera | null,
  plate: Plate | null,
): void {
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
    const [defs, , , origin] = trail.children;
    put(defs?.firstElementChild ?? null, "d", d);
    put(origin ?? null, "cx", fixed(stage.trail.from.x));
    put(origin ?? null, "cy", fixed(stage.trail.from.y * TRAIL_Y));
  }
  if (stage.playCallout !== null) {
    const { point } = stage.playCallout;
    const corner = badgeCorner(cam === null ? point : projectPoint(cam, point), badge, pitch);
    put(nodes.playEffect.current, "style", `left: ${fixed(point.x)}%; top: ${fixed(point.y)}%`);
    put(nodes.playBadge.current, "style", `left: ${fixed(corner.x)}%; top: ${fixed(corner.y)}%`);
  }
  const holder = plate === null ? undefined : nodes.players.get(plate.player);
  const carrier = holder?.leaving === false ? stage.players[holder.side][holder.slot] : null;
  if (plate !== null && carrier && pitch.w > 0) {
    const { point } = carrier;
    const box = {
      ...plate.box,
      x: (point.x / 100) * pitch.w - plate.playerSize.w / 2 + plate.box.x,
      y: (point.y / 100) * pitch.h - plate.playerSize.h * 0.7 + plate.box.y,
    };
    const view = cam === null ? WHOLE_PITCH : visibleRect(cam);
    const left = Math.max(0, view.x);
    const top = Math.max(0, view.y);
    const bounds = {
      x: (left / 100) * pitch.w,
      y: (top / 100) * pitch.h,
      w: ((Math.min(100, view.x + view.w) - left) / 100) * pitch.w,
      h: ((Math.min(100, view.y + view.h) - top) / 100) * pitch.h,
    };
    const move = keepInside(box, bounds);
    put(plate.el, "style", `translate: ${fixed(move.x)}px ${fixed(move.y)}px`);
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

/** Where the follow camera was on the last frame it painted, and for which match. */
interface CameraTrack {
  readonly timeline: Timeline;
  readonly clock: number;
  readonly now: number;
  readonly cam: Camera;
}

const Sprite = memo(function Sprite({ dexId }: { readonly dexId: SpeciesId }) {
  return <PlayerImage dexId={dexId} size={80} alt="" eager />;
});

// The smallest the cut-in's circle gets (`.cutInSprite`), for a box that has no layout yet.
const CUT_IN_SPRITE_MIN = 36;

/** The cut-in's sprite drawn at its circle's own size, which a container query sets. */
function CutInSprite({ species }: { readonly species: SpeciesId | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const measure = () => setSize(Math.round(el.clientWidth) || CUT_IN_SPRITE_MIN);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <span ref={ref} className={s.cutInSprite}>
      {species !== null && size !== null ? (
        <PlayerImage dexId={species} size={size} alt="" eager />
      ) : null}
    </span>
  );
}

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
  camera = "full",
  onBall,
  scoreBug,
  variant = "live",
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
  /** Follow zooms in on the ball; Full shows the whole pitch. */
  readonly camera?: CameraMode;
  /** Hears where the staged ball is along the pitch, 0 to 100, after each render (about 10 Hz). */
  readonly onBall?: (x: number) => void;
  /** Drawn over the camera's window, outside the zoomed pitch (the full-screen score bug). */
  readonly scoreBug?: ReactNode;
  readonly variant?: ResultsVariant;
}) {
  const userSlots = FORMATIONS[lineup.formation].slots;
  const oppSlots = FORMATIONS[match.opponent.formation ?? OPP_SHAPE].slots;
  const kitStyle = useMemo(() => {
    const kits = kitsFor(lineup.starters, match.opponent.theme);
    return { ...TYPE_VARS, "--kit-user": kits.user, "--kit-opp": kits.opp } as CSSProperties;
  }, [lineup.starters, match.opponent.theme]);
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
  const cutInOf = (at: Active | null, staged: PitchStage, minute: number): CutIn | null => {
    if (!cutIns) return null;
    return motion ? cutInAt(at, staged.playCallout) : stillCutInAt(timeline, at, minute);
  };

  const pitchRef = useRef<HTMLDivElement>(null);
  const trailId = `trail${useId().replace(/\W/g, "")}`;
  const cameraRef = useRef<CameraTrack | null>(null);
  const players = useRef(new Map<HTMLElement, Tracked>());
  const ballRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<SVGSVGElement>(null);
  const playEffectRef = useRef<HTMLDivElement>(null);
  const playBadgeRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLSpanElement>(null);
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
      pitch: pitchRef,
      players: players.current,
      ball: ballRef,
      trail: trailRef,
      playEffect: playEffectRef,
      playBadge: playBadgeRef,
    };
    const props: LiveFrame = { clock, now, fired, kicks, kickProgress, speed };
    const shotsOf = (f: LiveFrame) =>
      kicksShown(timeline.kicks.length, f.kicks, f.kickProgress, motion);
    const rendered = screenKey(active, stage, cutInOf(active, stage, clock), kicks, shotsOf(props));
    // Measured once per render, and only while a badge or a nameplate shows, so frames between
    // renders read no layout.
    const badgeEl = playBadgeRef.current;
    const plateEl = plateRef.current;
    const pitchEl = pitchRef.current;
    const badge =
      badgeEl === null ? UNMEASURED : { w: badgeEl.offsetWidth, h: badgeEl.offsetHeight };
    const pitch =
      (badgeEl === null && plateEl === null) || pitchEl === null
        ? UNMEASURED
        : { w: pitchEl.clientWidth, h: pitchEl.clientHeight };
    const playerEl = plateEl?.parentElement ?? null;
    const plate: Plate | null =
      plateEl === null || playerEl === null
        ? null
        : {
            el: plateEl,
            player: playerEl,
            box: {
              x: plateEl.offsetLeft,
              y: plateEl.offsetTop,
              w: plateEl.offsetWidth,
              h: plateEl.offsetHeight,
            },
            playerSize: { w: playerEl.offsetWidth, h: playerEl.offsetHeight },
          };
    // The camera springs after the ball frame by frame; with motion off it cuts. A new match, a
    // seek or a switch from Full starts it settled on the ball.
    const aim = (f: LiveFrame, latest: ReturnType<typeof frameAt>): Camera | null => {
      if (camera === "full") {
        cameraRef.current = null;
        put(pitchRef.current, "style", "");
        return null;
      }
      const target = latest.stage.ball;
      const wide = framesWhole(timeline, f.clock, latest.active, latest.shot);
      const last = cameraRef.current;
      const cam =
        !motion || last === null || last.timeline !== timeline || seeks(last.clock, f.clock)
          ? cameraAt(target, wide)
          : stepCamera(last.cam, target, wide, f.now - last.now);
      cameraRef.current = { timeline, clock: f.clock, now: f.now, cam };
      put(pitchRef.current, "style", `transform: ${cameraTransform(cam)}`);
      return cam;
    };
    const draw = () => {
      const f = feed?.latest() ?? props;
      const latest = frameAt(f);
      paint(nodes, latest.stage, badge, pitch, aim(f, latest), plate);
      const cut = cutInOf(latest.active, latest.stage, f.clock);
      return screenKey(latest.active, latest.stage, cut, f.kicks, shotsOf(f)) !== rendered;
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
  const cutIn = cutInOf(active, stage, clock);
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
          <span ref={plateRef} className={s.carrierBadge} data-testid="ball-carrier">
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
      data-camera={camera}
      style={kitStyle}
    >
      <div className={s.view} data-testid="pitch-view">
        <div ref={pitchRef} className={s.pitch} aria-hidden="true" data-testid="pitch">
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
              {/* One shape drawn twice, so a moving trail writes its path once a frame. */}
              <defs>
                <path id={trailId} className={s.trailShape} />
              </defs>
              <use href={`#${trailId}`} className={s.trailGlow} />
              <use href={`#${trailId}`} className={s.trailLine} />
              <circle r={1.1} className={s.trailOrigin} />
            </svg>
          ) : null}

          {stage.players.user.map((p) => renderPlayer(p, "u"))}
          {stage.players.opp.map((p) => renderPlayer(p, "o"))}
          {stage.leaving?.map((p) => renderPlayer(p, `off-${p.side}-`, true))}

          {stage.playCallout !== null ? (
            <div
              ref={playEffectRef}
              className={s.playEffect}
              data-effect={stage.playCallout.callout.effect}
            />
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
        {stage.playCallout !== null ? (
          <div
            ref={playBadgeRef}
            className={s.playBadge}
            data-side={stage.playCallout.side}
            data-effect={stage.playCallout.callout.effect}
            data-testid="pitch-ability"
          >
            {stage.playCallout.callout.text}
          </div>
        ) : null}
        {scoreBug}
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
            <CutInSprite species={cutIn.species} />
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
            {active.beat.side === "user"
              ? SIDE_COPY[variant].switchesTo
              : `${match.opponent.name} switch to`}{" "}
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
