"use client";

import { useEffect, useState } from "react";
import { createDraft, type DraftState } from "@/engine";
import { Builder, type Friendly } from "@/components/builder/Builder";
import { rebuildDraft } from "@/components/builder/model";
import { ResultsView } from "@/components/results/ResultsView";
import { BUILDER_URL_SEED, builderToken, draftFromBuilderToken, filledCount } from "@/ui/lineup";
import { loadStats, type BucketStats, type StatBucket } from "@/ui/runs";
import {
  DEFAULT_PANEL,
  builderSettings,
  loadPanel,
  savePanel,
  type PanelSettings,
} from "@/ui/settings";
import { SidePanel } from "./SidePanel";
import s from "./HomeScreen.module.css";

function freshDraft(panel: PanelSettings): DraftState {
  return createDraft(builderSettings(panel), BUILDER_URL_SEED);
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
  const [draft, setDraft] = useState<DraftState>(() => freshDraft(DEFAULT_PANEL));
  const [stats, setStats] = useState<Readonly<Record<StatBucket, BucketStats>> | null>(null);
  const [friendly, setFriendly] = useState<Friendly | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadPanel();
    const b = new URLSearchParams(window.location.search).get("b");
    const shared = b === null ? null : draftFromBuilderToken(b);
    const next =
      shared !== null && shared.settings.mode === "builder"
        ? {
            ...saved,
            formation: shared.settings.formation,
            gens: shared.settings.gens,
            legendaries: shared.settings.legendaries,
          }
        : saved;
    /* eslint-disable react-hooks/set-state-in-effect -- sync from localStorage and the URL after hydration */
    setPanel(next);
    setDraft(shared ?? freshDraft(next));
    setStats(loadStats());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready) return;
    const url =
      filledCount(draft.lineup) === 0
        ? window.location.pathname
        : `${window.location.pathname}?b=${builderToken(draft.settings, draft.lineup, BUILDER_URL_SEED)}`;
    window.history.replaceState(window.history.state, "", url);
  }, [draft, ready]);

  const changePanel = (next: PanelSettings) => {
    setPanel(next);
    savePanel(next);
    if (poolChanged(panel, next)) {
      setDraft(rebuildDraft(builderSettings(next), draft.lineup, BUILDER_URL_SEED));
    }
  };

  if (friendly !== null) {
    return (
      <ResultsView
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

  return (
    <div className={s.home}>
      <SidePanel panel={panel} onChange={changePanel} stats={stats} />
      <Builder
        draft={draft}
        onChange={setDraft}
        showRatings={panel.showRatings}
        onReset={() => {
          setPanel(DEFAULT_PANEL);
          savePanel(DEFAULT_PANEL);
          setDraft(freshDraft(DEFAULT_PANEL));
        }}
        onFriendly={setFriendly}
      />
    </div>
  );
}
