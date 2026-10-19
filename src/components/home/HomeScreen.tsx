"use client";

import { useEffect, useRef, useState } from "react";
import {
  Builder,
  type BuilderEngine,
  type Desk,
  type Friendly,
  type LiveDesk,
} from "@/components/builder/Builder";
import { MatchdaySettings } from "@/components/matchday/MatchdaySettings";
import type { LiveRun, friendlyStart } from "@/components/run/LiveRun";
import { MODE_LABEL } from "@/ui/labels";
import { BUILDER_URL_SEED, filledCount } from "@/ui/lineup";
import { loadStats, type BucketStats, type StatBucket } from "@/ui/runs";
import {
  RUN_CLEARED,
  readJson,
  readRunCheckpoint,
  readSession,
  runSlotKey,
  writeJson,
  type RunSlot,
} from "@/ui/storage";
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
// focus, a ?b= link, or a saved squad), not with the initial page bundle. The cup screens (the
// matchday and the results) load the same way.
const loadEngine = () => import("@/components/builder/live");
const loadLiveRun = () => import("@/components/run/LiveRun");
const BUILDER_CHECKPOINT_KEY = "pokedraft.builder";
// Every friendly saves its matchday under the one builder slot, whatever its settings.
const FRIENDLY_SLOT: RunSlot = {
  settings: builderSettings(DEFAULT_PANEL),
  seed: null,
  daily: null,
};

interface FriendlyScreen {
  readonly LiveRun: typeof LiveRun;
  readonly initial: ReturnType<typeof friendlyStart>;
}

// Reads the slot without the engine, so a home visit only loads the cup code for a live matchday.
function savedFriendlyMatchday(): boolean {
  const session = readSession(runSlotKey(FRIENDLY_SLOT));
  if (session === RUN_CLEARED) return false;
  const raw = session ?? readRunCheckpoint(FRIENDLY_SLOT);
  try {
    return raw !== null && (JSON.parse(raw) as { screen?: unknown }).screen === "matchday";
  } catch {
    return false;
  }
}

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
  const [friendly, setFriendly] = useState<FriendlyScreen | null>(null);
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
  const loadedEngine = useRef<BuilderEngine | null>(null);
  const ownCheckpoint = useRef<string | null>(null);

  const updatePanel = (next: PanelSettings) => {
    panelRef.current = next;
    setPanel(next);
  };

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
        loadedEngine.current = engine;
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

  const changeDraft = ({ engine, draft }: LiveDesk) => {
    const token =
      filledCount(draft.lineup) === 0
        ? null
        : engine.builderToken(draft.settings, draft.lineup, BUILDER_URL_SEED);
    if (
      token !== null ||
      (ownCheckpoint.current !== null &&
        ownCheckpoint.current === readJson<unknown>(BUILDER_CHECKPOINT_KEY, null))
    ) {
      writeJson(BUILDER_CHECKPOINT_KEY, token);
    }
    ownCheckpoint.current = token;
    setLive({ engine, draft });
  };

  useEffect(() => {
    const b = new URLSearchParams(window.location.search).get("b");
    /* eslint-disable react-hooks/set-state-in-effect -- sync from localStorage and the URL after hydration */
    updatePanel(loadPanel());
    setStats(loadStats());
    /* eslint-enable react-hooks/set-state-in-effect */
    const checkpoint = readJson<unknown>(BUILDER_CHECKPOINT_KEY, null);
    const token = b ?? (typeof checkpoint === "string" ? checkpoint : null);
    if (token !== null) startLive(token).catch(() => {});
    if (savedFriendlyMatchday()) {
      loadLiveRun().then(
        (mod) => {
          const initial = mod.restoreFriendly(FRIENDLY_SLOT);
          if (initial !== null) setFriendly({ LiveRun: mod.LiveRun, initial });
        },
        () => {},
      );
    }
    // Runs once after hydration; startLive only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () =>
      whenIdleAfterLoad(() => {
        loadEngine().catch(() => {});
        loadLiveRun().catch(() => {});
      }),
    [],
  );

  const playFriendly = async ({ token, draft, cup }: Friendly) => {
    const mod = await loadLiveRun();
    setFriendly({ LiveRun: mod.LiveRun, initial: mod.friendlyStart(token, draft, cup) });
  };

  useEffect(() => {
    if (live === null) return;
    const { engine, draft } = live;
    const token =
      filledCount(draft.lineup) === 0
        ? null
        : engine.builderToken(draft.settings, draft.lineup, BUILDER_URL_SEED);
    const { pathname, hash } = window.location;
    const url = token === null ? `${pathname}${hash}` : `${pathname}?b=${token}${hash}`;
    window.history.replaceState(window.history.state, "", url);
  }, [live]);

  const changePanel = (next: PanelSettings) => {
    updatePanel(next);
    savePanel(next);
    if (live !== null && poolChanged(panel, next)) {
      changeDraft({
        ...live,
        draft: live.engine.rebuildDraft(builderSettings(next), live.draft.lineup, BUILDER_URL_SEED),
      });
    }
  };

  if (friendly !== null) {
    const { draft } = friendly.initial;
    return (
      <friendly.LiveRun
        settings={draft.settings}
        seed={draft.seed}
        title={MODE_LABEL.builder}
        initial={friendly.initial}
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
          if (loadedEngine.current !== null) changeDraft({ engine: loadedEngine.current, draft });
        }}
        showRatings={panel.showRatings}
        onReset={() => {
          updatePanel(DEFAULT_PANEL);
          savePanel(DEFAULT_PANEL);
          if (live !== null) {
            changeDraft({ ...live, draft: freshDraft(live.engine, DEFAULT_PANEL) });
          }
        }}
        onFriendly={playFriendly}
        matchday={
          <MatchdaySettings
            value={{ managerMode: panel.managerMode, matchView: panel.matchView }}
            onChange={(next) => changePanel({ ...panel, ...next })}
          />
        }
      />
    </div>
  );
}
