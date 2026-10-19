import type { Metadata } from "next";
import { HistoryList } from "@/components/history/HistoryList";
import { LifetimePanel } from "@/components/history/LifetimePanel";
import { ModuleCard } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";
import { HISTORY_LIMIT } from "@/ui/runs";
import s from "./page.module.css";

export const metadata: Metadata = { title: "pokedraft history" };

export default function HistoryPage() {
  return (
    <main className={`page ${s.page}`}>
      <ModuleCard
        className={s.header}
        variant="quiet"
        eyebrow="This device"
        title={`Your last ${HISTORY_LIMIT} runs`}
        headingLevel={1}
        description="Completed runs saved in this browser."
        icon={<NavIcon family="history" />}
      />
      <ModuleCard
        eyebrow="Lifetime"
        title="Lifetime record"
        description={`Totals that keep counting past the last ${HISTORY_LIMIT} runs, and a backup file.`}
      >
        <LifetimePanel />
      </ModuleCard>
      <ModuleCard
        eyebrow="Saved runs"
        title="Run history"
        description="Open a run to replay its squad and cup."
      >
        <HistoryList />
      </ModuleCard>
    </main>
  );
}
