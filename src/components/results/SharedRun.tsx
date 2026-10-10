"use client";

import Link from "next/link";
import { useMemo } from "react";
import { replay } from "@/engine";
import { ResultsView } from "./ResultsView";
import s from "./ResultsView.module.css";

export function SharedRun({ token }: { token: string }) {
  const run = useMemo(() => {
    try {
      return replay(token);
    } catch {
      return null;
    }
  }, [token]);

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
