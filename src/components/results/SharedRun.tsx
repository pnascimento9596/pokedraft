"use client";

import type { ReplayedAnyRun } from "@/engine/versions";
import { engineLabel } from "@/engine/versions/label";
import { ResultsView } from "./ResultsView";
import { BrokenRun } from "./BrokenRun";

export function SharedRun({ token, run }: { token: string; run: ReplayedAnyRun | null }) {
  if (run === null) return <BrokenRun />;
  return (
    <>
      {!run.current && (
        <p className="kicker" data-testid="engine-label">
          Played on engine {engineLabel(run.engine)}
        </p>
      )}
      <ResultsView token={token} draft={run.draft} cup={run.cup} variant="shared" />
    </>
  );
}
