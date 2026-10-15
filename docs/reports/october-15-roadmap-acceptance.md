# October 15 roadmap acceptance map

This maps the five approved waves and the starting handoff's remaining-work matrix to source and measured dispatch evidence. Implementation is not a production receipt. PR #51 is shipped; PR #52 and the infrastructure dispatch require their final release receipts.

| Scope | Implementation and evidence |
| --- | --- |
| Data-free proxy and token handling | Request-boundary malformed-link checks; `src/proxy.ts`; share browser suite proves HTTP 404 for malformed versions 1 through 4. |
| Selected retained-engine loading | Async version router and version tests. First dispatch production browser receipt covers retained outcomes. |
| Identical retained JSON deduplication | Infrastructure server-only loader, actual emitted payload census, and five emitted replay hash checks. Frozen source and generated data remain unchanged. |
| Species metadata and scouting lookup | `src/engine/species.ts` rejects mismatched IDs/names/generations and normalizes species. `src/scouting/scouting-data.ts` exports the shared lookup used by FitReveal and dossiers. Build validates both 1,025-row artifacts. |
| Submission queries and concurrency | Infrastructure store combines retry/conflict/admission. Fresh submission uses three queries; accepted retry uses two. Independent 24-connection races prove serialized limits. Production cutover remains required. |
| All-time index and image pipeline | PR #50 includes the all-time index. `src/components/share/card-images.ts` memoizes in-flight image conversion by pack/species and processes unique starter images concurrently. No request-latency improvement is inferred from this source inspection. |
| Isolated database fixtures | Real PGlite snapshot clients and real teardown; separate migration/backfill tests. Fixture timing is a local setup measurement only. |
| Partial chemistry and line feedback | `src/ui/partial-rating.ts`, all-formation full/partial parity guards, and SquadFeedback. Numerical line strength requires ratings enabled. |
| Tactical labels, reasons, recommendations, swaps | Filled Pitch labels, clickable chemistry reason filters, Picker, dossier mini pitch and real placement/swap comparisons. PR #52 browser guards include blind-mode behavior, all sixteen squad positions, compact Picker and label containment. |
| Matchday and linked results | MatchdayLive, broadcast-table, BossRoster, FitReveal and recorded event types. Actual progressive group fixtures, shootout identity and all-squad scouting are covered by engine/UI tests and focused browser proof. |
| Sound and phone controls | Procedural special reveal cues and 44 px visible draft sound control. Browser emulation proves layout; physical audio quality remains unmeasured. |
| Seed challenges, import, formation and social rows | Existing shared-run challenge/import and daily formation settings, plus history/board squad previews and challenge links. Malformed or unavailable metadata is not invented. |
| Saved-squad exhibitions | Recorded 90-minute goal playback, pause/resume, full-time result and rematch reset. Keeper lookup has an explicit undefined guard. Matches remain unranked and do not write history or boards. |
| Career and Hall of Fame | Local ranked match win rate by formation and searchable/paginated coverage of all 1,025 species. Scope is the browser's retained 50-run history, including bench species and excluding exhibitions. Old records without squad metadata remain unknown. |
| Engine 4 tactical and attribute depth | Frozen v3; eligible themed eleven, captain/style, bounded XI line-strength effect, PAS/VIS/DRI creators, stamina-dependent availability/extra time, keeper penalty attributes and typed goals. See the engine completion record. |
| Calibration and goldens | 120,000 calibration cups, 160,000 Golden Boot cups and 170,000 win-curve matches. Literal retained/current goldens and reports preserve exact outcomes and uncertainty. |

## Boundaries and remaining audit queue

The handoff explicitly labels the two-leg exhibition format optional. The implemented exhibition contract is one 90-minute unranked match. Club-specific region identity and named opponent save/highlight events appear separately in the handoff's unfinished approved-work matrix without that optional marker. They remain required follow-up work. No user cancellation has been established. The broad keeper/event wave is implemented, but that does not establish these narrower items.

Opponents use a deterministic type theme and explicit 4-3-3. The club names refer to Pokémon cities. A verified presentation registry can supply club regions without changing shipped v4 simulation. Current matches record goals and penalty nonconversions, not named saves; a failed penalty cannot be relabeled a save. Adding recorded save events requires freezing the shipped v4 contract before advancing the current engine. The remaining follow-up must preserve all existing v4 replay output and receive its own review and release gates.

The older scouting queue remains open. Fresh source inspection confirms `review-rules.test.ts` still has the positive-KIC predicate without a synthetic positive control and no lowest-blend GK rule. Historical Jigglypuff/Wigglytuff findings therefore cannot be declared fixed. The queue requires a separately measured Red scouting lane before changing data. It predates this platform roadmap and is retained explicitly, not silently removed. Current and frozen scouting bytes were preserved throughout these three dispatches.

Physical iPhone/Android hardware, audio hardware, a new Lighthouse campaign, durable account history, production credential rotation, and unimplemented optional extensions are not covered by the local gate counts. Reports retain the Builder bot inversion and finite-sample Golden Boot uncertainty.

## Latest combined local checkpoint

Infrastructure source `47e24a107568ad2ceafaa50840975216699d2a41`, stacked on UI head `40723142cd9bdea99b16bbc4ece93de407a2f2c0`, passed 1,048 unit tests in 119 files, all source/build/seam/theme/migration-generation checks, five emitted retained replay hashes, and 36 production-build Chromium browser checks. Emitted retained JSON payloads total 2,088,694 bytes in three copies. The browser selection covers data split, current/retained replay, sharing, health, images, pitch regressions and history controls. These are local results before the final squash rebase and production cutover.
