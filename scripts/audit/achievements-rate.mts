// Earn rates of the run achievements over seeded good-bot cups, read-only. The Giant killer gap is
// set from this: the share of runs earning it must sit between 2% and 20%.
//   pnpm exec tsx scripts/audit/achievements-rate.mts --n 200
import { parseArgs } from "node:util";
import { replay } from "@/engine/replay";
import { ACHIEVEMENT_IDS, GIANT_KILLER_GAP, runAchievements } from "@/ui/achievements";
import { botCup8Token, POST_SETTINGS } from "./tokens.mjs";

const { values } = parseArgs({
  options: {
    n: { type: "string", default: "200" },
    prefix: { type: "string", default: "achievements-" },
  },
});
const n = Number(values.n);
const gaps = [50, 100, 150, 200, 250];
const atGap = new Map(gaps.map((g) => [g, 0]));
const earned = new Map(ACHIEVEMENT_IDS.map((id) => [id, 0]));

for (let i = 0; i < n; i++) {
  const { draft, cup } = replay(botCup8Token(`${values.prefix}${i}`, "good"));
  for (const id of runAchievements(draft, cup)) earned.set(id, earned.get(id)! + 1);
  let widest = Number.NEGATIVE_INFINITY;
  for (const m of cup.matches) {
    if (m.status === "played" && m.outcome === "W") {
      widest = Math.max(widest, m.opponent.score - m.rating);
    }
  }
  for (const g of gaps) if (widest >= g) atGap.set(g, atGap.get(g)! + 1);
}

const share = (count: number) => `${count} of ${n} (${((100 * count) / n).toFixed(1)}%)`;
console.log(
  `good bot, ${JSON.stringify(POST_SETTINGS)}, seeds ${values.prefix}0 to ${values.prefix}${n - 1}`,
);
for (const g of gaps) console.log(`giant killer at a gap of ${g}: ${share(atGap.get(g)!)}`);
console.log(`GIANT_KILLER_GAP is ${GIANT_KILLER_GAP}`);
for (const id of ACHIEVEMENT_IDS) console.log(`${id}: ${share(earned.get(id)!)}`);
