"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DRAFT_ROUNDS,
  GENS,
  dailySeed,
  replay,
  type CupResult,
  type DraftSettings,
  type DraftState,
  type IsoDate,
} from "@/engine";
import { longDate } from "@/components/leaderboard/format";
import { SubmitPanel } from "@/components/leaderboard/SubmitPanel";
import { ResultsView } from "@/components/results/ResultsView";
import { unlockAudio } from "@/components/wheel/sound";
import { GEN_REGION, MODE_LABEL, ORDER_LABEL, REGION_LABEL, STYLE_LABEL } from "@/ui/labels";
import { freshSeed, loadPanel, parsePlayQuery, playHref } from "@/ui/settings";
import { DraftBoard } from "./DraftBoard";
import { RoadStrip } from "./RoadStrip";
import { forgetRun, restoreRun, saveRun, type RunSlot } from "./savedRun";
import { runToken, startRun, step, type Run } from "./runState";
import s from "./PlayScreen.module.css";

type Screen =
  | { readonly kind: "start" }
  | { readonly kind: "draft"; readonly run: Run }
  | {
      readonly kind: "results";
      readonly token: string;
      readonly draft: DraftState;
      readonly cup: CupResult;
    };

export function PlayScreen() {
  const params = useSearchParams();
  const parsed = useMemo(() => parsePlayQuery(new URLSearchParams(params.toString())), [params]);
  if (parsed === null) {
    return (
      <section className={s.invalid}>
        <h1>That challenge link does not work</h1>
        <p>Some of its settings are missing or unknown. Pick a challenge from the home page.</p>
        <Link href="/" className="btn btn--primary">
          Back home
        </Link>
      </section>
    );
  }
  return (
    <Challenge
      key={JSON.stringify(parsed.settings)}
      settings={parsed.settings}
      querySeed={parsed.seed}
    />
  );
}

function gensSummary(settings: DraftSettings): string | null {
  if (settings.mode !== "cup8") return null;
  if (settings.gens.length === GENS.length) return "All regions";
  return settings.gens.map((g) => REGION_LABEL[GEN_REGION[g]]).join(", ");
}

export function SettingsSummary({ settings }: { readonly settings: DraftSettings }) {
  const gens = gensSummary(settings);
  const items: [string, string][] = [["Formation", settings.formation]];
  if (gens !== null) items.push(["Regions", gens]);
  if (settings.mode === "cup8") items.push(["Style", STYLE_LABEL[settings.style]]);
  if (settings.mode !== "builder") items.push(["Order", ORDER_LABEL[settings.order]]);
  return (
    <dl className={s.summary}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="kicker">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// `daily` pins the run to that date's shared seed and drops the fresh-seed New run.
export function Challenge({
  settings,
  querySeed,
  daily,
}: {
  readonly settings: DraftSettings;
  readonly querySeed: string | null;
  readonly daily?: IsoDate;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [screen, setScreen] = useState<Screen>({ kind: "start" });
  const [useQuerySeed, setUseQuerySeed] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  // The seed this run will use, when it is known before Start: today's Daily seed or a shared
  // link's. A fresh run draws its seed at Start (random, so never during render), and until then
  // the road strip shows no rating.
  const fixedSeed = daily !== undefined ? dailySeed(daily) : useQuerySeed ? querySeed : null;
  const slot: RunSlot = { settings, seed: fixedSeed, daily: daily ?? null };

  // A reload, a discarded tab or Back then Forward mounts this screen again with nothing in React
  // state. The tab's stored run brings the draft or the unsubmitted results back. The server renders
  // the start panel, so the restore waits for hydration.
  useEffect(() => {
    const restored = restoreRun(slot);
    if (restored === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from sessionStorage after hydration
    setScreen(restored);
    // Only on mount: later changes are this screen's own writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every screen change goes through here, so the tab always holds the run that is showing.
  const show = (next: Screen) => {
    if (next.kind === "draft") saveRun(slot, "draft", runToken(next.run));
    else if (next.kind === "results") saveRun(slot, "results", next.token);
    else forgetRun(slot);
    setScreen(next);
  };

  const start = () => {
    unlockAudio();
    show({ kind: "draft", run: startRun(settings, fixedSeed ?? freshSeed()) });
  };

  const newRun = () => {
    setUseQuerySeed(false);
    setFailure(null);
    show({ kind: "start" });
    if (params.has("seed")) {
      const q = new URLSearchParams(params.toString());
      q.delete("seed");
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    }
    window.scrollTo({ top: 0 });
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

  const title = settings.mode === "builder" ? MODE_LABEL.builder : MODE_LABEL[settings.mode];

  if (screen.kind === "results") {
    return (
      <ResultsView
        token={screen.token}
        draft={screen.draft}
        cup={screen.cup}
        variant="live"
        onNewRun={daily === undefined ? newRun : undefined}
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

  if (screen.kind === "draft") {
    return (
      <DraftBoard
        title={title}
        run={screen.run}
        failure={failure}
        onRun={(run) => show({ kind: "draft", run })}
        onAction={(action) => show({ kind: "draft", run: step(screen.run, action) })}
        onNewRun={newRun}
        onSeeResults={() => seeResults(screen.run)}
      />
    );
  }

  return (
    <section className={s.start}>
      <div className={s.hero}>
        <span className="kicker" data-testid={daily !== undefined ? "daily-kicker" : undefined}>
          {daily !== undefined ? `Daily challenge, ${longDate(daily)}` : "Challenge"}
        </span>
        <h1 className={s.title}>{daily !== undefined ? `Daily ${title}` : title}</h1>
        <p className={s.lede}>
          {daily !== undefined
            ? "Everyone plays the same seed today, and your run can go on the daily board. "
            : null}
          {DRAFT_ROUNDS} rounds. Each round the wheel rolls, you sign one player and place them.
          Then your squad plays the cup.
        </p>
        <SettingsSummary settings={settings} />
        <button type="button" className="btn btn--primary" data-testid="run-start" onClick={start}>
          Start run
        </button>
      </div>
      <RoadStrip seed={fixedSeed} mode={settings.mode} />
    </section>
  );
}
