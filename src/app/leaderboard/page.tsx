import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { LeaderboardScreen } from "@/components/leaderboard/LeaderboardScreen";
import { dailyDate } from "@/leaderboard/daily";
import s from "./page.module.css";

export const metadata: Metadata = { title: "Leaderboard · pokedraft" };

// Same reason as /play: the date line is the largest text, so the server renders it into the first
// response. The client still re-reads the date after hydration, so a page left open past midnight
// moves on.
async function LeaderboardContent() {
  await connection();
  return <LeaderboardScreen serverToday={dailyDate(new Date())} />;
}

export default function LeaderboardPage() {
  return (
    <main className={`page ${s.page}`}>
      <header className={s.header}>
        <span className="kicker">Ranked runs</span>
        <h1>Leaderboard</h1>
      </header>
      <Suspense fallback={<p className="kicker">Loading the board</p>}>
        <LeaderboardContent />
      </Suspense>
    </main>
  );
}
