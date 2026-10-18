"use client";

import { useEffect, useState } from "react";
import type { CupResult, ManagerAction } from "@/engine/types";
import type { CupContext } from "@/ui/manager/touchline";
import { callsCopy, callsIn, yourCallsRuns, type CallsReport } from "@/ui/manager/your-calls";
import s from "./YourCalls.module.css";

// Finished reports by cup and match, so a remount at full time does not replay the cup again.
const done = new WeakMap<CupResult, Map<number, CallsReport>>();

/**
 * The full-time comparison with the assistant. Mounted only once the match is over. Each replay
 * runs in its own task so the full-time screen stays responsive while they finish.
 */
export function YourCalls({
  ctx,
  cup,
  actions,
  matchIndex,
}: {
  readonly ctx: CupContext;
  readonly cup: CupResult;
  readonly actions: readonly ManagerAction[];
  readonly matchIndex: number;
}) {
  const [report, setReport] = useState<CallsReport | null>(
    () => done.get(cup)?.get(matchIndex) ?? null,
  );
  const coached = callsIn(actions, matchIndex).length > 0;

  useEffect(() => {
    if (!coached || done.get(cup)?.has(matchIndex)) return;
    const runs = yourCallsRuns(ctx, cup, actions, matchIndex);
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const next = runs.next();
      if (next.done) return;
      setReport(next.value);
      if (next.value.decisive !== null) {
        const byMatch = done.get(cup) ?? new Map<number, CallsReport>();
        done.set(cup, byMatch.set(matchIndex, next.value));
        return;
      }
      timer = setTimeout(step, 0);
    };
    timer = setTimeout(step, 0);
    return () => clearTimeout(timer);
  }, [ctx, cup, actions, matchIndex, coached]);

  if (!coached) return null;
  const copy = report === null ? null : callsCopy(report);
  return (
    <section className={s.calls} data-testid="your-calls" aria-live="polite">
      <h2 className={s.heading}>Your calls</h2>
      {copy === null ? (
        <p className={s.pending}>Replaying the match without your calls.</p>
      ) : (
        <>
          <p className={s.score} data-testid="your-calls-score">
            {copy.score}
          </p>
          {copy.same !== null ? <p className={s.line}>{copy.same}</p> : null}
          {copy.call !== null ? (
            <p className={s.line} data-testid="your-calls-call">
              {copy.call}
            </p>
          ) : (
            <p className={s.pending}>Checking each call.</p>
          )}
          {copy.later !== null ? (
            <p className={s.line} data-testid="your-calls-later">
              {copy.later}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
