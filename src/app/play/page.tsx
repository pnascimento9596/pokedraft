import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayScreen } from "@/components/run/PlayScreen";

export const metadata: Metadata = {
  title: "Challenge run · pokedraft",
};

export default function PlayPage() {
  return (
    <main className="page">
      <Suspense fallback={<p className="kicker">Loading the challenge</p>}>
        <PlayScreen />
      </Suspense>
    </main>
  );
}
