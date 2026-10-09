# Scouting model audit (seed pokedraft-audit-v3)

Independent round 3 judgment audit of the Layer 2 per-species reviews and the Layer 3 fits they produce, judged on the artifact that ships: the working tree at HEAD `53ac395` (clean, `git status --short` empty). Five data passes landed after the round 2 audit, so this audit judges the final state. The auditor did not write the model, the reviews, or any earlier audit.

## Method

- Sample: `pnpm -s data:audit-sample pokedraft-audit-v3` (the seed is the first positional argument, per `scripts/data/audit-sample.ts`). It wrote `scripts/data/.cache/audit-packet.json` with 100 species: the 20 highest by overall fit (`highest-20`), the 20 lowest (`lowest-20`), and 60 seeded random (`random-60`). "overall" is the species' best role fit; checked to equal `max(fits)` for all 100 (0 mismatches).
- Artifact consistency: every packet `scouting` entry equals the live `SCOUTING` record. For all 1,025 species, `src/scouting/review/gen-*.json` adjustments, bestRoles, worstRoles and rationale match `src/data/scouting.json`, and every final attribute equals `clamp(baseline + adjustment)` (0 mismatches).
- Layer 1 recomputation: `computeBaselines` from `src/scouting/attributes.ts` was run with `pnpm tsx` against the live `COEFFICIENTS` and `ABILITY_TRAITS`. It reproduced every packet `baseline` value for all 100 species (0 mismatches). The per-attribute breakdown (shape, heavy, baby, moves, abilities, type) and the blend inputs in `coefficients.ts` were used to check each adjustment for double counting (rubric rule 1).
- Every numeric claim in a sampled rationale (attribute values, weights in kg, heights in m, "highest in the generation" and "shortest" claims) was checked against the files. Generation claims were checked against `src/data/pokedex.json`.
- Judgment axes per species: does the rationale support the adjustments; does any adjustment repeat a Layer 1 effect, or adjust an attribute for a field that already feeds it; are near-identical peers treated alike (in-sample, plus out-of-sample peers from `src/scouting/review/gen-*.json` where noted: Squirtle line, Tirtouga, Dodrio, Piplup line, Klink line, Flabébé line, Slakoth line, Marowak, Totodile line, Mime Jr., Mr. Rime, Carbink, Bergmite, Trubbish, Ekans, Arbok, Ninjask, Popplio line); do bestRoles, worstRoles and fits make sense on a real pitch.
- Verdict rule (unchanged from round 2): DISAGREE only for a concrete problem (a wrong stated value, an adjustment that repeats a Layer 1 term, an inconsistency with a near-identical peer, or roles that contradict the review's own tags and data). Interpretive calls that are defensible are AGREE, sometimes with a note.
- Scratch scripts used: `scripts/data/.cache/audit-v3-dump.ts`, `audit-v3-peers.ts`, `audit-v3-scan.ts`, `audit-v3-fix.ts`, `audit-v3-table.ts`.

**Counts: AGREE 96, DISAGREE 4.**

## Results

| id | name | bucket | overall | verdict | note |
|---|---|---|---|---|---|
| 150 | Mewtwo | highest-20 | 97 | AGREE | No adjustments. Cited SHO 99 and TEC 99 match; def 90 ties spd 90 as its lowest stat. The round 2 stale ACC claim is gone. |
| 494 | Victini | highest-20 | 97 | AGREE | HAN -6 for height 4 (not a HAN input). PHY 65 and the height input to DIV are cited correctly. |
| 806 | Blacephalon | highest-20 | 97 | AGREE | No adjustments; AM/W/ST matches spa 151, spe 107. |
| 807 | Zeraora | highest-20 | 97 | AGREE | Kick credit (SHO +8, KIC +8 from moves) acknowledged, not repeated. |
| 151 | Mew | highest-20 | 96 | AGREE | HAN -6 only, matching Victini, Jirachi, Celebi, Manaphy. PHY 65 and TAK 72 cited correctly (weight feeds both). |
| 385 | Jirachi | highest-20 | 96 | AGREE | HAN -6 only; PHY 63, TAK 69 cited correctly. Consistent with the mythical group. |
| 386 | Deoxys | highest-20 | 96 | AGREE | No adjustments; explosive forward, CB/DM worst fit def 50, spd 50. |
| 491 | Darkrai | highest-20 | 96 | AGREE | No adjustments. "Def 90 is the soft spot" is loose (hp 70 is lower) but drives nothing. |
| 795 | Pheromosa | highest-20 | 96 | AGREE | Round 2 PHY -5 removed; now {} and the rationale says PHY already reflects weight 250. Kick stack not repeated. |
| 251 | Celebi | highest-20 | 95 | AGREE | HAN -6, AER +4 for hovering (AER 58 baseline cited correctly). PHY 66, TAK 73 correct. |
| 482 | Azelf | highest-20 | 95 | AGREE | No adjustments; Levitate AER +6 already in. |
| 483 | Dialga | highest-20 | 95 | AGREE | Cites heavy DIV -9 (breakdown -8.75); no repeat. CB/DM/CM anchor. |
| 490 | Manaphy | highest-20 | 95 | AGREE | HAN -6 only; PHY 62 cited correctly. Consistent with Jirachi. |
| 648 | Meloetta | highest-20 | 95 | AGREE | HAN -6 for height 0.6 m; the round 2 weight-based PHY -4 is gone. Matches the other five mythicals. |
| 649 | Genesect | highest-20 | 95 | AGREE | No adjustments; 82.5 kg correct, blaze-kick credit not repeated. |
| 658 | Greninja | highest-20 | 95 | AGREE | AER +3 for ninja leaping; Protean DRI/TEC credit not repeated. |
| 802 | Marshadow | highest-20 | 95 | AGREE | Kick and Technician credit acknowledged, not repeated. |
| 887 | Dragapult | highest-20 | 95 | AGREE | No adjustments. "Already max PAC, SHO, and DRI" is loose (PAC 95, SHO 98, DRI 99) but drives nothing. |
| 894 | Regieleki | highest-20 | 95 | AGREE | Spe 200 is the gen 8 maximum (checked); PAC 96 correct. |
| 1006 | Iron Valiant | highest-20 | 95 | AGREE | HAN -5 from 74 (correct) for bladed arms; GK is a worst role. |
| 824 | Blipbug | lowest-20 | 33 | AGREE | No adjustments; Compound Eyes and Telepathy credit already in VIS/PAS. FB second with a pace tag: see observation 6. |
| 829 | Gossifleur | lowest-20 | 33 | AGREE | Blob cuts acknowledged; DM/CB/FB for a near-immobile body. |
| 868 | Milcery | lowest-20 | 33 | AGREE | Flat blends 26 to 33; WM/WB/AM consistent with its tags. |
| 175 | Togepi | lowest-20 | 32 | AGREE | Baby -6 applied, not repeated; AM/CM/DM keeps a spe 20 baby central. |
| 273 | Seedot | lowest-20 | 32 | AGREE | Round 2 fix holds: CB, DM, FB; worst W, GK. |
| 339 | Barboach | lowest-20 | 32 | AGREE | Fish PAC -25 leaves PAC 27, yet WB/FB/W. Spe 60 and the agility tag make it defensible; see observation 6. |
| 837 | Rolycoly | lowest-20 | 32 | AGREE | Ball cuts acknowledged; CB/DM/FB. |
| 161 | Sentret | lowest-20 | 31 | AGREE | Round 2 fix holds: DM, CB, FB; "watchful holding role". |
| 173 | Cleffa | lowest-20 | 31 | AGREE | Baby -6 acknowledged; supportive midfielder. |
| 270 | Lotad | lowest-20 | 31 | AGREE | Round 2 fix holds: DM, CB, FB. |
| 664 | Scatterbug | lowest-20 | 31 | AGREE | FB first with a pace tag on a flat 27 to 32 blend; see observation 6. |
| 917 | Tarountula | lowest-20 | 31 | AGREE | Stakeout TAK credit not repeated; CB/DM. |
| 265 | Wurmple | lowest-20 | 30 | AGREE | FB first with a pace tag and spe 20; see observation 6. |
| 665 | Spewpa | lowest-20 | 30 | AGREE | ACC 29 after the blob cut cited correctly; CB/DM/FB. |
| 789 | Cosmog | lowest-20 | 28 | AGREE | W first consistent with its acceleration tag (ACC 47, its best attribute); 0.1 kg correct. |
| 298 | Azurill | lowest-20 | 27 | DISAGREE | Spe 20, PAC 22, yet bestRoles W, ST, WB with W first. Snom's corrected review sets the standard that spe 20 rules out pace roles. |
| 412 | Burmy | lowest-20 | 27 | AGREE | WB third on spe 36, PAC 27 is weak but no pace tag contradicts it; see observation 6. |
| 746 | Wishiwashi | lowest-20 | 26 | AGREE | GK first rides Layer 1 Schooling GK mods; no repeat. |
| 191 | Sunkern | lowest-20 | 25 | AGREE | Round 2 fix holds: CB, DM, FB; ACC -6 dropped since light and small feed ACC. |
| 872 | Snom | lowest-20 | 25 | AGREE | Now DM, CB, CM, and the rationale says spe 20 rules out FB and WB. Closes the round 2 Snom slip. |
| 8 | Wartortle | random-60 | 61 | AGREE | DEF +3 matches Squirtle's DEF +3 on the turtle shell. The rationale also cites def 80 and spd 80, both DEF inputs; genus Turtle is the real reason. FB first with a pace tag: observation 6. |
| 84 | Doduo | random-60 | 65 | AGREE | VIS +5 for two heads (VIS 29 baseline correct), matching Dodrio VIS +6. The "vision" strength tag sits on VIS 34, well below its median attribute (56). |
| 89 | Muk | random-60 | 77 | AGREE | No adjustments; HAN 98 with Sticky Hold credit; GK/CB/DM. |
| 93 | Haunter | random-60 | 74 | AGREE | Arms-shape DRI/TEC/KIC cuts acknowledged; no repeat (round 2 observation 3 holds). |
| 104 | Cubone | random-60 | 50 | AGREE | TAK +3 for the bone club, matching Marowak TAK +4. |
| 110 | Weezing | random-60 | 72 | AGREE | No adjustments; heads penalty stands; DM/CB/CM. |
| 118 | Goldeen | random-60 | 39 | AGREE | Fish PAC 31 cited correctly; no repeat. |
| 122 | Mr. Mime | random-60 | 80 | AGREE | HAN +5, GKP +3 on the mime identity; GK first matches GK blend 80, its highest. |
| 160 | Feraligatr | random-60 | 86 | AGREE | TAK +3 jaw bump matches Totodile and Croconaw; ACC 62 correct. |
| 174 | Igglybuff | random-60 | 34 | AGREE | STA 69 from hp 90 cited correctly; baby mods acknowledged. |
| 186 | Politoed | random-60 | 80 | AGREE | AER +4 from 67 (correct) for frog legs, which no AER input sees. |
| 211 | Qwilfish | random-60 | 55 | AGREE | Fish cuts and Intimidate credit acknowledged; flat blends 51 to 57. |
| 221 | Piloswine | random-60 | 74 | AGREE | VIS -4 from 52 (correct) for fur over the eyes; PHY 86, STA 84 correct. |
| 263 | Zigzagoon | random-60 | 47 | AGREE | Quick Feet credit not repeated; darting wide runner. |
| 288 | Vigoroth | random-60 | 74 | DISAGREE | STA +4 cites ability Vital Spirit, which Layer 1 already credited (STA +2 in the abilities term). |
| 294 | Loudred | random-60 | 59 | AGREE | No adjustments; CM/ST/DM. |
| 313 | Volbeat | random-60 | 73 | AGREE | No adjustments; quick wide runner. |
| 330 | Flygon | random-60 | 84 | AGREE | No adjustments; wings already cut DRI/TEC. |
| 336 | Seviper | random-60 | 69 | AGREE | AER -5 from 89 (correct) corrects a height that measures body length, matching Ekans AER -6. |
| 343 | Baltoy | random-60 | 49 | AGREE | No adjustments; GK first matches GK blend 49, its highest. |
| 365 | Walrein | random-60 | 85 | AGREE | No adjustments; ACC 52 correct; heavy term is near zero at 150.6 kg. |
| 393 | Piplup | random-60 | 51 | AGREE | DRI -4, HAN -5 offset humanoid DRI +7, HAN +6 for flippers. Prinplup and Empoleon trim only HAN; defensible since they are upright, not humanoid. |
| 404 | Luxio | random-60 | 60 | AGREE | Intimidate and Guts credit acknowledged. |
| 419 | Floatzel | random-60 | 90 | AGREE | Low-kick credit acknowledged. |
| 430 | Honchkrow | random-60 | 81 | AGREE | Wings AER credit acknowledged. |
| 438 | Bonsly | random-60 | 49 | AGREE | No adjustments; Sturdy credit in Layer 1. |
| 449 | Hippopotas | random-60 | 58 | AGREE | No adjustments; plodding blocker. |
| 479 | Rotom | random-60 | 70 | AGREE | Ball cuts acknowledged. |
| 505 | Watchog | random-60 | 71 | AGREE | Keen Eye VIS credit acknowledged, not repeated. |
| 510 | Liepard | random-60 | 88 | AGREE | 37.5 kg correct; quadruped TEC trim acknowledged. |
| 544 | Whirlipede | random-60 | 59 | AGREE | Ball cuts acknowledged; Speed Boost credit not repeated. |
| 565 | Carracosta | random-60 | 81 | DISAGREE | Says "the upright-driven TEC and HAN are trimmed", but the upright shape gives no HAN (breakdown shape 0); HAN 83 comes from the blend, Sturdy +4 and moves +1. |
| 567 | Archeops | random-60 | 90 | AGREE | Defeatist STA -6 acknowledged, not repeated. |
| 569 | Garbodor | random-60 | 80 | AGREE | DRI -3 from 67 (correct); GK second matches GK blend 80, its highest. |
| 574 | Gothita | random-60 | 48 | AGREE | No adjustments. |
| 581 | Swanna | random-60 | 81 | AGREE | No adjustments; 1.3 m correct. |
| 595 | Joltik | random-60 | 56 | AGREE | Shortest in gen 5 (height 1, checked); no adjustments. |
| 601 | Klinklang | random-60 | 78 | AGREE | HAN -8 for gears with no hands (heads shape has no HAN term); Klink -4, Klang -6 scale up the line. |
| 617 | Accelgor | random-60 | 85 | DISAGREE | PAC +5 rests on spe 145 (0.9 of the PAC blend) and Unburden (already PAC +1). The arms cut it claims to undo is only -3. Ninjask (spe 160) gets no PAC raise. |
| 646 | Kyurem | random-60 | 94 | AGREE | No adjustments; 325 kg and ACC 68 correct; heavy term acknowledged. |
| 670 | Floette | random-60 | 57 | AGREE | HAN -6 from 64 (correct), matching Flabébé HAN -6. |
| 679 | Honedge | random-60 | 48 | AGREE | Blob cuts acknowledged. |
| 689 | Barbaracle | random-60 | 84 | AGREE | HAN +3 for many clawed hands; heads shape has no HAN term. GK third ties DM at blend 79. |
| 700 | Sylveon | random-60 | 76 | AGREE | TAK +3 for ribbon feelers, a design call. |
| 703 | Carbink | random-60 | 65 | AGREE | Ball HAN cut and the height input to DIV cited correctly. |
| 713 | Avalugg | random-60 | 83 | AGREE | KIC -6 allowed (GK is a best role); SHO 68, KIC 81 correct. DEF +3 rests on genus Iceberg, not def. |
| 715 | Noivern | random-60 | 84 | AGREE | No adjustments. |
| 717 | Yveltal | random-60 | 93 | AGREE | No adjustments; GK third matches GK fit 91. |
| 719 | Diancie | random-60 | 76 | AGREE | HAN -5 from 98 (correct) against the arms bonus for a small body. |
| 730 | Primarina | random-60 | 72 | AGREE | AER +3 matches Popplio and Brionne (+4) on the balloon design. |
| 784 | Kommo-o | random-60 | 89 | AGREE | No adjustments. |
| 811 | Thwackey | random-60 | 74 | AGREE | DRI 90 and 14 kg correct. |
| 821 | Rookidee | random-60 | 47 | AGREE | Wings AER credit acknowledged; 1.8 kg correct. |
| 836 | Boltund | random-60 | 90 | AGREE | PAC 96 correct. |
| 886 | Drakloak | random-60 | 77 | AGREE | PAC 84 and 11 kg correct; arms cuts not repeated. |
| 892 | Urshifu | random-60 | 93 | AGREE | SHO 99, VIS 55, PAS 65 correct; Unseen Fist credit not repeated. |
| 938 | Tadbulb | random-60 | 38 | AGREE | Ball cuts acknowledged; 0.4 kg correct. |
| 954 | Rabsca | random-60 | 70 | AGREE | VIS 96, PAS 89 correct. "Height 3 dm already hold PHY down" is wrong (height is not a PHY input) but drives no adjustment. |
| 957 | Tinkatink | random-60 | 50 | AGREE | No adjustments. |
| 1020 | Gouging Fire | random-60 | 92 | AGREE | PHY 96, DEF 94, ACC 64, 590 kg correct. |

## Disagreements

### 288 Vigoroth
- Evidence: adjustments `{"STA": 4}`, rationale "Genus Wild Monkey with ability Vital Spirit and spe 90 is a restless engine, so stamina rises a touch". `ABILITY_TRAITS` maps vital-spirit to `STA +2`, and the Layer 1 breakdown shows `STA` abilities +2 (plus normal type +1) on a base of 71.03. The review cites the same ability that Layer 1 already credited, and the rubric says not to repeat `layer1Mods` for abilities. Genus Wild Monkey restates the same "restless" idea, so it gives no separate basis.
- Fix: drop `STA +4` (adjustments `{}`, STA 78 to 74). Reword the rationale to say Vital Spirit is already credited in Layer 1. Keep the tags: STA 74 is still in its upper range. Effect (computed): WB 72 to 71, DM 56 to 55, CM 55 to 54, WM 66 to 65; overall stays 74 (W).

### 617 Accelgor
- Evidence: adjustments `{"PAC": 5}`. The rationale gives three reasons: spe 145 (the gen 5 maximum, checked), ability Unburden, and "the arms-shape PAC cut in Layer 1 undersells that". Spe is 0.9 of the PAC blend (base 92.44). Unburden already adds PAC +1 in Layer 1. The arms shape cut is PAC -3, so even read as an undo, +5 overshoots it by 2. Arms means no legs, and Accelgor has none, so the shape reading is not wrong. Its nearest speed peer, Ninjask (spe 160), gets no PAC raise ("already maxes PAC and ACC").
- Fix: drop `PAC +5` (adjustments `{}`, PAC 95 to 90). Keep the rationale's identity line, but say Layer 1 already prices spe 145 and Unburden. Effect (computed): W 85 to 84, WM 81 to 80, WB 73 to 72, FB 63 to 62; overall 85 to 84.

### 565 Carracosta
- Evidence: rationale "its limbs are flippers, so the upright-driven TEC and HAN are trimmed". The upright shape gives TEC +5 but no HAN term (`shape.upright` is DRI, TEC, SHO, PAS, KIC). The HAN breakdown is base 77.62, moves +1, Sturdy +4, shape 0, giving HAN 83. So `TEC -5` correctly offsets a shape bonus, but `HAN -6` does not offset anything upright-driven. The flipper reason itself is consistent with Prinplup (`HAN -4`) and Empoleon (`HAN -5`), which trim HAN for flippers without claiming a shape bonus.
- Fix: keep `{"TEC": -5, "HAN": -6}` and reword the rationale: "its limbs are flippers, so the upright TEC bonus is trimmed and HAN drops for limbs that cannot grip". No number changes.

### 298 Azurill
- Evidence: spe 20, PAC 22, ACC 28. bestRoles `["W", "ST", "WB"]`, with the winger first and wing-back third. W weights PAC 0.25 and ACC 0.15, and WB weights PAC 0.2. The rationale only claims "a tiny wide role at best". Its tags (strengths balance, agility; weaknesses size, strength, durability) avoid the `pace` tag, so the rule test does not catch it. Snom's fix sets the standard for this tier: "Spe 20 rules out the pace roles FB and WB". Azurill has the same spe 20 and keeps two pace roles. Blends are flat (ST 27, W 26, WB 26, WM 26, CM 25, AM 25), so moving off the flanks costs nothing.
- Fix: bestRoles `["ST", "AM", "CM"]` (ST from Huge Power SHO 31, its top attribute). Keep worstRoles `["CB", "GK"]`. Add `pace` to weaknesses (it has room for a 4th tag). Reword "tiny wide role" to a short-range finisher. Effect (computed): overall stays 27 (ST); W 26 to 25, WB 26 to 22, FB 25 to 21.

## Systemic observations

Status of round 2's still-open observations 5, 6 and 7, checked against all 1,025 species at `53ac395`:

5. **Blend-input reasons: partly open.** Closed for every species round 2 named except one. Meloetta is now `{HAN: -6}` with no PHY trim. Pheromosa, Dipplin and Shedinja are `{}`. Jumpluff's weight-cited PHY -4 is gone (now DRI -6 for stubby limbs). Abomasnow's TEC -3 now cites genus Frost Tree and height, and no longer spe. Still open:
   - Terapagos: `ACC -5` for "a 2 dm turtle ... should not burst like ACC 67". Height feeds ACC through `small` (0.1) and weight through `light` (0.15). This is the same class of cut that was dropped from Sunkern (`ACC -6`) in round 2 for that reason, so the two are now treated differently.
   - Accelgor (new, in sample): `PAC +5` cites spe. See its disagreement.
   - Wartortle (minor): its `DEF +3` cites def 80 and spd 80, both DEF inputs. Genus Turtle (shell) is the real reason and matches Squirtle's `DEF +3`, so only the wording needs a fix.
6. **Slow species in wide roles: partly open.** Snom is closed (now DM, CB, CM). The rule test still keys only on the `pace` tag, so these remain:
   - spe 30 or below with W or WB as a best role: Azurill (spe 20, W/ST/WB, a disagreement above) and Kricketot (spe 25, PAC 28, WB/W/WM).
   - Final PAC 30 or below with W or WB as a best role: Barboach (PAC 27, WB/FB/W), Burmy (PAC 27, WB third) and Tynamo (PAC 28, W first). Each has spe 36 to 60, so they are defensible interpretive calls.
   - Round 2's "FB only third when `pace` is a weakness" was not adopted. 12 species are tagged weak on pace and list FB first: Squirtle, Wartortle, Chikorita, Marill, Wurmple, Shroomish, Sewaddle, Scatterbug, Rowlet, Grubbin, Mareanie, Chewtle.
   - Fix: extend `review-rules.test.ts` to also reject W or WB when spe is 30 or below. That would catch Azurill and Kricketot.
7. **KIC misuse: open (cosmetic).** The positive-KIC rule test passes. The three negative KIC trims round 2 named are unchanged: Flapple `KIC -6`, Crobat `KIC -4`, Bellsprout `KIC -4`, each with GK as a worst role. Three more species trim KIC without GK as a best role: Ninjask `-5`, Conkeldurr `-4`, Appletun `-5`. KIC carries 0.05 of the GK blend only, so these change no best-role fit. Avalugg's `KIC -6` is allowed (GK is a best role). Fix: extend the rule to any non-zero KIC without GK as a best role, and drop the six trims.

New observation:

10. **Rationales that misdescribe Layer 1 inputs.** Carracosta attributes HAN to the upright shape (a disagreement above). Rabsca and Dipplin (out of sample) say height "holds PHY down", but `blend.PHY` is weight, hp, def and atk, with no height term. Rabsca and Dipplin carry no adjustment, so nothing numeric is wrong. The citation test checks cited fields and attribute values, not claimed mechanisms. A rewording pass on these three is enough.

What holds up: no in-sample adjustment repeats a shape, heavy, baby, move or type term. All four round 2 role fixes in this sample (Seedot, Lotad, Sentret, Sunkern) and the mythical HAN-only rule (Mew, Victini, Jirachi, Celebi, Manaphy, Meloetta) hold. Every attribute value cited in the 100 rationales matches the current baseline or final value. Line peers are consistent: the Totodile line on TAK, the Klink line on HAN, Flabébé and Floette on HAN, the Popplio line on AER, and Doduo and Dodrio on VIS.

## Verification run

- `pnpm -s vitest run src/scouting`: exit 0. "Test Files 6 passed (6)", "Tests 74 passed (74)". Vite also printed a config warning: `vitest.config.ts` uses ESM syntax in a file loaded as CommonJS. That warning is unrelated to the result.
- `pnpm -s data:check-moves`: exit 0. "1025 rationales, 159 move citations, 0 not learnable".

## Not run

- `pnpm lint`, `pnpm typecheck`, the full `pnpm test`, and `pnpm build`: NOT RUN (out of scope for this audit).
- No proposed fix was applied, so `scripts/data/validate-review.ts`, `pnpm data:scouting` and the golden tests were not run against any fix: NOT RUN. The fit effects quoted under Disagreements were computed with `allFits` on baseline plus the proposed adjustments in a scratch script, not from a rebuilt artifact.
- `pnpm check:mirrors`: NOT RUN (no mirrored file touched).
