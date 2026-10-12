# Linux native date and caption correction

The first exact-head GitHub browser job (run 38193051091, head fc070324) failed four strict delayed-font guards: 568 passed, 51 existing skips and four failures. Its 735 unit tests and static checks passed. Local macOS had passed all 623 cases; that receipt did not establish Linux acceptance.

A local Linux Playwright 1.64.0 Noble container reproduced an 18 px caption-wrap movement and native year-field movement. Explicit input height and calendar positioning alone were insufficient, as the retained red probe shows. Reserving responsive caption space and waiting for document.fonts.ready before exposing the same native date input yields zero shift entries. A neutral Loading date label occupies the fixed control space during that wait. No second font was added; Inter still uses swap.

All ten existing cold-load and delayed-font checks pass locally under Linux. Two new native-date label/editing guards were committed failing before their aria-labelledby correction. The original strict zero-shift assertions and mobile acceptance suite are unchanged. Full exact-head GitHub CI and the new independent review remain required.

Text receipts retain the raw and normalized SHA256 in normalization.json. The Docker probe is supporting evidence, not the clean-runner Lighthouse measurement.

Final correction checks: Linux 12 passed and macOS 62 passed, with zero axe violations and strict zero CLS. Native Date editing preserves its label, type, 2026-10-09 value, route and focus. An explicit aria-labelledby prevents the transient Loading date label from changing the control’s accessible name. Results and leaderboard snapshots retain 186 and 10 figures per theme.

The earlier unit receipt passed 735 tests. A concurrent repeat hit four unchanged-test timeouts (731 passed); an isolated repeat also encountered a five-second replay import timeout. These runs are not accepted as green. The exact new head must pass all 735 tests on the clean GitHub runner before merge. No assertion or timeout was relaxed for these failures.
