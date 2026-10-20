"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CupResult, DraftState } from "@/engine";
import type { GroupRow, ManagerAction, Score } from "@/engine/types";
import { toFullLineup } from "@/engine/draft";
import { MatchPlayer } from "@/components/matchday/MatchPlayer";
import { unlockAudio, useAudioLocked } from "@/components/wheel/sound";
import { ROUND_LABEL } from "@/ui/labels";
import { broadcastTable } from "./broadcast-table";
import { SIDE_COPY, type PlayedMatch, type ResultsVariant } from "./format";
import s from "./MatchReplay.module.css";

const GROUP_ROUNDS: readonly string[] = ["G1", "G2", "G3"];

/**
 * One finished match played again in the Live match broadcast. A retained run that recorded only
 * goals gets the broadcast's goals-only staging. A group match shows the group table as it stands
 * at the minute on the clock.
 */
export function MatchReplay({
  cup,
  draft,
  matchIndex,
  goal,
  shareGoal,
  variant = "live",
  onClose,
}: {
  readonly cup: CupResult;
  readonly draft: DraftState;
  readonly matchIndex: number;
  /** The run's coach decisions, which the live engine needs to replay the match's chances. */
  readonly manager: readonly ManagerAction[];
  /** A goal link's minute: the replay opens a minute before it. */
  readonly goal?: number;
  readonly shareGoal?: (minute: number) => string;
  readonly variant?: ResultsVariant;
  readonly onClose: () => void;
}) {
  const match = cup.matches[matchIndex] as PlayedMatch;
  const lineup = useMemo(() => toFullLineup(draft), [draft]);
  const heading = useRef<HTMLHeadingElement>(null);
  // A goal link plays without a tap, which browsers do not let start audio.
  const locked = useAudioLocked();
  useEffect(() => {
    heading.current?.scrollIntoView({ block: "start" });
    heading.current?.focus();
  }, [matchIndex]);
  const standings =
    GROUP_ROUNDS.includes(match.round) && cup.groupFixtures !== undefined
      ? (minute: number, score: Score) => (
          <Standings
            rows={broadcastTable(cup, match.round, minute, score) ?? []}
            team={SIDE_COPY[variant].team}
          />
        )
      : undefined;

  return (
    <section className={s.replay} data-testid="match-replay" aria-labelledby="match-replay-title">
      <div className={s.head}>
        <h2
          className={s.title}
          id="match-replay-title"
          data-testid="match-replay-title"
          tabIndex={-1}
          ref={heading}
        >
          Watch live: {ROUND_LABEL[match.round]} against {match.opponent.name}
        </h2>
        {goal !== undefined && locked ? (
          <button
            type="button"
            className="btn btn--sm"
            data-testid="tap-for-sound"
            onClick={unlockAudio}
          >
            Tap for sound
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          data-testid="match-replay-close"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <MatchPlayer
        key={matchIndex}
        match={match}
        matchIndex={matchIndex}
        seed={cup.seed}
        lineup={lineup}
        view="live"
        autoStart
        aside={standings}
        startAt={goal === undefined ? undefined : goal - 1}
        shareGoal={shareGoal}
        variant={variant}
      />
    </section>
  );
}

function Standings({ rows, team }: { readonly rows: readonly GroupRow[]; readonly team: string }) {
  return (
    <details className={s.standings} data-testid="replay-standings">
      <summary>Group table</summary>
      <p>Provisional during play. Other group results are added at full time.</p>
      <table aria-label="Group table during this match">
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">P</th>
            <th scope="col">GD</th>
            <th scope="col">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team} data-user={row.team === "user" || undefined}>
              <th scope="row">{row.team === "user" ? team : row.name}</th>
              <td>{row.played}</td>
              <td>{row.goalsFor - row.goalsAgainst}</td>
              <td>{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
