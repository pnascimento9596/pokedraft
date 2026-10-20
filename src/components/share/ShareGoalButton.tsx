"use client";

import { ManualLink } from "./ManualLink";
import { GOAL_SHARE_TEXT, SHARE_TITLE } from "./shareLink";
import { useLinkShare } from "./useLinkShare";

/** "Share this goal": shares the goal's link, the same way Share shares the run's. */
export function ShareGoalButton({
  path,
  minute,
  className,
}: {
  readonly path: string;
  readonly minute: number;
  readonly className?: string;
}) {
  const link = useLinkShare();
  return (
    <span className={className}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        data-testid="share-goal"
        aria-label={`Share this goal: ${minute}'`}
        onClick={() => void link.share({ title: SHARE_TITLE, text: GOAL_SHARE_TEXT, path })}
      >
        Share this goal
      </button>
      <span role="status">{link.said}</span>
      <ManualLink url={link.manual} />
    </span>
  );
}
