import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PlayScreen } from "@/components/run/PlayScreen";
import s from "./page.module.css";

export const metadata: Metadata = {
  title: "Challenge run · pokedraft",
};

// The start panel depends on the URL (mode, seed), so the page is not prerendered whole. Waiting for
// the request here makes the server render the panel into the first response, instead of sending a
// "Loading" line and drawing the panel after the JavaScript hydrates (the mobile LCP contributor).
async function PlayContent() {
  await connection();
  return <PlayScreen />;
}

export default function PlayPage() {
  return (
    <main className={`page ${s.page}`}>
      <Suspense fallback={<p className="kicker page-loading">Loading the challenge</p>}>
        <PlayContent />
      </Suspense>
    </main>
  );
}
