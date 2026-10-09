# Scouting model audit, round 1 (superseded data, kept for the record)

Independent audit of the Layer 2 per-species reviews and the Layer 3 fits they produce. The auditor did not write the model or the reviews.

## Method

- Sample: `scripts/data/.cache/audit-packet.json`, seed `pokedraft-audit-v1`. 100 species: the 20 highest by overall fit (`highest-20`), the 20 lowest (`lowest-20`), and 60 seeded random (`random-60`). "overall" is the species' best role fit.
- For each entry the auditor checked: (a) every field the rationale cites against the raw `species` data; (b) every Layer 1 claim against a fresh recomputation of the current Layer 1 breakdown (`computeBaselines` in `src/scouting/attributes.ts`, run against the live coefficients; it reproduced all 1,700 baseline values in the packet exactly); (c) whether each adjustment obeys the rubric (`scripts/data/review-rubric.md`), including "do not repeat what layer1Mods already applied"; (d) whether bestRoles, worstRoles and fits make sense for the soccer metaphor.
- Verdict rule: DISAGREE when a cited field value is wrong, when a load-bearing claim rests on something absent from the data, when an adjustment contradicts the data or a rubric rule, or when a role or fit is implausible. Minor wording or interpretive slips that change nothing are AGREE with a note.
- Out-of-sample spot checks (Arcanine, Shuckle, Spinda, Kecleon) were run because the brief named them. They are reported under Systemic observations and are not counted below.

**Counts: AGREE 95, DISAGREE 5.**

## Results

