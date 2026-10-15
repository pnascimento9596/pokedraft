import type { CupResult, CupRound, GroupRow, Score } from "@/engine/types";

const ROUNDS = ["G1", "G2", "G3"] as const;

export function broadcastTable(
  cup: Pick<CupResult, "group" | "groupFixtures">,
  round: CupRound,
  minute: number,
  score: Score,
): readonly GroupRow[] | null {
  if (cup.groupFixtures === undefined) return null;
  const index = ROUNDS.indexOf(round as (typeof ROUNDS)[number]);
  if (index === -1 || (index === 2 && minute >= 90)) return cup.group;
  const rows = new Map(
    cup.group.map(({ team, name }) => [
      team,
      {
        team,
        name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
    ]),
  );
  for (const fixture of cup.groupFixtures) {
    const fixtureIndex = ROUNDS.indexOf(fixture.round);
    const active = fixtureIndex === index;
    if (fixtureIndex > index || (active && minute === 0)) continue;
    const userMatch = fixture.a === "user" || fixture.b === "user";
    if (active && !userMatch && minute < 90) continue;
    const aGoals =
      active && userMatch ? (fixture.a === "user" ? score.user : score.opp) : fixture.aGoals;
    const bGoals =
      active && userMatch ? (fixture.b === "user" ? score.user : score.opp) : fixture.bGoals;
    for (const [team, goalsFor, goalsAgainst] of [
      [fixture.a, aGoals, bGoals],
      [fixture.b, bGoals, aGoals],
    ] as const) {
      const row = rows.get(team);
      if (row === undefined) throw new RangeError(`Unknown group team ${team}`);
      row.played++;
      row.goalsFor += goalsFor;
      row.goalsAgainst += goalsAgainst;
      if (goalsFor > goalsAgainst) {
        row.won++;
        row.points += 3;
      } else if (goalsFor === goalsAgainst) {
        row.drawn++;
        row.points++;
      } else row.lost++;
    }
  }
  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.name.localeCompare(b.name),
  );
}
