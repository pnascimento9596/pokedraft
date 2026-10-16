# Opponent completion dispatch: club regions and recorded saves

The user approved the full October 15 roadmap in separately reviewed dispatches and named two
items still open after the UI and infrastructure releases: club-specific region identity and
named goalkeeper save/highlight events. This dispatch delivers both. It freezes engine 4 before
the live event contract moves to engine 5.

## Acceptance

| Contract | Evidence |
| --- | --- |
| Engine 4 frozen before the live contract moves | `src/engine/versions/v4`, provenance check against `bb2fd16` (34 files, only `@/` import lines differ), bundle digest `dc448ff8…abbfb` pinned in `versions.test.ts` |
| Retained v4 replays byte-identical to shipped engine 4 | Raw v4 replays of the engine-4 golden cup8 and kanto151 tokens hash to the engine-4 live golden digests `8520e109…` and `1da7e560…` |
| pd4 links route to the frozen bundle with no saves | Dispatcher test: `pokedraft-engine-4`, `retained-engine-bundle:v4`, `current: false`, no match carries `saves` |
| Saves come only from recorded simulation events | `saves.test.ts` pins literal events. Every keeper is that side's goalkeeper and every shooter is an eligible starter of the other side |
| A failed penalty is not a save | The shootout fixture has 4 missed kicks and no save after minute 120 |
| v4/v5 outcome parity is proven, not assumed | 40 paired runs in CI and a 1,000-run local campaign across cup8, kanto151 and builder. Once saves and the version string are removed, draft and cup output equal the frozen v4 bundle exactly (24,198 saves recorded) |
| Club regions are verified presentation only | `src/ui/club-identity.ts` with sources in `docs/dispatches/club-region-identity.md`; all 39 club IDs rendered in tests; no engine or data import |

## Save model

Engine 4 resolves goals as `period.chances` Bernoulli trials per team: 50 in regulation and 17 in
extra time. A trial is a slice of the goal rate, not a shot. The first draft recorded every
non-goal trial as a save attempt. That produced 42 saves in one 0-1 match, so it was rejected
before any pin.

Engine 5 keeps every scoring draw exactly where it was. For each non-goal trial it draws only
from a per-side `save_events` substream: the shooter, weighted by `SHO` and role factor, then one
save draw. That draw has probability `ON_TARGET_SHARE × clamp(0.35 + (keeper handling − SHO) / 250,
0.1, 0.7)`. The keeper handling blend is `0.35 REF + 0.3 DIV + 0.2 HAN + 0.15 GKP`.
`ON_TARGET_SHARE = 0.15` is a simulation design parameter that sets save volume. It is not a
real-world calibration. A 400-match probe measured a mean of 2.71 saves per keeper per match,
with a maximum of 11, and 84 of 800 keeper-matches had none. Substreams are keyed by name, so
adding `save_events` shifts no other stream.

## What a recorded save means

The engine does not simulate shots. Each chance trial only decides goal or no goal, and keeper
strength already lowers that goal rate through the GK line (`wGk × GK` in `expectedGoals`). A
recorded save is the engine's classification of a trial that did not score. It is drawn during
the same chance loop, at that trial's minute, from the save stream. It never prevents a goal and
never changes a score. Better keepers record more saves because the save draw uses their handling
attributes. The results UI states this beside every save list.

A model in which saves stop goals was considered and rejected for this dispatch. It would change
scoring, break the requested v4/v5 outcome parity, and invalidate the 120,000-cup difficulty
calibration. That would need its own Red engine dispatch with fresh calibration and new goldens.

## Decisions

Model the Domain kept saves as their own typed event (`SaveEvent`, optional on played matches),
not a relabeled goal or penalty kick. Retained engines show no save list instead of an invented one.
Fix Root Causes replaced the every-trial attribution with an explicit on-target gate instead of
capping the displayed list. Test Behavior, Not Implementation led to literal recorded events and
a paired comparison against the frozen bundle, not a structural presence check. Sequence Work into
Verifiable Units kept the committed RED guards ("test(engine): expose missing recorded goalkeeper
saves" and "test: guard verified club region identity display") ahead of each fix.

## Risks and carryovers

- An in-flight engine-4 page submitting after deploy receives the existing
  `ENGINE_VERSION_MISMATCH` reload prompt, the same transition as engine 3 to 4. Boards do not
  filter by engine version.
- Save volume is a design choice. Changing `ON_TARGET_SHARE` later is an engine change that needs
  a new version.
- Club regions rely on secondary game references where official pages did not load.
