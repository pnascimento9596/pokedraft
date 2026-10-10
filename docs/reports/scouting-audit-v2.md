# Scouting model audit v2 (PR 6B: keeper frame and serpent reach)

Independent judgment audit of the Layer 1 change in PR 6B (bounded keeper frame term on DIV and HAN, serpent body length read as reach for the squiggle shape) and of the Layer 2 reconciliation that followed it. The auditor did not write the model, the reviews, or any earlier audit.

## Method

- Sample: `scripts/data/.cache/audit-moved-packet.json`, made by `pnpm tsx scripts/data/audit-moved.ts origin/main 60`. The 60 species whose role fits moved most between `origin/main` and the working tree on `feat/scouting-size`. Ranking: largest single-role |fit change|, then summed |fit change|, then id. The sample spans max moves of 5 down to 2.
- Layer 1 recomputation: `computeBaselines` from `src/scouting/attributes.ts` was run with `pnpm tsx` against the live coefficients and `ABILITY_TRAITS`. It reproduced every packet `scouting.baseline` value for all 60 species (0 mismatches). The per-attribute breakdown (base, shape, heavy, frame, baby, moves, abilities, type) was used to separate frame and serpent effects from everything else.
- Layer 2 comparison: each entry in `src/scouting/review/gen-*.json` was compared with its `origin/main` version (`git show origin/main:src/scouting/review/gen-N.json`). Across all 1,025 species the reconciliation removed 14 adjustments (Ekans AER, Dunsparce AER, Seviper AER, and HAN on Mew, Celebi, Jirachi, Manaphy, Shaymin, Victini, Meloetta, Flabébé, Floette, Spritzee, Diancie) and trimmed 7 (HAN on Snivy, Servine, Swadloon, Whimsicott, Darumaka, Trubbish, Amoonguss), matching the PR description. Only 3 of those 21 (Ekans, Dunsparce, Seviper) fall in this sample.
- Checks per species: (a) is the direction and size of the fit move plausible for the soccer metaphor, given real size, shape and data; (b) do the cited fields, numbers, abilities and moves in the rationale match the data; (c) does any Layer 2 adjustment now double count the frame term or the serpent reach; (d) are bestRoles and worstRoles still sensible.
- Citation check: every "ATTR NN" token in the 60 rationales was compared with the current baseline and final attributes, and every stat, height and weight token with the Pokédex data. All match (unit variants such as "weight 950 kg" for weightHg 9500 included). `vitest run` on `citations.test.ts`, `review-rules.test.ts` and `attributes.test.ts` passed (3 files, 30 tests).
- Verdict rule: DISAGREE when a cited value is wrong, a load-bearing claim is absent from the data, an adjustment double counts or contradicts a rubric rule, or a move or fit is implausible. Minor wording slips that change nothing are AGREE with a note.

**Counts: AGREE 56, DISAGREE 4.**

## Results

