"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { FullLineup, ManagerAction, Score, Seed } from "@/engine";
import { MatchPlayer } from "@/components/matchday/MatchPlayer";
import { unlockAudio } from "@/components/wheel/sound";
import {
  exhibitionFixture,
  legSeed,
  playSingle,
  playTwoLegs,
  singleSeed,
  type TieDecision,
  type TwoLegTie,
} from "@/components/results/exhibition";
import { finalScore, goalLine, type PlayedMatch } from "@/components/results/format";
import { decideExhibition } from "@/ui/manager/exhibition-decide";
import type { Decision } from "@/ui/manager/touchline";
import { loadPanel, matchdayView, type MatchView } from "@/ui/settings";
import s from "./ExhibitionMatch.module.css";

/** How the player watches, read from the settings once at kick off. */
interface Watch {
  readonly view: MatchView;
  readonly managed: boolean;
  readonly ratings: boolean;
}

type Run =
  | {
      readonly kind: "single";
      readonly watch: Watch;
      readonly actions: readonly ManagerAction[];
      readonly match: PlayedMatch;
    }
  | { readonly kind: "legs"; readonly watch: Watch; readonly leg: 1 | 2 };

type Sides = Readonly<Record<"user" | "opp", string>>;

const DECIDED_LABEL: Readonly<Record<TieDecision, string>> = {
  aggregate: "On aggregate",
  "extra-time": "After extra time",
  penalties: "On penalties",
};

const MANAGER_NOTE = "Manager controls in one match only.";

function scoreText(score: Score): string {
  return `${score.user}-${score.opp}`;
}

function winnerOf(score: Score): "user" | "opp" | null {
  if (score.user === score.opp) return null;
  return score.user > score.opp ? "user" : "opp";
}

export function ExhibitionMatch({
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
  const noteId = useId();
  const sides: Sides = { user: "Your squad", opp: awayName };
  const fixture = useMemo(() => exhibitionFixture(home, away, awayName), [home, away, awayName]);
  const scope = useMemo(
    () => ({ seed, own: home, other: away, rematch }),
    [seed, home, away, rematch],
  );
  const single = useMemo(
    () => (fixture === null || legs !== 1 ? null : playSingle(fixture, scope)),
    [fixture, scope, legs],
  );
  const tie = useMemo(
    () => (fixture === null || legs !== 2 ? null : playTwoLegs(fixture, scope)),
    [fixture, scope, legs],
  );
  // A rematch, the other format or another squad is a new game, back at kick off.
  const game = useMemo(() => ({ fixture, scope, legs }), [fixture, scope, legs]);
  const [state, setState] = useState<{ game: typeof game; run: Run | null }>({ game, run: null });
  const run = state.game === game ? state.run : null;
  const start = (next: Run) => setState({ game, run: next });
  // Play rematch unmounts with the match, so the focus it held moves to the new Kick off.
  const kickoffRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  useEffect(() => {
    if (run !== null || !refocus.current) return;
    refocus.current = false;
    kickoffRef.current?.focus({ preventScroll: true });
  }, [run]);

  if (fixture === null || (single === null && tie === null)) {
    return <p>One of these squads has no goalkeeper, so this exhibition cannot be played.</p>;
  }

  const kickOff = () => {
    unlockAudio();
    const panel = loadPanel();
    // Two legs never stop for the manager: a leg-1 decision would change which seed breaks a tie.
    const watch: Watch = {
      view: matchdayView(panel),
      managed: legs === 1 && panel.managerMode,
      ratings: panel.showRatings,
    };
    start(
      single !== null
        ? { kind: "single", watch, actions: [], match: single }
        : { kind: "legs", watch, leg: 1 },
    );
  };

  const decide = (minute: number, decision: Decision): string | null => {
    if (run?.kind !== "single") return "The match is over.";
    const verdict = decideExhibition(
      { fixture, seed: singleSeed(scope) },
      run.match,
      run.actions,
      minute,
      decision,
    );
    if (!verdict.ok) return verdict.reason;
    start({ ...run, actions: verdict.actions, match: verdict.match });
    return null;
  };

  const rematchButton = (
    <button
      type="button"
      className="btn btn--primary"
      onClick={() => {
        refocus.current = true;
        onRematch();
      }}
    >
      Play rematch
    </button>
  );

  return (
    <div className={s.match}>
      {mirror ? (
        <p className={s.mirror} data-testid="exhibition-mirror">
          Same squad on both sides
        </p>
      ) : null}
      <div
        className={s.format}
        role="group"
        aria-label="Exhibition format"
        aria-describedby={noteId}
      >
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
      <p className={s.note} id={noteId} data-testid="exhibition-manager-note">
        {MANAGER_NOTE}
      </p>
      <p className={s.note}>
        {legs === 1
          ? "Both teams are rated by the current engine. A 90-minute friendly can end in a draw and never changes your history or leaderboard."
          : "Two 90-minute legs. The tie is decided on aggregate, with no away goals rule. A level aggregate goes to extra time and penalties at the end of leg 2. Never changes your history or leaderboard."}
      </p>

      {run === null ? (
        <button
          type="button"
          ref={kickoffRef}
          className={`btn btn--primary ${s.kickoff}`}
          data-testid="exhibition-kickoff"
          onClick={kickOff}
        >
          Kick off
        </button>
      ) : run.kind === "single" ? (
        <MatchPlayer
          key="single"
          match={run.match}
          matchIndex={fixture.matchIndex}
          seed={singleSeed(scope)}
          lineup={home}
          view={run.watch.view}
          manager={run.watch.managed ? { actions: run.actions, decide } : undefined}
          ratings={run.watch.ratings}
          label={`Exhibition against ${awayName}`}
          autoStart
          takeFocus
          footer={
            <div className={s.fulltime} data-testid="exhibition-fulltime">
              <p className={s.line}>
                Full time,{" "}
                <strong className="num" data-testid="exhibition-score">
                  {scoreText(finalScore(run.match))}
                </strong>
                .{" "}
                {run.match.outcome === "D"
                  ? "Honours even."
                  : `${sides[run.match.outcome === "W" ? "user" : "opp"]} wins.`}
              </p>
              {rematchButton}
            </div>
          }
        />
      ) : (
        <section className={s.leg} aria-label={`Leg ${run.leg}`}>
          <h3>Leg {run.leg}</h3>
          <MatchPlayer
            key={run.leg}
            match={tie!.legs[run.leg - 1]}
            matchIndex={fixture.matchIndex}
            seed={legSeed(scope, run.leg)}
            lineup={home}
            view={run.watch.view}
            ratings={run.watch.ratings}
            label={`Leg ${run.leg} against ${awayName}`}
            autoStart
            takeFocus
            footer={
              run.leg === 1 ? (
                <div className={s.fulltime} data-testid="exhibition-fulltime">
                  <p className={s.line}>
                    Leg 1 full time,{" "}
                    <strong className="num" data-testid="exhibition-leg-1-score">
                      {scoreText(tie!.legs[0].regulation)}
                    </strong>
                    . {legWinner(sides, tie!.legs[0].regulation)}
                  </p>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => start({ ...run, leg: 2 })}
                  >
                    Play leg 2
                  </button>
                </div>
              ) : (
                <TieResult tie={tie!} sides={sides} rematch={rematchButton} />
              )
            }
          />
        </section>
      )}
    </div>
  );
}

