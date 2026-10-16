"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { challengeHref } from "@/ui/challenge-href";
import { PlayerImage } from "@/components/PlayerImage";
import { StatusNote } from "@/components/ui/primitives";
import { announce } from "@/components/Announcer";
import { record } from "@/ui/labels";
import { fetchBoard, type BoardResult, type BoardView } from "./client";
import { variantLabel } from "./format";
import s from "./Board.module.css";

const ERROR_COPY: Readonly<Record<Extract<BoardResult, { kind: "error" }>["reason"], string>> = {
  offline: "The leaderboard is offline right now.",
  network: "Could not reach the leaderboard. Check your connection.",
  unexpected: "The leaderboard sent a reply we could not read.",
};

function Figure({ value }: { readonly value: string | number }) {
  const text = String(value);
  return (
    <bdi className={s.figure} role="group" aria-label={text}>
      {[...text].map((character, index) => (
        <span key={index} className={character === "-" ? s.separator : s.digit} aria-hidden="true">
          {character}
        </span>
      ))}
    </bdi>
  );
}

export function Board({ view }: { readonly view: BoardView }) {
  const [attempt, setAttempt] = useState(0);
  const key = `${view.mode}|${view.scope}|${view.scope === "daily" ? view.date : ""}|${attempt}`;
  const [loaded, setLoaded] = useState<{ key: string; result: BoardResult } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchBoard(view, ctrl.signal).then((result) => {
      if (!ctrl.signal.aborted) setLoaded({ key, result });
    });
    return () => ctrl.abort();
    // `key` covers every field of `view` that changes the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const result = loaded?.key === key ? loaded.result : null;
  // Try again unmounts itself, so the next board, empty state or error takes focus. The attempt
  // number keeps the error's own effect, if it runs after the click, from taking that focus.
  const focusAttempt = useRef<number | null>(null);
  const focusTarget = useRef<HTMLElement | null>(null);
  const target = (el: HTMLElement | null) => {
    focusTarget.current = el;
  };

  useEffect(() => {
    if (result === null) return;
    // An error is a role="alert" and speaks for itself.
    if (result.kind === "ok") {
      const n = result.entries.length;
      announce(n === 0 ? "No entries yet." : n === 1 ? "1 entry." : `${n} entries.`);
    }
    if (focusAttempt.current === attempt) {
      focusAttempt.current = null;
      focusTarget.current?.focus({ preventScroll: true });
    }
  }, [result, attempt]);

  if (result === null) {
    return <p className={`kicker ${s.loading}`}>Loading the board</p>;
  }

  if (result.kind === "error") {
    return (
      <StatusNote
        className={s.error}
        title="Board unavailable"
        data-testid="board-error"
        role="alert"
      >
        <span>{ERROR_COPY[result.reason]} The board could not be loaded.</span>
        <button
          ref={target}
          type="button"
          className="btn"
          onClick={() => {
            focusAttempt.current = attempt + 1;
            setAttempt(attempt + 1);
          }}
        >
          Try again
        </button>
      </StatusNote>
    );
  }

  if (result.entries.length === 0) {
    return (
      <StatusNote className={s.empty} title="No entries yet." data-testid="board-empty">
        <span>Finish a run and submit it to claim the top spot.</span>
        <Link
          ref={target}
          href={view.scope === "daily" ? "/daily" : "/"}
          className="btn btn--primary"
        >
          {view.scope === "daily" ? "Play the daily" : "Play a run"}
        </Link>
      </StatusNote>
    );
  }

  return (
    <ol ref={target} className={s.list} data-testid="board" aria-label="Leaderboard" tabIndex={-1}>
      {result.entries.map((e) => (
        <li
          key={e.token}
          className={s.row}
          data-testid="board-row"
          data-top={e.rank <= 3 || undefined}
        >
          <Link href={`/r/${e.token}`} className={s.link}>
            <span className={s.rank}>{e.rank}</span>
            <span className={s.main}>
              <span className={s.nick}>{e.nickname}</span>
              <span className={s.meta}>{variantLabel(e.variant)}</span>
              <span className={s.squad}>
                {e.squadSpeciesIds ? (
                  e.squadSpeciesIds.map((id) => (
                    <PlayerImage key={id} dexId={id} size={24} alt={`Squad species ${id}`} />
                  ))
                ) : (
                  <span className={s.meta}>Squad preview unavailable.</span>
                )}
              </span>
            </span>
            <span className={s.recordCol}>
              <span className={s.label}>W-D-L</span>
              <span className={s.record}>
                <Figure value={record(e.wins, e.draws, e.losses)} />
              </span>
            </span>
            <span className={s.scoreCol}>
              <span className={s.label}>Team Score</span>
              <span className={s.score}>
                <Figure value={e.teamScore} />
              </span>
            </span>
          </Link>
          {challengeHref(e.token) !== null ? (
            <Link className={`btn btn--ghost ${s.challenge}`} href={challengeHref(e.token)!}>
              Challenge this Seed
            </Link>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
