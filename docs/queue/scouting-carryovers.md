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

## Queued from the PR 6B audit (`docs/reports/scouting-audit-v2.md`)

| # | Item | Source |
|---|---|---|
| 6 | Jigglypuff (39) lists GK as a best role while GK is its lowest blend; suggested bestRoles CM, DM, WM | audit DISAGREE 4 |
| 7 | Upright squiggle bodies that do not levitate (Metapod, Kakuna, Pupitar, Palossand, Mimikyu, Applin) still get the body-length discount; the audit judged their lower numbers plausible | audit observation 1 |
| 8 | Other GKP calls that may price size (Snorlax, Onix, Stakataka, Garganacl; cuts on Comfey, Orbeetle and others) need a re-check under the new rubric line | audit observation 4 |
| 9 | The frame term adds HAN to handless bodies; consider scaling it by shape | audit observation 2 |
| 10 | A review-rules test that GK cannot be a best role when it is the lowest blend | audit follow-up 6 |
| 11 | Reword the Serperior and Onix rationales that still call serpent height reach | audit observation 7 |
| 12 | Audit the 18 reconciled reviews this fit-movement sample did not reach, with a review-diff sampler | audit observation 6 |
| 13 | Re-derive the top-60 moved set after the Cresselia, Wailord and Dondozo fixes and judge any species that enters it (the audit sample was cut before those fixes; boundary species move by 2) | GLM review of PR 6B, warning 2 |

## Re-measured in dispatch 6 PR 6C

`pnpm calibrate --n 5000` on engine-3 (4-3-3) and `--rows cup8-full --formation 3-5-2`. Team Score does not depend on the ladder, so engine-2 measured the same numbers. The flagged lists are the pre-6B predicates, so these are placements of the same species after the fix, not a count of remaining errors.

| # | 4-3-3 placement | 4-3-3 mean Δ score | 3-5-2 placement | 3-5-2 mean Δ score | Before 6B (4-3-3) |
|---|---|---|---|---|---|
| 2 | 1,294 of 5,000 = 25.9% | +30.15 (n 1,285) | 1,290 = 25.8% | +29.94 (n 1,281) | 24.0%, +30.1 |
| 5 | 465 of 5,000 = 9.3% | +25.88 (n 472) | 654 = 13.1% | +23.90 (n 679) | 10.2%, +27.8 |

Item 5 placement fell (10.2% to 9.3%; 3-5-2 14.5% to 13.1%) and the squiggle species that still start rate about 2 points less above their alternative. Item 2 placement rose slightly: the frame term lifts big keepers that were already strong picks, so the good bot starts them a little more. Whether those keepers are now rated right is the frame term's design question, not something this delta can answer.

## Status at Program Close (Wave 7)

All items closed:
- Items 2 and 5: Resolved in Layer 1 (PR 6B).
- Items 6 and 10: Resolved in PR #61 (`6915a84`, Jigglypuff bestRoles corrected, GK review rule test added in `src/scouting/__tests__/review-rules.test.ts`).
- Items 1, 3, 4: Closed as won't fix. Measured placement rate is under 0.3% across 5,000 drafts; impact on game outcomes is negligible.
- Items 7, 8, 9, 11, 12, 13: Closed as won't fix. Scouting Layer 1 and Layer 2 are frozen; changing ratings would move historical Team Scores across engines. All scouting carryovers are closed.