| id | name | max move | fit delta summary | verdict | note |
|---|---|---|---|---|---|
| 488 | Cresselia | 5 | GK -5, CB -3, ST -2 | DISAGREE | Serpent rule reads its 1.5 m height as body length; AER 84 to 66, DIV 88 to 73 for a levitating, non-serpent legendary with GK as a best role. See below. |
| 1001 | Wo-Chien | 5 | GK -5, CB -3, ST -2 | AGREE | Snail-like body; reading height 15 as length is defensible. GK stays third best role at blend 78. |
| 843 | Silicobra | 4 | GK -3, CB -4, ST -2 | AGREE | Rationale correctly cites AER 49. Strength tag `reach` is kept on "stretched out it still covers ground", which is a lateral claim, not keeper reach. |
| 968 | Orthworm | 4 | GK -4, CB -3, ST -2 | AGREE | Earthworm length discount is right; frame +2.88 still lifts HAN 61 to 64 for 310 kg. |
| 11 | Metapod | 4 | GK -4, CB -2, ST -2 | AGREE | Upright cocoon, not a serpent, but an immobile shell at AER 28, DIV 23 is plausible either way. PAC/ACC/DEF adjustments untouched by the change. |
| 14 | Kakuna | 4 | GK -4, CB -2, ST -1 | AGREE | Same as Metapod; the pair stays consistent. |
| 737 | Charjabug | 4 | GK -4, CB -2, ST -1 | AGREE | Horizontal larva; ACC 43 citation correct. |
| 367 | Huntail | 3 | GK -3, CB -3, ST -2 | AGREE | Eel length discount is the intended case. |
| 693 | Clawitzer | 3 | GK -3, CB -3, ST -2 | AGREE | SHO +6 is about the cannon claw, unrelated to size. |
| 247 | Pupitar | 3 | GK -2, CB -3, ST -2 | AGREE | Upright chrysalis, so the length reading is wrong in principle, but AER 53, DIV 46 for a limbless shell is not implausible. See systemic 1. |
| 368 | Gorebyss | 3 | GK -3, CB -3, ST -1 | AGREE | Intended eel case. |
| 770 | Palossand | 3 | GK -3, CB -3, ST -1 | AGREE | A sand castle's 1.3 m is real height, so the mechanism is wrong (systemic 1), but a stationary fortress losing AER and DIV is still a plausible outcome. GK stays a best role at 61. |
| 23 | Ekans | 3 | GK -3, CB -2, ST -1 | AGREE | AER -6 correctly removed; rationale "AER 47 stands" matches. Tag `limb-reach` on a limbless snake is odd but pre-existing and cosmetic. |
| 780 | Drampa | 3 | GK -3, CB -2, ST -1 | AGREE | "Towering" at height 30 is partly length, but frame +3.19 still lifts HAN; DM/CB/GK unchanged and sound. |
| 771 | Pyukumuku | 3 | GK -3, ST -1 | AGREE | Frame -5.64 for a 3 dm, 1.2 kg body. GK stays a best role at fit rank 3 (blend 52), backed by def 130, spd 130; weakness tag `size` now agrees with the model. |
| 208 | Steelix | 3 | GK +3 | AGREE | Even at 0.4 of 9.2 m its reach is top percentile; frame +5.75. |
| 249 | Lugia | 3 | GK +3 | AGREE | DIV 99, HAN 95 for a 5.2 m, 216 kg body; cited AER 99, SHO 78, DRI 70 all correct. |
| 321 | Wailord | 3 | GK +3 | DISAGREE | GKP +8 rests only on "sheer size" (height 145, weight 3980), which the frame term now prices (+5.85 DIV and HAN). See below. |
| 382 | Kyogre | 3 | GK +3 | AGREE | Big frame, no Layer 2 size adjustment. |
| 593 | Jellicent | 3 | GK +3 | AGREE | 2.2 m, 135 kg; frame +4.83 on top of tentacles HAN +4. |
| 713 | Avalugg | 3 | GK +3 | AGREE | Frame +5.28 partly offsets heavy -7.01 on DIV. SHO -5, KIC -6 are not size calls; KIC cut is allowed with GK a best role. |
| 755 | Morelull | 3 | GK -3 | AGREE | Frame -5.5 is right for height 2. GK as third best role is weak (GK fit rank 4, blend 33 vs AM 36) for the smallest decile, but the gap is small; see follow-ups. |
| 805 | Stakataka | 3 | GK +3 | AGREE | GKP +5 rests on genus Rampart identity as well as height 55, so it is not purely a size repeat. See systemic 4. |
| 809 | Melmetal | 3 | GK +3 | AGREE | Frame +5.64 offsets part of heavy -9.66; TEC -3 unrelated. |
| 890 | Eternatus | 3 | GK +3 | AGREE | Rationale updated to AER 98 (correct). |
| 977 | Dondozo | 3 | GK +3 | DISAGREE | GKP +6 because height 120 and weight 220 kg "physically fill the goal mouth": the frame inputs, now priced by frame +5.58. See below. |
| 147 | Dratini | 2 | GK -2, CB -2, ST -2 | AGREE | Strength tag `aerial` at AER 48 is relative only (tied second best of a flat profile). Wide roles unaffected. |
| 206 | Dunsparce | 2 | GK -2, CB -2, ST -1 | AGREE | AER -6 correctly removed; `aerial` moved to weaknesses; "AER 55 stands" correct. |
| 219 | Magcargo | 2 | GK -2, CB -2, ST -1 | AGREE | DRI 15 citation correct. |
| 423 | Gastrodon | 2 | GK -2, CB -2, ST -1 | AGREE | STA 92 citation correct. |
| 705 | Sliggoo | 2 | GK -2, CB -2, ST -1 | AGREE | GK is a worst role; move is irrelevant to its CM/DM/AM call. |
| 24 | Arbok | 2 | GK -1, CB -2, ST -1 | AGREE | Rationale rewritten to "AER 74 stands" (correct); no adjustment repeats the discount. |
| 218 | Slugma | 2 | GK -1, CB -2, ST -1 | AGREE | Tiny moves on a floor-level body. |
| 336 | Seviper | 2 | GK -1, CB -2, ST -1 | AGREE | AER -5 correctly removed; "AER 72 stands" correct. |
| 769 | Sandygast | 2 | GK -2, CB -1, ST -1 | AGREE | Weight 700 on height 5 keeps frame at only -1.34. |
| 885 | Dreepy | 2 | GK -2, CB -1, ST -1 | AGREE | ACC 84 citation correct; GK a worst role. |
| 936 | Armarouge | 2 | GK +2, CB +1, ST +1 | AGREE | GK first; DIV 92, HAN 94 for 1.5 m, 85 kg humanoid. |
| 76 | Golem | 2 | GK +2, CB +1 | AGREE | PHY 95, TAK 95, ACC 26 citations correct. |
| 164 | Noctowl | 2 | GK +2, CB +1 | AGREE | Rationale updated to AER 90 (correct). |
| 317 | Swalot | 2 | GK +2, ST +1 | AGREE | Rationale updated to HAN 98 (correct). |
| 344 | Claydol | 2 | GK +2, ST +1 | AGREE | Rationale updated to HAN 99 (correct). |
| 412 | Burmy | 2 | GK -2, ST +1 | AGREE | Weakness tag `size` matches frame -5.16. |
| 476 | Probopass | 2 | GK +2, CB +1 | AGREE | HAN -8 is for a handless heads shape, not size. Frame added +4.09 HAN to a body with no hands; see systemic 2. |
| 497 | Serperior | 2 | CB -2, ST -1 | AGREE | Rationale still says "height 3.3 m gives a long blocking reach" (tag `reach`), which the serpent rule now rejects; no adjustment rests on it and GK is its top blend (85) on spe 113. Wording follow-up. |
| 563 | Cofagrigus | 2 | GK +2, ST +1 | AGREE | HAN +8 is for four shadow hands undoing blob HAN -8, not for the 1.7 m body. |
| 718 | Zygarde | 2 | GK +2, CB -1 | AGREE | Frame +5.14; serpentine blocker reading unchanged. |
| 844 | Sandaconda | 2 | CB -2, ST -1 | AGREE | Rationale updated to AER 84, DIV 90 (correct). |
| 982 | Dudunsparce | 2 | GK -1, CB -2 | AGREE | Strength `aerial` at AER 82 still holds. |
| 9 | Blastoise | 2 | GK +2 | AGREE | Rationale updated to HAN 94 (correct). |
| 39 | Jigglypuff | 2 | GK -2 | DISAGREE | GK is a best role though GK blend 33 is its lowest of all ten roles; DIV 26, REF 26, GKP 27 are among its lowest attributes and `size` is a weakness tag. See below. |
| 59 | Arcanine | 2 | GK +2 | AGREE | GK a worst role; HAN 70 for a quadruped is frame on a handless body (systemic 2) but irrelevant to fits that matter. |
| 68 | Machamp | 2 | GK +2 | AGREE | HAN +6, DIV +5, GKP +3 rest on four arms (design), which the frame term does not see. Final DIV 85, HAN 98 is high but defensible. |
| 86 | Seel | 2 | GK +2 | AGREE | PAC 18 citation correct. |
| 87 | Dewgong | 2 | GK +2 | AGREE | No size adjustment. |
| 91 | Cloyster | 2 | GK +2 | AGREE | DEF +3, PAC -3 unrelated to size. |
| 95 | Onix | 2 | GK +2 | AGREE | GKP +5 argues length along the goal line, which frame (discounted reach) does not credit, so not a strict repeat. "Height already carries its aerial reach" is now only partly true (AER 77). Wording follow-up. |
| 97 | Hypno | 2 | GK +2 | AGREE | Rationale updated to HAN 90 (correct). |
| 143 | Snorlax | 2 | GK +2 | AGREE | GKP +6 rests on the franchise identity of a body that blocks a path, not only on weight. Borderline; see systemic 4. |
| 172 | Pichu | 2 | GK -2 | AGREE | Frame -5.08 plus baby -6; GK a worst role. |
| 177 | Natu | 2 | GK -2 | AGREE | AER -5 is for stubby wings (design), not size. |