function legWinner(sides: Sides, score: Score): string {
  const winner = winnerOf(score);
  return winner === null ? "Leg drawn." : `${sides[winner]} wins the leg.`;
}

// Extra time and penalties come from the knockout match that broke the tie, so the pitch shows
// leg 2's 90 minutes and this card adds what came after.
function TieResult({
  tie,
  sides,
  rematch,
}: {
  readonly tie: TwoLegTie;
  readonly sides: Sides;
  readonly rematch: ReactNode;
}) {
  const extraGoals = tie.leg2.goals.filter((goal) => goal.minute > 90);
  const pens = tie.leg2.shootout;
  return (
    <div className={s.fulltime} data-testid="exhibition-fulltime">
      {tie.leg2.extraTime ? (
        <>
          <p className={s.line}>
            Level on aggregate after 90 minutes, so leg 2 went to extra time
            {pens === null ? "" : " and penalties"}. The pitch shows its 90 minutes.
          </p>
          {extraGoals.length === 0 ? (
            <p className={s.note}>No goals in extra time.</p>
          ) : (
            <ul className={s.goals} aria-label="Extra time goals">
              {extraGoals.map((goal, i) => (
                <li key={i} data-side={goal.side}>
                  <span>{sides[goal.side]}</span>
                  <span>{goalLine(goal)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
      <section className={s.aggregate} aria-label="Aggregate">
        <p>
          Leg 1{" "}
          <strong className="num" data-testid="exhibition-leg-1-score">
            {scoreText(tie.legs[0].regulation)}
          </strong>
          . Leg 2{" "}
          <strong className="num" data-testid="exhibition-leg-2-score">
            {scoreText(tie.leg2.score)}
          </strong>
          {tie.leg2.extraTime ? " after extra time" : ""}. Aggregate{" "}
          <strong className="num" data-testid="exhibition-aggregate">
            {scoreText(tie.aggregate)}
          </strong>
          . <strong data-testid="exhibition-decided">{DECIDED_LABEL[tie.decidedBy]}</strong>
          {pens === null ? "" : `, ${pens.user}-${pens.opp}`}. {sides[tie.winner]} wins the tie.
        </p>
      </section>
      {rematch}
    </div>
  );
}
