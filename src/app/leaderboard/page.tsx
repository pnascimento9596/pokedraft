import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaderboardScreen } from "@/components/leaderboard/LeaderboardScreen";
import s from "./page.module.css";

export const metadata: Metadata = { title: "Leaderboard · pokedraft" };

export default function LeaderboardPage() {
  return (
    <main className={`page ${s.page}`}>
      <header className={s.header}>
        <span className="kicker">Ranked runs</span>
        <h1>Leaderboard</h1>
      </header>
      <Suspense fallback={<p className="kicker">Loading the board</p>}>
        <LeaderboardScreen />
      </Suspense>
    </main>
  );
}
