"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CupResult, DraftState } from "@/engine";
import { toFullLineup } from "@/engine/draft";
import { MatchPlayer } from "@/components/matchday/MatchPlayer";
import { ROUND_LABEL } from "@/ui/labels";
import type { PlayedMatch } from "./format";
import s from "./MatchReplay.module.css";

/**
 * One finished match played again in the Live match broadcast. A retained run that recorded only
 * goals gets the broadcast's goals-only staging.
 */
export function MatchReplay({
  cup,
  draft,
  matchIndex,
  onClose,
}: {
  readonly cup: CupResult;
  readonly draft: DraftState;
  readonly matchIndex: number;
  readonly onClose: () => void;
}) {
  const match = cup.matches[matchIndex] as PlayedMatch;
  const lineup = useMemo(() => toFullLineup(draft), [draft]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.scrollIntoView({ block: "start" });
    heading.current?.focus();
  }, [matchIndex]);

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
      />
    </section>
  );
}
