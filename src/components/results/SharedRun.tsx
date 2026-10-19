"use client";

import type { ReplayedAnyRun } from "@/engine/versions";
import { engineLabel } from "@/engine/versions/label";
import { ResultsView } from "./ResultsView";
import { BrokenRun } from "./BrokenRun";
import { watchAt } from "@/ui/run-link";

type QueryValue = string | string[] | undefined;

export function SharedRun({
  token,
  run,
  watch,
  at,
}: {
  token: string;
  run: ReplayedAnyRun | null;
  /** A goal link's query: the played match and the goal's minute, still unparsed. */
  watch?: QueryValue;
  at?: QueryValue;
}) {
  if (run === null) return <BrokenRun />;
  return (
    <>
      {!run.current && (
        <p className="kicker" data-testid="engine-label">
          Played on engine {engineLabel(run.engine)}
        </p>
      )}
      <ResultsView
        token={token}
        draft={run.draft}
        cup={run.cup}
        variant="shared"
        watch={watchAt(watch, at, run.cup)}
      />
    </>
  );
}
