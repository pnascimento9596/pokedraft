"use client";

import Link from "next/link";
import { useState } from "react";
import { NICKNAME_MAX, NICKNAME_MIN, type BoardEntry } from "@/leaderboard/contract";
import { readJson, writeJson } from "@/ui/storage";
import { boardHref, submitRun, type SubmitFailure } from "./client";
import s from "./SubmitPanel.module.css";

export const NICKNAME_KEY = "pokedraft:nickname";

export const SUBMIT_ERROR_COPY: Readonly<Record<SubmitFailure, string>> = {
  INVALID_BODY: "The leaderboard could not read this submission. Reload the page and try again.",
  NICKNAME_INVALID: "That nickname is not allowed. Try a different one.",
  TOKEN_MALFORMED: "This run link is damaged, so it cannot be ranked.",
  INVALID_SETTINGS: "These run settings cannot be ranked.",
  ILLEGAL_ACTION: "This run breaks a draft rule, so it cannot be ranked.",
  BUILDER_NOT_RANKED: "Friendly runs are not ranked.",
  DAILY_SETTINGS_MISMATCH:
    "This run does not use the daily settings, so it cannot go on the daily board.",
  ENGINE_VERSION_MISMATCH:
    "The game was updated after this run started. Reload the page and play a new run to submit.",
  DAILY_ALREADY_SUBMITTED:
    "That nickname already has a run on today's daily board. Use another nickname or come back tomorrow.",
  DUPLICATE_TOKEN: "This run is already on the leaderboard.",
  RATE_LIMITED: "Too many submissions from here. Wait a minute and try again.",
  DB_UNAVAILABLE: "The leaderboard is offline right now. Try again in a few minutes.",
  NETWORK: "Could not reach the leaderboard. Check your connection and try again.",
  UNEXPECTED: "The leaderboard sent a reply we could not read. Try again later.",
};

type Status =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "done"; readonly entry: BoardEntry }
  | { readonly kind: "error"; readonly code: SubmitFailure };

function savedNickname(): string {
  const raw = readJson<unknown>(NICKNAME_KEY, "");
  return typeof raw === "string" ? raw : "";
}

export function SubmitPanel({ token, daily }: { readonly token: string; readonly daily: boolean }) {
  const [nickname, setNickname] = useState(savedNickname);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const trimmed = nickname.trim();
  const valid = trimmed.length >= NICKNAME_MIN && trimmed.length <= NICKNAME_MAX;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status.kind === "submitting") return;
    writeJson(NICKNAME_KEY, trimmed);
    setStatus({ kind: "submitting" });
    const result = await submitRun(trimmed, token);
    setStatus(result.kind === "ok" ? { kind: "done", entry: result.entry } : result);
  };

  const target = daily ? "today's daily board" : "the all-time board";

  if (status.kind === "done") {
    const { entry } = status;
    const scope = entry.dailyDate === null ? "all" : "daily";
    return (
      <section className={s.panel} data-testid="submit-panel" aria-label="Leaderboard">
        <p className={s.success} data-testid="submit-success" role="status">
          <span className={s.rank}>#{entry.rank}</span>
          <span>
            {entry.nickname} is on {scope === "daily" ? "the daily board" : "the all-time board"}.
          </span>
        </p>
        <Link
          href={boardHref({ mode: entry.mode, scope, date: entry.dailyDate })}
          className="btn btn--primary"
        >
          View leaderboard
        </Link>
      </section>
    );
  }

  return (
    <section className={s.panel} data-testid="submit-panel" aria-label="Leaderboard">
      <form className={s.form} onSubmit={submit}>
        <label className={s.label} htmlFor="submit-nickname">
          <span className="kicker">Submit to {target}</span>
        </label>
        <div className={s.row}>
          <input
            id="submit-nickname"
            className={s.input}
            data-testid="submit-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={NICKNAME_MAX + 10}
            autoComplete="nickname"
            placeholder="Nickname"
            aria-describedby="submit-hint"
          />
          <button
            type="submit"
            className="btn btn--primary"
            data-testid="submit-button"
            disabled={!valid || status.kind === "submitting"}
          >
            {status.kind === "submitting" ? "Submitting" : "Submit"}
          </button>
        </div>
        <p id="submit-hint" className={s.hint}>
          {NICKNAME_MIN} to {NICKNAME_MAX} characters. Shown publicly next to your record.
        </p>
        {status.kind === "error" ? (
          <p className={s.error} data-testid="submit-error" role="alert">
            {SUBMIT_ERROR_COPY[status.code]}
          </p>
        ) : null}
      </form>
    </section>
  );
}
