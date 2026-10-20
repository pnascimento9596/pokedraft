import { useState } from "react";
import { Board } from "@/components/leaderboard/Board";
import type { BoardView } from "@/components/leaderboard/client";
import type { CoachFilter, EngineFilter } from "@/leaderboard/contract";

// The coach and engine views live in the URL on the real page. Here it lives in state, so a press
// reaches the Board the way a router.replace would.
export function StatefulBoard({
  view,
}: {
  readonly view: Omit<BoardView, "coach" | "engine"> & {
    readonly coach?: CoachFilter;
    readonly engine?: EngineFilter;
  };
}) {
  const [coach, setCoach] = useState<CoachFilter>(view.coach ?? "all");
  const [engine, setEngine] = useState<EngineFilter>(view.engine ?? "current");
  return (
    <Board view={{ ...view, coach, engine }} onCoachChange={setCoach} onEngineChange={setEngine} />
  );
}
