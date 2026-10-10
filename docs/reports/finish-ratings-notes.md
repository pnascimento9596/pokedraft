# Ratings notes, 20 seeded drafts

Observations only. Nothing here retunes the engine; every item is a candidate for a later, separately reviewed calibration dispatch.

## How the sample was made

- Command: `pnpm exec tsx scripts/calibration/play-seeded.mts --n 20` (committed in this PR; deterministic, a second run was byte-identical).
- 20 `cup8` drafts, 4-3-3, all generations, `classic3`, Squad First, seeds `finish-1` to `finish-20`.
- Odd seeds use the calibration `good` bot, even seeds the `random` bot. Bots come from `scripts/calibration/bots.ts`.
- Per run the script prints the Team Score parts, per-slot fit, familiarity and quality, the cup path with opponent scores, and the awards.
- This is 20 runs, so every rate below is anecdotal, not a measurement. Larger-sample numbers belong to `pnpm calibrate`.

## Sample summary (measured from the 20 runs)

| Group              | Runs | Team Score range | Cup result                                                                           |
| ------------------ | ---- | ---------------- | ------------------------------------------------------------------------------------ |
| good bot (odd)     | 10   | 739 to 866       | 1 champion (flawless, seed 3), 2 finalists, 3 semifinalists, 4 lost in the quarters  |
| random bot (even)  | 10   | 379 to 663       | 0 past the quarters; 6 lost in the quarters, 3 in the Round of 16, 1 in the group    |

## Oddities logged: 7

1. **Opponent strength jumps at the quarterfinal.** Round of 16 opponents scored 460 to 500, quarterfinal opponents 741 to 780, semifinal 838 to 863, final 978 to 990. The step from R16 to QF is about +280 while R32 to R16 is about +120. Random-bot teams scoring 401 to 663 reached the QF in 6 of 10 runs and lost all 6 there. Good-bot teams scoring 739 to 814 lost the QF 4 times (seeds 11, 13, 17, 19) while a 769 team won it on penalties (seed 7). Reads as a cliff, not a ramp.
2. **Keeper quality is much more generous than the displayed fit.** A keeper at fit 31 has quality 0.46 (seed 2, Rotom), fit 42 has 0.70 (seed 14, Archaludon), fit 38 has 0.60 (seed 16, Weavile), fit 36 has 0.60 (seed 4, Overqwil). An outfielder at fit 30 to 44 has quality 0.00 to 0.20. The rating reads quality, the card shows fit, so a low-fit keeper looks worse on screen than it plays.
3. **"Weakest" skips those keepers.** `weakest` is the three lowest by quality (`src/engine/team.ts` line 73), not by fit. Seed 2: the keeper has the second-lowest fit in the XI (31) and is not flagged, while the CDM at fit 37 is. Seed 14: the keeper has the lowest fit (42) and is not flagged. This follows from item 2.
4. **Player of the Tournament can be a keeper with no goals or assists.** Seed 4 (Overqwil) and seed 14 (Archaludon): 0 goals, 0 assists, while a striker scored 2 and 3. Plausible if it is driven by clean sheets, but the results screen shows only goals and assists, so the award looks arbitrary. The award rule was not read for this note.
5. **Golden Boot to non-attackers.** Seed 16: a center-back (Urshifu, LCB) scored 5, ahead of every forward. Seed 1: a defensive midfielder (Kingambit) scored 6 while the striker fit was 90. Seeds 6 and 10: central midfielders led the scorers with 6 and 3. 4 of 20 Golden Boots went to a CB, DM or CM.
6. **Penalty shootout 8-7 twice.** Seeds 10 and 18, both in the Round of 16. 7 shootouts happened across the 20 runs (5-3, 5-4, 8-7, 4-2, 1-3, 5-3, 8-7). Two identical long shootouts in seven is odd but is too small a sample to call a bug. Low confidence.
7. **Opponent score is not always rising through the early rounds.** Seed 13: G3 358, R32 347. Seed 15: G3 349, R32 345. Minor, and may be intended as per-opponent variation.

## Looked at, nothing odd

- Specials: the good bot reached the 3-special cap in 5 of 10 teams and never exceeded it.
- Determinism: a second full run produced identical output.
- Finish tracks Team Score in the large: in the 10 adjacent pairs (seed 1 vs 2, 3 vs 4, and so on) the good-bot run finished at or above the random-bot run every time, strictly above in 6 and level (both quarterfinal exits) in 4.
- Lopsided scores exist: 8-0 (seed 15, Team Score 857, group stage) and 9-0 (seed 16, Team Score 526, group stage). Large but not contradictory.

## Not done

- No retune and no engine change. Items 1 to 5 are the ones worth a calibration dispatch.
- Browser play of these 20 drafts through the UI was not done; they were played through the engine and the bots only.
