import type { StoryChance } from "@/engine/story";
import type { Score, Side } from "@/engine/types";
import type { Beat } from "./timeline";

type GoalBeat = Extract<Beat, { kind: "goal" }>;

const LATE_MINUTE = 85;
const RUN_OF_PLAY_GAP = 0.8;

function outcome(score: Score): number {
  return Math.sign(score.user - score.opp);
}

/** "Late drama at 87'": a goal at 85' or later that turns a defeat into a draw or a draw into a win. */
export function lateDramaLine(minute: number, side: Side, after: Score): string | null {
  const before = { ...after, [side]: after[side] - 1 };
  return minute >= LATE_MINUTE && outcome(before) !== outcome(after)
    ? `Late drama at ${minute}'`
    : null;
}

/** A scorer's second and third goals of the match. */
export function scorerLine(name: string, nth: number): string | null {
  if (nth === 2) return `${name}'s second`;
  if (nth === 3) return `${name}'s hat-trick`;
  return null;
}

/** A goal by the side that trails on chances (summed xG) by 0.8 or more at that minute. */
export function runOfPlayLine(side: Side, xg: Readonly<Record<Side, number>>): string | null {
  const other: Side = side === "user" ? "opp" : "user";
  return xg[other] - xg[side] >= RUN_OF_PLAY_GAP ? "Against the run of play" : null;
}

/**
 * Each goal's commentary, in goal order. Every line reads only the goals before it and the
 * chances up to its minute, so a line never knows what comes later. Without the match's chances
 * (a retained run, an exhibition) there is no run-of-play line.
 */
export function goalNotes(
  goals: readonly GoalBeat[],
  chances: readonly StoryChance[] | null,
): readonly (readonly string[])[] {
  const tally = new Map<string, number>();
  return goals.map((g) => {
    const who = `${g.side}:${g.scorer.species ?? g.scorer.name}`;
    const nth = (tally.get(who) ?? 0) + 1;
    tally.set(who, nth);
    const xg = { user: 0, opp: 0 };
    for (const c of chances ?? []) if (c.minute <= g.minute) xg[c.side] += c.p;
    const lines = [
      lateDramaLine(g.minute, g.side, g.score),
      scorerLine(g.scorer.name, nth),
      chances === null ? null : runOfPlayLine(g.side, xg),
    ];
    return lines.filter((l): l is string => l !== null);
  });
}
