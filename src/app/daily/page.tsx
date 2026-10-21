import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DailyScreen } from "@/components/daily/DailyScreen";
import { dailyDate } from "@/leaderboard/daily";

export const metadata: Metadata = { title: "Daily challenge · pokedraft" };

// Server-render the daily challenge panel so the loading line is not the first contentful paint.
async function DailyContent() {
  await connection();
  return <DailyScreen serverToday={dailyDate(new Date())} />;
}

export default function DailyPage() {
  return (
    <main className="page">
      <Suspense fallback={<p className="kicker page-loading">Loading the daily challenge</p>}>
        <DailyContent />
      </Suspense>
    </main>
  );
}