| id | name | bucket | overall | verdict | note |
|---|---|---|---|---|---|
| 494 | Victini | highest-20 | 97 | AGREE | HAN/DIV/PHY trims follow height 0.4 m, weight 4 kg; kickMoves blaze-kick, mega-kick present. |
| 150 | Mewtwo | highest-20 | 96 | AGREE | spa 154, spe 130 correct; weight 1220 hg read correctly. |
| 151 | Mew | highest-20 | 96 | AGREE | kickMoves blaze-kick through triple-axel all present. |
| 385 | Jirachi | highest-20 | 96 | AGREE | PHY -8, TAK -6 justified by 1.1 kg, 0.3 m. |
| 486 | Regigigas | highest-20 | 96 | DISAGREE | GK 96 on DIV 99, REF 95 for a 420 kg slow-start colossus; other heavy legendaries got DIV -8. |
| 806 | Blacephalon | highest-20 | 96 | AGREE | spa 151, spe 107, def 53 correct; clown design is franchise identity. |
| 807 | Zeraora | highest-20 | 96 | AGREE | kickMoves blaze-kick, low-kick present; no adjustment needed. |
| 251 | Celebi | highest-20 | 95 | AGREE | Small AER lift for a winged hoverer is mild and reasonable. |
| 481 | Mesprit | highest-20 | 95 | AGREE | Even 105 spread verified. |
| 482 | Azelf | highest-20 | 95 | AGREE | "Tireless runner" only drives the work-rate tag, not an adjustment. |
| 483 | Dialga | highest-20 | 95 | AGREE | DIV -8 for a 6830 hg quadruped; heavy penalty does not reach DIV, so the patch is warranted. |
| 490 | Manaphy | highest-20 | 95 | AGREE | Fields verified. |
| 491 | Darkrai | highest-20 | 95 | AGREE | Ability bad-dreams present; spe 125, spa 135 correct. |
| 648 | Meloetta | highest-20 | 95 | AGREE | triple-axel present; HAN/PHY trims follow size. |
| 649 | Genesect | highest-20 | 95 | DISAGREE | Rationale says "upright 82.5 kg frame"; shape is humanoid. |
| 795 | Pheromosa | highest-20 | 95 | AGREE | high-jump-kick, triple-kick present; PHY -5 on 25 kg at 1.8 m fits. |
| 802 | Marshadow | highest-20 | 95 | AGREE | rolling-kick, blaze-kick present. |
| 1006 | Iron Valiant | highest-20 | 95 | AGREE | HAN -5 for bladed arms is design identity; fragility claim matches hp 74, spd 60. |
| 249 | Lugia | highest-20 | 94 | AGREE | Multiscale is its hidden ability; genus Diving supports GK. |
| 386 | Deoxys | highest-20 | 94 | AGREE | 150/150/150 verified; tentacle arms are design identity. |
| 868 | Milcery | lowest-20 | 34 | AGREE | Sweet Veil, Aroma Veil present; near-floor fits are honest. |
| 14 | Kakuna | lowest-20 | 33 | DISAGREE | Cites "signature Harden"; Harden is not in the data. |
| 175 | Togepi | lowest-20 | 33 | AGREE | isBaby, def/spd 65, atk/spe 20 verified. |
| 292 | Shedinja | lowest-20 | 33 | AGREE | hp 1, Wonder Guard, PHY -8 all supported. |
| 829 | Gossifleur | lowest-20 | 33 | AGREE | Regenerator present; blob penalties correctly credited to Layer 1. |
| 270 | Lotad | lowest-20 | 32 | AGREE | "All 50 or below" true; best-role pick among near-ties is noise at this level. |
| 273 | Seedot | lowest-20 | 32 | AGREE | Fields verified. |
| 664 | Scatterbug | lowest-20 | 32 | AGREE | Fields verified. |
| 837 | Rolycoly | lowest-20 | 32 | AGREE | Ball cuts to DRI/TEC are real (DRI now -22 after recalibration). |
| 173 | Cleffa | lowest-20 | 31 | AGREE | Friend Guard present; baby mods correctly credited. |
| 265 | Wurmple | lowest-20 | 31 | AGREE | Fields verified. |
| 917 | Tarountula | lowest-20 | 31 | AGREE | Stakeout present and already worth GKP +1 in Layer 1. |
| 161 | Sentret | lowest-20 | 30 | AGREE | Minor misread: VIS lift came from keen-eye and frisk, not genus Scout; no adjustment depends on it. |
| 665 | Spewpa | lowest-20 | 30 | AGREE | "Cocoon genus line" is loose (genus is Scatterdust); ACC -4 stands on blob shape and spe 29. |
| 789 | Cosmog | lowest-20 | 30 | AGREE | Weight 0.1 kg, atk 29 verified; ACC 66 at spe 37 is a Layer 1 artifact (see Systemic 6). |
| 298 | Azurill | lowest-20 | 29 | AGREE | Huge Power already in SHO; tail-bounce lore drives no adjustment. |
| 412 | Burmy | lowest-20 | 29 | AGREE | Overcoat present; fields verified. |
| 872 | Snom | lowest-20 | 27 | AGREE | Ice Scales, Shield Dust present. |
| 191 | Sunkern | lowest-20 | 26 | AGREE | ACC -6 corrects a small-size ACC inflation the data supports. |
| 746 | Wishiwashi | lowest-20 | 26 | AGREE | Reviewed before schooling mods existed; current Layer 1 schooling GK lift makes GK best role sensible. |
| 10 | Caterpie | random-60 | 35 | AGREE | ACC -6, PAC -3 correct an ACC 66 inflated by small/light. |
| 13 | Weedle | random-60 | 35 | AGREE | Same ACC correction; head stinger is design identity. |
| 90 | Shellder | random-60 | 45 | AGREE | def 100, ball shape verified. |
| 98 | Krabby | random-60 | 54 | AGREE | atk 105, def 90, armor shape verified. |
| 102 | Exeggcute | random-60 | 46 | AGREE | heads shape penalties correctly credited. |
| 104 | Cubone | random-60 | 50 | AGREE | TAK +3 rests on the held-bone design and def 95; acceptable as design identity. |
| 125 | Electabuzz | random-60 | 90 | AGREE | Vital Spirit present; spe 105, spa 95 correct. |
| 146 | Moltres | random-60 | 84 | AGREE | Wings already give AER 99; no adjustment. |
| 155 | Cyndaquil | random-60 | 63 | AGREE | double-kick present; weight 79 hg correct. |
| 166 | Ledian | random-60 | 67 | AGREE | HAN +5 correctly identifies that the wings shape HAN -6 ignores its four arms; Iron Fist present. |
| 179 | Mareep | random-60 | 42 | AGREE | Plus is its hidden ability; fields verified. |
| 195 | Quagsire | random-60 | 74 | AGREE | Cites STA 81, current baseline is 82 (stale packet, see Systemic 1). |
| 230 | Kingdra | random-60 | 81 | AGREE | Sniper present; weight 1520 hg correct. |
| 252 | Treecko | random-60 | 67 | AGREE | DRI 76, ACC 86 match baseline. |
| 256 | Combusken | random-60 | 73 | AGREE | blaze-kick, double-kick present. |
| 260 | Swampert | random-60 | 85 | AGREE | GK 80 as third role is defensible from HAN 89 and size. |
| 262 | Mightyena | random-60 | 67 | AGREE | Intimidate present; Layer 1 TAK +7 already rewards it. |
| 284 | Masquerain | random-60 | 75 | AGREE | TAK -5 deliberately offsets the Intimidate TAK +5 on a 3.6 kg body; not a repeat. |
| 303 | Mawile | random-60 | 60 | AGREE | Intimidate present; jaw is design identity. |
| 305 | Lairon | random-60 | 72 | AGREE | def 140, weight 1200 hg verified. |
| 328 | Trapinch | random-60 | 48 | AGREE | Hyper Cutter has no Layer 1 trait, so TAK +4 is not a repeat. |
| 331 | Cacnea | random-60 | 62 | AGREE | Fields verified. |
| 339 | Barboach | random-60 | 34 | AGREE | Fish shape penalties correctly left alone. |
| 344 | Claydol | random-60 | 87 | AGREE | HAN 96, GKP 91 match baseline; arms shape means no legs. |
| 362 | Glalie | random-60 | 75 | AGREE | weight 2565 hg verified; ball cuts credited. |
| 384 | Rayquaza | random-60 | 90 | AGREE | Squiggle cuts credited; ST/CB/DM sensible. |
| 405 | Luxray | random-60 | 81 | AGREE | VIS +5 anchored on genus Gleam Eyes. |
| 417 | Pachirisu | random-60 | 73 | AGREE | Weight 39 hg verified. |
| 465 | Tangrowth | random-60 | 84 | AGREE | Regenerator present; def 125 verified. |
| 467 | Magmortar | random-60 | 89 | AGREE | HAN -6 for cannon arms is design identity. |
| 472 | Gliscor | random-60 | 84 | AGREE | Poison Heal present; aerial defender is sensible. |
| 479 | Rotom | random-60 | 71 | AGREE | Ball cuts credited; W best is a near-floor relative call. |
| 485 | Heatran | random-60 | 91 | AGREE | DIV -8 for a 4300 hg quadruped. |
| 493 | Arceus | random-60 | 94 | AGREE | DIV -8 for a 3200 hg quadruped. |
| 509 | Purrloin | random-60 | 60 | AGREE | Prankster present; ACC 86 matches. |
| 571 | Zoroark | random-60 | 91 | AGREE | Illusion present; DRI +3 small and reasonable. |
| 594 | Alomomola | random-60 | 61 | AGREE | Healer present; hp 165 verified. |
| 603 | Eelektrik | random-60 | 56 | AGREE | Levitate present; fish cuts credited. |
| 620 | Mienshao | random-60 | 92 | AGREE | 11 kickMoves verified; tied with Scrafty and Scraggy for gen 5 longest, as claimed. |
| 627 | Rufflet | random-60 | 56 | AGREE | Sheer Force, Hustle present. |
| 645 | Landorus | random-60 | 90 | AGREE | No-legs claim is supported by shape arms; the Tornadus comparison is unnecessary. |
| 657 | Frogadier | random-60 | 82 | AGREE | AER +4 from genus Bubble Frog is mild. |
| 659 | Bunnelby | random-60 | 52 | AGREE | Huge Power correctly credited to Layer 1. |
| 674 | Pancham | random-60 | 56 | AGREE | Iron Fist present. |
| 680 | Doublade | random-60 | 65 | AGREE | DRI -4, KIC -5 for legless heads shape. |
| 703 | Carbink | random-60 | 62 | AGREE | HAN -6, DIV -4 on a handless ball with HAN 80 is fair. |
| 723 | Dartrix | random-60 | 63 | AGREE | Fields verified. |
| 742 | Cutiefly | random-60 | 66 | AGREE | PHY -4 offsets the armor shape PHY +4 on a 0.2 kg body. |
| 743 | Ribombee | random-60 | 83 | AGREE | spe 124 verified. |
| 785 | Tapu Koko | random-60 | 90 | DISAGREE | Shape arms (no legs) ignored; Landorus with the same shape was trimmed. |
| 794 | Buzzwole | random-60 | 88 | AGREE | Weight 3336 hg verified. |
| 848 | Toxel | random-60 | 36 | DISAGREE | TEC -3 for Klutz double-counts the Klutz TEC -2 Layer 1 already applied. |
| 864 | Cursola | random-60 | 76 | AGREE | Weak Armor present; deep playmaker fits VIS 95. |
| 892 | Urshifu | random-60 | 92 | AGREE | Unseen Fist present. |
| 906 | Sprigatito | random-60 | 60 | AGREE | Fields verified. |
| 922 | Pawmo | random-60 | 76 | AGREE | low-kick present. |
| 941 | Kilowattrel | random-60 | 84 | AGREE | PAC 97 matches. |
| 950 | Klawf | random-60 | 79 | AGREE | Anger Shell present; TAK 87, PHY 92 match. |
| 965 | Varoom | random-60 | 50 | AGREE | Slow Start (hidden) correctly credited for ACC 33. |
| 994 | Iron Moth | random-60 | 86 | AGREE | PAS 95, VIS 94 match. |

