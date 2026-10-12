"use client";

import { useEffect, useRef, useState } from "react";
import {
  Builder,
  type BuilderEngine,
  type Desk,
  type Friendly,
  type LiveDesk,
} from "@/components/builder/Builder";
import { BUILDER_URL_SEED, filledCount } from "@/ui/lineup";
import { loadStats, type BucketStats, type StatBucket } from "@/ui/runs";
import { readJson, writeJson } from "@/ui/storage";
import {
  DEFAULT_PANEL,
  builderSettings,
  loadPanel,
  savePanel,
  type PanelSettings,
} from "@/ui/settings";
import { SidePanel } from "./SidePanel";
import { focusHeading } from "@/ui/focus";
import s from "./HomeScreen.module.css";

// The builder engine and the species data load on first use (a pointer over the builder, a tap, a
// focus, a ?b= link, or a saved squad), not with the initial page bundle.
const loadEngine = () => import("@/components/builder/live");
const BUILDER_CHECKPOINT_KEY = "pokedraft.builder";

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

function freshDraft(engine: BuilderEngine, panel: PanelSettings) {
  return engine.createDraft(builderSettings(panel), BUILDER_URL_SEED);
}

function poolChanged(a: PanelSettings, b: PanelSettings): boolean {
  return (
    a.formation !== b.formation ||
    a.legendaries !== b.legendaries ||
    a.gens.length !== b.gens.length ||
    a.gens.some((g, i) => b.gens[i] !== g)
  );
}

export function HomeScreen() {
  const [panel, setPanel] = useState<PanelSettings>(DEFAULT_PANEL);
  const [live, setLive] = useState<LiveDesk | null>(null);
  const [stats, setStats] = useState<Readonly<Record<StatBucket, BucketStats>> | null>(null);
  const [friendly, setFriendly] = useState<Friendly | null>(null);
  const showingResults = friendly !== null;
  const shownBefore = useRef(showingResults);

  // Play a friendly cup and New run swap the whole screen; the new one's heading takes focus.
  useEffect(() => {
    if (shownBefore.current === showingResults) return;
    shownBefore.current = showingResults;
    focusHeading();
  }, [showingResults]);
  const panelRef = useRef(panel);
  const loading = useRef<Promise<LiveDesk> | null>(null);
  const dirty = useRef(false);
  const ownCheckpoint = useRef<string | null>(null);

  const updatePanel = (next: PanelSettings) => {
    panelRef.current = next;
    setPanel(next);
  };

  // A shared or saved lineup sets the formation and pool it was built with.
  const startLive = (b: string | null): Promise<LiveDesk> => {
    loading.current ??= loadEngine().then(
      (engine) => {
        const saved = panelRef.current;
        const shared = b === null ? null : engine.draftFromBuilderToken(b);
        if (shared !== null && b === readJson<unknown>(BUILDER_CHECKPOINT_KEY, null)) {
          ownCheckpoint.current = b;
        }
        const next =
          shared !== null && shared.settings.mode === "builder"
            ? {
                ...saved,
                formation: shared.settings.formation,
                gens: shared.settings.gens,
                legendaries: shared.settings.legendaries,
              }
            : saved;
        if (next !== saved) updatePanel(next);
        const desk = { engine, draft: shared ?? freshDraft(engine, next) };
        setLive(desk);
        return desk;
      },
      (e: unknown) => {
        loading.current = null;
        throw e;
      },
    );
    return loading.current;
  };

  const ensureLive = () => (live !== null ? Promise.resolve(live) : startLive(null));

  useEffect(() => {
    const b = new URLSearchParams(window.location.search).get("b");
    /* eslint-disable react-hooks/set-state-in-effect -- sync from localStorage and the URL after hydration */
    updatePanel(loadPanel());
    setStats(loadStats());
    /* eslint-enable react-hooks/set-state-in-effect */
    const checkpoint = readJson<unknown>(BUILDER_CHECKPOINT_KEY, null);
    const token = b ?? (typeof checkpoint === "string" ? checkpoint : null);
    if (token !== null) startLive(token).catch(() => {});
    // Runs once after hydration; startLive only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => whenIdleAfterLoad(() => void loadEngine().catch(() => {})), []);

  useEffect(() => {
    if (live === null) return;
    const { engine, draft } = live;
    const token =
      filledCount(draft.lineup) === 0
        ? null
        : engine.builderToken(draft.settings, draft.lineup, BUILDER_URL_SEED);
    const url =
      token === null ? window.location.pathname : `${window.location.pathname}?b=${token}`;
    window.history.replaceState(window.history.state, "", url);
    // Viewing a shared squad must not adopt it or erase another squad saved by this browser.
    if (!dirty.current) return;
    dirty.current = false;
    if (
      token !== null ||
      (ownCheckpoint.current !== null &&
        ownCheckpoint.current === readJson<unknown>(BUILDER_CHECKPOINT_KEY, null))
    ) {
      writeJson(BUILDER_CHECKPOINT_KEY, token);
    }
    ownCheckpoint.current = token;
  }, [live]);

  const changePanel = (next: PanelSettings) => {
    updatePanel(next);
    savePanel(next);
    if (live !== null && poolChanged(panel, next)) {
      dirty.current = true;
      setLive({
        ...live,
        draft: live.engine.rebuildDraft(builderSettings(next), live.draft.lineup, BUILDER_URL_SEED),
      });
    }
  };

  if (friendly !== null && live !== null) {
    return (
      <live.engine.ResultsView
        token={friendly.token}
        draft={friendly.draft}
        cup={friendly.cup}
        variant="live"
        onNewRun={() => {
          setFriendly(null);
          setStats(loadStats());
        }}
      />
    );
  }

  const desk: Desk =
    live === null ? { kind: "idle", formation: panel.formation } : { kind: "live", ...live };

  return (
    <div className={s.home}>
      <SidePanel panel={panel} onChange={changePanel} stats={stats} />
      <Builder
        desk={desk}
        ensureLive={ensureLive}
        onChange={(draft) => {
          dirty.current = true;
          setLive((cur) => (cur === null ? cur : { ...cur, draft }));
        }}
        showRatings={panel.showRatings}
        onReset={() => {
          updatePanel(DEFAULT_PANEL);
          savePanel(DEFAULT_PANEL);
          if (live !== null) {
            dirty.current = true;
            setLive({ ...live, draft: freshDraft(live.engine, DEFAULT_PANEL) });
          }
        }}
        onFriendly={setFriendly}
      />
    </div>
  );
}
