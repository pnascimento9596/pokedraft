# Scouting carryovers

Logged by dispatch 1 (`docs/decisions/dispatch-1.md`, carryover rows) and frozen in dispatch 2. Ratings do not change in dispatch 2. GATE 6 measures each item against the engine. A later Red lane fixes an item only if its measured impact warrants it.

Each item gets two numbers from `scripts/calibrate.mts`:

- **Placement rate.** How often the good-player bot places a flagged species in the flagged role, over 5,000 seeded cup8 drafts.
- **Score delta.** How much Team Score moves when that species is swapped for the next-best option at that slot.

| # | Carryover | Flagged species and role | Placement rate | Score delta |
|---|---|---|---|---|
| 1 | Claw and blade bodies keep a "handling" weakness at HAN 70 or more, because shape cannot tell claws from hands | 11 non-quadruped species (Scizor, Garchomp, Escavalier, Ceruledge, Koraidon and others) at GK | 10 of 5,000 = 0.2% (4-3-3); 7 = 0.1% (3-5-2) | mean +42.3 (n 10; 3-5-2 +28.0, n 7) |
| 2 | HAN and DIV have no size signal | GK species at the extremes of height and weight | 1,198 of 5,000 = 24.0% (4-3-3); 1,201 = 24.0% (3-5-2) | mean +30.1 (n 1,189; 3-5-2 +30.0) |
| 3 | 12 pace-weak species list FB first among their best roles | those 12 at FB | 14 of 5,000 = 0.3% (4-3-3); 0 (3-5-2) | mean +22.6 (n 14) |
| 4 | Barboach, Burmy and Tynamo have PAC 27 to 28 from shape cuts but keep W or WB best roles (spe 36 to 60) | those 3 at W and WB | 0 of 5,000 in 4-3-3 (W slots) and 3-5-2 (WB slots) | n/a, never placed |
| 5 | Squiggle (serpentine) height is body length, which inflates AER | squiggle species at CB and ST | 512 of 5,000 = 10.2% (4-3-3); 726 = 14.5% (3-5-2) | mean +27.8 (n 522; 3-5-2 +25.4, n 760) |

Measured in GATE 6 with the final coefficients (`docs/calibration.md`, Scouting carryovers). A positive score delta means the flagged species rates higher than the good bot's best alternative from the same pick. Each item flags a rating that may be wrong, so the delta is how much Team Score rides on that rating: if the flag is a real error, that much score is unearned. Recommendation for the next Red lane: items 2 (keeper size, 24% of good-bot drafts, about +30) and 5 (squiggle AER, 10 to 15%, about +26) reach typical players and carry real score. Items 1, 3 and 4 are below 0.5% placement and can wait.

## Status after dispatch 6 PR 6B

- **Item 2: fixed in Layer 1.** A bounded keeper frame term on DIV and HAN: `cap * (2 * blend - 1)` from the reach and weight percentiles, cap 6 (`frame` in `src/scouting/coefficients.ts`). It is skipped for species whose ability already sets the body size (`frame.sizeAbilities`, Schooling).
- **Item 5: fixed in Layer 1.** For `squiggle` shapes, height is read as body length: reach is the percentile of 0.4 times height (`bodyLength`), and it feeds AER and DIV in place of raw height. PHY has no height input, so nothing changes there.
- Layer 2 was reconciled so no review counts these twice: 14 adjustments removed, 7 trimmed and stale citations refreshed (`docs/decisions/dispatch-6.md`).
- Items 1, 3 and 4 stay queued with the numbers above (0.3% placement or less).
- The placement and score-delta numbers for items 2 and 5 are not re-measured here. They are re-measured with the PR 6C calibration, which runs on the final scouting and engine.
