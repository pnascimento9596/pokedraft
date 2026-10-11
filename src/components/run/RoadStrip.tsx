import { useId, useMemo, type CSSProperties } from "react";
import { ENGINE_COEFFICIENTS } from "@/engine/coefficients";
import { buildLadder } from "@/engine/opponents";
import { CUP_ROUNDS, type Mode } from "@/engine/types";
import { ROUND_LABEL, ROUND_SHORT } from "@/ui/labels";
import s from "./RoadStrip.module.css";

const BIG_JUMP = new Set(["R32", "R16", "QF", "SF", "F"]);
// Before a seed exists the bars follow the shape of the coefficient table. No number is printed.
const SHAPE = ENGINE_COEFFICIENTS.ladder.score;
// A non-breaking space holds the value row open, so the strip is the same height with and
// without ratings (an empty cell has no line box).
const NO_RATING = <>&nbsp;</>;

export function RoadStrip({
  seed,
  mode,
  compact = false,
}: {
  readonly seed: string | null;
  readonly mode: Mode;
  readonly compact?: boolean;
}) {
  const titleId = useId();
  const ladder = useMemo(() => (seed === null ? null : buildLadder(seed, mode)), [seed, mode]);
  const heights = CUP_ROUNDS.map((round) => ladder?.[round].score ?? SHAPE[round]);
  const top = Math.max(...heights);
  return (
    <section className={s.road} data-compact={compact || undefined} aria-labelledby={titleId}>
      <div className={s.head}>
        <h2 id={titleId} className={s.title}>
          Road to the Final
        </h2>
        <span className="kicker">Your opponents</span>
      </div>
      <ol className={s.steps}>
        {CUP_ROUNDS.map((round, i) => {
          const opponent = ladder?.[round] ?? null;
          return (
            <li
              key={round}
              className={s.step}
              data-big={BIG_JUMP.has(round) || undefined}
              style={{ "--h": heights[i]! / top } as CSSProperties}
            >
              <span className={`num ${s.value}`} aria-hidden="true">
                {opponent === null ? NO_RATING : opponent.score}
              </span>
              <span className={s.bar} aria-hidden="true" />
              <span className={s.round} aria-hidden="true">
                {ROUND_SHORT[round]}
              </span>
              <span className="visually-hidden">
                {opponent === null
                  ? ROUND_LABEL[round]
                  : `${ROUND_LABEL[round]}, ${opponent.name}, rating ${opponent.score}`}
              </span>
            </li>
          );
        })}
      </ol>
      {compact ? null : (
        <p className={s.caption}>
          {ladder === null
            ? "Your opponents are set the moment you start the run."
            : "Opponent ratings climb. The group stage is the gentle start; every knockout round is a step up, and the Final is the hardest test."}
        </p>
      )}
    </section>
  );
}
