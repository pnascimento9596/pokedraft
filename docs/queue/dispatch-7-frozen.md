# Dispatch 7 findings in frozen areas (report only)

These live in paths dispatch 7 froze (scouting numbers and data). Evidence is in `docs/reports/platform-audit.md` under each ID. Not changed by dispatch 7.

| ID | Area | Sev | Mobile | Finding | Tier |
|---|---|---|---|---|---|
| SF-20 | F-tests | S3 | no | The scouting test 'raises KIC only for keepers' cannot fail today, because no species has a positive KIC adjustment | Red |
| SF-29 | F-tests | S3 | no | The queued GK review rule has no test, and 2 of 160 GK-best species (Jigglypuff and Wigglytuff) already break it | Red |

## Status after Wave 6 row 6-0

| ID | Status |
|---|---|
| SF-20 | Closed. Engine 6 (#61, `6915a84`) added a synthetic positive control, so the KIC rule can fail: `src/scouting/__tests__/review-rules.test.ts:28-32`. Recorded in `docs/decisions/engine-6-manager.md:71-80` |
| SF-29 | Closed. Engine 6 (#61, `6915a84`) added the GK rule test with a synthetic positive control (`src/scouting/__tests__/review-rules.test.ts:34-55`), and Jigglypuff and Wigglytuff no longer list GK as a best role (`docs/decisions/engine-6-manager.md:71-80`) |

## Status at Program Close (Wave 7)

All items closed:
- SF-20: Closed. Engine 6 (PR #61, squash `6915a84`) added a synthetic positive control ensuring the KIC rule can fail (`src/scouting/__tests__/review-rules.test.ts:28-32`).
- SF-29: Closed. Engine 6 (PR #61, squash `6915a84`) added the GK rule test with a synthetic positive control (`src/scouting/__tests__/review-rules.test.ts:34-55`), and Jigglypuff/Wigglytuff bestRoles were corrected.
- No open frozen findings remain.
