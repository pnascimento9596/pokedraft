"use client";

import Link from "next/link";
import { useState } from "react";
import {
  replay,
  type CupResult,
  type DraftSettings,
  type DraftState,
  type IsoDate,
} from "@/engine";
import { SubmitPanel } from "@/components/leaderboard/SubmitPanel";
import { ResultsView } from "@/components/results/ResultsView";
import { loadPanel, playHref } from "@/ui/settings";
import { DraftBoard } from "./DraftBoard";
import { runToken, startRun, step, type Run } from "./runState";
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
  onNewRun,
}: {
  readonly settings: DraftSettings;
  readonly seed: string;
  readonly daily?: IsoDate;
  readonly title: string;
  readonly onNewRun: () => void;
}) {
  const [screen, setScreen] = useState<Screen>(() => ({
    kind: "draft",
    run: startRun(settings, seed),
  }));
  const [failure, setFailure] = useState<string | null>(null);

  const seeResults = (run: Run) => {
    const token = runToken(run);
    try {
      const { draft, cup } = replay(token);
      setScreen({ kind: "results", token, draft, cup });
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
      run={screen.run}
      failure={failure}
      onRun={(run) => setScreen({ kind: "draft", run })}
      onAction={(action) => setScreen({ kind: "draft", run: step(screen.run, action) })}
      onNewRun={onNewRun}
      onSeeResults={() => seeResults(screen.run)}
    />
  );
}
