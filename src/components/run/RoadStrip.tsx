import { useId, type CSSProperties } from "react";
import { CUP_ROUNDS } from "@/engine";
import { ROUND_LABEL, ROUND_SHORT } from "@/ui/labels";
import { NOMINAL_LADDER } from "@/ui/lineup";
import s from "./RoadStrip.module.css";

const TOP = Math.max(...CUP_ROUNDS.map((r) => NOMINAL_LADDER[r]));
const BIG_JUMP = new Set(["QF", "SF", "F"]);

export function RoadStrip({ compact = false }: { readonly compact?: boolean }) {
  const titleId = useId();
  return (
    <section className={s.road} data-compact={compact || undefined} aria-labelledby={titleId}>
      <div className={s.head}>
        <h2 id={titleId} className={s.title}>
          Road to the Final
        </h2>
        <span className="kicker">Approximate opponent ratings</span>
      </div>
      <ol className={s.steps}>
        {CUP_ROUNDS.map((round) => {
          const value = NOMINAL_LADDER[round];
          return (
            <li
              key={round}
              className={s.step}
              data-big={BIG_JUMP.has(round) || undefined}
              style={{ "--h": value / TOP } as CSSProperties}
            >
              <span className={`num ${s.value}`} aria-hidden="true">
                {value}
              </span>
              <span className={s.bar} aria-hidden="true" />
              <span className={s.round} aria-hidden="true">
                {ROUND_SHORT[round]}
              </span>
              <span className="visually-hidden">
                {ROUND_LABEL[round]}, opponent rating about {value}
              </span>
            </li>
          );
        })}
      </ol>
      {compact ? null : (
        <p className={s.caption}>
          Opponent ratings climb. The group stage is a warm-up; the quarter-final, semi-final and
          Final are the real test.
        </p>
      )}
    </section>
  );
}
