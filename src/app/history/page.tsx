import type { Metadata } from "next";
import { HistoryList } from "@/components/history/HistoryList";
import { ModuleCard } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";
import s from "./page.module.css";

export const metadata: Metadata = { title: "pokedraft history" };

export default function HistoryPage() {
  return (
    <main className={`page ${s.page}`}>
      <ModuleCard
        className={s.header}
        variant="quiet"
        eyebrow="This device"
        title="Your last 50 runs"
        headingLevel={1}
        description="Completed runs saved in this browser."
        icon={<NavIcon family="history" />}
      />
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
