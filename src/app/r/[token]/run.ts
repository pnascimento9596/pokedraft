import { cache } from "react";
import { replayAnyVersion, type ReplayedAnyRun } from "@/engine/versions";

// One replay per request: the page, its metadata and the OG image route all read through here.
// Any retained engine version replays, so links from older engines keep working.
export const loadRun = cache((token: string): ReplayedAnyRun | null => {
  try {
    return replayAnyVersion(token);
  } catch {
    return null;
  }
});
