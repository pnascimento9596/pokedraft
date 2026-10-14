"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { StatusNote } from "@/components/ui/primitives";
import { FINISH_LABEL, record } from "@/ui/labels";
import { BUCKET_LABEL, HISTORY_LIMIT, loadHistory, type RunRecord } from "@/ui/runs";
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
  const [filter, setFilter] = useState<"all" | "champions">("all");

  if (runs === null) return <p className="kicker">Loading your runs</p>;
  if (runs.length === 0) {
    return (
      <StatusNote className={s.empty} title="No runs yet." data-testid="history-empty">
        <span>Finished runs on this device show up here.</span>
        <Link href="/" className="btn btn--primary">
          Start a run
        </Link>
      </StatusNote>
    );
  }
  const ranked = runs.filter((r) => !r.friendly && r.bucket !== "builder");
  const bestScore = ranked.reduce<number | null>(
    (best, r) => (best === null ? r.score : Math.max(best, r.score)),
    null,
  );
  const metrics = [
    { label: "Total ranked runs", value: ranked.length },
    { label: "Ranked cups won", value: ranked.filter((r) => r.finish === "champion").length },
    { label: "Ranked flawless finishes", value: ranked.filter((r) => r.flawless).length },
    { label: "Best ranked Team Score", value: bestScore ?? "Not yet" },
  ];
  const visible = filter === "champions" ? runs.filter((r) => r.finish === "champion") : runs;
  return (
    <div className={s.history}>
      <section aria-label="Career summary" className={s.career}>
        <h3>Career summary</h3>
        <p className={s.scope}>
          Based only on stored history in this browser on this device, up to {HISTORY_LIMIT} runs.
          Not a lifetime total. Friendlies are excluded from the summary.
        </p>
        <dl className={s.metrics}>
          {metrics.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className={s.filters} role="group" aria-label="Filter run history">
        <button
          type="button"
          className="chip"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All runs
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={filter === "champions"}
          onClick={() => setFilter("champions")}
        >
          Champions only
        </button>
      </div>
      {visible.length === 0 ? (
        <StatusNote title="No champions in stored history yet.">
          Choose All runs to see your other finishes.
        </StatusNote>
      ) : (
        <ol className={s.list} data-testid="history-list">
          {visible.map((r) => (
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
      )}
    </div>
  );
}
