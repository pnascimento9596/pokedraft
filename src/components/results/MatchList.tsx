import type { CSSProperties } from "react";
import type { CupResult, MatchResult } from "@/engine";
import { FINISH_LABEL, ROUND_LABEL, ROUND_SHORT } from "@/ui/labels";
import { NOMINAL_LADDER } from "@/ui/lineup";
import {
  absenceLine,
  eliminatedIn,
  finalScore,
  goalLine,
  shootoutLine,
  type PlayedMatch,
} from "./format";
import s from "./MatchList.module.css";

const SCALE = 1000;

function bar(score: number): CSSProperties {
  return { "--w": `${Math.min(100, (score / SCALE) * 100)}%` } as CSSProperties;
}

const OUTCOME_LABEL = { W: "Win", D: "Draw", L: "Loss" } as const;

export function MatchList({ cup }: { cup: CupResult }) {
  const outIn = eliminatedIn(cup);
  return (
    <ol className={s.list}>
      {cup.matches.map((m) => (
        <li key={m.round} data-testid={`match-${m.round}`} className={s.row} data-status={m.status}>
          {m.status === "played" ? (
            <Played
              m={m}
              headline={cup.rating.score}
              outNote={outIn === m.round ? FINISH_LABEL[cup.finish] : null}
            />
          ) : (
            <NotPlayed m={m} />
          )}
        </li>
      ))}
    </ol>
  );
}

function Played({
  m,
  headline,
  outNote,
}: {
  m: PlayedMatch;
  headline: number;
  outNote: string | null;
}) {
  const score = finalScore(m);
  const pens = shootoutLine(m);
  const user = m.goals.filter((g) => g.side === "user");
  const opp = m.goals.filter((g) => g.side === "opp");
  return (
    <article className={s.card} data-outcome={m.outcome}>
      <div className={s.head}>
        <span className={s.round} title={ROUND_LABEL[m.round]}>
          {ROUND_SHORT[m.round]}
        </span>
        <span className={s.roundLong}>{ROUND_LABEL[m.round]}</span>
        <span className={s.outcome} data-outcome={m.outcome}>
          {OUTCOME_LABEL[m.outcome]}
        </span>
      </div>
      <div className={s.scoreline}>
        <span className={s.side}>You</span>
        <span className={s.goals}>
          {score.user}-{score.opp}
        </span>
        <span className={`${s.side} ${s.oppName}`}>{m.opponent.name}</span>
      </div>
      {m.extraTime !== null || pens !== null ? (
        <p className={s.extra}>
          {m.extraTime !== null ? "a.e.t." : null}
          {m.extraTime !== null && pens !== null ? ", " : null}
          {pens}
        </p>
      ) : null}
      <div className={s.ladder} aria-label="Ratings for this match">
        <div className={s.meter}>
          <span className={s.meterLabel}>You</span>
          <span className={s.track}>
            <span className={s.fillUser} style={bar(m.rating)} />
          </span>
          <span className={s.meterValue}>{m.rating}</span>
        </div>
        <div className={s.meter}>
          <span className={s.meterLabel}>Opp</span>
          <span className={s.track}>
            <span className={s.fillOpp} style={bar(m.opponent.score)} />
          </span>
          <span className={s.meterValue}>{m.opponent.score}</span>
        </div>
        {m.rating < headline ? (
          <p className={s.below}>
            Fielded side rated {m.rating}, below your full Team Score of {headline}.
          </p>
        ) : null}
      </div>
      {user.length > 0 || opp.length > 0 ? (
        <div className={s.scorers}>
          <ul className={s.goalList} aria-label="Your goals">
            {user.map((g, i) => (
              <li key={i}>{goalLine(g)}</li>
            ))}
          </ul>
          <ul className={`${s.goalList} ${s.goalOpp}`} aria-label="Opponent goals">
            {opp.map((g, i) => (
              <li key={i}>{goalLine(g)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {m.absences.map((a) => (
        <p key={a.slot} className={s.absence}>
          {absenceLine(a)}
        </p>
      ))}
      {m.recap.length > 0 ? (
        <div className={s.recap}>
          {m.recap.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      ) : null}
      {outNote !== null ? <p className={s.out}>{outNote}</p> : null}
    </article>
  );
}

function NotPlayed({ m }: { m: Extract<MatchResult, { status: "notPlayed" }> }) {
  return (
    <article className={s.card} data-outcome="none">
      <div className={s.head}>
        <span className={s.round}>{ROUND_SHORT[m.round]}</span>
        <span className={s.roundLong}>{ROUND_LABEL[m.round]}</span>
        <span className={s.outcome}>Not played</span>
      </div>
      <div className={s.meter}>
        <span className={s.meterLabel}>Opp</span>
        <span className={s.track}>
          <span className={s.fillGhost} style={bar(NOMINAL_LADDER[m.round])} />
        </span>
        <span className={s.meterValue}>about {NOMINAL_LADDER[m.round]}</span>
      </div>
    </article>
  );
}
