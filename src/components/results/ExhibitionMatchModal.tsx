"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { FORMATIONS, speciesById, type DraftState, type Seed } from "@/engine";
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

  const own = challenger === null ? null : fullLineup(challenger.lineup);
  const other = fullLineup(opponent.lineup);
  let match = null;
  if (own !== null && other !== null) {
    const rating = rateTeam(own);
    const opposition = rateTeam(other);
    const formation = FORMATIONS[own.formation];
    const starters = own.starters.map((id, i): MatchStarter => ({
      species: speciesById(id),
      line: formation.slots[i]!.line,
      role: formation.slots[i]!.role,
    }));
    match = simulateMatch({
      matchIndex: 0,
      round: "F",
      phase: "group",
      seed: JSON.stringify([opponent.seed, own, other, rematch]) as Seed,
      rating: rating.score,
      userLines: matchLines(rating),
      starters,
      keeper: starters.find((player) => player.line === "GK")!.species,
      opponent: {
        id: "shared-squad",
        name: "Shared squad",
        score: opposition.score,
        lines: matchLines(opposition),
      },
      absences: [],
    });
  }
  const score = match === null ? null : finalScore(match);

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
        if (active.current && !event.currentTarget.open) onClose();
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
            <div className={s.scoreboard} aria-label="Exhibition final score">
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
              Full time.{" "}
              {match.outcome === "W"
                ? "Your squad wins."
                : match.outcome === "L"
                  ? "Shared squad wins."
                  : "Honours even."}
            </p>
            <ul className={s.goals} aria-label="Exhibition goals">
              {match.goals.map((goal, i) => (
                <li key={i} data-side={goal.side}>
                  <span>{goal.side === "user" ? "Your squad" : "Shared squad"}</span>
                  <span>
                    {goal.side === "user"
                      ? goalLine(goal)
                      : `${goal.minute}' No. ${goal.scorer}${goal.penalty ? " (pen)" : ""}`}
                  </span>
                </li>
              ))}
            </ul>
            {match.goals.length === 0 ? <p>No goals in this match.</p> : null}
            <p className={s.note}>Opponent events use shirt numbers in this engine version.</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setRematch((n) => n + 1)}
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