## Disagreements

### 488 Cresselia

- Evidence: shape `squiggle`, heightDm 15, weightHg 856, ability Levitate, genus Lunar. `bodyLength.squiggle` 0.4 cuts its reach percentile, so AER base fell to 58.77 (final 66, was 84) and DIV base to 72.63 (final 73, was 88). GK is a best role and its fit fell 86 to 81, the largest move in the sample. Cresselia is a floating crescent figure, not a serpent, so its Pokédex height is its height. Its own review lists `aerial` as a strength and says "Levitate keeps it airborne", which the new AER 66 no longer supports well.
- Fix: exempt it from the body-length reading in Layer 1 (see follow-up 1). A Layer 2 patch would need roughly AER +18 and DIV +15 to restore it, beyond the 12-point limit and against the spirit of correcting a shape reading per species.

### 321 Wailord

- Evidence: adjustments `{"GKP": 8, "DEF": 6}`. The rationale gives one reason for the keeper bump: "Height 145 and weight 3980 make it the largest body on any pitch, so it blocks the goal and the box by sheer size". Those two fields are exactly the frame inputs, and the frame term now adds +5.85 to DIV and HAN for the same reason. In the GK blend that is about +2.6 from frame plus +1.2 from GKP for one cause. GK is its first best role. GKP is not one of the attributes the rubric lists for the frame term, so this is a double count in spirit rather than in letter.
- Fix: drop GKP +8 (keep DEF +6, which is an outfield box-blocking call) or re-justify it with something the frame term cannot see. Expected GK fit change about -1.