## Disagreements

### 486 Regigigas (highest-20, overall 96)

Evidence:
- species: `genus: "Colossal Pokémon"`, `shape: "humanoid"`, `heightDm: 37`, `weightHg: 4200`, `spe: 100`, `def: 110`, `abilities: [slow-start]`.
- Layer 1 (recomputed): heavy penalty is applied to PAC and ACC, and slow-start adds ACC -8, PAC -4. Neither touches DIV or REF.
- baseline: `DIV 99, REF 95, HAN 99, GKP 90`; `adjustments: {}`; `fits: GK 96, CB 93, DM 92`; `bestRoles: [CB, GK, DM]`.
- rationale: "Genus Colossal with atk 160 at height 37 dominates; the slow-start ability already cut PAC and ACC in Layer 1. Baseline fits."

Problem: the creature whose defining trait is being slow to get going is rated a world-class diving, reflex keeper (GK 96, one of the five highest overall fits in the dex). The rationale correctly says Layer 1 cut PAC and ACC, but then treats that as covering everything, when DIV and REF were untouched. It is also inconsistent with the other heavy legendaries in this sample: Dialga (6830 hg), Heatran (4300 hg) and Arceus (3200 hg) all received DIV -8 on the grounds that a body that heavy cannot dive. Regigigas at 4200 hg received nothing.

