"use client";

import { useEffect, useState } from "react";
import { speciesById, type CupResult, type DraftState } from "@/engine";
import { ROUND_LABEL, ROUND_SHORT } from "@/ui/labels";
import { playGoalHorn, unlockAudio } from "@/components/wheel/sound";
import { absenceLine, finalScore, goalLine, shootoutLine, type PlayedMatch } from "./format";
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
  const [kickCount, setKickCount] = useState<number | null>(null);

  useEffect(() => {
    if (!running || !match || minute >= maxMinute) return;
    const timer = setTimeout(() => {
      const next = Math.min(maxMinute, minute + 3);
      for (const goal of match.goals) {
        if (goal.side === "user" && goal.minute > minute && goal.minute <= next) playGoalHorn();
      }
      setMinute(next);
      if (next >= maxMinute) setRunning(false);
    }, 80);
    return () => clearTimeout(timer);
  }, [running, match, maxMinute, minute]);

  if (!match) return null;

  const visibleGoals = match.goals.filter((g) => g.minute <= minute);
  const recordedScore = finalScore(match);
  const hasGoalTimeline =
    match.goals.filter((g) => g.side === "user").length === recordedScore.user &&
    match.goals.filter((g) => g.side === "opp").length === recordedScore.opp;
  const atFullTime = minute >= maxMinute;
  const userGoals = atFullTime
    ? recordedScore.user
    : visibleGoals.filter((g) => g.side === "user").length;
  const oppGoals = atFullTime
    ? recordedScore.opp
    : visibleGoals.filter((g) => g.side === "opp").length;
  const shootout = match.shootout;
  const visibleKicks = shootout?.kicks.slice(0, kickCount ?? shootout.kicks.length) ?? [];
  const shootoutComplete = visibleKicks.length === shootout?.kicks.length;

  const selectRound = (idx: number) => {
    const target = played[idx];
    setRunning(false);
    setRoundIdx(idx);
    setMinute(target?.extraTime ? 120 : 90);
    setKickCount(null);
  };

  const toggleReplay = () => {
    if (running) {
      setRunning(false);
      return;
    }
    unlockAudio();
    if (atFullTime) {
      setMinute(0);
      setKickCount(null);
    }
    setRunning(true);
  };

  return (
    <section className={s.studio} data-testid="matchday-live" aria-label="Matchday Live Broadcast">
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
          <span className={`num ${s.clockPill}`}>{atFullTime ? "FT" : `${minute}'`}</span>
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
          onClick={toggleReplay}
          disabled={!hasGoalTimeline}
        >
          {running ? "Pause Replay" : atFullTime ? "Replay Minute-by-Minute" : "Resume Replay"}
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
        {!hasGoalTimeline ? (
          <div className={s.eventRow}>
            <span>Goal timeline unavailable for this recorded match.</span>
          </div>
        ) : visibleGoals.length === 0 ? (
          <div className={s.eventRow}>
            <span>
              {minute < maxMinute ? "Match underway on the pitch..." : "No goals before full time."}
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

      {atFullTime && shootout !== null ? (
        <div className={s.shootoutBox} data-testid="broadcast-shootout">
          <span className="kicker">
            Penalty Shootout (Keeper: {speciesById(shootout.keeper).name})
          </span>
          <p aria-live="polite">
            Your XI{" "}
            {shootoutComplete
              ? shootout.user
              : visibleKicks.filter((k) => k.side === "user" && k.scored).length}
            {" - "}
            {shootoutComplete
              ? shootout.opp
              : visibleKicks.filter((k) => k.side === "opp" && k.scored).length}{" "}
            {match.opponent.name}
          </p>
          {shootoutComplete ? (
            <p role="status">
              Your XI {match.outcome === "W" ? "won" : "lost"}. {shootoutLine(match)}
            </p>
          ) : null}
          <div className={s.controls}>
            <button type="button" className="btn btn--sm" onClick={() => setKickCount(0)}>
              Replay Shootout
            </button>
            {!shootoutComplete ? (
              <>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => setKickCount(visibleKicks.length + 1)}
                >
                  Next Kick
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setKickCount(null)}
                >
                  Show All Kicks
                </button>
              </>
            ) : null}
          </div>
          <ol className={s.kickGrid} aria-label="Shootout kicks" tabIndex={0}>
            {visibleKicks.map((k, idx) => (
              <li key={idx} className={s.kickItem}>
                <span>
                  {idx + 1}. {k.side === "user" ? speciesById(k.taker).name : `Opp No. ${k.taker}`}
                </span>
                <span>{k.scored ? "Scored" : "Not scored"}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
