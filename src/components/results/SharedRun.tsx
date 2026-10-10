"use client";

import type { ReplayedRun } from "@/components/share/card";
import { ResultsView } from "./ResultsView";
import { BrokenRun } from "./BrokenRun";

export function SharedRun({ token, run }: { token: string; run: ReplayedRun | null }) {
  if (run === null) return <BrokenRun />;
  return <ResultsView token={token} draft={run.draft} cup={run.cup} variant="shared" />;
}
