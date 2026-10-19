"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { DraftState, GoalEvent, Score } from "@/engine";
import { fullLineup } from "@/components/builder/model";
import { draftFromBuilderToken } from "@/ui/builder-token";
import { readJson } from "@/ui/storage";
import {
  exhibitionFixture,
  playSingle,
  playTwoLegs,
  type ExhibitionFormat,
  type TieDecision,
} from "./exhibition";
import { finalScore, goalLine, shootoutLine } from "./format";
import s from "./ExhibitionMatchModal.module.css";

interface Replay {
  readonly minute: number;
  readonly running: boolean;
}

// Every replay opens at full time, whatever minute its match ends on.
const FULL_TIME: Replay = { minute: Number.POSITIVE_INFINITY, running: false };

const SIDE_NAME = { user: "Your squad", opp: "Shared squad" } as const;

const DECIDED_LABEL: Readonly<Record<TieDecision, string>> = {
  aggregate: "On aggregate",
  "extra-time": "After extra time",
  penalties: "On penalties",
};

function winnerOf(score: Score): "user" | "opp" | null {
  if (score.user === score.opp) return null;
  return score.user > score.opp ? "user" : "opp";
}

function legLine(leg: number, score: Score): string {
  const winner = winnerOf(score);
  return `Leg ${leg} full time. ${winner === null ? "Leg drawn." : `${SIDE_NAME[winner]} wins the leg.`}`;
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
          Your squad
          <br />
          <small>{own}</small>
        </span>
        <strong className={`num ${s.score}`} data-testid={scoreTestId}>
          {score.user}-{score.opp}
        </strong>
        <span>
          Shared squad
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
            <span>{SIDE_NAME[goal.side]}</span>
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

export function ExhibitionMatchModal({
  opponent,
  onClose,
}: {
  readonly opponent: DraftState;
  readonly onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef(false);
  const titleId = useId();
  const [rematch, setRematch] = useState(0);
  const [format, setFormat] = useState<ExhibitionFormat>("single");
  const [replays, setReplays] = useState<readonly [Replay, Replay]>([FULL_TIME, FULL_TIME]);
  const [challenger] = useState(() => {
    const token = readJson<unknown>("pokedraft.builder", null);
    return typeof token === "string" ? draftFromBuilderToken(token) : null;
  });
  const replayLeg = useMemo(
    () =>
      ([0, 1] as const).map(
        (leg) => (update: (current: Replay) => Replay) =>
          setReplays((current) =>
            leg === 0 ? [update(current[0]), current[1]] : [current[0], update(current[1])],
          ),
      ),
    [],
  );

  useEffect(() => {
    const element = dialog.current;
    const returnFocus = document.activeElement;
    active.current = true;
    if (element && !element.open) element.showModal();
    return () => {
      active.current = false;
      if (element?.open) element.close();
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
        returnFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  const own = useMemo(
    () => (challenger === null ? null : fullLineup(challenger.lineup)),
    [challenger],
  );
  const other = useMemo(() => fullLineup(opponent.lineup), [opponent]);
  const fixture = useMemo(
    () => (own === null || other === null ? null : exhibitionFixture(own, other)),
    [own, other],
  );
  const played = useMemo(() => {
    if (fixture === null || own === null || other === null) return null;
    const scope = { seed: opponent.seed, own, other, rematch };
    return format === "single"
      ? { format, match: playSingle(fixture, scope) }
      : { format, tie: playTwoLegs(fixture, scope) };
  }, [fixture, own, other, opponent.seed, rematch, format]);

  const ends = [90, played?.format === "two-legs" && played.tie.leg2.extraTime ? 120 : 90] as const;
  const ownLabel = own === null || fixture === null ? "" : `${own.formation} / ${fixture.rating}`;
  const otherLabel =
    other === null || fixture === null ? "" : `${other.formation} / ${fixture.opponent.score}`;

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby={titleId}
      data-testid="exhibition-modal"
      onCancel={(event) => {
        event.preventDefault();
        event.currentTarget.close();
      }}
      onClose={(event) => {
        if (active.current && !event.currentTarget.open) {
          setReplays((current) => [
            { ...current[0], running: false },
            { ...current[1], running: false },
          ]);
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className={s.content}>
        <header className={s.header}>
          <div>
            <p className="kicker">Friendly / Not ranked</p>
            <h2 id={titleId}>Exhibition Match</h2>
          </div>
          <button type="button" className="btn btn--sm" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </header>
        {played !== null ? (
          <>
            <div className={s.format} role="group" aria-label="Exhibition format">
              {(
                [
                  ["single", "One match"],
                  ["two-legs", "Two legs"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={format === value}
                  onClick={() => {
                    setFormat(value);
                    setReplays([FULL_TIME, FULL_TIME]);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {played.format === "single" ? (
              <>
                <p className={s.note}>
                  Your saved Builder squad against this shared squad. Both teams are rated by the
                  current engine. A 90-minute friendly can end in a draw and never changes your
                  history or leaderboard.
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
                          ? "Shared squad wins."
                          : "Honours even."}
                    </>
                  }
                  replay={replays[0]}
                  onReplay={replayLeg[0]!}
                  own={ownLabel}
                  other={otherLabel}
                />
              </>
            ) : (
              <>
                <p className={s.note}>
                  Your saved Builder squad against this shared squad over two 90-minute legs. The
                  tie is decided on aggregate, with no away goals rule. A level aggregate goes to
                  extra time and penalties at the end of leg 2. Never changes your history or
                  leaderboard.
                </p>
                {([0, 1] as const).map((leg) => {
                  const tie = played.tie;
                  const second = leg === 1;
                  const final = second ? tie.leg2.score : tie.legs[0].regulation;
                  const shootout =
                    second && tie.decider !== null ? shootoutLine(tie.decider) : null;
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
                            : legLine(leg + 1, final)
                        }
                        replay={replays[leg]}
                        onReplay={replayLeg[leg]!}
                        own={ownLabel}
                        other={otherLabel}
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
                        . {SIDE_NAME[played.tie.winner]} wins the tie.
                      </p>
                    </>
                  ) : (
                    <p>The aggregate shows when both legs are at full time.</p>
                  )}
                </section>
              </>
            )}
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setReplays([FULL_TIME, FULL_TIME]);
                setRematch((n) => n + 1);
              }}
            >
              Play rematch
            </button>
          </>
        ) : (
          <>
            <p>
              Save a complete squad in the Builder, including all five substitutes, before playing
              an exhibition.
            </p>
            <Link href="/" className="btn btn--primary" onClick={() => dialog.current?.close()}>
              Build your squad
            </Link>
          </>
        )}
      </div>
    </dialog>
  );
}
