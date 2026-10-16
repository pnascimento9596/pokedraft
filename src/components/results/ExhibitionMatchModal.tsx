"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  FORMATIONS,
  speciesById,
  type DraftState,
  type OpponentPlayerRef,
  type Seed,
} from "@/engine";
import { simulateMatch, type MatchStarter } from "@/engine/match";
import { matchLines, rateTeam } from "@/engine/team";
import { fullLineup } from "@/components/builder/model";
import { draftFromBuilderToken } from "@/ui/builder-token";
import { readJson } from "@/ui/storage";
import { finalScore, goalLine } from "./format";
import s from "./ExhibitionMatchModal.module.css";

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
  const [replay, setReplay] = useState({ minute: 90, running: false });
  const [challenger] = useState(() => {
    const token = readJson<unknown>("pokedraft.builder", null);
    return typeof token === "string" ? draftFromBuilderToken(token) : null;
  });

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
  const match = useMemo(() => {
    if (own === null || other === null) return null;
    const rating = rateTeam(own);
    const opposition = rateTeam(other);
    const formation = FORMATIONS[own.formation];
    const otherFormation = FORMATIONS[other.formation];
    const starters = own.starters.map((id, i): MatchStarter => ({
      species: speciesById(id),
      line: formation.slots[i]!.line,
      role: formation.slots[i]!.role,
    }));
    const otherStarters = other.starters.map((id, i): MatchStarter => ({
      species: speciesById(id),
      line: otherFormation.slots[i]!.line,
      role: otherFormation.slots[i]!.role,
    }));
    const keeper = starters.find((player) => player.line === "GK");
    if (keeper === undefined) return null;
    return simulateMatch({
      matchIndex: 0,
      round: "F",
      phase: "group",
      seed: JSON.stringify([opponent.seed, own, other, rematch]) as Seed,
      rating: rating.score,
      userLines: matchLines(rating),
      starters,
      keeper: keeper.species,
      opponent: {
        id: "shared-squad",
        name: "Shared squad",
        score: opposition.score,
        lines: matchLines(opposition),
        roster: other.starters.map((id) => ({ kind: "species", id }) as OpponentPlayerRef),
      },
      opponentStarters: otherStarters,
      absences: [],
    });
  }, [own, other, opponent.seed, rematch]);

  useEffect(() => {
    if (!replay.running || replay.minute >= 90) return;
    const timer = setTimeout(() => {
      setReplay((current) => {
        const minute = Math.min(90, current.minute + 3);
        return { minute, running: minute < 90 };
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [replay]);

  const atFullTime = replay.minute >= 90;
  const goals = match?.goals.filter((goal) => goal.minute <= replay.minute) ?? [];
  const score =
    match === null
      ? null
      : atFullTime
        ? finalScore(match)
        : {
            user: goals.filter((goal) => goal.side === "user").length,
            opp: goals.filter((goal) => goal.side === "opp").length,
          };

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
          setReplay((current) => ({ ...current, running: false }));
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
        <p className={s.note}>
          Your saved Builder squad against this shared squad. Both teams are rated by the current
          engine. A 90-minute friendly can end in a draw and never changes your history or
          leaderboard.
        </p>
        {match !== null && score !== null ? (
          <>
            <div
              className={s.scoreboard}
              aria-label={atFullTime ? "Exhibition final score" : "Exhibition replay score"}
            >
              <span>
                Your squad
                <br />
                <small>
                  {own!.formation} / {match.rating}
                </small>
              </span>
              <strong className={`num ${s.score}`} data-testid="exhibition-score">
                {score.user} - {score.opp}
              </strong>
              <span>
                Shared squad
                <br />
                <small>
                  {other!.formation} / {match.opponent.score}
                </small>
              </span>
            </div>
            <p role="status">
              {atFullTime ? (
                <>
                  Full time.{" "}
                  {match.outcome === "W"
                    ? "Your squad wins."
                    : match.outcome === "L"
                      ? "Shared squad wins."
                      : "Honours even."}
                </>
              ) : (
                `${replay.minute}' / 90' Replay of recorded goals.`
              )}
            </p>
            <div className={s.controls} role="group" aria-label="Exhibition highlights">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  setReplay((current) => ({
                    minute: current.minute >= 90 ? 0 : current.minute,
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
                <button
                  type="button"
                  className="btn"
                  onClick={() => setReplay({ minute: 90, running: false })}
                >
                  Show full time
                </button>
              ) : null}
            </div>
            <ul className={s.goals} aria-label="Exhibition goals">
              {goals.map((goal, i) => (
                <li key={i} data-side={goal.side}>
                  <span>{goal.side === "user" ? "Your squad" : "Shared squad"}</span>
                  <span>{goalLine(goal)}</span>
                </li>
              ))}
            </ul>
            {goals.length === 0 ? (
              <p>{atFullTime ? "No goals in this match." : "No goals yet in this replay."}</p>
            ) : null}
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setReplay({ minute: 90, running: false });
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
