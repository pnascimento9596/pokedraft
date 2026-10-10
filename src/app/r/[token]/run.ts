import { cache } from "react";
import { replay } from "@/engine";
import type { ReplayedRun } from "@/components/share/card";

// One replay per request: the page, its metadata and the OG image route all read through here.
export const loadRun = cache((token: string): ReplayedRun | null => {
  try {
    return replay(token);
  } catch {
    return null;
  }
});
