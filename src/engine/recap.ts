import { speciesById } from "./species";
import type { GoalEvent, Opponent, Score, Shootout } from "./types";

export interface RecapInput {
  readonly matchIndex: number;
  readonly opponent: Opponent;
  readonly regulation: Score;
  readonly extraTime: Score | null;
  readonly shootout: Shootout | null;
  readonly outcome: "W" | "D" | "L";
  readonly goals: readonly GoalEvent[];
}

type UserGoal = Extract<GoalEvent, { side: "user" }>;
type Template = (scorer: string, minute: string, assist: string) => string;

const OPENING: Readonly<
  Record<"W" | "D" | "L", readonly ((score: string, club: string) => string)[]>
> = {
  W: [(score, club) => `Beat ${club} ${score}.`, (score, club) => `A ${score} win over ${club}.`],
  D: [
    (score, club) => `Drew ${score} with ${club}.`,
    (score, club) => `A ${score} draw against ${club}.`,
  ],
  L: [
    (score, club) => `Lost ${score} to ${club}.`,
    (score, club) => `A ${score} defeat to ${club}.`,
  ],
};

const ASSISTED: readonly Template[] = [
  (s, m, a) => `${s} scores in the ${m} minute, set up by ${a}.`,
  (s, m, a) => `${a} sets up ${s} in the ${m} minute.`,
  (s, m, a) => `${s} finishes in the ${m} minute after a pass from ${a}.`,
];

const SOLO: readonly Template[] = [
  (s, m) => `${s} scores in the ${m} minute.`,
  (s, m) => `${s} finds the net in the ${m} minute.`,
];

const PENALTY: readonly Template[] = [
  (s, m) => `${s} converts a penalty in the ${m} minute.`,
  (s, m) => `${s} scores from the spot in the ${m} minute.`,
];

function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

function goalLine(goal: UserGoal, variant: number): string {
  const scorer = speciesById(goal.scorer).name;
  const minute = ordinal(goal.minute);
  if (goal.penalty) return PENALTY[variant % PENALTY.length]!(scorer, minute, "");
  if (goal.assist === null) return SOLO[variant % SOLO.length]!(scorer, minute, "");
  return ASSISTED[variant % ASSISTED.length]!(scorer, minute, speciesById(goal.assist).name);
}

export function recapLines(input: RecapInput): string[] {
  const user = input.regulation.user + (input.extraTime?.user ?? 0);
  const opp = input.regulation.opp + (input.extraTime?.opp ?? 0);
  const score = `${Math.max(user, opp)}-${Math.min(user, opp)}`;
  const templates = OPENING[input.shootout === null ? input.outcome : "D"];
  let opening = templates[input.matchIndex % templates.length]!(score, input.opponent.name);
  if (input.extraTime !== null) opening = `${opening.slice(0, -1)} after extra time.`;
  const lines = [opening];

  const userGoals = input.goals.filter((g): g is UserGoal => g.side === "user");
  userGoals.forEach((goal, goalIndex) => lines.push(goalLine(goal, input.matchIndex + goalIndex)));

  if (input.shootout !== null) {
    const { user: u, opp: o } = input.shootout;
    lines.push(
      input.outcome === "W" ? `Won the shootout ${u}-${o}.` : `Lost the shootout ${o}-${u}.`,
    );
  }
  return lines;
}
