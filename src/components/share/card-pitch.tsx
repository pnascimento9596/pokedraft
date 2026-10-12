import type { CSSProperties } from "react";
import { CARD_THEME } from "@/design/card-tokens";
import { OUTER_RECT, PITCH_RECT, TOKEN, type Rect } from "./card-layout";

const FRAME = PITCH_RECT.left - OUTER_RECT.left;
const METRE = 8;
const LINE = 4;
const CHALK_WIDTH = 2.5;

const play = {
  x: FRAME + LINE,
  y: FRAME + LINE,
  width: PITCH_RECT.width - 2 * LINE,
  height: PITCH_RECT.height - 2 * LINE,
};
const midY = play.y + play.height / 2;
const midX = play.x + play.width / 2;

const STRIPES = 12;
const STRIPE_W = PITCH_RECT.width / STRIPES;

function goal(side: "left" | "right") {
  const dir = side === "left" ? -1 : 1;
  const line = side === "left" ? play.x : play.x + play.width;
  const depth = 12;
  const half = (7.32 * METRE) / 2;
  const back = line + dir * depth;
  const top = midY - half;
  const bottom = midY + half;
  const verticals = [0.33, 0.66].map((f) => line + dir * depth * f);
  const horizontals = [1, 2, 3, 4, 5].map((k) => top + (k * (bottom - top)) / 6);
  return (
    <g>
      <rect
        x={Math.min(line, back)}
        y={top}
        width={depth}
        height={bottom - top}
        fill={CARD_THEME.grassShade}
        fillOpacity={0.55}
      />
      {verticals.map((x) => (
        <path
          key={x}
          d={`M ${x} ${top} V ${bottom}`}
          stroke={CARD_THEME.chalk}
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      ))}
      {horizontals.map((y) => (
        <path
          key={y}
          d={`M ${line} ${y} H ${back}`}
          stroke={CARD_THEME.chalk}
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      ))}
      <path
        d={`M ${line} ${top} H ${back} V ${bottom} H ${line}`}
        stroke={CARD_THEME.chalk}
        strokeWidth={2.5}
        fill="none"
        strokeLinejoin="round"
      />
    </g>
  );
}

function penaltyEnd(side: "left" | "right") {
  const dir = side === "left" ? 1 : -1;
  const goalLine = side === "left" ? play.x : play.x + play.width;
  const at = (metres: number) => goalLine + dir * metres * METRE;
  const penalty = { depth: 16.5, half: 20.16 };
  const six = { depth: 5.5, half: 9.16 };
  const spot = at(11);
  const radius = 9.15 * METRE;
  const edge = at(penalty.depth);
  const reach = Math.sqrt(radius ** 2 - (edge - spot) ** 2);
  const sweep = side === "left" ? 1 : 0;
  const rect = (depth: number, half: number) =>
    `M ${goalLine} ${midY - half * METRE} H ${at(depth)} V ${midY + half * METRE} H ${goalLine}`;
  return (
    <g>
      <path d={rect(penalty.depth, penalty.half)} />
      <path d={rect(six.depth, six.half)} />
      <circle cx={spot} cy={midY} r={3.5} fill={CARD_THEME.chalk} stroke="none" />
      <path
        d={`M ${edge} ${midY - reach} A ${radius} ${radius} 0 0 ${sweep} ${edge} ${midY + reach}`}
      />
    </g>
  );
}

function corner(x: number, y: number, sx: 1 | -1, sy: 1 | -1) {
  const r = 10;
  return (
    <path d={`M ${x + sx * r} ${y} A ${r} ${r} 0 0 ${sx * sy === 1 ? 1 : 0} ${x} ${y + sy * r}`} />
  );
}

const TURF = `linear-gradient(180deg, ${CARD_THEME.grassLight}, ${CARD_THEME.grassDark})`;
const MOWING = `repeating-linear-gradient(90deg, transparent 0px, transparent ${STRIPE_W}px, ${CARD_THEME.mowShade} ${STRIPE_W}px, ${CARD_THEME.mowShade} ${2 * STRIPE_W}px)`;
const VIGNETTE_DEPTH = 150;
const PLATE = { rx: 50, ry: 12, lift: 16 };
const FADE = [CARD_THEME.vignetteEdge, CARD_THEME.vignetteClear];

