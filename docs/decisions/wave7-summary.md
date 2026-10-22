# Wave 7 summary and program closeout (Green)

## Scope

Close Wave 7 and the entire platform improvement program:
- Update `STATE.md` with the PR #176 merge record and Wave 7 completion.
- Append the Wave 7 program-log entry in `docs/reports/audits-2026-10-17/program-log.md`.
- Deliver the comprehensive program closing report `docs/reports/audits-2026-10-17/closing-report.md`.
- Close all items across `docs/queue/*.md` (`dispatch-7-deferred.md`, `dispatch-7-frozen.md`, `engine-followups.md`, `scouting-carryovers.md`).
- Document owner verification checklist for physical phones and screen readers.
- No product code changes; docs and reports only.

## Summary of Wave 7 Dispatches

All 18 planned rows merged cleanly across 18 PRs (#159 to #176):
- 7-0 (PR #159, `8a29610b`): Playwright live checks through passcode gate.
- 7ci (PR #160, `040781bb`): CI hygiene, Node 24, pinned action SHAs, format check, Postgres job.
- 7pm (PR #161, `24386947`): Proxy matcher trim excluding static and health paths.
- 7cq (PR #162, `edb04432`): Non-canonical `/card` queries redirect 308 to canonical query order.
- 7rb (PR #163, `90ee0f72`): Database rollback row count check and `--drop-data` guard.
- 7csp (PR #164, `fc890c09`): Content-Security-Policy header enforced across all routes.
- 7bp (PR #165, `a26daf01`): Rich OpenGraph squad link previews for `/?b=` URLs.
- 7zd (PR #166, `a560015e`): Classic Zod replaced on client; instant `/daily` server first paint.
- 7q1 (PR #167, `d23e15f6`): Matchday and broadcast carryovers sweep.
- 7q2 (PR #168, `c9c7ccd8`): App surface carryovers sweep (skip link, error pages, accessibility).
- 7cr (PR #169, `9c1db3b4`): Credential rotation runbook and security verification.
- 8a (PR #170, `363fed60`): Content-addressed engine data blobs under `_blobs/`.
- 8b (PR #171, `f2f01113`): Freeze Engine 7 into retained bundle.
- 8c (PR #172, `d6a165d1`): Dormant Defend against direct multiplier candidate.
- 8e (PR #173, `2c288bbc`): Engine 8 calibration with V8 candidate (Row 8d dropped).
- 8x (PR #174, `b823acff`): The flip to Engine 8 (`pokedraft-engine-8`, token version 8).
- 7sp (PR #175, `acdd8f00`): Species chunk split into slim index and 9 lazy generation chunks.
- 7x (PR #176, `8e071295`): Refreshed 360 px mobile matchday screenshots and GIF.

## Owner phone check (NOT RUN; owner action)

On iPhone Safari and one Android phone, against live production (`https://pokedraft-woad.vercel.app`):

1. **Passcode gate:** The gate prompts once for the passcode, sets the secure cookie, and remembers the device across reloads and tab closes.
2. **Squad link previews:** Copy a builder squad link (`/?b=...`) and paste it into a group chat (iMessage, WhatsApp, Telegram, or Discord). The link unfurls with squad title, rating, and preview image without being blocked by the gate.
3. **Instant Daily paint:** Open `/daily`. The page renders content immediately on initial paint instead of showing a blank or loading indicator.
4. **Engine 8 coaching feel:** Draft a squad in manager mode. When facing a direct opponent, following the scout's tactical tip (Defend against direct) visibly helps a strong squad and rewards sound tactical reads.
5. **UI carryover polish:**
   - Tap "New run" mid-draft: confirm dialog prevents accidental resets.
   - Picker search ignores accents and apostrophes.
   - Screen reader skip link jumps directly to main content.
   - Offline or error states show themed error screens.

## Screen reader pass (NOT RUN; owner action)

Using VoiceOver on iOS or TalkBack on Android:
- Passcode gate input announces field requirements and error states cleanly.
- Builder pitch slots announce player names and roles without duplication.
- Live match ticker polite region announces goals only after ball crosses the line.
- Skip to content link functions at the first tab stop on every page.

## Decisions

- **Goal-kind centring dropped (Row 8d):** Calibration pins P1 to P6 do not depend on goal kind and the owner did not request changes. Dropping 8d avoided unnecessary coefficient churn.
- **Species chunk split timing:** Executed after the Engine 7 freeze so historical bundles remain intact while modern Engine 8 benefits from 48.2% faster initial load.
- **Production evidence grounding:** All screenshots, GIF, and measurements were re-shot directly from live production at `8e071295`.

## NOT RUN

- Owner physical phone checks (owner action).
- Physical VoiceOver / TalkBack verification (owner action).
- Unit tests on this branch: docs and reports only (CI verifies).
