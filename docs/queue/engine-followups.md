# Engine follow-ups

Logged by dispatch 3 (UI). The engine and scouting were frozen in that lane, so each item here is a candidate for the next Red engine lane. Nothing below changed engine behaviour.

| # | Item | Why the UI wants it | What the UI does today |
|---|---|---|---|
| 1 | Export the opponent ladder (`buildLadder(seed, mode)` in `src/engine/opponents.ts`) from `src/engine/index.ts`, or return it from a draft-time call | The draft screen's "Road to the Final" strip should show this run's exact 8 opponent ratings before the cup is played. The ratings carry a seeded jitter of up to 20 around the nominal ladder | Shows the nominal ladder from `ENGINE_COEFFICIENTS.ladder.score` (300, 320, 340, 360, 480, 760, 850, 980), labelled approximate. The results screen shows each opponent's exact rating from the cup result |
| 2 | `notPlayed` matches carry `opponent: null` (`src/engine/cup.ts`) | After an early exit, the results screen would like to name the opponents the player never reached | Shows "Not played" with the nominal rating for that round |
| 3 | Shootout cap. After 20 level sudden-death pairs `shootout()` awards the win to the user by decree (`src/engine/match.ts`, `coefficients.ts` `shootout.maxSuddenDeath`) | A decided-by-decree win is not a real result. About 2e-6 per shootout (dispatch 2 carryover) | Detected from engine output: the decree adds one scored user kick and one missed opponent kick (`match.ts:251-254`), so a capped shootout has more than 25 user kicks (5 + 20) and ends user = opp + 1. Shown as "Won on penalties (decided after 20 rounds)". Candidate fix: continue sudden death, or draw the winner from the match stream |

## Added by dispatch 5 PR B (finish)

| # | Item | Why | What ships today |
|---|---|---|---|
| 4 | Split `src/data/pokedex.json` and `src/data/scouting.json` so the home route loads only what its first screen needs | The 1.33 MB data chunk is the LCP contributor on `/` (Lighthouse mobile, simulated: 3.8 s against a 2.5 s target). It changes how engine data is loaded, so it is a Red-lane change, not a finish change | `/` ships both files up front |
| 5 | Calibration review of the five ratings oddities in `docs/reports/finish-ratings-notes.md` (quarterfinal opponent step, keeper fit versus quality, `weakest` ranked by quality, Player of the Tournament, Golden Boot) | Observed in 20 seeded drafts; 20 runs is anecdote, so a `pnpm calibrate` sized sample must confirm before any coefficient moves | Nothing retuned |

## Status after dispatch 6 PR 6C (engine-3)

| # | Status |
|---|---|
| 1 | Done. Dispatch 6 PR 6C exported `buildLadder(seed, mode)` from `src/engine/index.ts`. Dispatch 7 PR 7A wired it into the "Road to the Final" strip: the strip prints this run's exact opponent ratings on the draft screen, and on the start screen when the seed is already known (the Daily, a shared link). A fresh run has no seed until Start, so its start screen shows the bars and no rating. `NOMINAL_LADDER` is removed; the strip reads `ENGINE_COEFFICIENTS.ladder.score` only to size the bars before a seed exists and prints no number from it |
| 2 | Done: `notPlayed` matches carry the run's opponent (name and rating); the results screen shows both. Retained-engine runs get theirs from that engine's own ladder |
| 3 | Done: sudden death runs to 200 pairs, then a seeded coin from the match stream decides (`decider: "coin"`). Old engine-1 and engine-2 decrees still read as decrees |
| 4 | Open |
| 5 | Three of five addressed with calibration-sized samples: the quarter-final cliff (max ladder step 280 to 125), Golden Boot to non-attackers (scorer and assist weight by slot role; attackers score 71.5% of user goals in 4-3-3, was 51.0%), and Player of the Tournament (a typed contribution score with its breakdown shown). Keeper fit versus quality and `weakest` by quality stay open in the engine. Dispatch 7 PR 7A changed the display only: the cards now show each player's quality for the role (0 to 100, labelled "vs other" plus the role, the quantity `weakest` ranks by) with the raw fit inside Scouting notes, so the three Weak spot tags sit on the three lowest numbers shown (ties follow the engine's order). The ranking rule and the coefficients are unchanged and were not re-judged |

## Status after Wave 6 row 6-0

| # | Status |
|---|---|
| 5 | Closed. Keeper fit versus quality and `weakest` ranked by quality are won't fix. Changing either moves every Team Score, and the "All engines" board compares Team Scores across engines; the 0 to 1000 scale is the one number friends quote. Dispatch 7 already made the display honest (each card shows the quality `weakest` ranks by) |