Proposed fix: `adjustments: { DIV: -8, REF: -6 }`. DIV -8 matches the reviews of the other heavy legendaries. REF -6 is anchored on the slow-start ability, which is in the data. The GK blend drops from about 96 to about 93; CB 93 stays, so `bestRoles [CB, GK, DM]` remain sensible. Also log as a Layer 1 carryover: `heavy.attrs` should include DIV (see Systemic 3).

### 649 Genesect (highest-20, overall 95)

Evidence:
- species: `shape: "humanoid"`, `weightHg: 825`.
- rationale: "...with spe 99 and kickMoves blaze-kick on an upright 82.5 kg frame make a complete attacker..."

Problem: the rationale states a wrong value for a cited field. The shape is `humanoid`, not `upright`. The two shapes carry different Layer 1 mods (humanoid adds HAN +6, DIV +3 and slightly larger DRI and TEC bonuses), so the misstatement misdescribes how the baseline was built. No adjustment depends on it, and the fits and roles are fine.

Proposed fix: rationale text only. Replace "upright 82.5 kg frame" with "humanoid 82.5 kg frame". Keep `adjustments: {}` and the roles.

### 14 Kakuna (lowest-20, overall 33)

Evidence:
- species: `genus: "Cocoon Pokémon"`, `shape: "squiggle"`, `spe: 35`, `def: 50`, `kickMoves: []`, `abilities: [shed-skin]`.
- adjustments: `{ PAC: -8, ACC: -10, DEF: 4 }`.
- rationale: "Genus Cocoon with spe 35 and signature Harden is close to immobile, so pace and acceleration drop. Def 50 and a hard shell make it a static blocker at best."

