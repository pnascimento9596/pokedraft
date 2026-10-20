import { memo } from "react";
import type { StoryWindow } from "@/engine/story";
import { riverLabel, riverTotals } from "@/ui/matchday/river";
import s from "./MatchPlayer.module.css";

const HALF = 10;
const WINDOW = 5;
// A window's chances worth this much xG fill its half of the river. Across 40 seeded cup8 runs
// (6,936 window sides) the 99th percentile was 0.26 and the largest 0.37.
const CAP = 0.4;

const depth = (xg: number) => (Math.min(xg, CAP) / CAP) * (HALF - 1);

/**
 * Each played window's chances as a column, the user's above the line and the opponent's below.
 * It takes the count of played windows, not the clock, so it renders once per window.
 */
export const XgRiver = memo(function XgRiver({
  windows,
  upTo,
  finalMinute,
  shared,
  motion,
}: {
  readonly windows: readonly StoryWindow[];
  readonly upTo: number;
  readonly finalMinute: number;
  readonly shared: boolean;
  readonly motion: boolean;
}) {
  const totals = riverTotals(windows, upTo);
  const grow = motion ? s.riverGrow : undefined;
  return (
    <div
      className={s.river}
      role="img"
      aria-label={riverLabel(totals, shared)}
      data-testid="xg-river"
      data-windows={upTo}
    >
      <span className={s.riverLabel}>Chances (xG)</span>
      <span className={`num ${s.riverNum}`}>{totals.user.toFixed(1)}</span>
      <svg
        className={s.riverChart}
        viewBox={`0 0 ${finalMinute} ${HALF * 2}`}
        preserveAspectRatio="none"
      >
        <line className={s.riverAxis} x1={0} x2={finalMinute} y1={HALF} y2={HALF} />
        {windows.slice(0, upTo).map((w) => (
          <g key={w.window} className={grow}>
            <rect
              className={s.riverUser}
              x={w.minute - WINDOW}
              y={HALF - depth(w.xgUser)}
              width={WINDOW}
              height={depth(w.xgUser)}
            />
            <rect
              className={s.riverOpp}
              x={w.minute - WINDOW}
              y={HALF}
              width={WINDOW}
              height={depth(w.xgOpp)}
            />
          </g>
        ))}
      </svg>
      <span className={`num ${s.riverNum}`}>{totals.opp.toFixed(1)}</span>
    </div>
  );
});
