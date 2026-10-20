# Wave 5 summary (Green)

## Scope

Close Wave 5: the program-log entry with the database receipts, the owner phone and screen reader
checklist, and the owner items that are still open. No product code changes.

## Files

- `docs/reports/audits-2026-10-17/program-log.md`: the Wave 5 entry (PR table, order and why,
  measurements that moved, brief vs code, database receipts, open carryovers, Wave 7 additions).
- `STATE.md`: the PR #139 merged paragraph and this section.

## Owner phone check (NOT RUN; owner action)

One consolidated session on iPhone Safari and one Android phone, against production. Use the lists
in `docs/decisions/wave3-summary.md` and `docs/decisions/wave4-summary.md`, plus:

1. Share on results opens the phone's share sheet with "7-1-0, Team Score 812. Beat it?" style
   text and the link.
2. Download image shares the card straight away, with no second tap.
3. "Challenge a friend", then the friend plays, then results show the head-to-head table and the
   right verdict.
4. The board highlights your own row after you submit, and "Share my rank" opens the sheet.
5. Exhibition from a history row: manager stop, sub, finish.
6. The results reveal feels quick, not slow. With reduced motion on in the OS, there is no
   animation.
7. The achievements grid shows earned dates. A new achievement shows its chip on the card.
8. "Friends on this seed" on results and on a shared `/r/` page; at the narrowest phone you own,
   the table fits without sideways scrolling.
9. The all-time board shows current-engine runs by default; "All engines" adds older runs with an
   "Engine vN" label.
10. Early provisional Team Score swings during the draft (869 to 240 on the second pick in 4c) look
    acceptable to you (carried from Wave 4).

## Screen reader pass (NOT RUN; owner action)

VoiceOver is enough. Cover the board own row and its "you", the board's pressed buttons, the
challenge labels, the Share fallback input, the head-to-head table, the exhibition picker, the
results headings, the seed table and the achievements grid.

## Owner items still open

1. **Passcode gate is off in production.** `FRIENDS_PASSCODE` is not set in Vercel Production
   (checked 2026-10-19), so `src/proxy.ts`'s gate does not apply and the API answers without a
   cookie. Server replay, the per-IP limits and the 5f2 copy guard still apply. Setting it is your
   call.
2. **Credential rotation after the Neon cutover.** Decided for Wave 7; the agent asks for a
   one-word yes at the destructive step.
3. **WAF rate limit on `/card` and `/r/*/opengraph-image`.** Decided for Wave 7, after the `/card`
   canonical query; the agent asks for a one-word yes.

## Decisions

- The health cron (#128) was removed the same day at the owner's request (#130). No scheduled
  monitoring is added in later waves.
- Two hosted-CI failures were treated as real, not reruns: the play badge test budget (#135, its own
  PR before 5e) and the seed table at 320 px on Linux fonts (fixed inside 5g, both receipts rerun).
  Later briefs required 12 px of headroom at 320 px and a measurement at 308 px.

## NOT RUN

- The phone check, the screen reader pass and the owner items above.
- Unit tests and the e2e suite on this branch: nothing under `src/` or `e2e/` changed. CI runs them.