Problem: Harden does not appear anywhere in the species data. `kickMoves` is empty, and the packet holds no other move list. The rationale cites Harden as part of the justification for both the pace cut and the DEF bump. The rubric allows "signature moves" as franchise identity, but a reader checking the packet cannot verify it. This is the same pattern as Arcanine's Extreme Speed (see Systemic 2). The adjustments themselves are supportable from fields that are present: genus Cocoon, spe 35, and the ACC 43 baseline, which small size inflates.

Proposed fix: rationale text only. For example: "Genus Cocoon with spe 35 on a limbless squiggle shape is close to immobile, so pace and acceleration drop; def 50 makes it a static blocker at best." Keep the adjustments.

### 785 Tapu Koko (random-60, overall 90)

Evidence:
- species: `shape: "arms"` (the dataset's head-and-arms body plan with no legs), `spe: 130`, `atk: 115`, `heightDm: 18`, `weightHg: 205`.
- Layer 1 (recomputed): the arms shape gives `DRI -4, TEC -2, SHO -2, PAC -3` and no KIC change.
- baseline: `DRI 88, TEC 91, SHO 90, KIC 86`; `adjustments: {}`; `bestRoles: [W, ST, AM]`.
- rationale: "Spe 130 and atk 115 make it an explosive wide attacker, and the baseline already says so. Weight 205 (20.5 kg) and hp 70 keep it light."

Problem: the rubric asks "limbs (can it kick?)", and the rationale never addresses the shape. Landorus, which has the same `arms` shape, was trimmed (`KIC -8, TEC -5`) because it "floats... without legs." Tapu Koko keeps DRI 88 and KIC 86 and is rated a top winger with no acknowledgement that it has no feet to dribble with. The winger call itself survives, because PAC 93 and ACC 91 legitimately carry it. The problem is the inconsistent treatment of the shape.

Proposed fix: `adjustments: { DRI: -5, KIC: -6 }`, with a rationale that cites `shape arms`. W fit moves from about 90 to about 89, so `bestRoles [W, ST, AM]` stay. Also log as a Layer 1 carryover: the `arms` shape has no KIC penalty (see Systemic 4).

### 848 Toxel (random-60, overall 36)

Evidence:
- species: `abilities: [rattled, static, klutz (hidden)]`, `isBaby: true`, `spa: 54`.
- Layer 1 (recomputed): `TEC: shape +5, baby -6, abilities -2`. The -2 is Klutz (`TEC -4` at the 0.5 hidden weight). The review packet the reviewer worked from also showed `layer1Mods.TEC: -3`, which included the Klutz term.
- adjustments: `{ TEC: -3 }`.
- rationale: "IsBaby penalties are already applied, and its hidden ability Klutz marks it as clumsy, so TEC drops slightly."

Problem: the rubric's hard rule is "Do not repeat what layer1Mods already applied." Klutz is in `ability-traits.json` with `TEC -4, HAN -4`, and Layer 1 already applied it. The reviewer credited the baby penalties to Layer 1 but missed that the Klutz call had already been made there, so the same ability is counted twice. The impact on fits is small (W 36 either way), but it is a clean rule violation and the same kind of Layer 1 misread as Shuckle's original review.

Proposed fix: drop the adjustment (`adjustments: {}`) and reword the rationale to "IsBaby penalties and hidden ability Klutz are already applied in Layer 1; spa 54 is its only notable stat." Roles unchanged.

## Systemic observations

1. **Reviews were written against stale baselines.** The cached review packets (`scripts/data/.cache/review-packets/gen-*.json`, written 17:25) do not match the current Layer 1. Baselines differ for 84 of the 100 sampled species: the STA blend changed for almost all of them, the ball-shape DRI penalty went from -10 to -22 (Milcery, Rolycoly, Cosmog, Sunkern, Shellder, Glalie, Rotom, Carbink), and Wishiwashi's schooling mods (`HAN +8, DIV +8, GKP +6, REF +4`) did not exist when it was reviewed. In this sample the drift happens to be benign: the ball changes only strengthen claims like "Layer 1 already cut its ball skills", and only one rationale cites a now-wrong number (Quagsire's STA 81, now 82). The process gap is real, though. Recommended: regenerate the packets whenever coefficients change, and add a validator check that every `ATTR NN` a rationale cites equals the current baseline value.

