import type { Metadata } from "next";
import { Suspense } from "react";
import { DailyScreen } from "@/components/daily/DailyScreen";

export const metadata: Metadata = { title: "Daily challenge · pokedraft" };

export default function DailyPage() {
  return (
    <main className="page">
      <Suspense fallback={<p className="kicker">Loading the daily challenge</p>}>
        <DailyScreen />
      </Suspense>
    </main>
  );
}
