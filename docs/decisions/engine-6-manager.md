# Engine 6: manager mode, live tactics, injuries, substitutions and cards

## Boards: coached and uncoached runs share one board, and coached rows are marked

Manager mode is a per-player preference, not a draft setting, so a coached and an uncoached run of
the same daily share a board. A run with no coach decisions is played by the auto coach (defend a
late lead, chase a deficit, fatigue substitutions at 60' and 75'), which is also what a coached
run falls back to for any match it leaves alone.

Measured on 200 bot-drafted cup8 squads (seeds `scum-1..200`), a coach who replays each match with
every kickoff and half-time tactic pair and keeps the best result, the upper bound for replaying a
deterministic daily locally, gets:

| squads     | auto coach: mean wins, champions | replaying coach: mean wins, champions |
| ---------- | -------------------------------- | ------------------------------------- |
| good bot   | 5.95, 3%                         | 6.39, 11%                             |
| random bot | 2.85, 0%                         | 3.44, 0%                              |

A single honest playthrough gains far less, but the ceiling is real: about half a win, which is
the first ranking key. So the board does not reward coaching quietly. The manager UI dispatch adds
a "Coached" marker on every coached row and an All / Uncoached / Coached filter. Whether a run was
coached is derived at read time from its stored token (`manager` actions present), so no column or
migration is needed, and splitting into separate boards later is a read-side change that also
covers every row already submitted.

Until that marker shipped, the submit handler rejected any token with coach decisions
(`ILLEGAL_ACTION`, "Coached runs are not ranked yet.") before replaying it, so no coached run could
rank unmarked in the window between this engine and the manager UI. The guard was removed when the
marker shipped, in the manager mode UI dispatch (`docs/decisions/manager-mode-broadcast.md`), and
a handler test now pins that a coached token ranks and comes back with `coached: true`.

Principles: keep the board honest and visible rather than fragmenting a small group's daily; prefer
the reversible read-time choice; record the measured advantage so the default can be revisited.

## Calibration (auto coach vs frozen engine 5, same bot-drafted squads)

`pnpm exec tsx scripts/calibration/engine6-compare.mts --n 2000` (cup8) and `--n 600 --mode kanto151`.
The final numbers are in the table below; they are the output of the current coefficients.

Engine 6 per match (both sides, cup8): about 3.3 yellows, 0.17 reds, 0.23 to 0.26 injuries (user
side only) and the same number of injury substitutions, and 1.8 to 2.0 tactic changes. The first
cut produced 0.39 reds per match, almost all second yellows, because a booked player kept the full
yellow hazard. `manager.bookedCaution = 0.25` scales a booked player's yellow hazard, which brought
reds to 0.17, near real football.

The first cut also never made a fatigue substitution: by 75' the most tired starter sat near 74
energy against `autoSubEnergy` 72. It is now 82, so the auto coach makes one rotation at each of
60' and 75' when someone qualifies. A Boss Club has no named bench, so at the same checks it
refreshes its most tired outfield player (no incident row); it fires about 1.2 times a match.

Final numbers (cup8, 1000 runs per bot; kanto151, 300 runs per bot):

| squads             | win rate v5 / v6 | group exits v5 / v6 | subs per match (v6) |
| ------------------ | ---------------- | ------------------- | ------------------- |
| cup8 good bot      | 0.850 / 0.852    | 0 / 0               | 1.11                |
| cup8 random bot    | 0.647 / 0.682    | 0.052 / 0.034       | 2.12                |
| kanto151 good bot  | 0.800 / 0.803    | 0 / 0               | 1.99                |
| kanto151 random bot| 0.669 / 0.700    | 0.047 / 0.007       | 2.26                |

Strong squads are unchanged. Weak squads gain about 3 points of win rate because the auto coach
swaps in bench players who fit the role better than a randomly placed starter. That is the coach
doing its job, so it stays.

## Retained links

Engine 6 found two places that only knew token versions 1 to 4: the proxy's link check (which
would have sent every pd5 share link to "run not found" once pd6 went live) and the Challenge
button plus board squad preview (already missing for pd5 runs in production since #52). Both now
read `RETAINED_TOKEN_VERSIONS` plus the live version.

## Scouting queue items closed here

- Item 6: Jigglypuff (39) and Wigglytuff (40) no longer list GK as a best role; GK was their
  lowest raw role blend (33 and 49). The new rule test found Wigglytuff, which the queue missed.
- Item 10: `review-rules.test.ts` rejects GK as a best role at the species' lowest raw blend,
  with a synthetic positive control. The blend is read before familiarity, since fits already
  carry the best-role boost.
- KIC rule (SF-20): a synthetic positive control so the rule can fail.
- Item 11: Serperior and Onix rationales no longer read serpent height as reach (Serperior also
  drops its `reach` strength tag).
- Items 7, 8, 9, 12 and 13 stay queued.
