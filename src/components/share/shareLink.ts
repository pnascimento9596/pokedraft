import { record } from "@/ui/labels";

/** What happened to a link: the share sheet took it, the player closed the sheet, it reached the
 * clipboard, or nothing worked and the caller must show it for a manual copy. */
export type ShareOutcome = "shared" | "cancelled" | "copied" | "manual";

export interface LinkShare {
  readonly title: string;
  readonly text: string;
  readonly path: string;
}

export const SHARE_TITLE = "pokedraft";
export const GOAL_SHARE_TEXT = "Watch this goal.";
export const LINEUP_SHARE_TEXT = "My pokedraft XI.";

/** The status line each outcome leaves. */
export const SHARE_SAID: Readonly<Record<ShareOutcome, string>> = {
  shared: "Link shared",
  cancelled: "",
  copied: "Link copied",
  manual: "Could not copy the link",
};

// A friendly has no challenge link, so it carries no dare.
export function runShareText(run: {
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly score: number;
  readonly friendly: boolean;
}): string {
  const line = `${record(run.wins, run.draws, run.losses)}, Team Score ${run.score}`;
  return run.friendly ? `Friendly: ${line}.` : `${line}. Beat it?`;
}

export function absoluteUrl(path: string): string {
  return `${location.origin}${path}`;
}

// The share sheet is where a phone keeps its chat apps. A desktop sheet lists few of them, so a
// computer keeps the plain copy.
export function isCoarsePointer(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}

async function viaSheet(data: ShareData): Promise<"shared" | "cancelled" | null> {
  if (!isCoarsePointer() || typeof navigator.share !== "function") return null;
  if (navigator.canShare?.({ url: data.url }) === false) return null;
  try {
    await navigator.share(data);
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    return null;
  }
}

export async function shareLink({ title, text, path }: LinkShare): Promise<ShareOutcome> {
  const url = absoluteUrl(path);
  const sheet = await viaSheet({ title, text, url });
  if (sheet !== null) return sheet;
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "manual";
  }
}