2. **Move citations outside the data.** `kickMoves` holds only the 32 trait moves in `scripts/data/move-traits.json`, so reviewers have no way to cite any other move from the packet. None of the 100 sampled rationales cites a move as a `kickMoves` fact when it is absent. The one in-sample case is Kakuna's "signature Harden". A dex-wide scan of the review files with a small move dictionary found these out-of-sample cases:
   - Arcanine: "Signature Extreme Speed on spe 95..." This is load-bearing for `ACC +5`. Arcanine's `kickMoves` are `[headbutt, iron-head, protect, skull-bash]`. The adjustment can be defended from spe 95 against an ACC 62 baseline, but the rationale's headline fact is not in the data.
   - Metapod: "signature Harden".
   - Magikarp: "signature Splash is a high flopping leap, so AER 35 rises a little". This one is load-bearing.
   - Miltank: "Rollout charging identity". This drives a role call.
   - The rubric itself allows "signature moves" as franchise identity, so the reviewers followed the rubric as written. Recommended: either add a `signatureMoves` field to the packet so these are verifiable, or amend the rubric to forbid move citations not in `kickMoves`. Until then, Arcanine and Magikarp should be rewritten to rest on fields that are present.

3. **Heavy penalty misses DIV (Layer 1 carryover).** `heavy.attrs` covers ACC, DRI, PAC and AER only. Reviewers patched DIV by hand for Dialga, Heatran and Arceus (all `DIV -8`) but not for Regigigas. A Layer 1 term would make this consistent: for example, add `DIV: 1` to `heavy.attrs`, then remove the hand patches.

4. **The arms shape has no kicking penalty (Layer 1 carryover).** The dataset's `arms` shape is a legless body plan, but `shape.arms` has no KIC mod and only `DRI -4`. Reviewers split on it: Landorus was trimmed, Tapu Koko was not, and Claydol and Cursola were left alone (harmless, since they are not in ball-carrying roles). Recommended: give `shape.arms` a KIC penalty and a larger DRI penalty, in line with `heads`.

5. **KIC adjustments are mostly cosmetic.** KIC appears only in the GK role weight (0.05). The adjustments to Landorus `KIC -8`, Doublade `KIC -5` and the proposed Tapu Koko `KIC -6` barely move any fit, but the rationales read as if they shape outfield play. Similarly, PHY is not in the AM or W weights, so the PHY trims on small mythicals (Victini, Jirachi, Celebi, Meloetta) leave their AM 95 to 97 untouched. This is not wrong, but reviewers should know which attributes actually reach their chosen roles.

6. **Small size inflates ACC (Layer 1 carryover).** The ACC blend is `spe 0.55, light 0.25, small 0.2`, so tiny, slow species score high: Caterpie 66 (spe 45), Weedle 71 (spe 50), Cosmog 66 (spe 37), Milcery 62 (spe 34), Sunkern 55 (spe 30), Burmy 55 (spe 36), Scatterbug 55 (spe 35). Reviewers cut it for some (Caterpie, Weedle, Sunkern, Spewpa, Kakuna) and not for others (Cosmog, Milcery, Burmy, Scatterbug). Uneven hand correction of the same artifact is a sign it belongs in Layer 1, for example by reducing the small and light weights or gating them on spe.

