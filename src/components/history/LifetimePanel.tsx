"use client";

import { useRef, useState } from "react";
import { ACHIEVEMENTS_SINCE, ACHIEVEMENT_LABEL, lifetimeAchievements } from "@/ui/achievements";
import { backupFileName, buildBackup, parseBackup, restoreBackup } from "@/ui/backup";
import { FINISH_LABEL, record } from "@/ui/labels";
import { overall } from "@/ui/lifetime";
import { BUCKET_LABEL, STAT_BUCKETS } from "@/ui/runs";
import { savedRunsChanged, useSavedRuns } from "./store";
import s from "./HistoryList.module.css";

type Notice = { readonly kind: "done" | "error"; readonly text: string } | null;

function earnedOn(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "Earned";
  return `Earned ${d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
}

function download(): void {
  const exportedAt = new Date().toISOString();
  const blob = new Blob([JSON.stringify(buildBackup(exportedAt), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName(exportedAt);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function LifetimePanel() {
  const saved = useSavedRuns();
  const input = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);

  if (saved === null) return <p className="kicker">Loading your totals</p>;
  const { lifetime } = saved;
  const total = overall(lifetime);
  const tiles = lifetimeAchievements(lifetime, saved.runs);
  const metrics = [
    { label: "Runs completed", value: total.runs },
    { label: "Cups won", value: total.cupsWon },
    { label: "Matches W-D-L", value: record(total.wins, total.draws, total.losses) },
    {
      label: "Goals for and against",
      value: total.goalRuns === 0 ? "Not yet" : `${total.goalsFor} / ${total.goalsAgainst}`,
    },
  ];

  async function restore(file: File): Promise<void> {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setNotice({ kind: "error", text: "This file could not be read. Nothing was restored." });
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setNotice({ kind: "error", text: parsed.message });
      return;
    }
    const { addedRuns } = restoreBackup(parsed.backup);
    savedRunsChanged();
    setNotice({
      kind: "done",
      text: `Backup restored. ${addedRuns} new run${addedRuns === 1 ? "" : "s"} added to your history.`,
    });
  }

  return (
    <div className={s.history} data-testid="lifetime-panel">
      <section aria-label="Lifetime totals" className={s.career}>
        <h3>Lifetime totals</h3>
        <p className={s.scope}>
          Every completed run counted in this browser, friendlies included. These totals are never
          trimmed.
        </p>
        {lifetime.backfilledRuns > 0 ? (
          <p className={s.scope} data-testid="lifetime-backfill">
            Includes your last {lifetime.backfilledRuns} saved run
            {lifetime.backfilledRuns === 1 ? "" : "s"} from before lifetime tracking.
          </p>
        ) : null}
        {total.goalRuns < total.runs ? (
          <p className={s.scope} data-testid="lifetime-goal-coverage">
            Goals cover {total.goalRuns} of {total.runs} runs. Older saved runs did not store goals.
          </p>
        ) : null}
        <dl className={s.metrics}>
          {metrics.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-label="Achievements" className={s.career}>
        <h3>Achievements</h3>
        <p className={s.scope}>Ranked runs only. Friendlies never count.</p>
        <p className={s.scope}>
          {ACHIEVEMENT_LABEL["hat-trick-hero"]}, {ACHIEVEMENT_LABEL.comeback} and{" "}
          {ACHIEVEMENT_LABEL["giant-killer"]} count runs played from {ACHIEVEMENTS_SINCE}.
        </p>
        <ul className={s.achievements}>
          {tiles.map((tile) => (
            <li key={tile.id} data-earned={tile.done} data-testid={`achievement-${tile.id}`}>
              <strong>{tile.label}</strong>
              <span>
                {tile.earned !== null ? earnedOn(tile.earned.at) : tile.done ? "Earned" : "Not yet"}
              </span>
              {tile.progress !== null ? (
                <span className={s.progress}>
                  {tile.progress.count} of {tile.progress.of}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Best finish by mode" className={s.career}>
        <h3>Best finish by mode</h3>
        <ul className={s.formationRates}>
          {STAT_BUCKETS.map((bucket) => {
            const best = lifetime.buckets[bucket].bestFinish;
            return (
              <li key={bucket}>
                <strong>{BUCKET_LABEL[bucket]}</strong>{" "}
                <span>{best === null ? "No runs yet" : FINISH_LABEL[best]}</span>
                <span>
                  {lifetime.buckets[bucket].runs} run
                  {lifetime.buckets[bucket].runs === 1 ? "" : "s"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-label="Backup" className={s.career}>
        <h3>Backup</h3>
        <p className={s.scope}>
          Save your history and lifetime totals as a file, or restore them in another browser.
          Restoring merges with what is already here.
        </p>
        <div className={s.filters}>
          <button type="button" className="btn" onClick={download}>
            Download backup
          </button>
          <button type="button" className="btn" onClick={() => input.current?.click()}>
            Restore from backup
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Backup file"
            data-testid="backup-file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file !== undefined) void restore(file);
            }}
          />
        </div>
        <p className={s.scope} role="status" data-testid="backup-notice" data-kind={notice?.kind}>
          {notice?.text}
        </p>
      </section>
    </div>
  );
}
