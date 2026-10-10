"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { record } from "@/ui/labels";
import { fetchBoard, type BoardResult, type BoardView } from "./client";
import { variantLabel } from "./format";
import s from "./Board.module.css";

const ERROR_COPY: Readonly<Record<Extract<BoardResult, { kind: "error" }>["reason"], string>> = {
  offline: "The leaderboard is offline right now.",
  network: "Could not reach the leaderboard. Check your connection.",
  unexpected: "The leaderboard sent a reply we could not read.",
};

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

  if (result === null) {
    return (
      <p className={`kicker ${s.loading}`} role="status">
        Loading the board
      </p>
    );
  }

  if (result.kind === "error") {
    return (
      <div className={s.error} data-testid="board-error" role="alert">
        <p>{ERROR_COPY[result.reason]} The board could not be loaded.</p>
        <button type="button" className="btn" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    );
  }

  if (result.entries.length === 0) {
    return (
      <div className={s.empty} data-testid="board-empty">
        <p>No entries yet. Finish a run and submit it to claim the top spot.</p>
        <Link href={view.scope === "daily" ? "/daily" : "/"} className="btn btn--primary">
          {view.scope === "daily" ? "Play the daily" : "Play a run"}
        </Link>
      </div>
    );
  }

  return (
    <ol className={s.list} data-testid="board" aria-label="Leaderboard">
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
            </span>
            <span className={s.recordCol}>
              <span className={s.label}>W-D-L</span>
              <span className={s.record}>{record(e.wins, e.draws, e.losses)}</span>
            </span>
            <span className={s.scoreCol}>
              <span className={s.label}>Team Score</span>
              <span className={s.score}>{e.teamScore}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
