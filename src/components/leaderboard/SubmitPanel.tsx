"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ModuleCard, Pill, StatusNote } from "@/components/ui/primitives";
import { NICKNAME_MAX, NICKNAME_MIN, type SubmitEntry } from "@/leaderboard/contract";
import { isCoached } from "@/ui/manager/coached";
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
    "That nickname already has a run on this daily board. One run per nickname per day.",
  DUPLICATE_TOKEN: "This exact run is already on the board.",
  RATE_LIMITED:
    "Too many submissions from this network. The limit is 10 an hour, so you may need to wait up to an hour.",
  DB_UNAVAILABLE: "The leaderboard is offline right now. Try again in a few minutes.",
  NETWORK: "Could not reach the leaderboard. Check your connection and try again.",
  UNEXPECTED: "The leaderboard sent a reply we could not read. Try again later.",
};

type Status =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "done"; readonly entry: SubmitEntry }
  | { readonly kind: "error"; readonly code: SubmitFailure; readonly nickname?: string };

function errorCopy(code: SubmitFailure, nickname: string | undefined): string {
  return code === "DUPLICATE_TOKEN" && nickname !== undefined
    ? `This exact run is already on the board, listed under ${nickname}.`
    : SUBMIT_ERROR_COPY[code];
}

function savedNickname(): string {
  const raw = readJson<unknown>(NICKNAME_KEY, "");
  return typeof raw === "string" ? raw : "";
}

export function SubmitPanel({ token, daily }: { readonly token: string; readonly daily: boolean }) {
  const [nickname, setNickname] = useState(savedNickname);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const successRef = useRef<HTMLParagraphElement>(null);
  const trimmed = nickname.trim();
  // The reply's rank is counted among runs like this one, so a leader of the uncoached runs reads
  // #1 rather than its place behind every coached run.
  const coach = isCoached(token) ? "coached" : "uncoached";

  // The form that held focus is gone. The success line takes it, and a screen reader reads it.
  useEffect(() => {
    if (status.kind === "done") successRef.current?.focus({ preventScroll: true });
  }, [status.kind]);
  const valid = trimmed.length >= NICKNAME_MIN && trimmed.length <= NICKNAME_MAX;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status.kind === "submitting") return;
    writeJson(NICKNAME_KEY, trimmed);
    setStatus({ kind: "submitting" });
    const result = await submitRun(trimmed, token, coach);
    setStatus(result.kind === "ok" ? { kind: "done", entry: result.entry } : result);
  };

  const target = daily ? "today's daily board" : "the all-time board";

  if (status.kind === "done") {
    const { entry } = status;
    const scope = entry.dailyDate === null ? "all" : "daily";
    return (
      <ModuleCard
        className={s.panel}
        data-testid="submit-panel"
        eyebrow="Leaderboard"
        title="Submission saved"
        description="Your run has been submitted."
      >
        <p ref={successRef} className={s.success} data-testid="submit-success" tabIndex={-1}>
          {entry.rank === null ? null : (
            <Pill tone="ok" className={s.rank}>
              #{entry.rank}
            </Pill>
          )}
          <span>
            {entry.nickname} is on {scope === "daily" ? "the daily board" : "the all-time board"},
            among {coach} runs.
          </span>
        </p>
        {entry.rank === null ? (
          <StatusNote title="Rank unavailable" data-testid="rank-unavailable">
            Your rank could not be loaded right now.
          </StatusNote>
        ) : null}
        <Link
          href={boardHref({ mode: entry.mode, scope, date: entry.dailyDate, coach })}
          className="btn btn--primary"
        >
          View leaderboard
        </Link>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard
      className={s.panel}
      data-testid="submit-panel"
      eyebrow="Leaderboard"
      title="Submit your run"
      description="Choose the nickname shown next to your record."
    >
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
          <p
            className={
              status.code === "DB_UNAVAILABLE" ||
              status.code === "NETWORK" ||
              status.code === "UNEXPECTED"
                ? s.unavailable
                : s.error
            }
            data-testid="submit-error"
            role="alert"
          >
            {errorCopy(status.code, status.nickname)}
          </p>
        ) : null}
      </form>
    </ModuleCard>
  );
}
