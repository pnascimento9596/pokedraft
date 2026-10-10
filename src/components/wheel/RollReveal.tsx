"use client";

import { useEffect, useState } from "react";
import { announce, type Stage } from "./reel";
import { playTick } from "./sound";
import { Wheel, type WheelState } from "./Wheel";
import s from "./RollReveal.module.css";

export interface RollRevealProps {
  readonly stages: readonly Stage[];
  /** Skip the animation entirely (reduced motion): every stage renders settled. */
  readonly instant: boolean;
  /** Fires once, shortly after the last stage settles. Remount (key) per roll. */
  readonly onDone: () => void;
}

interface Progress {
  readonly index: number;
  readonly state: WheelState;
}

const STAGE_PAUSE_MS = 320;
const DONE_PAUSE_MS = 260;

export function RollReveal({ stages, instant, onDone }: RollRevealProps) {
  const last = stages.length - 1;
  const [progress, setProgress] = useState<Progress>({ index: 0, state: "spinning" });
  const shown: Progress = instant ? { index: last, state: "settled" } : progress;

  useEffect(() => {
    if (instant || progress.state !== "settled") return;
    const id = window.setTimeout(
      () => {
        if (progress.index < last) setProgress({ index: progress.index + 1, state: "spinning" });
        else onDone();
      },
      progress.index < last ? STAGE_PAUSE_MS : DONE_PAUSE_MS,
    );
    return () => window.clearTimeout(id);
  }, [instant, progress, last, onDone]);

  const settledCount = shown.state === "settled" ? shown.index + 1 : shown.index;
  const line = stages.slice(0, settledCount).map(announce).join(" ");

  return (
    <div className={s.reveal}>
      <div className={s.reels}>
        {stages.map((stage, i) => {
          if (i > shown.index) {
            return (
              <div key={stage.kind} className={s.waiting} aria-hidden="true">
                <span className="kicker">{stage.kind === "type" ? "Type" : "Region"}</span>
                <div className={s.waitingWindow}>?</div>
              </div>
            );
          }
          const state: WheelState = i < shown.index ? "settled" : shown.state;
          return (
            <Wheel
              key={stage.kind}
              stage={stage}
              state={state}
              onTick={playTick}
              onSettle={(reason) => {
                if (i !== shown.index || shown.state !== "spinning") return;
                setProgress({ index: reason === "skipped" ? last : i, state: "settled" });
              }}
            />
          );
        })}
      </div>
      <p className={s.live} aria-live="polite" data-testid="wheel-announce">
        {line}
      </p>
    </div>
  );
}
