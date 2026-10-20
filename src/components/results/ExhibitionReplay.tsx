"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { FullLineup, GoalEvent, Score, Seed } from "@/engine";
import { exhibitionFixture, playSingle, playTwoLegs, type TieDecision } from "./exhibition";
import { finalScore, goalLine, shootoutLine } from "./format";
import s from "./ExhibitionReplay.module.css";

interface Replay {
  readonly minute: number;
  readonly running: boolean;
}

// Every replay opens at full time, whatever minute its match ends on.
const FULL_TIME: Replay = { minute: Number.POSITIVE_INFINITY, running: false };
const AT_FULL_TIME: readonly [Replay, Replay] = [FULL_TIME, FULL_TIME];

const DECIDED_LABEL: Readonly<Record<TieDecision, string>> = {
  aggregate: "On aggregate",
  "extra-time": "After extra time",
  penalties: "On penalties",
};

type Sides = Readonly<Record<"user" | "opp", string>>;

function winnerOf(score: Score): "user" | "opp" | null {
  if (score.user === score.opp) return null;
  return score.user > score.opp ? "user" : "opp";
}

function legLine(sides: Sides, leg: number, score: Score): string {
  const winner = winnerOf(score);
  return `Leg ${leg} full time. ${winner === null ? "Leg drawn." : `${sides[winner]} wins the leg.`}`;
}

