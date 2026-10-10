import type { Metadata } from "next";
import { HistoryList } from "@/components/history/HistoryList";
import s from "./page.module.css";

export const metadata: Metadata = { title: "pokedraft history" };

export default function HistoryPage() {
  return (
    <main className={`page ${s.page}`}>
      <header className={s.header}>
        <span className="kicker">This device</span>
        <h1>Your last 50 runs</h1>
      </header>
      <HistoryList />
    </main>
  );
}
