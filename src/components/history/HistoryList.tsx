"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { FINISH_LABEL, record } from "@/ui/labels";
import { BUCKET_LABEL, loadHistory, type RunRecord } from "@/ui/runs";
import s from "./HistoryList.module.css";

function when(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// localStorage is only readable after mount; the server snapshot is the loading state. The
// cache is dropped on every mount so a run finished in this tab shows up after navigation.
let snapshot: readonly RunRecord[] | undefined;

function subscribe(onChange: () => void): () => void {
  const refresh = () => {
    snapshot = undefined;
    onChange();
  };
  refresh();
  window.addEventListener("storage", refresh);
  return () => window.removeEventListener("storage", refresh);
}

function getSnapshot(): readonly RunRecord[] {
  return (snapshot ??= loadHistory());
}

export function HistoryList() {
  const runs = useSyncExternalStore(subscribe, getSnapshot, () => null);

  if (runs === null) return <p className="kicker">Loading your runs</p>;
  if (runs.length === 0) {
    return (
      <div className={s.empty} data-testid="history-empty">
        <p>No runs yet. Finished runs on this device show up here.</p>
        <Link href="/" className="btn btn--primary">
          Start a run
        </Link>
      </div>
    );
  }
  return (
    <ol className={s.list} data-testid="history-list">
      {runs.map((r) => (
        <li key={r.token} className={s.row} data-friendly={r.friendly || undefined}>
          <Link href={`/r/${r.token}`} className={s.link}>
            <span className={s.record}>{record(r.wins, r.draws, r.losses)}</span>
            <span className={s.main}>
              <span className={s.bucket}>{BUCKET_LABEL[r.bucket] ?? r.bucket}</span>
              <span className={s.meta}>
                {when(r.at)}, {r.formation}, {FINISH_LABEL[r.finish] ?? r.finish}
                {r.flawless ? ", flawless" : ""}
              </span>
            </span>
            <span className={s.score}>
              <span className={s.scoreLabel}>Team Score</span>
              <span className={s.scoreValue}>{r.score}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
