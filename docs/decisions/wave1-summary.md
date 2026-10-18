# Wave 1 summary (Green)

Branch `docs/wave1-summary` off `4173b94`. Docs only: appends the Wave 1 entry to
`docs/reports/audits-2026-10-17/program-log.md`, as section 7 of the brief asks at the end of each
wave.

Decisions:

- Every number in the entry comes from a STATE section, a hosted CI log or a production check run in
  this program. Nothing is estimated.
- The table lists all twelve program rows in merge order, so 1k sits before 1i and 1j. The reorder is
  stated with its reason, the audits having gone public in #71.
- Carryovers name what is unfixed, including process slips (one force-push on #72), so the next
  wave starts from the real state.

- PR #70 is not in the record: it merged as `40f3c92`, the commit both audits read, before the
  program started at `f4489cb`.

Gates: the coordinator ran lint, typecheck, unit tests, build and a Prettier check on all three
changed files at the reviewed head. Hosted CI runs the same and the full e2e suite.
