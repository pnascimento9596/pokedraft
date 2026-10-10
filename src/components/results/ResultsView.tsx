"use client";

import type { CupResult, DraftState } from "@/engine";

export interface ResultsViewProps {
  /** The run token: `encodeToken` output that `replay` accepts. */
  readonly token: string;
  /** Both from `replay(token)`. The view never recomputes them. */
  readonly draft: DraftState;
  readonly cup: CupResult;
  /** `live` right after a run (records it locally, offers New run); `shared` on /r/[token]. */
  readonly variant: "live" | "shared";
  readonly onNewRun?: () => void;
}

// Contract stub. The results workstream replaces the body; the props stay fixed.
export function ResultsView({ cup }: ResultsViewProps) {
  return (
    <section data-testid="results">
      <p data-testid="results-record">
        {cup.wins}-{cup.draws}-{cup.losses}
      </p>
    </section>
  );
}
