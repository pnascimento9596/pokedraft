import { useState } from "react";
import { Board } from "@/components/leaderboard/Board";
import type { BoardView } from "@/components/leaderboard/client";
import type { CoachFilter } from "@/leaderboard/contract";

// The coach view lives in the URL on the real page. Here it lives in state, so a chip press
// reaches the Board the way a router.replace would.
export function StatefulBoard({
  view,
}: {
  readonly view: Omit<BoardView, "coach"> & { readonly coach?: CoachFilter };
}) {
  const [coach, setCoach] = useState<CoachFilter>(view.coach ?? "all");
  return <Board view={{ ...view, coach }} onCoachChange={setCoach} />;
}
