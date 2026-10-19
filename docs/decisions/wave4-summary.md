# Wave 4 summary (Green)

## Scope

Close Wave 4: the program-log entry, the owner phone and screen reader checklist, the owner account
items, and the read-only leaderboard query that decides 5f's urgency. No product code changes.

## Files

- `docs/reports/audits-2026-10-17/program-log.md`: the Wave 4 entry (PR table, order and why,
  measurements that moved, brief vs code, open carryovers).
- `STATE.md`: the PR #123 merged paragraph and this section.

## Leaderboard duplicate check (before 5f)

Run 2026-10-19 20:11 UTC against Neon project `summer-lab-87419384`, default branch, one read-only
`SELECT`. `leaderboard_entries` holds 3 rows. Groups with an identical squad result (mode, variant,
seed, daily date, Team Score, wins, draws, losses, engine version) under more than one distinct
nickname: 0. 5f stays the first row of Wave 5, as decided; there is no live abuse to clean up first.

## Owner phone check (NOT RUN; owner action)

After 4i, on iPhone Safari and one Android phone, against production. Use the ten items in
`docs/decisions/wave3-summary.md`, plus:

1. Add to Home Screen: the icon (soccer ball on pitch green) looks right and the app opens
   standalone, with no browser bar.
2. Notch and home bar: the header, the draft toast and the page bottom are not hidden.
3. The draft drag feels smooth; the 48 px sprites and one-line names read well.
4. No pull-to-refresh bounce during the draft.
5. Fast spins feel fast but readable.
6. With the app on Auto, switch the OS between dark and light: the page and the status bar colour
   follow.
7. Follow camera: note any jump in the ball (the 4-0 guard covers the maths; the eye is the check).
8. Home at about 960 to 1024 px wide (a tablet in landscape): two columns, nothing cut off.

## Screen reader pass (NOT RUN; owner action)

VoiceOver on iPhone is enough. Cover the skip link, the nav's current page, the draft tokens (they
read "{slot} {name}"), the dossier tabs, the touchline subs and the error page's retry.

## Owner account items

1. Vercel MCP access for the pokedraft project. The connected Vercel team lists other projects but
   not pokedraft; Wave 7's csp-report and runtime-error reads need it.
2. Credential rotation after the Neon cutover: STATE.md still records it as not performed.
3. A Vercel WAF rate limit on `/card` and `/r/*/opengraph-image` cache misses.

## Decisions

- Keep 5f in Wave 5. It is Red (migration, backfill, unique index) and Wave 4 was Yellow; the query
  shows 0 duplicate groups, so waiting costs nothing.
- Record the four order swaps and the parallel platform builds in the program log rather than
  re-order history: each swap kept files disjoint and merges serial.

## NOT RUN

- The phone check, the screen reader pass and the account items above.
- Unit tests and the e2e suite on this branch: nothing under `src/` or `e2e/` changed. CI runs them.