### 977 Dondozo

- Evidence: adjustments `{"GKP": 6}` because "at height 120 dm and weight 220 kg with hp 150, it physically fills the goal mouth". Same pattern as Wailord: height and weight drive frame +5.58 on DIV and HAN, and GKP repeats the size reason. GK is a best role.
- Fix: drop GKP +6, or tie it to abilities Unaware and Oblivious (composure) if a positioning call is still wanted. Expected GK fit change about -1.

### 39 Jigglypuff

- Evidence: bestRoles `["CM", "DM", "GK"]`. Role blends: DM 43, CM 43, WB 43, WM 42, CB 40, FB 40, ST 38, AM 36, W 34, GK 33. GK is its lowest blend, and its keeper attributes are among its worst (DIV 26, REF 26, GKP 27, with only PAC 27 as low). Height 5 and weight 55 give frame -3.6, and its own weakness tags include `size`. The GK slot lifts a 33 blend to full familiarity instead of a better outfield role. The rationale does not argue for goal.
- Fix: bestRoles `["CM", "DM", "WM"]` (WM blend 42; the rubric only bars W and WB for a `pace` weakness), worstRoles `["GK", "W"]` (its two lowest blends). Keep AER +4.

## Systemic observations

1. **The serpent rule keys on shape, and `squiggle` is not only serpents.** Of the 40 squiggle species, several are upright or compact bodies whose Pokédex height is real height: Cresselia, Palossand, Pupitar, Metapod, Kakuna, and outside the sample Mimikyu, Applin and Snom. For the tiny ones the effect is negligible, and for immobile shells (Metapod, Kakuna, Pupitar, Palossand) the lower AER and DIV happen to be plausible anyway. Cresselia is the one case where the wrong reading costs a mobile, levitating keeper candidate 5 GK fit points. The genuine serpents (Ekans, Arbok, Seviper, Dratini, Dunsparce, Huntail, Gorebyss, Silicobra, Sandaconda, Orthworm, Onix, Steelix) are handled well.
2. **The frame term on HAN rewards size on bodies that cannot catch.** HAN is catching. Frame adds up to +6 HAN regardless of shape, so large fish (Wailord +5.85, Kyogre +5.77, Dondozo +5.58), quadrupeds (Stakataka +5.93, Avalugg +5.28, Arcanine +4.62), heads (Probopass +4.09) and squiggles (Steelix +5.75) claw back part of the shape HAN penalty. Probopass already needed HAN -8 in Layer 2. It is bounded and small in fit terms (GK weights HAN 0.2), but it is the group the term treats least sensibly.
3. **Size now enters DIV twice in Layer 1.** DIV's blend already uses `reach` at 0.35, and the frame term adds reach and weight on top. For heavy bodies, weight also lowers DIV through `heavy` while raising it through frame (Eternatus heavy -10.65, frame +5.98; Stakataka -9.8, +5.93). The net results look reasonable, but three terms pulling on one attribute from two fields make the breakdown harder to audit. Worth a comment in `coefficients.ts` stating the intended net.
4. **Size-based GKP calls are the remaining double count channel.** The rubric says height and weight already move DIV and HAN, but says nothing about GKP. Reviews still use GKP to price body size in both directions: bumps for huge bodies (Wailord +8, Dondozo +6, Snorlax +6, Onix +5, Stakataka +5, and out of sample Garganacl +4) and cuts for tiny ones (out of sample Comfey, Orbeetle, Eldegoss, Polteageist, Alcremie, Wormadam, Pincurchin, all GKP -6 to -8 citing height or weight). In the GK fit these stack with the frame term. The two in-sample cases whose only reason is height and weight are the DISAGREEs above; the others carry an identity reason and are AGREE with a note.
5. **The GK shift for big versus tiny bodies is sensible overall.** Every species that gained GK fit is large (heightDm 14 to 200 or weight over 75 kg): Lugia, Kyogre, Eternatus, Wailord, Steelix, Stakataka, Melmetal, Snorlax, Avalugg, Golem. Every non-squiggle species that lost GK fit is tiny (Morelull, Burmy, Pichu, Natu, Jigglypuff), as is the squiggle Pyukumuku. The bound works: no non-squiggle fit moved more than 3, and non-squiggle outfield fits moved by at most 1 (Golem, Armarouge, Noctowl, Swalot, Claydol, Probopass, Cofagrigus, Burmy), from the AER percentile reshuffle as serpents drop down the reach ranking; frame itself touches only DIV and HAN. Serpent moves reach 5 and also shift CB and ST through AER, which is the intended effect.
6. **The fit-movement sample misses most of the Layer 2 reconciliation.** Removing a size adjustment offsets the frame term, so the net fit barely moves and the species drops out of the top 60. Only Ekans, Dunsparce and Seviper of the 21 reconciled entries appear here, and all three are correct. The other 18 (mostly tiny-mythical HAN -6 removals and stubby-limb HAN trims to -3) were not judged in this audit.
7. **Rationale hygiene after the serpent change.** Numeric citations are all current (the reconciliation refreshed Eternatus, Noctowl, Swalot, Claydol, Probopass, Sandaconda, Blastoise, Hypno). Wording that still treats serpent height as reach survives in Serperior ("long blocking reach", tag `reach`) and Onix ("height already carries its aerial reach"). Neither drives an adjustment.

