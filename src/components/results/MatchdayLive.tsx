"use client";

import { useEffect, useState } from "react";
import { speciesById, type CupResult, type DraftState } from "@/engine";
import { ROUND_LABEL, ROUND_SHORT } from "@/ui/labels";
import { playGoalHorn } from "@/components/wheel/sound";
import { absenceLine, goalLine, type PlayedMatch } from "./format";
import s from "./MatchdayLive.module.css";

export function MatchdayLive({
  cup,
  onClose,
}: {
  readonly cup: CupResult;
  readonly draft?: DraftState;
  readonly onClose: () => void;
}) {
  const played = cup.matches.filter((m): m is PlayedMatch => m.status === "played");
  const [roundIdx, setRoundIdx] = useState(0);
  const match = played[roundIdx] ?? played[0];
  const maxMinute = match?.extraTime ? 120 : 90;
  const [minute, setMinute] = useState(maxMinute);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || !match) return;
    const timer = setInterval(() => {
      setMinute((prev) => {
        const next = Math.min(maxMinute, prev + 3);
        const justScored = match.goals.some(
          (g) => g.side === "user" && g.minute > prev && g.minute <= next,
        );
        if (justScored) playGoalHorn();
        if (next >= maxMinute) setRunning(false);
        return next;
      });
    }, 80);
    return () => clearInterval(timer);
  }, [running, match, maxMinute]);

  if (!match) return null;

  const visibleGoals = match.goals.filter((g) => g.minute <= minute);
  const userGoals = visibleGoals.filter((g) => g.side === "user").length;
  const oppGoals = visibleGoals.filter((g) => g.side === "opp").length;

  const selectRound = (idx: number) => {
    const target = played[idx];
    setRunning(false);
    setRoundIdx(idx);
    setMinute(target?.extraTime ? 120 : 90);
  };

  const startLiveReplay = () => {
    setMinute(0);
    setRunning(true);
  };

  return (
    <section
      className={s.studio}
      data-testid="matchday-live"
      aria-label="Matchday Live Broadcast"
    >
      <header className={s.header}>
        <div className={s.titleGroup}>
          <span className="kicker">Silph Cup Broadcast</span>
          <h2 className={s.title}>
            {ROUND_LABEL[match.round]} vs {match.opponent.name}
          </h2>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
          Close Broadcast
        </button>
      </header>

      <div className={s.rounds} role="group" aria-label="Broadcast rounds">
        {played.map((m, i) => (
          <button
            key={m.round}
            type="button"
            className={s.roundBtn}
            aria-pressed={roundIdx === i}
            data-testid={`broadcast-round-${m.round}`}
            onClick={() => selectRound(i)}
          >
            {ROUND_SHORT[m.round]}
          </button>
        ))}
      </div>

      <div className={s.scoreboard}>
        <div className={s.teamSide}>
          <span className={s.teamName}>Your XI</span>
          <span className={`num ${s.teamRating}`}>Rating {match.rating}</span>
        </div>
        <div className={s.centerScore}>
          <span className={`num ${s.clockPill}`}>
            {minute >= maxMinute ? "FT" : `${minute}'`}
          </span>
          <span className={`num ${s.scoreDigits}`} data-testid="broadcast-score">
            {userGoals} - {oppGoals}
          </span>
        </div>
        <div className={s.teamSideRight}>
          <span className={s.teamName}>{match.opponent.name}</span>
          <span className={`num ${s.teamRating}`}>Rating {match.opponent.score}</span>
        </div>
      </div>

      <div className={s.progressTrack} aria-hidden="true">
        <div
          className={s.progressFill}
          style={{ width: `${Math.round((minute / maxMinute) * 100)}%` }}
        />
      </div>

      <div className={s.controls}>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          data-testid="broadcast-replay-btn"
          onClick={startLiveReplay}
        >
          {running ? "Simulating..." : "▶ Replay Minute-by-Minute"}
        </button>
        {minute < maxMinute ? (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setRunning(false);
              setMinute(maxMinute);
            }}
          >
            Skip to Full Time
          </button>
        ) : null}
        {roundIdx < played.length - 1 ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => selectRound(roundIdx + 1)}
          >
            Next Round ({ROUND_SHORT[played[roundIdx + 1]!.round]})
          </button>
        ) : null}
      </div>

      <div className={s.feed} aria-live="polite">
        {match.absences.map((a) => (
          <div key={a.slot} className={s.eventRow}>
            <span>Pre-match lineup update</span>
            <span>{absenceLine(a)}</span>
          </div>
        ))}
        {visibleGoals.length === 0 ? (
          <div className={s.eventRow}>
            <span>
              {minute < maxMinute ? "Match underway on the pitch..." : "No goals in open play."}
            </span>
          </div>
        ) : (
          visibleGoals.map((g, i) => (
            <div key={i} className={s.eventRow} data-side={g.side}>
              <span>{g.side === "user" ? "⚽ Goal for Your XI" : `⚽ ${match.opponent.name}`}</span>
              <span>{goalLine(g)}</span>
            </div>
          ))
        )}
      </div>

      {minute >= maxMinute && match.shootout !== null ? (
        <div className={s.shootoutBox} data-testid="broadcast-shootout">
          <span className="kicker">
            Penalty Shootout ({match.shootout.user}-{match.shootout.opp}, Keeper:{" "}
            {speciesById(match.shootout.keeper).name})
          </span>
          <div className={s.kickGrid}>
            {match.shootout.kicks.slice(0, 14).map((k, idx) => (
              <div key={idx} className={s.kickItem}>
                <span>
                  {k.side === "user" ? speciesById(k.taker).name : `Opp No. ${k.taker}`}
                </span>
                <span>{k.scored ? "⚽ Scored" : "🧤 Saved"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
