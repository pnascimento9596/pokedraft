# Scouting carryovers

Logged by dispatch 1 (`docs/decisions/dispatch-1.md`, carryover rows) and frozen in dispatch 2. Ratings do not change in dispatch 2. GATE 6 measures each item against the engine. A later Red lane fixes an item only if its measured impact warrants it.

Each item gets two numbers from `scripts/calibrate.mts`:

- **Placement rate.** How often the good-player bot places a flagged species in the flagged role, over 5,000 seeded cup8 drafts.
- **Score delta.** How much Team Score moves when that species is swapped for the next-best option at that slot.

| # | Carryover | Flagged species and role | Placement rate | Score delta |
|---|---|---|---|---|
| 1 | Claw and blade bodies keep a "handling" weakness at HAN 70 or more, because shape cannot tell claws from hands | 11 non-quadruped species (Scizor, Garchomp, Escavalier, Ceruledge, Koraidon and others) at GK | pending GATE 6 | pending GATE 6 |
| 2 | HAN and DIV have no size signal | GK species at the extremes of height and weight | pending GATE 6 | pending GATE 6 |
| 3 | 12 pace-weak species list FB first among their best roles | those 12 at FB | pending GATE 6 | pending GATE 6 |
| 4 | Barboach, Burmy and Tynamo have PAC 27 to 28 from shape cuts but keep W or WB best roles (spe 36 to 60) | those 3 at W and WB | pending GATE 6 | pending GATE 6 |
| 5 | Squiggle (serpentine) height is body length, which inflates AER | squiggle species at CB and ST | pending GATE 6 | pending GATE 6 |