## Recommended follow-ups

Not applied.

1. Replace the shape-wide `bodyLength.squiggle` with a narrower rule: either an explicit list of species ids whose height is length, or an exemption list for upright squiggle bodies (at minimum Cresselia, Palossand, Pupitar, Metapod, Kakuna, Mimikyu, Applin, Snom). Re-run `audit-moved.ts` afterwards.
2. Drop GKP +8 on Wailord and GKP +6 on Dondozo, or re-justify them without height and weight.
3. Fix Jigglypuff roles to bestRoles `["CM", "DM", "WM"]`, worstRoles `["GK", "W"]`.
4. Add a rubric line: "Do not use GKP to price body size; the frame term on DIV and HAN already does." Then review the out-of-sample size GKP calls listed in systemic 4 (Garganacl, Comfey, Orbeetle, Eldegoss, Polteageist, Alcremie, Wormadam, Pincurchin) together with Snorlax, Onix and Stakataka.
5. Consider scaling the frame term on HAN by shape (for example 0 for fish, quadruped, heads, squiggle) or moving its HAN share to DIV, so size does not buy catching for handless bodies.
6. Add a review-rule test: GK cannot be a best role when its role blend is the species' lowest (catches Jigglypuff), and optionally when it ranks below fifth and height is in the bottom decile (Morelull).
7. Reword Serperior and Onix rationales so they no longer read serpent height as reach.
8. Audit the 18 reconciled entries not in this sample with a sampler keyed on review diffs rather than fit movement.

