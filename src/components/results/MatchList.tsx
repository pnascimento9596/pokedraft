import type { CSSProperties } from "react";
import type { CupResult, DraftState, MatchResult } from "@/engine";
import { FINISH_LABEL, ROUND_LABEL, ROUND_SHORT } from "@/ui/labels";
import {
  absenceLine,
  eliminatedIn,
  finalScore,
  goalLine,
  shootoutLine,
  type PlayedMatch,
} from "./format";
import { RecordedSaves } from "./RecordedSaves";
import { BossRoster } from "./BossRoster";
import { getMatchStar } from "./starCalculation";
import s from "./MatchList.module.css";

const SCALE = 1000;

function bar(score: number): CSSProperties {
  return { "--w": `${Math.min(100, (score / SCALE) * 100)}%` } as CSSProperties;
}

const OUTCOME_LABEL = { W: "Win", D: "Draw", L: "Loss" } as const;

export function MatchList({
  cup,
  draft,
  onSelectStar,
}: {
  cup: CupResult;
  draft?: DraftState;
  onSelectStar?: (round: PlayedMatch["round"]) => void;
}) {
  const outIn = eliminatedIn(cup);
  return (
    <ol className={s.list}>
      {cup.matches.map((m) => (
        <li key={m.round} data-testid={`match-${m.round}`} className={s.row} data-status={m.status}>
          {m.status === "played" ? (
            <Played
              m={m}
              draft={draft}
              headline={cup.rating.score}
              outNote={outIn === m.round ? FINISH_LABEL[cup.finish] : null}
              onSelectStar={onSelectStar}
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
  draft,
  headline,
  outNote,
  onSelectStar,
}: {
  m: PlayedMatch;
  draft?: DraftState;
  headline: number;
  outNote: string | null;
  onSelectStar?: (round: PlayedMatch["round"]) => void;
}) {
  const score = finalScore(m);
  const pens = shootoutLine(m);
  const user = m.goals.filter((g) => g.side === "user");
  const opp = m.goals.filter((g) => g.side === "opp");
  const star = draft ? getMatchStar(m, draft) : null;
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
      {star ? (
        onSelectStar ? (
          <button
            type="button"
            className={s.starBadge}
            data-testid={`match-star-${m.round}`}
            onClick={() => onSelectStar(m.round)}
          >
            <span className={s.starIcon} aria-hidden="true">
              ⭐
            </span>
            <span className={s.starName}>{star.name}</span>
            <span className={s.starHeadline}>• {star.headline}</span>
          </button>
        ) : (
          <div className={s.starBadge} data-testid={`match-star-${m.round}`}>
            <span className={s.starIcon} aria-hidden="true">
              ⭐
            </span>
            <span className={s.starName}>{star.name}</span>
            <span className={s.starHeadline}>• {star.headline}</span>
          </div>
        )
      ) : null}
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
      <RecordedSaves saves={m.saves} />
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
      <BossRoster opponent={m.opponent} />
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
      <p className={s.notPlayedOpp}>{m.opponent.name}</p>
      <div className={s.meter}>
        <span className={s.meterLabel}>Opp</span>
        <span className={s.track}>
          <span className={s.fillGhost} style={bar(m.opponent.score)} />
        </span>
        <span className={s.meterValue}>{m.opponent.score}</span>
      </div>
      <BossRoster opponent={m.opponent} />
    </article>
  );
}
