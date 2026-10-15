import { writeFileSync } from "node:fs";
import { replay } from "@/engine/replay";
import type { FullLineup, Seed } from "@/engine/types";
import { builderToken } from "@/ui/builder-token";

const lineup = {
  formation: "4-3-3",
  starters: [9, 59, 149, 130, 3, 80, 6, 55, 26, 85, 135],
  bench: [25, 94, 65, 68, 143],
} as unknown as FullLineup;
const settings = {
  mode: "builder",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  legendaries: true,
} as const;
for (let i = 0; i < 100; i++) {
  const token = builderToken(settings, lineup, `v4-browser-${i}` as Seed);
  const run = replay(token);
  const match = run.cup.matches.find((m) => m.status === "played" && m.shootout !== null);
  if (match?.status !== "played" || match.shootout === null) continue;
  writeFileSync(
    new URL("./engine-v4-fixtures.json", import.meta.url),
    `${JSON.stringify(
      {
        token,
        record: `${run.cup.wins}-${run.cup.draws}-${run.cup.losses}`,
        score: run.cup.rating.score,
        round: match.round,
        kicks: match.shootout.kicks.length,
        firstOpponentTaker: match.shootout.kicks.find((k) => k.side === "opp")!.taker,
        opponentRoster: match.opponent.roster,
      },
      null,
      2,
    )}\n`,
  );
  process.exit(0);
}
throw new Error("No shootout found in the bounded fixture search");
