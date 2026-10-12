# Browser progress and simultaneous players

A production browser reproduction on `8788709` found that an ordinary random run returned from Round 3 to Round 1 on refresh. Its restored snapshot was rejected because Start drew a fresh seed first. A seeded unfinished run disappeared after closing its tab. Builder lineups survived through a `?b=` URL but not a plain home reopen. Separate browser contexts already kept history and active runs apart.

The browser remains the player boundary. Each profile holds its own history, stats, settings, Builder lineup, and run checkpoints. No account or server progress store is required for the friend group. The shared leaderboard retains its existing submission rules.

## Run recovery

The existing `{screen, token, daily}` snapshot is written to the tab's session storage and to a durable browser checkpoint. The tab snapshot has priority, so another open tab cannot replace its working run. Closing and reopening the site can restore the latest checkpoint for a mode, or the Daily checkpoint. This is one durable checkpoint per mode, not an archive of unfinished runs.

The lazy run module validates the snapshot's settings, explicit seed, Daily date, and exact reconstructed token before restoring. Random runs use their saved seed. The first round is saved before any pick. Restored mounts do not overwrite a newer checkpoint from another tab. Existing session-only saves gain a durable checkpoint when none exists.

New run removes the durable bytes only when they match the current screen. A cleared marker keeps that tab on Start after refresh even when another tab has a different checkpoint. Storage reads and writes remain best effort; blocked storage does not prevent play.

## Builder recovery

Plain home restores `pokedraft.builder` through the existing lazy decoder. An explicit shared `?b=` link takes precedence. Viewing a shared lineup does not save it over the browser's own lineup. Edits, Randomize, and pool changes save the exact resulting lineup synchronously before React renders the edit. Clear all and Reset clear an owned checkpoint only if its bytes still match, protecting a different shared lineup or a newer edit in another tab.

## Evidence

The failing unit guards preceded production fixes. Run guards recorded 5 failures/22 passes, then 3 failures/26 passes for first-round and clearing behavior, then 2 failures/29 passes for same-route seed navigation and legacy checkpoint migration. Builder guards recorded 6 failures/7 passes/24 existing tests skipped. The run group passed 47 focused tests. The initial Builder group passed 47, and the final group passed 49 after the browser race correction.

Local lint, typecheck, production build, and all 793 unit tests across 82 files passed. Browser coverage exercises random-run refresh, exact seeded restart and results, idempotent history, simultaneous independent players, shared replay, independent tabs, safe New run, invalid settings/seed, corrupt tab fallback, and Builder restart/shared-lineup ownership. Existing Share, Builder, and persistence cases are included in the focused browser gate. The final local browser run passed 25 cases with one existing desktop skip for the touch share sheet: 19 Chromium and six iPhone-profile WebKit cases. All six new progress cases passed in both engines. Exact-head review, CI, and deployed verification receipts belong to the PR.

A WebKit browser run found a filled Builder lineup whose checkpoint remained absent for five seconds. The previous dirty flag could be consumed by the initial empty desk's render effect. A failing unit guard was committed before the correction (1 failure/1 pass/37 existing tests skipped). Saving now occurs inside the edit transaction; the live-state effect only updates the URL. The CI browser projects include all six progress cases in Chromium and an iPhone WebKit profile.

The retained local evidence directory is `output/progress/`. Early browser harness attempts assumed two candidates for every random roll and omitted a base URL for a restarted context. Those assumptions were corrected; failure logs remain retained. A concurrent baseline and local run also collided in Playwright's default artifact directory; the accepted local run used a dedicated output directory and passed. The ordinary-run production guard was rerun after correction to prove the actual refresh regression.

## Scope and rollback

Engine actions, scoring, tokens, generated data, leaderboard persistence, and passcode policy retain their contracts. Rollback is a code revert; no database migration or cloud resource change is involved. The durable snapshots use the existing token decoder and require no schema migration.

Clearing browser site data loses local saves. People using the same browser profile share its local history and latest checkpoints; separate profiles or devices are independent. There is no cross-device synchronization. Physical mobile hardware and a guarantee of retention when browser storage is disabled are NOT RUN.

The design follows Model the Domain and Separate Before Serializing Shared State: per-tab working state and browser recovery have distinct authority. Make Operations Idempotent preserves history on results recovery. Boundary Discipline validates browser input through the canonical engine decoder. Test Behavior, Not Implementation ties acceptance to observable progress, squads, and results.
