"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { dailySeed } from "@/engine/rng";
import { DRAFT_ROUNDS, GENS, type DraftSettings, type IsoDate } from "@/engine/types";
import { longDate } from "@/components/leaderboard/format";
import { unlockAudio } from "@/components/wheel/sound";
import { focusHeading } from "@/ui/focus";
import { GEN_REGION, MODE_LABEL, ORDER_LABEL, REGION_LABEL, STYLE_LABEL } from "@/ui/labels";
import { freshSeed, parsePlayQuery } from "@/ui/settings";
import { readSession, runSlotKey, writeSession } from "@/ui/storage";
import type { LiveRun } from "./LiveRun";
import { RoadStrip } from "./RoadStrip";
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
  const [live, setLive] = useState<{
    readonly seed: string;
    readonly LiveRun: typeof LiveRun;
    readonly restore: boolean;
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
    const seed = fixedSeed ?? freshSeed();
    setLoading(true);
    setLoadFailed(false);
    loadLiveRun().then(
      (mod) => {
        setLoading(false);
        setLive({ seed, LiveRun: mod.LiveRun, restore });
      },
      () => {
        setLoading(false);
        setLoadFailed(true);
      },
    );
  };

  // A reload, a discarded tab or Back then Forward mounts this screen again with nothing in React
  // state. When the tab holds a saved run for these settings, the draft loads straight into it.
  // The peek reads only the settings key, never the species data.
  useEffect(() => {
    const slot = {
      settings,
      seed: daily !== undefined ? dailySeed(daily) : querySeed,
      daily: daily ?? null,
    };
    if (readSession(runSlotKey(slot)) === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-enter the saved run after hydration
    start(true);
    // Only on mount: later starts come from the Start button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newRun = () => {
    setUseQuerySeed(false);
    setLive(null);
    // The run on screen is gone, so a later mount must not bring it back.
    writeSession(
      runSlotKey({
        settings,
        seed: daily !== undefined ? dailySeed(daily) : querySeed,
        daily: daily ?? null,
      }),
      null,
    );
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
        restore={live.restore}
        onNewRun={newRun}
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
      </div>
      <RoadStrip seed={fixedSeed} mode={settings.mode} />
    </section>
  );
}
