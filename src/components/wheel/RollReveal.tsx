"use client";

import { useEffect, useState } from "react";
import { spinMs, type SpinSpeed } from "@/ui/settings";
import { announce, type Stage } from "./reel";
import { playReelSettle, playTick } from "./sound";
import { Wheel, type WheelState } from "./Wheel";
import s from "./RollReveal.module.css";

export interface RollRevealProps {
  readonly stages: readonly Stage[];
  /** Skip the animation entirely (reduced motion): every stage renders settled. */
  readonly instant: boolean;
  readonly speed: SpinSpeed;
  /** Fires once, shortly after the last stage settles. Remount (key) per roll. */
  readonly onDone: () => void;
}

interface Progress {
  readonly index: number;
  readonly state: WheelState;
}

const STAGE_PAUSE_MS = 320;
const DONE_PAUSE_MS = 260;

export function RollReveal({ stages, instant, speed, onDone }: RollRevealProps) {
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
      spinMs(progress.index < last ? STAGE_PAUSE_MS : DONE_PAUSE_MS, speed),
    );
    return () => window.clearTimeout(id);
  }, [instant, progress, last, onDone, speed]);

  // The result, once the last wheel stops. The draft board reads it out through the page's live
  // region, which is on the page before the roll, so this line is not a live region itself.
  const line =
    shown.state === "settled" && shown.index === last ? stages.map(announce).join(" ") : "";

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
              speed={speed}
              onTick={playTick}
              onSettle={(reason) => {
                if (i !== shown.index || shown.state !== "spinning") return;
                playReelSettle();
                setProgress({ index: reason === "skipped" ? last : i, state: "settled" });
              }}
            />
          );
        })}
      </div>
      <p className={s.live} data-testid="wheel-announce">
        {line}
      </p>
    </div>
  );
}