// Satori paints a radial gradient as its last stop everywhere, so the vignette is four linear
// edge fades and each ground shadow is two stacked ellipses, because blurred shadows cost about 4 ms each to render.
const EDGES = [
  { left: 0, top: 0, width: PITCH_RECT.width, height: VIGNETTE_DEPTH, angle: 180 },
  {
    left: 0,
    top: PITCH_RECT.height - VIGNETTE_DEPTH,
    width: PITCH_RECT.width,
    height: VIGNETTE_DEPTH,
    angle: 0,
  },
  { left: 0, top: 0, width: VIGNETTE_DEPTH, height: PITCH_RECT.height, angle: 90 },
  {
    left: PITCH_RECT.width - VIGNETTE_DEPTH,
    top: 0,
    width: VIGNETTE_DEPTH,
    height: PITCH_RECT.height,
    angle: 270,
  },
].map(({ angle, ...rect }) => ({
  ...rect,
  background: `linear-gradient(${angle}deg, ${FADE[0]}, ${FADE[1]})`,
}));

const fill: CSSProperties = { position: "absolute", display: "flex" };

// Satori accepts only intrinsic elements inside <svg>, so the marking helpers are called, not rendered.
/** The framed pitch with its markings and a ground shadow under each filled token. */
export function Pitch({ boxes, filled }: { boxes: readonly Rect[]; filled: readonly boolean[] }) {
  const { width, height } = OUTER_RECT;
  const right = play.x + play.width;
  const bottom = play.y + play.height;
  return (
    <div
      style={{
        position: "absolute",
        left: OUTER_RECT.left,
        top: OUTER_RECT.top,
        width,
        height,
        display: "flex",
        borderRadius: 22,
        background: `linear-gradient(180deg, ${CARD_THEME.frameHi}, ${CARD_THEME.frameLo})`,
        boxShadow: `0 12px 30px ${CARD_THEME.panelShadow}`,
      }}
    >
      <div
        style={{
          ...fill,
          left: 4.5,
          top: 4.5,
          width: width - 9,
          height: height - 9,
          borderRadius: 18,
          border: `1.5px solid ${CARD_THEME.frameKeyline}`,
        }}
      />
      <div
        style={{
          ...fill,
          left: FRAME,
          top: FRAME,
          width: PITCH_RECT.width,
          height: PITCH_RECT.height,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {[
          { left: 0, top: 0, width: PITCH_RECT.width, height: PITCH_RECT.height, background: TURF },
          {
            left: 0,
            top: 0,
            width: PITCH_RECT.width,
            height: PITCH_RECT.height,
            background: MOWING,
          },
          ...EDGES,
        ].map((layer, i) => (
          <div key={i} style={{ ...fill, ...layer }} />
        ))}
      </div>
      {boxes.map((box, i) =>
        filled[i] ? (
          <div
            key={i}
            style={{
              ...fill,
              left: box.left + box.width / 2 - OUTER_RECT.left - PLATE.rx,
              top: box.top + TOKEN.image - PLATE.lift - OUTER_RECT.top - PLATE.ry,
              width: 2 * PLATE.rx,
              height: 2 * PLATE.ry,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: PLATE.rx,
              background: CARD_THEME.plateEdge,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 1.5 * PLATE.rx,
                height: 1.4 * PLATE.ry,
                borderRadius: PLATE.rx,
                background: CARD_THEME.plateMid,
              }}
            />
          </div>
        ) : null,
      )}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <g stroke={CARD_THEME.chalk} strokeOpacity={0.85} strokeWidth={CHALK_WIDTH} fill="none">
          <rect x={play.x} y={play.y} width={play.width} height={play.height} />
          <path d={`M ${midX} ${play.y} V ${bottom}`} />
          <circle cx={midX} cy={midY} r={9.15 * METRE} />
          <circle cx={midX} cy={midY} r={3.5} fill={CARD_THEME.chalk} stroke="none" />
          {penaltyEnd("left")}
          {penaltyEnd("right")}
          {corner(play.x, play.y, 1, 1)}
          {corner(right, play.y, -1, 1)}
          {corner(play.x, bottom, 1, -1)}
          {corner(right, bottom, -1, -1)}
        </g>
        {goal("left")}
        {goal("right")}
      </svg>
    </div>
  );
}
