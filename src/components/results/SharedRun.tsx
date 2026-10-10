"use client";

import Link from "next/link";
import type { ReplayedRun } from "@/components/share/card";
import { ResultsView } from "./ResultsView";
import s from "./ResultsView.module.css";

export function SharedRun({ token, run }: { token: string; run: ReplayedRun | null }) {
  if (run === null) {
    return (
      <section className={s.broken} data-testid="run-error">
        <h1>Run not found</h1>
        <p>This run link is broken or from an older version.</p>
        <Link href="/" className="btn btn--primary">
          Play a new run
        </Link>
      </section>
    );
  }
  return <ResultsView token={token} draft={run.draft} cup={run.cup} variant="shared" />;
}