7. **Uneven small-body trims on flat-100 mythicals.** Victini, Jirachi, Celebi and Meloetta got PHY or HAN trims for being under 0.6 m. Mew, Manaphy, Mesprit and Azelf (0.3 to 0.4 m) got none. None of this changes a best role (see point 5), but it is a calibration inconsistency across generation lanes.

8. **Design-trait citations.** In this sample, design references (Ledian's four arms, Magmortar's cannon arms, Iron Valiant's blades, Luxray's eyes, Cubone's bone) are each anchored to at least one field in the data, or they correct a real Layer 1 blind spot (Ledian's hands under the wings shape). They pass. Out-of-sample gen 3 checks:
   - Spinda `{PAS -4, TEC -4}`: rests on Tangled Feet, which is in its abilities and is not a double count, because Layer 1 maps Tangled Feet to DRI -2 only, plus the "well-known tottering design". Tangled Feet speaks to feet, not passing, so the PAS cut is mostly lore. It is acceptable at magnitude 4, but the weakest-anchored adjustment seen in this audit.
   - Kecleon `{}`: "camouflage design" only colours the role choice. Its roles DM, CM, CB track its strongest raw role blends (DM 65, CM 64, CB 63, GK 63), so the lore did no work. This is fine.

9. **Layer 1 misreads.** Shuckle's current review (`HAN -8, PAC -6`, citing spe 5 and "no hands") is now correct against the data. In-sample misreads of the same kind: Toxel (double-counted Klutz, a DISAGREE above) and Sentret (credits genus Scout for a VIS lift that came from keen-eye and frisk; harmless). Masquerain's `TAK -5` looks like a reversal of Intimidate's Layer 1 `TAK +5`, but it is a deliberate, data-backed correction (a 3.6 kg body), not a misread.

10. **Rationale unit style.** Rationales mix raw dataset units ("weight 1220", "height 54", "4300 hg") with converted ones ("0.4 m", "20.5 kg"). Every case checked was numerically correct for its unit, but it slows audit. Optional: have the rubric require one convention.

NOT RUN: the out-of-sample move scan used a small hand-picked move dictionary, so it is not exhaustive. No review files or coefficients were edited. No validator or test suite was run.

## Resolutions (added by the implementer after round 1)

Round 1 judged the data before the fixes below. Round 2 (`docs/reports/scouting-audit.md`) audits the final artifact.

| Finding | Resolution | Where |
|---|---|---|
| Regigigas GK 96 at 420 kg | Layer 1 heavy penalty now lowers DIV (Regigigas DIV -5.94); review adds REF -6 for Slow Start | commits 62e9c03, a848151 |
| Genesect rationale says upright | text now cites shape humanoid | a848151 |
| Kakuna cites "signature Harden" | Harden is in its learnset at the pinned commit, but "signature" overstated it; text now rests on genus, spe and shape (same fix for Metapod) | a848151 |
| Tapu Koko arms shape ignored | Layer 1 arms shape now KIC -8; review adds TEC -5, DRI -4 to match Tornadus and Thundurus | 62e9c03, a848151 |
| Toxel TEC -3 double counts Klutz | dropped | a848151 |
| Stale review packets and cited numbers | packets regenerated; a test now checks every cited number, stat, shape, type, genus, ability and kick move in all 1,025 rationales | 4ee63f5, a848151 |
| Moves cited but not in the data | the rubric allows signature moves; CI now checks every cited move against the full pinned learnset (163 citations, 0 unlearnable) | 7db9968 |
| Heavy penalty misses DIV | fixed in Layer 1; 7 weight-based DIV review cuts shrunk or removed | 62e9c03, a848151 |
| Arms shape has no KIC penalty | fixed in Layer 1 (KIC -8); 6 review KIC cuts removed | 62e9c03, a848151 |
| ACC blend inflates tiny slow species | blend now spe 0.75, light 0.15, small 0.1; species with ACC 15 or more above PAC fell from 222 to 24; ACC review cuts re-judged | 62e9c03, a848151 |
| KIC and PHY trims barely move fit | by design: KIC is a goalkeeping attribute in the dispatch, and PHY is not part of the AM or W blends | no change |
| Spinda PAS and TEC cuts mostly lore | logged as a weak but permitted identity call; left to round 2 | carryover |