## Not run

- Full test suite, lint, typecheck and build: NOT RUN. Only `citations.test.ts`, `review-rules.test.ts` and `attributes.test.ts` were run (pass).
- `pnpm data:check-moves`: NOT RUN (no cited moves changed in the sample).
- No proposed fix was applied or validated with `scripts/data/validate-review.ts`.

## Lane owner response (applied in PR 6B after this audit)

The audit above judged the tree before these changes. Values below are from the rebuilt `scouting.json`, compared with `origin/main`.

| id | name | DISAGREE | action | result (main to PR 6B) |
|---|---|---|---|---|
| 488 | Cresselia | Serpent rule read a levitating body's height as length | Layer 1: `uprightAbilities: ["levitate"]` exempts a body that hangs upright from the body-length discount. Only Cresselia matches among squiggle species. Guard test committed RED first | AER 84 to 85, DIV 88 to 92, GK fit 86 to 88 |
| 321 | Wailord | GKP +8 priced the same size the frame term now prices | Layer 2: GKP +8 removed, DEF +6 kept, rationale reworded | GKP 54 to 46, DIV 50 to 56, GK fit 50 to 52 |
| 977 | Dondozo | GKP +6 priced the same size | Layer 2: GKP +6 removed, rationale reworded | GKP 73 to 67, DIV 68 to 73, GK fit 64 to 66 |
| 39 | Jigglypuff | GK listed as a best role while GK is its lowest blend | Not changed: the roles predate PR 6B and the frame term did not cause them. Queued in `docs/queue/scouting-carryovers.md` | unchanged |

The rubric now says that no attribute, GKP included, may price body size again. The re-ranked reach percentiles moved one citation (Dragonair AER 75 to 74), which was refreshed. Follow-ups 1 (squiggle bodies that do not levitate but stand upright), 4 (re-check the other GKP size calls), 5, 6, 7 and 8 are queued, not applied.
