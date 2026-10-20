import type { StoryChance } from "@/engine/story";
import type { Score, Side } from "@/engine/types";
import type { Beat } from "./timeline";

type GoalBeat = Extract<Beat, { kind: "goal" }>;

export function lateDramaLine(minute: number, side: Side, after: Score): string | null {
  throw new Error(`lateDramaLine is not built yet (${minute}, ${side}, ${JSON.stringify(after)})`);
}

export function scorerLine(name: string, nth: number): string | null {
  throw new Error(`scorerLine is not built yet (${name}, ${nth})`);
}

export function runOfPlayLine(side: Side, xg: Readonly<Record<Side, number>>): string | null {
  throw new Error(`runOfPlayLine is not built yet (${side}, ${JSON.stringify(xg)})`);
}

export function goalNotes(
  goals: readonly GoalBeat[],
  chances: readonly StoryChance[] | null,
): readonly (readonly string[])[] {
  throw new Error(`goalNotes is not built yet (${goals.length}, ${chances?.length})`);
}
