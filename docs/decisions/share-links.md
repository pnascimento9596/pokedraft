# Share links on Apple devices

A completed run can replay in the browser and on the server, yet its copied link can open the broken-run page. Production request logs at 2026-10-12 16:16 UTC showed requests to `/r/pd3` with no run payload and HTTP 404. Production health identified `f25ecb6190bf8be9d04781ca53c190310b16212d`.

## Reproduction and cause

The production 151 and Classic 8-0 end-to-end challenge cases passed. A fresh Open 8-0 run also replayed its full copied link, with record `1-1-1` and Team Score `283` preserved. Its URL contained 432 characters.

Foundation's `NSDataDetector` recognized only the first 39 characters of that URL, ending at `/r/pd3`. Percent-encoding the separator and replacing it with a hyphen still recognized only 39 characters. Moving the payload into `/r/pd3?t=<payload>` recognized all 434 characters. The exact original token and the detector script are retained locally under `output/share-links/` and `output/share-links/original-link.txt`.

The query format fixes the transport boundary. The internal `pd3.<payload>` token, deterministic engine, persisted history, and current and retained replay bundles keep their existing contracts. The proxy reconstructs the canonical token and rewrites to the existing result route. Existing complete path links remain supported.

A URL already reduced to `/r/pd3` cannot restore a run because its seed and actions are absent. A player can copy a corrected link from the completed results or reopen the run from History and share again.

## Validation and release

The committed RED sequence produced six failures and 26 passes in three suites. The final focused unit check passed all 48 tests in four suites. Full lint, typecheck and production build passed. The full unit suite passed 762 tests in 81 files.

The browser command `PLAYWRIGHT_PORT=3417 pnpm exec playwright test e2e/share.spec.ts e2e/challenge.spec.ts e2e/draft-modes.spec.ts e2e/old-links.spec.ts --project=chromium --workers=2` passed all 15 cases. The seven share cases were rerun after scoping their status locator to the results region. A separate real Chromium and iPhone-profile WebKit capture restored HTTP 200, record `1-1-1`, Team Score `283`, and the expected page title. The actual corrected clipboard URL was recognized in full by Foundation, 434 of 434 characters.

Native proof is repeatable with `swift output/share-links/detect-link.swift output/share-links/original-link.txt` and `swift output/share-links/detect-copied.swift output/share-links/copied-after.txt`. Browser captures are under `output/share-links/`. The first capture harness attempt matched both the results status and the global announcer. Its locator and the browser regression were scoped to the results region.

The first full Linux browser attempt recorded 589 passes, 51 existing skips, two passes on retry, and one failure in the unchanged natural wheel test. The unchanged rerun recorded 586 passes, 51 skips, five passes on retry, and one failure in the same natural-animation boundary at another width. All Share cases passed in both attempts. The focused unchanged wheel suite passed all 12 Chromium and WebKit cases.

The wheel's two spins and pauses take 4,380 ms before scheduling and loading. Its candidate assertion starts immediately after Start with a five-second deadline. The initial failed trace contains three candidate buttons 5.411 ms after the assertion failed. A retry shows both wheels settled with the final completion pause still pending. The test now waits up to ten seconds for both actual wheel results before starting its existing five-second candidate assertion, at both rounds. Its visible result, geometry, pick, and next-round checks remain. Application animation, timing, state, and scoring are unchanged. The previous exact-head approval is superseded by this test-only correction; fresh review and CI are required.

Independent exact-head review and CI receipts belong to the correction PR. Merge is a production deployment and remains pending explicit deployment authorization under the repository skill.

## Decisions

Fix Root Causes led to testing the operating system's link detector after complete production links replayed correctly. Boundary Discipline keeps URL handling outside the engine and preserves canonical replay tokens. Model the Domain represents the URL as a version path and payload query while retaining the existing run token.

The unrelated unseeded tab-restoration issue found during recon is outside this correction. No change is made to run scoring, generated data, submissions, or database schema. Browser proof uses emulated devices. Physical iPhone messaging apps are NOT RUN.

The installed `how`, `architect`, `swarm`, `arena`, `reflect`, `deslop`, `control-ui`, `control-cli`, and `create-skill` routes are skipped under `pokedraft-overrides.md`. Direct source recon, existing Playwright browser tests, and the native detector provide the corresponding evidence for this bounded fix.
