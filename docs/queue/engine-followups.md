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
