"use client";

import { useState } from "react";
import { copyLink } from "./copyLink";

/** "Share this goal": copies the goal's link, the same way Share copies the run's. */
export function ShareGoalButton({
  path,
  minute,
  className,
}: {
  readonly path: string;
  readonly minute: number;
  readonly className?: string;
}) {
  const [said, setSaid] = useState("");
  return (
    <span className={className}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        data-testid="share-goal"
        aria-label={`Share this goal: ${minute}'`}
        onClick={async () => setSaid(await copyLink(path))}
      >
        Share this goal
      </button>
      <span role="status">{said}</span>
    </span>
  );
}
