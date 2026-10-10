"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { PlayerImage } from "@/components/PlayerImage";
import {
  buildStrip,
  dexLabel,
  faceValue,
  neighbourFace,
  reelEase,
  type Face,
  type Stage,
  type StageKind,
} from "./reel";
import s from "./Wheel.module.css";

export type WheelState = "spinning" | "settled";

export interface WheelProps {
  readonly stage: Stage;
  readonly state: WheelState;
  /** Called when the spin finishes or the user taps to skip. The parent flips `state`. */
  readonly onSettle: (reason: "finished" | "skipped") => void;
  readonly onTick?: () => void;
}

export const FACE_H = 48;
const MIN_STRIP = 28;

const DURATION_MS: Readonly<Record<StageKind, number>> = {
  region: 1700,
  type: 2100,
  species: 2300,
};

const STAGE_LABEL: Readonly<Record<StageKind, string>> = {
  region: "Region",
  type: "Type",
  species: "Species",
};

function lapsFor(faces: number): number {
  return Math.max(2, Math.ceil(MIN_STRIP / Math.max(1, faces)));
}

function FaceView({ face, result }: { face: Face; result?: boolean }) {
  const common = {
    className: s.face,
    "data-kind": face.kind,
    ...(result ? { "data-testid": "wheel-result", "data-value": faceValue(face) } : null),
  };
  if (face.kind === "species") {
    return (
      <div {...common}>
        <PlayerImage dexId={face.value} size={32} alt={face.label} eager />
        <span className={s.faceName}>{face.label}</span>
        <span className={`num ${s.faceDex}`}>{dexLabel(face.value)}</span>
      </div>
    );
  }
  if (face.kind === "type") {
    return (
      <div {...common} style={{ "--type-color": `var(--type-${face.value})` } as CSSProperties}>
        <span className={s.typeSwatch} aria-hidden="true" />
        <span className={s.faceName}>{face.label}</span>
      </div>
    );
  }
  return (
    <div {...common}>
      <span className={s.faceName}>{face.label}</span>
    </div>
  );
}

export function Wheel({ stage, state, onSettle, onTick }: WheelProps) {
  const reelRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef(onSettle);
  const tickRef = useRef(onTick);
  useEffect(() => {
    settleRef.current = onSettle;
    tickRef.current = onTick;
  });

  const { faces, landing } = stage;
  const spinning = state === "spinning";
  const { strip, landingIndex } = buildStrip(faces, landing, lapsFor(faces.length));
  const head = neighbourFace(faces, strip[0]!, -1);
  const tail = neighbourFace(faces, landing, 1);

  useEffect(() => {
    if (!spinning) return;
    const el = reelRef.current;
    if (el === null) return;
    const duration = DURATION_MS[stage.kind];
    let raf = 0;
    let start: number | null = null;
    let lastFace = 0;
    let lastPos = 0;
    let lastT = 0;
    const frame = (now: number) => {
      if (start === null) {
        start = now;
        lastT = now;
      }
      const progress = Math.min(1, (now - start) / duration);
      const pos = reelEase(progress) * landingIndex;
      const speed = (pos - lastPos) / Math.max(1, now - lastT);
      el.style.transform = `translate3d(0, ${-pos * FACE_H}px, 0)`;
      el.style.filter = speed > 0.004 ? `blur(${Math.min(2.2, speed * 90).toFixed(2)}px)` : "";
      const crossed = Math.floor(pos + 0.5);
      if (crossed !== lastFace) {
        lastFace = crossed;
        tickRef.current?.();
      }
      lastPos = pos;
      lastT = now;
      if (progress < 1) raf = requestAnimationFrame(frame);
      else settleRef.current("finished");
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [spinning, stage.kind, landingIndex]);

  return (
    <div
      className={s.wheel}
      data-testid="wheel"
      data-state={state}
      data-kind={stage.kind}
      onClick={spinning ? () => onSettle("skipped") : undefined}
    >
      <div className={s.top}>
        <span className="kicker">{STAGE_LABEL[stage.kind]}</span>
        {spinning ? (
          <button
            type="button"
            className={s.skip}
            onClick={(e) => {
              e.stopPropagation();
              onSettle("skipped");
            }}
          >
            Tap to skip
          </button>
        ) : null}
      </div>
      <div className={s.window} style={{ "--face-h": `${FACE_H}px` } as CSSProperties}>
        <div className={s.payline} aria-hidden="true" />
        {spinning ? (
          <div className={s.reel} ref={reelRef} aria-hidden="true">
            {[head, ...strip, tail].map((face, i) => (
              <FaceView key={i} face={face} />
            ))}
          </div>
        ) : (
          <div className={s.reel} data-settled="">
            <div aria-hidden="true">
              <FaceView face={neighbourFace(faces, landing, -1)} />
            </div>
            <FaceView face={landing} result />
            <div aria-hidden="true">
              <FaceView face={tail} />
            </div>
          </div>
        )}
        <div className={s.shade} aria-hidden="true" />
      </div>
    </div>
  );
}
