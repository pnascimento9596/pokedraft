"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { dailySeed } from "@/engine/rng";
import { DRAFT_ROUNDS, type DraftSettings, type IsoDate } from "@/engine/types";
import { longDate } from "@/components/leaderboard/format";
import { unlockAudio } from "@/components/wheel/sound";
import { focusHeading } from "@/ui/focus";
import { MODE_LABEL } from "@/ui/labels";
import { freshSeed, parsePlayQuery } from "@/ui/settings";
import { settingsSummary } from "@/ui/settingsSummary";
import { readRunCheckpoint, readSession, RUN_CLEARED, runSlotKey } from "@/ui/storage";
import type { LiveRun } from "./LiveRun";
import type { Restored } from "./savedRun";
import { RoadStrip } from "./RoadStrip";
import { SettingsSummary } from "@/components/SettingsSummary";
import { ModuleCard, StatusNote } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";
import s from "./PlayScreen.module.css";

// The draft, the results and the species data they need load on demand. Pointing at or focusing
// Start fetches them early, so the draft is usually ready by the time the tap lands.
const loadLiveRun = () => import("./LiveRun");

function whenIdleAfterLoad(task: () => void): () => void {
  let id = 0;
  const idle = () => {
    id = window.requestIdleCallback ? window.requestIdleCallback(task) : window.setTimeout(task, 1);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
  return () => {
    window.removeEventListener("load", idle);
    if (window.cancelIdleCallback) window.cancelIdleCallback(id);
  };
}

export function PlayScreen() {
  const params = useSearchParams();
  const parsed = useMemo(() => parsePlayQuery(new URLSearchParams(params.toString())), [params]);
  if (parsed === null) {
    return (
      <ModuleCard
        className={s.invalid}
        eyebrow="Challenge unavailable"
        title="That challenge link does not work"
        headingLevel={1}
        description="Pick a challenge from the home page."
        icon={<NavIcon family="play" />}
      >
        <StatusNote title="Missing settings">
          Some of its settings are missing or unknown.
        </StatusNote>
        <Link href="/" className="btn btn--primary">
          Back home
        </Link>
      </ModuleCard>
    );
  }
  return (
    <Challenge key={JSON.stringify(parsed)} settings={parsed.settings} querySeed={parsed.seed} />
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
  const [live, setLive] = useState<{
    readonly seed: string;
    readonly LiveRun: typeof LiveRun;
    readonly initial: Restored | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [useQuerySeed, setUseQuerySeed] = useState(true);
  const wasLive = useRef(live !== null);

  // New run swaps the whole screen back to Start; its heading takes focus.
  useEffect(() => {
    if (wasLive.current === (live !== null)) return;
    wasLive.current = live !== null;
    if (live === null) focusHeading();
  }, [live]);

  // The seed this run will use, when it is known before Start: today's Daily seed or a shared
  // link's. A fresh run draws its seed at Start (random, so never during render), and until then
  // the road strip shows no rating.
  const fixedSeed = daily !== undefined ? dailySeed(daily) : useQuerySeed ? querySeed : null;

  useEffect(() => whenIdleAfterLoad(() => void loadLiveRun().catch(() => {})), []);

  const preload = () => {
    loadLiveRun().catch(() => {});
  };

  const start = (restore = false) => {
    if (loading) return;
    unlockAudio();
    const seed = fixedSeed ?? (restore ? null : freshSeed());
    setLoading(true);
    setLoadFailed(false);
    loadLiveRun().then(
      (mod) => {
        setLoading(false);
        const initial = restore
          ? mod.restoreRun({ settings, seed: fixedSeed, daily: daily ?? null })
          : null;
        if (restore && initial === null) return;
        const actualSeed =
          initial === null
            ? seed
            : initial.kind === "draft"
              ? initial.run.seed
              : initial.draft.seed;
        if (actualSeed === null) return;
        setLive({ seed: actualSeed, LiveRun: mod.LiveRun, initial });
      },
      () => {
        setLoading(false);
        setLoadFailed(true);
      },
    );
  };

  // A reload, a discarded tab or Back then Forward mounts this screen again with nothing in React
  // state. The tab snapshot takes priority; a browser checkpoint also survives closing the site.
  // The peek reads only the slot key, never the species data.
  useEffect(() => {
    const slot = {
      settings,
      seed: daily !== undefined ? dailySeed(daily) : querySeed,
      daily: daily ?? null,
    };
    const session = readSession(runSlotKey(slot));
    if (session === RUN_CLEARED) {
      focusHeading();
      return;
    }
    if (session === null && readRunCheckpoint(slot) === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-enter the saved run after hydration
    start(true);
    // Only on mount: later starts come from the Start button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newRun = () => {
    setUseQuerySeed(false);
    setLive(null);
    if (params.has("seed")) {
      const q = new URLSearchParams(params.toString());
      q.delete("seed");
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    }
    window.scrollTo({ top: 0 });
  };

  const title = settings.mode === "builder" ? MODE_LABEL.builder : MODE_LABEL[settings.mode];

  if (live !== null) {
    return (
      <live.LiveRun
        settings={settings}
        seed={live.seed}
        daily={daily}
        title={title}
        initial={live.initial}
        onNewRun={newRun}
      />
    );
  }

  return (
    <section className={s.start}>
      <ModuleCard
        className={s.hero}
        eyebrow={daily !== undefined ? `Daily challenge, ${longDate(daily)}` : "Challenge"}
        title={daily !== undefined ? `Daily ${title}` : title}
        description={`${daily !== undefined ? "Everyone plays the same seed today, and your run can go on the daily board. " : ""}${DRAFT_ROUNDS} rounds. Each round the wheel rolls, you sign one player and place them. Then your squad plays the cup.`}
        headingLevel={1}
        icon={<NavIcon family={daily !== undefined ? "daily" : "play"} />}
        data-testid={daily !== undefined ? "daily-kicker" : undefined}
      >
        <SettingsSummary items={settingsSummary(settings)} />
        <button
          type="button"
          className="btn btn--primary"
          data-testid="run-start"
          aria-busy={loading || undefined}
          onClick={() => start()}
          onPointerEnter={preload}
          onPointerDown={preload}
          onFocus={preload}
        >
          {loading ? "Loading the draft" : "Start run"}
        </button>
        {loadFailed ? (
          <p className={s.loadFailed} role="alert">
            The game could not load. Check your connection and tap Start again.
          </p>
        ) : null}
      </ModuleCard>
      <RoadStrip seed={fixedSeed} mode={settings.mode} />
    </section>
  );
}
