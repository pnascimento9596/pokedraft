import type { Metadata } from "next";
import { Suspense } from "react";
import { ExhibitionScreen } from "@/components/exhibition/ExhibitionScreen";
import { ModuleCard } from "@/components/ui/primitives";
import { NavIcon } from "@/components/ui/nav-icons";
import s from "./page.module.css";

export const metadata: Metadata = { title: "Exhibition · pokedraft" };

export default function ExhibitionPage() {
  return (
    <main className={`page ${s.page}`}>
      <ModuleCard
        className={s.header}
        variant="quiet"
        eyebrow="Friendly, not ranked"
        title="Exhibition match"
        headingLevel={1}
        description="Play your squad against another one. Exhibitions never change your history or the leaderboard."
        icon={<NavIcon family="play" />}
      />
      <Suspense fallback={<p className="kicker">Loading the exhibition</p>}>
        <ExhibitionScreen />
      </Suspense>
    </main>
  );
}
