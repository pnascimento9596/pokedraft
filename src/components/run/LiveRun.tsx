"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  replay,
  type CupResult,
  type DraftSettings,
  type DraftState,
  type IsoDate,
} from "@/engine";
import { SubmitPanel } from "@/components/leaderboard/SubmitPanel";
import { ResultsView } from "@/components/results/ResultsView";
import { focusHeading } from "@/ui/focus";
import { loadPanel, playHref } from "@/ui/settings";
import { DraftBoard } from "./DraftBoard";
import { runToken, startRun, step, type Run } from "./runState";
import { restoreRun, saveRun, type RunSlot } from "./savedRun";
import s from "./PlayScreen.module.css";

type Screen =
  | { readonly kind: "draft"; readonly run: Run }
  | {
      readonly kind: "results";
      readonly token: string;
      readonly draft: DraftState;
      readonly cup: CupResult;
    };

// The draft and the results. PlayScreen loads this module (and the species data under it) with
// import() at Start, so the start panel's first load carries none of it.
export function LiveRun({
  settings,
  seed,
  daily,
  title,
  restore,
  onNewRun,
}: {
  readonly settings: DraftSettings;
  readonly seed: string;
  readonly daily?: IsoDate;
  readonly title: string;
  /** When the tab holds a saved run, boot into it instead of a fresh draft. */
  readonly restore: boolean;
  readonly onNewRun: () => void;
}) {
  const slot: RunSlot = { settings, seed, daily: daily ?? null };
  const [screen, setScreen] = useState<Screen>(() => {
    if (restore) {
      const restored = restoreRun(slot);
      if (restored !== null) {
        if (restored.kind === "draft") return { kind: "draft", run: restored.run };
        return {
          kind: "results",
          token: restored.token,
          draft: restored.draft,
          cup: restored.cup,
        };
      }
    }
    return { kind: "draft", run: startRun(settings, seed) };
  });
  const [failure, setFailure] = useState<string | null>(null);

  // Start run, See results and New run each swap the screen; the new screen's heading takes focus.
  useEffect(() => {
    focusHeading();
  }, [screen.kind]);

  // Every screen change goes through here, so the tab always holds the run that is showing.
  const show = (next: Screen) => {
    if (next.kind === "draft") saveRun(slot, "draft", runToken(next.run));
    else saveRun(slot, "results", next.token);
    setScreen(next);
  };

  const seeResults = (run: Run) => {
    const token = runToken(run);
    try {
      const { draft, cup } = replay(token);
      show({ kind: "results", token, draft, cup });
      window.scrollTo({ top: 0 });
    } catch {
      setFailure("This run could not be scored. Start a new run.");
    }
  };

  if (screen.kind === "results") {
    return (
      <ResultsView
        token={screen.token}
        draft={screen.draft}
        cup={screen.cup}
        variant="live"
        onNewRun={daily === undefined ? onNewRun : undefined}
        submit={
          settings.mode === "builder" ? undefined : (
            <>
              <SubmitPanel token={screen.token} daily={daily !== undefined} />
              {daily !== undefined ? (
                <p className={s.dailyNext}>
                  One daily seed per day.{" "}
                  <Link href={playHref("cup8", loadPanel())}>Play a regular challenge</Link> for a
                  fresh one.
                </p>
              ) : null}
            </>
          )
        }
      />
    );
  }

  return (
    <DraftBoard
      title={title}
      navFamily={daily === undefined ? "play" : "daily"}
      run={screen.run}
      failure={failure}
      onRun={(run) => show({ kind: "draft", run })}
      onAction={(action) => show({ kind: "draft", run: step(screen.run, action) })}
      onNewRun={onNewRun}
      onSeeResults={() => seeResults(screen.run)}
    />
  );
}
