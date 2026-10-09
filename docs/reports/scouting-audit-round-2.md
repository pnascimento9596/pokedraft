# Scouting model audit (seed pokedraft-audit-v2)

Independent judgment audit of the Layer 2 per-species reviews and the Layer 3 fits they produce. The auditor did not write the model, the reviews, or any earlier audit.

## Method

- Sample: `scripts/data/.cache/audit-packet.json`, seed `pokedraft-audit-v2`. 100 species: the 20 highest by overall fit (`highest-20`), the 20 lowest (`lowest-20`), and 60 seeded random (`random-60`). "overall" is the species' best role fit (checked: equals `max(fits)` for all 100).
- Layer 1 recomputation: `computeBaselines` from `src/scouting/attributes.ts` was run with `pnpm tsx` against the live coefficients and `ABILITY_TRAITS`. It reproduced every packet `baseline` value for all 100 species (0 mismatches). The per-attribute breakdown (shape, heavy, baby, moves, abilities, type) was used to check each adjustment for double counting against both `layer1Mods` and the base blend inputs in `coefficients.ts`.
- Judgment axes per species: does the rationale support the adjustments; does any adjustment repeat a Layer 1 effect; are similar species treated alike (peers inside the sample, plus out-of-sample peers read from `src/scouting/review/gen-*.json` where noted); do bestRoles, worstRoles and fits make sense on a real pitch.
- Not re-verified (covered by existing checks): field citations (`src/scouting/__tests__/citations.test.ts`) and cited moves (`pnpm data:check-moves`). Neither was re-run here: NOT RUN.
- Verdict rule: DISAGREE only for a concrete problem (a wrong stated value, an adjustment that repeats a Layer 1 term, an inconsistency with a near-identical peer, or roles that contradict the review's own tags and data). Interpretive calls that are defensible are AGREE, sometimes with a note.

**Counts: AGREE 86, DISAGREE 14.**

## Results

| id | name | bucket | overall | verdict | note |
|---|---|---|---|---|---|
| 150 | Mewtwo | highest-20 | 97 | DISAGREE | Rationale says weight "holds ACC at 74"; ACC is 86. Weakness tags acceleration, agility contradict ACC 86. |
| 494 | Victini | highest-20 | 97 | AGREE | PHY/HAN/DIV trims for 0.4 m, 4 kg are defensible; see Mew and Manaphy for the consistency gap. |
| 806 | Blacephalon | highest-20 | 97 | AGREE | No adjustments; AM/W/ST matches spa 151, spe 107. |
| 807 | Zeraora | highest-20 | 97 | AGREE | Kick moves already credited (SHO +8, KIC +8); correctly left alone. |
| 151 | Mew | highest-20 | 96 | DISAGREE | Same h4, w40, all-100 stats as Victini, but no PHY trim; rationale says PHY 65 "reflects" tininess while Victini calls the same 65 too high. |
| 385 | Jirachi | highest-20 | 96 | AGREE | PHY -8, TAK -6 for 1.1 kg is a reasonable body call. |
| 386 | Deoxys | highest-20 | 96 | AGREE | Explosive forward, fragile; CB/DM worst fits def 50, spd 50. |
| 491 | Darkrai | highest-20 | 96 | AGREE | Fast playmaker; no adjustment needed. |
| 795 | Pheromosa | highest-20 | 96 | AGREE | Kick stack (SHO +24 capped) correctly not repeated; PHY -5 for a lissome 25 kg frame is fair. |
| 251 | Celebi | highest-20 | 95 | AGREE | PHY -4, AER +4 for a small winged hoverer. |
| 482 | Azelf | highest-20 | 95 | AGREE | Levitate AER +6 already in; no repeat. "Work-rate" tag on STA 69 is generous but only a tag. |
| 483 | Dialga | highest-20 | 95 | AGREE | Heavy penalty already cut ACC/DRI/DIV; CB/DM/CM anchor is sound. |
| 490 | Manaphy | highest-20 | 95 | DISAGREE | Near-identical to Jirachi (h3, 1.4 kg vs 1.1 kg, all-100, humanoid) but no PHY/TAK trim; PHY 62, TAK 70 vs Jirachi 55, 63. |
| 648 | Meloetta | highest-20 | 95 | AGREE | HAN -6, PHY -4 for 6.5 kg; AM/CM/WM fits spa 128, spd 128. |
| 649 | Genesect | highest-20 | 95 | AGREE | Blaze-kick credit not repeated; cannon identity drives tags only. |
| 658 | Greninja | highest-20 | 95 | AGREE | AER +3 for ninja leaping is light but franchise-backed. |
| 802 | Marshadow | highest-20 | 95 | AGREE | Kick and Technician credit not repeated. |
| 887 | Dragapult | highest-20 | 95 | AGREE | W/ST/AM from spe 142, atk 120. |
| 894 | Regieleki | highest-20 | 95 | AGREE | Spe 200 already maxes PAC; no adjustment needed. |
| 1006 | Iron Valiant | highest-20 | 95 | AGREE | HAN -5 for bladed arms is a design call; GK is a worst role anyway. |
| 829 | Gossifleur | lowest-20 | 33 | AGREE | Blob cuts already applied; DM/CB/FB for a near-immobile body. |
| 868 | Milcery | lowest-20 | 33 | AGREE | Flat blends (all 26 to 33); WM/WB/AM is consistent with its own acceleration tag (ACC 43). |
| 175 | Togepi | lowest-20 | 32 | AGREE | Baby -6 applied; no repeat. |
| 273 | Seedot | lowest-20 | 32 | DISAGREE | Rationale says "small, tough blocker", weakness tag pace, yet bestRoles lead with FB, WB. |
| 292 | Shedinja | lowest-20 | 32 | AGREE | PHY -8 for hp 1 shell; CB/GK as Wonder Guard "blocker" is a franchise call on flat blends. |
| 339 | Barboach | lowest-20 | 32 | AGREE | Fish cuts applied; WB/FB/W consistent with agility tag and spe 60. |
| 837 | Rolycoly | lowest-20 | 32 | AGREE | Ball cuts applied; CB/DM/FB reasonable. |
| 173 | Cleffa | lowest-20 | 31 | AGREE | Baby -6 applied; supportive midfielder fits Friend Guard. |
| 270 | Lotad | lowest-20 | 31 | DISAGREE | Weakness tag pace and spe 30, yet bestRoles are WB, FB, WM. |
| 664 | Scatterbug | lowest-20 | 31 | AGREE | FB first on a flat 27 to 32 blend; see systemic note on slow full-backs. |
| 917 | Tarountula | lowest-20 | 31 | AGREE | Stakeout sit-and-wait CB/DM. |
| 161 | Sentret | lowest-20 | 30 | DISAGREE | Spe 20, weakness tag pace, "watchful support role", yet WB is the first bestRole. |
| 265 | Wurmple | lowest-20 | 30 | AGREE | FB first on a flat blend; see systemic note. |
| 665 | Spewpa | lowest-20 | 30 | AGREE | Blob cuts applied; CB/DM/FB. |
| 789 | Cosmog | lowest-20 | 28 | AGREE | W first is consistent with its own acceleration tag (ACC 47, its best attribute). |
| 298 | Azurill | lowest-20 | 27 | AGREE | Huge Power SHO +8 not repeated. |
| 412 | Burmy | lowest-20 | 27 | AGREE | DM first; blob cuts applied. |
| 746 | Wishiwashi | lowest-20 | 26 | AGREE | GK first rides Layer 1 Schooling GK mods (HAN +8, DIV +8); no repeat in Layer 2. |
| 191 | Sunkern | lowest-20 | 25 | DISAGREE | ACC -6 because it cannot move, weakness tags pace and footwork, then WB, FB as bestRoles. |
| 872 | Snom | lowest-20 | 25 | AGREE | FB/WB on spe 20 is weak, but its own tags (acceleration strength) do not contradict it; systemic note. |
| 12 | Butterfree | random-60 | 63 | AGREE | Compound Eyes and bug-wings credit not repeated. |
| 14 | Kakuna | random-60 | 33 | AGREE | PAC/ACC cuts match Metapod exactly (out-of-sample peer); squiggle shape carries no PAC cut. |
| 15 | Beedrill | random-60 | 65 | DISAGREE | DM listed as a best role though DM blend 53 is its lowest outfield blend and def 40 / durability weakness. |
| 16 | Pidgey | random-60 | 45 | AGREE | Wings AER credit not repeated. |
| 17 | Pidgeotto | random-60 | 55 | AGREE | Baseline stands. |
| 22 | Fearow | random-60 | 79 | AGREE | Direct flier; W/ST/WB. |
| 41 | Zubat | random-60 | 41 | AGREE | DRI -4 explicitly on top of the wings DRI -4, for a species-specific reason; Golbat/Crobat treated in the same spirit. |
| 55 | Golduck | random-60 | 81 | AGREE | Kick credit not repeated. |
| 61 | Poliwhirl | random-60 | 73 | DISAGREE | CM listed first though CM blend 55 is its 5th best and the rationale itself says spa 50 holds vision down. |
| 97 | Hypno | random-60 | 79 | AGREE | GK third matches GK blend 79, its highest. |
| 133 | Eevee | random-60 | 52 | AGREE | Baseline stands. |
| 168 | Ariados | random-60 | 66 | DISAGREE | DEF +3 justified by "spe 40 limits pace", a non sequitur, on top of armor-shape DEF +4. |
| 170 | Chinchou | random-60 | 42 | AGREE | Fish cuts applied; no repeat. |
| 189 | Jumpluff | random-60 | 79 | AGREE | DRI -6 offsets the small/light DRI blend terms for stubby limbs; tags agree. |
| 195 | Quagsire | random-60 | 74 | AGREE | CB/DM/CM anchor. |
| 252 | Treecko | random-60 | 65 | AGREE | Baseline stands. |
| 258 | Mudkip | random-60 | 42 | AGREE | Holding role argued explicitly against the flat W blend. |
| 263 | Zigzagoon | random-60 | 47 | AGREE | Darting wide runner, Quick Feet already credited. |
| 271 | Lombre | random-60 | 52 | AGREE | Link player. |
| 285 | Shroomish | random-60 | 42 | AGREE | FB first matches its top blend (42); systemic note. |
| 296 | Makuhita | random-60 | 48 | AGREE | Thick Fat/Guts/Sheer Force PHY +7 not repeated. |
| 305 | Lairon | random-60 | 72 | AGREE | Heavy Metal and steel/rock credit not repeated. |
| 349 | Feebas | random-60 | 37 | AGREE | Spe 80 is the only asset; wide roles fit. |
| 354 | Banette | random-60 | 79 | AGREE | AM/ST/W from atk 115. |
| 373 | Salamence | random-60 | 91 | AGREE | Intimidate TAK +5 not repeated. |
| 443 | Gible | random-60 | 47 | AGREE | Baseline stands. |
| 460 | Abomasnow | random-60 | 79 | AGREE | TEC -5 rests on a size call; citing spe 60 (a TEC blend input) is weak, see systemic. |
| 461 | Weavile | random-60 | 89 | AGREE | TAK +4 on Pickpocket (not in ability traits), so no repeat. |
| 463 | Lickilicky | random-60 | 86 | AGREE | GK third matches GK blend 80. |
| 467 | Magmortar | random-60 | 90 | AGREE | HAN -6 for cannon arms. |
| 496 | Servine | random-60 | 70 | AGREE | HAN -4 small and GK-only. |
| 507 | Herdier | random-60 | 57 | AGREE | Intimidate TAK +6 correctly not repeated. |
| 553 | Krookodile | random-60 | 88 | AGREE | Intimidate credit not repeated. |
| 554 | Darumaka | random-60 | 56 | AGREE | DRI -4, HAN -5 for a round daruma body offset humanoid bonuses. |
| 581 | Swanna | random-60 | 81 | AGREE | Baseline stands. |
| 642 | Thundurus | random-60 | 88 | DISAGREE | DRI -4, TEC -5 for "no legs" repeat the arms shape, which already means no legs and applied DRI -4, TEC -2. |
| 690 | Skrelp | random-60 | 42 | AGREE | Baseline stands. |
| 695 | Heliolisk | random-60 | 87 | AGREE | Baseline stands. |
| 808 | Meltan | random-60 | 40 | AGREE | Ball cuts applied. |
| 810 | Grookey | random-60 | 61 | AGREE | Kick credit not repeated. |
| 818 | Inteleon | random-60 | 92 | AGREE | VIS +4 on Secret Agent identity; Sniper SHO credit not repeated. |
| 825 | Dottler | random-60 | 55 | AGREE | HAN -8 for a limbless shell. |
| 845 | Cramorant | random-60 | 78 | AGREE | Baseline stands. |
| 858 | Hatterene | random-60 | 68 | AGREE | GK third matches GK blend 68 (tied top). |
| 862 | Obstagoon | random-60 | 87 | AGREE | DEF +5 on genus Blocking; Obstruct fed only REF/DIV/HAN in Layer 1, so no DEF repeat. |
| 865 | Sirfetch’d | random-60 | 79 | AGREE | AER -8 correctly undoes most of a wings +12 for a non-flier. |
| 870 | Falinks | random-60 | 79 | AGREE | AER -10, DIV -8 correct a height that measures a column, not a body. |
| 871 | Pincurchin | random-60 | 65 | DISAGREE | PAS -5 "overstates PAS for a creature this slow": spe is already a PAS blend input, and slowness is not a passing flaw; CM still a best role. |
| 874 | Stonjourner | random-60 | 82 | DISAGREE | PAC -6 "for that mass" repeats the Layer 1 heavy penalty (PAC -3.59, DRI -7.17 at 520 kg). |
| 878 | Cufant | random-60 | 57 | AGREE | Heavy Metal/Sheer Force credit not repeated. |
| 911 | Skeledirge | random-60 | 85 | AGREE | Heavy penalty acknowledged; no repeat. |
| 913 | Quaxwell | random-60 | 69 | AGREE | Kick credit acknowledged; no repeat. |
| 927 | Dachsbun | random-60 | 77 | AGREE | FB/WB/W from spe 95, def 115. |
| 956 | Espathra | random-60 | 82 | DISAGREE | KIC +6 spends an adjustment on a GK-only attribute for an outfield "ostrich kick" while GK is a worst role. |
| 994 | Iron Moth | random-60 | 86 | AGREE | Baseline stands. |
| 1000 | Gholdengo | random-60 | 84 | AGREE | Baseline stands. |
| 1011 | Dipplin | random-60 | 74 | AGREE | PHY -4 for 9.7 kg. |
| 1014 | Okidogi | random-60 | 90 | AGREE | Baseline stands. |
| 1019 | Hydrapple | random-60 | 87 | AGREE | Regenerator STA +4 not repeated. |
| 1024 | Terapagos | random-60 | 66 | AGREE | ACC -5 offsets small/light ACC terms for a shelled body; FB first on a three-way tie (66). |

## Disagreements

### 150 Mewtwo
- Evidence: rationale says "weight 1220 rightly holds ACC at 74". Packet `baseline.ACC` and `attrs.ACC` are both 86, and the Layer 1 recomputation shows no heavy penalty (122 kg is under `heavy.thresholdKg` 150). Weakness tags `["acceleration", "agility"]` describe its strongest dimension (spe 130, ACC 86, PAC 94). The "74" is a stale value from an earlier coefficient set.
- Fix: rewrite the rationale clause to drop the ACC claim (for example: "Legendary status alone adds nothing; the baseline already carries spe 130."). Replace weaknesses with `["teamwork", "marking"]` (genus Genetic, a solitary engineered design; DEF 87 is its lowest outfield attribute). No adjustment change.

### 151 Mew
- Evidence: Mew and Victini share heightDm 4, weightHg 40, all base stats 100. Victini gets `PHY -4` (plus HAN -6, DIV -4) because "height 0.4 m and weight 4 kg leave no ... strength"; Mew gets `{}` and its rationale says "AER 54 and PHY 65 reflect" its tininess. The two reviews make opposite calls on the same PHY 65 for the same body.
- Fix: add `"PHY": -4` to Mew to match Victini, Celebi and Meloetta. Optionally harmonise HAN/DIV (see systemic).

### 490 Manaphy
- Evidence: Manaphy (heightDm 3, weightHg 14, all 100, humanoid) vs Jirachi (heightDm 3, weightHg 11, all 100, humanoid). Jirachi gets `{"PHY": -8, "TAK": -6}` for "weight 11 and height 3 cannot win physical duels". Manaphy gets `{}` with "no physical presence" in its own rationale and `strength` as a weakness tag, leaving PHY 62, TAK 70.
- Fix: apply `{"PHY": -8, "TAK": -6}` to match Jirachi.

### 273 Seedot
- Evidence: rationale "a small, tough blocker with no creative range"; weaknesses include `pace`; spe 30, PAC 32, STA 28. bestRoles `["FB", "WB", "DM"]` put it in the two running-intensive wide defensive roles. Blends are flat (FB 32, CB 31, DM 29), so the blend does not force this.
- Fix: bestRoles `["CB", "DM", "FB"]`, worstRoles `["W", "GK"]` (W is not a blocker role; AM was the old worst).

### 270 Lotad
- Evidence: weakness tags `["pace", "strength", "shot-power"]`, spe 30, PAC 30; bestRoles `["WB", "FB", "WM"]`. WB weights PAC 0.2 and STA 0.2. Blends are flat (DM 31, CB 31, FB 31, WB 30).
- Fix: bestRoles `["DM", "CB", "FB"]`; keep worstRoles `["ST", "GK"]`.

### 161 Sentret
- Evidence: spe 20, weakness `pace`, rationale "a watchful support role"; bestRoles `["WB", "FB", "DM"]`. Its strength tags are vision and positioning, which point at a holding role.
- Fix: bestRoles `["DM", "CB", "FB"]`; keep worstRoles `["ST", "GK"]`.

### 191 Sunkern
- Evidence: the review cuts `ACC -6` because the body cannot move ("a seed with tiny legs"), tags weaknesses `pace` and `footwork`, then names `["WB", "FB", "DM"]`, with the wing-back first.
- Fix: bestRoles `["DM", "CB", "FB"]`; keep `ACC -6` and worstRoles `["ST", "GK"]`.

### 15 Beedrill
- Evidence: bestRoles `["W", "ST", "DM"]`. Its DM blend is 53, the lowest of all ten of its role blends (GK 57, CB 56, FB 59, WB 60, CM 56, AM 58, WM 60). Weaknesses include `durability`, def 40. The `TAK +4` "presses hard" supports a pressing forward, not a holding midfielder.
- Fix: bestRoles `["W", "ST", "WM"]`. Keep `TAK +4`. `KIC -4` is harmless but pointless (KIC only feeds GK, a worst role); drop it to free the slot.

### 61 Poliwhirl
- Evidence: bestRoles `["CM", "WM", "W"]`, best first. Blends: W 73, ST 65, WM 64, AM 60, CM 55. The rationale says "Spa 50 holds its vision down", and CM weights PAS 0.25 and VIS 0.15 (PAS 50, VIS 41). Tags `dribbling`, `acceleration`, `balance` describe a wide runner.
- Fix: bestRoles `["W", "WM", "ST"]`; keep worstRoles `["GK", "CB"]`.

### 168 Ariados
- Evidence: `DEF +3` with "spe 40 limits pace, so DEF rises slightly". Low pace is not a reason to defend better. Layer 1 already gave armor shape `DEF +4`, and def 70 is half of the DEF blend. The genus Long Leg argument in the same rationale is about reach, which belongs to tackling or tags (it already has `limb-reach`).
- Fix: drop `DEF +3` (adjustments `{}`), or if a reach call is wanted, `TAK +3` citing genus Long Leg. Roles unchanged.

### 642 Thundurus
- Evidence: `{"TEC": -5, "DRI": -4}` because it "floats on a cloud with no legs". Shape `arms` is the no-legs body plan (`coefficients.ts`: "arms (no legs) suits goalkeeping") and Layer 1 already applied DRI -4, TEC -2, SHO -2, PAC -3, KIC -8 for it. The rationale credits only the KIC -8 and then applies the same no-legs reason again. Same pattern in out-of-sample Tornadus (`TEC -5, DRI -4`) and Landorus (`TEC -5`).
- Fix: drop both adjustments (`{}`) and rewrite the rationale to say the arms shape already prices the missing legs. Apply the same to Tornadus and Landorus. If the arms-shape mods are judged too soft for a legless body, change `shape.arms` in `coefficients.ts` once, not per species.

### 871 Pincurchin
- Evidence: `PAS -5` because "spa 91 overstates PAS for a creature this slow". Spe is already 15% of the PAS blend, and on a pitch slowness does not degrade passing quality. The review keeps CM in bestRoles `["DM", "CB", "CM"]` and leaves VIS 81 untouched, so the cut is internally inconsistent. `HAN -8` (undoing the tentacles HAN +4) and `GKP -6` are fine.
- Fix: drop `PAS -5`; keep `{"HAN": -8, "GKP": -6}`. If a body-plan passing cut is wanted, cite shape tentacles and height 3, not spe.

### 874 Stonjourner
- Evidence: `PAC -6` because "spe 70 overstates top speed for that mass". The Layer 1 heavy term exists for exactly this and already applied PAC -3.59, ACC -7.17, DRI -7.17, DIV -7.17, AER -3.59 at weightHg 5200. `DRI -6` "too generous for stone legs" is a different, legitimate reason: it offsets the legs-shape DRI +5.
- Fix: drop `PAC -6`, keep `DRI -6`, and reword the rationale to tie DRI to the legs-shape bonus rather than mass.

### 956 Espathra
- Evidence: `{"KIC": 6, "SHO": 4}` for "an ostrich kick is famously strong". KIC is a goalkeeping attribute that feeds only the GK blend (weight 0.05), and GK is in worstRoles `["GK", "CB"]`, so KIC +6 changes no relevant fit while reading KIC as outfield kick power. Low-kick already gave SHO +1.25, KIC +1 in Layer 1.
- Fix: drop `KIC +6`; keep `SHO +4` on genus Ostrich and long legs. Adjustments `{"SHO": 4}`.

## Systemic observations

1. **Stale numbers in rationales.** Mewtwo's "ACC at 74" survives from an earlier coefficient set (Kakuna's "now that spe drives it" shows the ACC blend changed). The citation test checks cited fields against species data, not cited attribute values against current baselines. Recommend extending `citations.test.ts` so any "ATTR NN" token in a rationale must equal either the current baseline or the final value for that attribute.
2. **Tiny all-100 mythicals are inconsistent.** Mew, Victini, Jirachi, Celebi, Manaphy, Meloetta share a profile (all or near-all 100 stats, heightDm 3 to 6, weightHg 11 to 65). PHY trims: Jirachi -8, Victini -4, Celebi -4, Meloetta -4, Mew 0, Manaphy 0. HAN trims: Victini -6, Meloetta -6, the rest 0 (Jirachi, Manaphy keep HAN 98, Celebi 99). HAN only matters for GK, which all six list as a worst role, so the HAN spread is cosmetic; the PHY spread is not (PHY feeds CB, DM, ST). Pick one rule and apply it to all six. The underlying cause is the PHY blend: weight is 0.4 but hp/def/atk at the 100 level still lift a 1 to 6 kg body to PHY 62 to 66. If many reviews keep trimming PHY for light bodies, a larger `weight` share in `blend.PHY` would remove the need.
3. **No-legs double count on the arms shape.** Thundurus, Tornadus and Landorus all subtract TEC/DRI for "no legs" after Layer 1's arms shape already did. The reviews acknowledge only the KIC -8 part of the shape. Fix once in the shape table if the effect is too weak.
4. **Mass double count.** Stonjourner's PAC cut repeats the heavy term. Dialga (683 kg) correctly relied on the heavy term instead. Reviewers should treat `heavy` as already covering PAC, ACC, DRI, DIV and AER for mass.
5. **Blend-input reasons.** Several reasons cite a field that is already a blend input for the same attribute: Pincurchin PAS (spe), Abomasnow TEC (spe 60, though its main reason is size), and the light-body PHY trims (weight). These are legitimate only when the reason is something the blend cannot see (body plan, design, height measuring the wrong thing as with Falinks). Recommend the rubric say so explicitly: "do not adjust an attribute for a field that already feeds its blend".
6. **Slow species placed as wing-backs.** In the lowest tier, role blends are flat (spread of 3 to 6 points), and reviews often pick FB/WB for species tagged `pace` as a weakness with spe 20 to 30: Seedot, Lotad, Sentret, Sunkern (DISAGREE), and Snom, Scatterbug, Wurmple, Shroomish (AGREE, FB first or tags not contradictory). On a real pitch a slow blocker plays CB or DM. Recommend a rubric line: if `pace` is a weakness, WB and W cannot be bestRoles, and FB only third.
7. **KIC misuse.** Espathra's KIC +6 and Beedrill's KIC -4 treat KIC as outfield kicking. Since KIC only feeds GK, reviews should touch KIC only when GK is a plausible role. A validator rule (no KIC adjustment when GK is in worstRoles) would catch this mechanically.
8. **bestRoles order.** Poliwhirl and Beedrill show bestRoles that ignore both their blends and their own tags. Familiarity only cares about set membership, so order is cosmetic for fits, but the third slot is not: a wrong third role lifts a weak fit to full familiarity (Beedrill DM fit 53 at full familiarity instead of WM 60).
9. **What is working well.** Layer 1 credit is respected in the large majority: kick stacks (Pheromosa, Marshadow, Zeraora), Intimidate (Herdier, Krookodile, Salamence), heavy penalty (Dialga, Skeledirge), Schooling GK mods (Wishiwashi) and shape cuts in the low tier are acknowledged and not repeated. Corrections that undo a wrong shape reading (Sirfetch'd AER -8, Falinks AER -10 and DIV -8, Pincurchin HAN -8) are the best use of Layer 2. The Kakuna/Metapod and Silcoon/Cascoon pairs are consistent.

## Not run

- `src/scouting/__tests__/citations.test.ts` and `pnpm data:check-moves` were not re-run for this audit (the brief states they pass): NOT RUN.
- No proposed fix was applied or validated with `scripts/data/validate-review.ts`: NOT RUN.

## Resolution check

Checked against the working tree at `7db7364`: `src/scouting/review/gen-*.json` and `src/data/scouting.json`. `pnpm vitest run src/scouting/__tests__/citations.test.ts src/scouting/__tests__/review-rules.test.ts` passed (2 files, 10 tests). The full suite, lint, typecheck and build: NOT RUN.

**Counts: RESOLVED 9, RESOLVED WITH DEVIATION 5 (all 5 accepted), OPEN 0.**

| # | species | status | note |
|---|---|---|---|
| 1 | Mewtwo (150) | RESOLVED | Rationale no longer claims ACC 74. Weaknesses are now `marking`, `tackling` instead of my proposed `teamwork`, `marking`. Both are fine: def 90 and spd 90 are its lowest stats. The citation checker now catches "ACC at 74" (test passes). |
| 2 | Mew (151) | RESOLVED WITH DEVIATION, accepted | My fix was PHY -4. The reviewer instead added HAN -6 and kept PHY 65 because weight already feeds PHY (0.4 of the blend). That follows the new rubric rule on blend inputs. Mew now matches Victini, Jirachi, Celebi and Manaphy (all `HAN -6` only), which removes the inconsistency I flagged. |
| 3 | Manaphy (490) | RESOLVED WITH DEVIATION, accepted | My fix was PHY -8, TAK -6. Now `HAN -6` only, under the same one-rule treatment. Jirachi lost its PHY/TAK trims, so the pair is consistent again (PHY 62 vs 63, TAK 70 vs 69). |
| 4 | Seedot (273) | RESOLVED | bestRoles CB, DM, FB; worstRoles W, GK. |
| 5 | Lotad (270) | RESOLVED | bestRoles DM, CB, FB; the rationale now says it holds a deep position. |
| 6 | Sentret (161) | RESOLVED | bestRoles DM, CB, FB; the rationale now says "watchful holding role". |
| 7 | Sunkern (191) | RESOLVED WITH DEVIATION, accepted | Roles fixed (CB, DM, FB). The ACC -6 is dropped because `light` and `small` feed ACC. That fits my own systemic point 5, so the drop is correct. ACC 40 against pace and footwork weaknesses is tolerable at this tier. |
| 8 | Beedrill (15) | RESOLVED | bestRoles W, ST, WM. TAK +4 kept, KIC -4 dropped. WM fit 60 replaces DM 53. |
| 9 | Poliwhirl (61) | RESOLVED | bestRoles W, WM, ST. |
| 10 | Ariados (168) | RESOLVED | DEF +3 replaced by TAK +3 citing genus Long Leg, which was my alternative fix. |
| 11 | Thundurus (642) | RESOLVED WITH DEVIATION, accepted | Fixed in Layer 1 (arms shape now DRI -8, TEC -7) rather than per species. Thundurus, Tornadus and Landorus now all have `{}`. Final DRI 81 and TEC 87 are unchanged, so the net effect is identical without the double count. This was the shape-table option in my proposal. Blast radius: every arms-shape species shifts. That was not re-audited here. |
| 12 | Pincurchin (871) | RESOLVED | PAS -5 dropped; HAN -8 and GKP -6 kept. The rationale now justifies CM from spa 91. |
| 13 | Stonjourner (874) | RESOLVED WITH DEVIATION, accepted | PAC -6 dropped as proposed. DRI -6 is also dropped; I had proposed keeping it to offset the legs-shape DRI +5. Dropping it is not a double count, and heavy already takes DRI -7.17, so DRI 56 for a 520 kg pillar is plausible. Accepting it is the conservative call. |
| 14 | Espathra (956) | RESOLVED | Adjustments are now `{SHO: 4}`; KIC +6 dropped. The rule test covers positive KIC without GK as a best role. |

Systemic observations still open:
- **5 (blend-input reasons), partly open.** The new rubric rule says not to adjust an attribute for a field that already feeds it. The fix pass applied it to the six mythicals but not to the other light-body PHY trims that cite weight: Meloetta (PHY -4, "weight 6.5 kg"), Pheromosa (PHY -5, "weight 250"), Dipplin (PHY -4, "weight 9.7 kg"), Terapagos (PHY -4, "high for its weight"), Jumpluff (PHY -4, "weight 30"), Shedinja (PHY -8, "hp 1 and weight 12"). Abomasnow's TEC -5 still cites "spe 60", which the rubric now names as a TEC input. Meloetta is the sharpest case: it is the closest peer of the six and is the only one still trimmed for weight. Fix: drop or re-justify these by body plan.
- **6 (slow wide players), mostly closed.** The rule test covers W/WB for species tagged weak on pace. Snom (spe 20, bestRoles FB, WB, DM, no pace tag) slips past it. A guard keyed on spe or PAC, not only the tag, would close it.
- **7 (KIC), mostly closed.** Positive KIC without GK as a best role is now tested. Negative KIC trims with GK as a worst role remain on 3 species: Flapple -6, Crobat -4, Bellsprout -4. They have no effect on any fit. Optional cleanup.
- **8 (bestRoles order), open but informational.** No mechanical check. This is cosmetic for fits once set membership is right.
- Observations 1, 2, 3 and 4 are closed.
