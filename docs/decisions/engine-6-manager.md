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
the first ranking key. So the board does not reward coaching quietly. Every coached row carries a
"Coached" marker and the board has an All / Uncoached / Coached filter. Whether a run was coached
is derived at read time from its stored token (`manager` actions present), so no column or
migration is needed, and splitting into separate boards later is a read-side change that also
covers every row already submitted.

Principles: keep the board honest and visible rather than fragmenting a small group's daily; prefer
the reversible read-time choice; record the measured advantage so the default can be revisited.

## Calibration (auto coach vs frozen engine 5, same bot-drafted squads)

`pnpm exec tsx scripts/calibration/engine6-compare.mts --n 2000` (cup8) and `--n 600 --mode kanto151`:

| cup8, 1000 runs each | win rate v5 / v6 | goals for per match v5 / v6 | goals against v5 / v6 |
| -------------------- | ---------------- | --------------------------- | --------------------- |
| good bot             | 0.850 / 0.850    | 2.945 / 2.986               | 0.397 / 0.387         |
| random bot           | 0.647 / 0.651    | 1.752 / 1.778               | 0.701 / 0.703         |

Engine 6 per match (both sides, cup8): about 3.3 yellows, 0.17 reds, 0.23 to 0.26 injuries (user
side only) and the same number of injury substitutions, and 1.8 to 2.0 tactic changes. The first
cut produced 0.39 reds per match, almost all second yellows, because a booked player kept the full
yellow hazard. `manager.bookedCaution = 0.25` scales a booked player's yellow hazard, which brought
reds to 0.17, near real football.
