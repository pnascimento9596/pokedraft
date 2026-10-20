import type { StoryWindow } from "@/engine/story";
import type { CupResult, ManagerAction, Mode, Side } from "@/engine/types";

/** Summed chance xG per side. */
export type SideXg = Readonly<Record<Side, number>>;

export interface StorySource {
  readonly mode: Mode;
  readonly manager: readonly ManagerAction[];
}

export function storySource(
  cup: Pick<CupResult, "engine" | "mode">,
  manager: readonly ManagerAction[],
): StorySource | null {
  throw new Error(`storySource is not built yet (${cup.engine}, ${manager.length})`);
}

export function completedWindows(windows: readonly StoryWindow[], clock: number): number {
  throw new Error(`completedWindows is not built yet (${windows.length}, ${clock})`);
}

export function riverTotals(windows: readonly StoryWindow[], upTo: number): SideXg {
  throw new Error(`riverTotals is not built yet (${windows.length}, ${upTo})`);
}

export function riverLabel(totals: SideXg, shared: boolean): string {
  throw new Error(`riverLabel is not built yet (${JSON.stringify(totals)}, ${shared})`);
}