function MatchReplay({
  name,
  goalsLabel,
  scoreTestId,
  final,
  goals,
  end,
  fullTime,
  replay,
  onReplay,
  sides,
  own,
  other,
}: {
  readonly name: string;
  readonly goalsLabel: string;
  readonly scoreTestId: string;
  readonly final: Score;
  readonly goals: readonly GoalEvent[];
  readonly end: number;
  readonly fullTime: ReactNode;
  readonly replay: Replay;
  readonly onReplay: (update: (current: Replay) => Replay) => void;
  readonly sides: Sides;
  readonly own: string;
  readonly other: string;
}) {
  useEffect(() => {
    if (!replay.running || replay.minute >= end) return;
    const timer = setTimeout(() => {
      onReplay((current) => {
        const minute = Math.min(end, current.minute + 3);
        return { minute, running: minute < end };
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [replay, end, onReplay]);

  const atFullTime = replay.minute >= end;
  const shown = goals.filter((goal) => goal.minute <= replay.minute);
  const score = atFullTime
    ? final
    : {
        user: shown.filter((goal) => goal.side === "user").length,
        opp: shown.filter((goal) => goal.side === "opp").length,
      };
  return (
    <>
      <div
        className={s.scoreboard}
        aria-label={atFullTime ? `${name} final score` : `${name} replay score`}
      >
        <span>
          {sides.user}
          <br />
          <small>{own}</small>
        </span>
        <strong className={`num ${s.score}`} data-testid={scoreTestId}>
          {score.user}-{score.opp}
        </strong>
        <span>
          {sides.opp}
          <br />
          <small>{other}</small>
        </span>
      </div>
      <p role="status">
        {atFullTime ? fullTime : `${replay.minute}' / ${end}' Replay of recorded goals.`}
      </p>
      <div className={s.controls} role="group" aria-label={`${name} highlights`}>
        <button
          type="button"
          className="btn"
          onClick={() =>
            onReplay((current) => ({
              minute: current.minute >= end ? 0 : current.minute,
              running: !current.running,
            }))
          }
        >
          {replay.running
            ? "Pause highlights"
            : atFullTime
              ? "Replay highlights"
              : "Resume highlights"}
        </button>
        {!atFullTime ? (
          <button type="button" className="btn" onClick={() => onReplay(() => FULL_TIME)}>
            Show full time
          </button>
        ) : null}
      </div>
      <ul className={s.goals} aria-label={goalsLabel}>
        {shown.map((goal, i) => (
          <li key={i} data-side={goal.side}>
            <span>{sides[goal.side]}</span>
            <span>{goalLine(goal)}</span>
          </li>
        ))}
      </ul>
      {shown.length === 0 ? (
        <p>{atFullTime ? "No goals in this match." : "No goals yet in this replay."}</p>
      ) : null}
    </>
  );
}

export function ExhibitionReplay({
  home,
  away,
  seed,
  rematch,
  legs,
  awayName,
  mirror,
  onLegs,
  onRematch,
}: {
  readonly home: FullLineup;
  readonly away: FullLineup;
  /** The away squad's seed, the one the exhibition has always been played on. */
  readonly seed: Seed;
  readonly rematch: number;
  readonly legs: 1 | 2;
  readonly awayName: string;
  readonly mirror: boolean;
  readonly onLegs: (legs: 1 | 2) => void;
  readonly onRematch: () => void;
}) {
  const sides: Sides = useMemo(() => ({ user: "Your squad", opp: awayName }), [awayName]);
  // Highlights reset when the match changes: a rematch, the other format or another squad.
  const match = useMemo(
    () => ({ home, away, seed, rematch, legs }),
    [home, away, seed, rematch, legs],
  );
  const [state, setState] = useState({ match, replays: AT_FULL_TIME });
  const replays = state.match === match ? state.replays : AT_FULL_TIME;
  const replayLeg = useMemo(
    () =>
      ([0, 1] as const).map(
        (leg) => (update: (current: Replay) => Replay) =>
          setState((current) => {
            const now = current.match === match ? current.replays : AT_FULL_TIME;
            return {
              match,
              replays: leg === 0 ? [update(now[0]), now[1]] : [now[0], update(now[1])],
            };
          }),
      ),
    [match],
  );

  const fixture = useMemo(() => exhibitionFixture(home, away, awayName), [home, away, awayName]);
  const played = useMemo(() => {
    if (fixture === null) return null;
    const scope = { seed, own: home, other: away, rematch };
    return legs === 1
      ? { legs, match: playSingle(fixture, scope) }
      : { legs, tie: playTwoLegs(fixture, scope) };
  }, [fixture, home, away, seed, rematch, legs]);

  if (played === null || fixture === null) {
    return <p>One of these squads has no goalkeeper, so this exhibition cannot be played.</p>;
  }

  const ends = [90, played.legs === 2 && played.tie.leg2.extraTime ? 120 : 90] as const;
  const own = `${home.formation} / ${fixture.rating}`;
  const other = `${away.formation} / ${fixture.opponent.score}`;

  return (
    <div className={s.replay}>
      {mirror ? (
        <p className={s.mirror} data-testid="exhibition-mirror">
          Same squad on both sides
        </p>
      ) : null}
      <div className={s.format} role="group" aria-label="Exhibition format">
        {(
          [
            [1, "One match"],
            [2, "Two legs"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={legs === value}
            onClick={() => onLegs(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {played.legs === 1 ? (
        <>
          <p className={s.note}>
            Both teams are rated by the current engine. A 90-minute friendly can end in a draw and
            never changes your history or leaderboard.
          </p>
          <MatchReplay
            name="Exhibition"
            goalsLabel="Exhibition goals"
            scoreTestId="exhibition-score"
            final={finalScore(played.match)}
            goals={played.match.goals}
            end={90}
            fullTime={
              <>
                Full time.{" "}
                {played.match.outcome === "W"
                  ? "Your squad wins."
                  : played.match.outcome === "L"
                    ? `${awayName} wins.`
                    : "Honours even."}
              </>
            }
            replay={replays[0]}
            onReplay={replayLeg[0]!}
            sides={sides}
            own={own}
            other={other}
          />
        </>
      ) : (
        <>
          <p className={s.note}>
            Two 90-minute legs. The tie is decided on aggregate, with no away goals rule. A level
            aggregate goes to extra time and penalties at the end of leg 2. Never changes your
            history or leaderboard.
          </p>
          {([0, 1] as const).map((leg) => {
            const tie = played.tie;
            const second = leg === 1;
            const final = second ? tie.leg2.score : tie.legs[0].regulation;
            const shootout = second && tie.decider !== null ? shootoutLine(tie.decider) : null;
            return (
              <section
                key={leg}
                className={s.leg}
                aria-label={`Leg ${leg + 1}`}
                data-testid={`exhibition-leg-${leg + 1}`}
              >
                <h3>Leg {leg + 1}</h3>
                <MatchReplay
                  name={`Leg ${leg + 1}`}
                  goalsLabel={`Leg ${leg + 1} goals`}
                  scoreTestId={`exhibition-leg-${leg + 1}-score`}
                  final={final}
                  goals={second ? tie.leg2.goals : tie.legs[0].goals}
                  end={ends[leg]}
                  fullTime={
                    second && tie.leg2.extraTime
                      ? `Leg 2 after extra time.${shootout === null ? "" : ` Penalties: ${shootout}.`}`
                      : legLine(sides, leg + 1, final)
                  }
                  replay={replays[leg]}
                  onReplay={replayLeg[leg]!}
                  sides={sides}
                  own={own}
                  other={other}
                />
              </section>
            );
          })}
          <section className={s.aggregate} aria-label="Aggregate">
            {replays.every((replay, leg) => replay.minute >= ends[leg]) ? (
              <>
                <p>
                  Aggregate{" "}
                  <strong className="num" data-testid="exhibition-aggregate">
                    {played.tie.aggregate.user}-{played.tie.aggregate.opp}
                  </strong>
                </p>
                <p>
                  <strong data-testid="exhibition-decided">
                    {DECIDED_LABEL[played.tie.decidedBy]}
                  </strong>
                  . {sides[played.tie.winner]} wins the tie.
                </p>
              </>
            ) : (
              <p>The aggregate shows when both legs are at full time.</p>
            )}
          </section>
        </>
      )}
      <button type="button" className="btn btn--primary" onClick={onRematch}>
        Play rematch
      </button>
    </div>
  );
}
