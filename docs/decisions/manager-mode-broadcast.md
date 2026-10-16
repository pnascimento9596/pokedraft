# Manager mode UI and the Live match broadcast

The UI half of engine 6. No file under `src/engine` changed, and no engine API change was needed.

## Settings: two preferences, not draft settings

`managerMode` (default off, "Manager mode", hint "Make tactics and substitutions from the touchline
during each match") and `matchView` (`quick` or `live`, default `quick`, shown as "Match view:
Quick sim / Live match") live in the panel settings next to the ratings switches. `parsePanel`
reads both defensively, so a stored panel from before this change, or a hand-edited one, falls back
to the defaults. They show on the home panel (a Matchday section) and on every challenge start
screen (`/play` and `/daily`) through `MatchdaySettings`, which writes the same panel. Builder runs
are friendlies and never enter the matchday.

With manager mode off and the quick view, See results goes straight to the results exactly as
before (`playsMatchday` is false, and an e2e test pins it).

Principles: keep the default path byte-for-byte unchanged; the matchday is a preference, so it
must never change what a token means.

## Every decision is replayed through the engine

The matchday flow holds the cup and the manager list. A touchline decision is checked twice:
first against what the touchline can see (order, the final whistle, the same tactic, the 5
substitution limit, an empty slot, a used or absent bench seat), so the copy can say why, and then
by `runCup` itself. Only a decision the engine accepted reaches the list, so the token the flow
finally encodes always replays. The finished token is `encodeToken({...draftToken, manager})`, it
is replayed once more, and the normal results page and share link follow. The e2e test opens the
share link and checks the record, the Team Score and the Coached pill match.

Each decision costs one `runCup`. Measured in node, `runCup` took about 174 ms per call over 20
iterations. That is a pause on a tap, not a frame budget, so it runs synchronously.

### When a decision lands

- The engine applies decisions at minute t before the items of minute t+1, and the assistant's own
  boundary changes (auto tactic, fatigue subs at 60' and 75') come after a decision at the same
  minute. `incidentsBefore` and `revealed` follow that order, so a decision at t never shows an
  assistant change it would erase. While the clock runs, `decisionMinute` records a decision at the
  next minute once the assistant's boundary change at the current one is already on screen.
- Kickoff, half time and the break before extra time stop the clock in manager mode. Each user
  injury stops it too, with the assistant's pick preselected. Confirming the assistant's pick
  records nothing, so the run stays uncoached if that is all the player did. A different pick
  records a sub at the injury minute and slot, which the engine treats as the injury override.
- After the first recorded decision of a match the touchline says "You have the touchline. Your
  assistant stops making changes this match."
- Bench availability comes from the fielded lineup: an absence moves a bench player into the
  eleven and the absentee into that seat, where nobody can bring them on.

## Broadcast

`Broadcast` is loaded with `next/dynamic` (`ssr: false`), and it loads the canon movesets with a
dynamic `import()` on mount. `@/data/movesets` is imported as a value nowhere else, so neither the
first page load nor the quick view carries the artifact.

- The choreography is a pure timeline (`src/ui/matchday/timeline.ts`) seeded from `src/lib/rng.ts`
  with `broadcast:<seed>:<matchIndex>:moves` and `:drift`. The same match always draws the same
  drift and the same move picks. The ESLint determinism rules now cover `src/ui/matchday` and
  `src/ui/manager`.
- Players stand at their formation slot coordinates (bosses without a recorded shape use 4-3-3),
  and each line shifts with the tactic in that window. The ball sways toward the side making
  chances. Every sprite goes through `PlayerImage`.
- A goal plays the assist, the scorer and the shot, then the scorer's canon move ("Shuppet used
  Phantom Force!"), then a goal flash. The move is picked from the damaging moves with a power
  value, then any move, then a plain "X shoots!". Fire, water, electric, grass, ice and psychic get
  their own effect colour; every other type gets a generic impact. Saves call the keeper's
  `keeperMove` (shield) or "X dives!". Cards flash a referee card, injuries a medic cross, subs a
  board, tactic changes a touchline banner, and the shootout shows each kick.
- A retained run with no windows or incidents shows goals only, with a note.
- Reduced motion keeps the pitch still at the slot positions, shows the latest event without
  movement, and keeps the ticker.
- Pace: live is 25 s per half (one 5 minute window is about 2.8 s), 8 s per extra-time half and
  1.2 s per kick, with holds on goals and saves. Quick is about 5 s per match. Both have pause, 2x
  and skip to full time.

## Results and the board

- Results list each match's incidents (`MatchIncidents`, copy from `format.ts`), and the existing
  results broadcast feed (`MatchdayLive`) interleaves them with goals and saves.
- `BoardEntry.coached` is derived in `toBoardEntry` from the stored token by `isCoached`. There is
  no column and no migration. The client schema requires the field, so a board reply without it is
  shown as an error, not read as uncoached.
- The rule: a token whose version is in `MANAGER_TOKEN_VERSIONS` (`[6]` today, in
  `src/ui/manager/coached.ts`) and whose base64url JSON payload has more than three elements. The
  payload is `[compactSettings, seed, actions, manager?]`, and `encodeToken` writes `manager` only
  when it is non-empty. `isCoached` parses the JSON itself and does not call the live decoder, so a
  coached pd6 run keeps its marker once pd6 is a retained version. A future token version with the
  same layout is appended to the list; one with another layout needs its own rule.
- Engine 6 shipped a temporary guard that refused coached tokens at submit, so no coached run could
  rank unmarked. This dispatch ships the marker, so the guard is gone. A handler test pins that a
  coached token gets 201 with `coached: true` and an uncoached one `coached: false`, and its RED
  run (422 from the guard) was committed first.
- Rows carry a "Coached" chip. The All / Uncoached / Coached filter is server side. `GET
  /api/leaderboard` takes `coach=all|uncoached|coached` (default `all`, any other value is 400
  `INVALID_QUERY`) and echoes it as `BoardOk.coach`. Each view is its own top 50 in board order,
  ranked 1..n inside the view. The first cut filtered the fetched All top 50 in the browser, so a
  board whose top 50 were all coached showed an empty Uncoached view while uncoached runs existed
  below it. A PGlite test pins the fix: 51 coached rows above 1 uncoached row give Uncoached exactly
  that row at rank 1, Coached ranks 1 to 50, and All 50 rows without it. Its RED run was committed
  before the fix.
- The filter runs in SQL as `coachedSql` in `src/leaderboard/server/store.ts`, built from the same
  version list: for each version, `CASE WHEN token LIKE 'pd<v>.%' THEN
  jsonb_array_length(convert_from(decode(rpad(translate(substr(token, n + 1), '-_', '+/'),
  ((length(token) - n + 3) / 4) * 4, '='), 'base64'), 'UTF8')::jsonb) > 3 ... ELSE false END`,
  where `n` is the length of `pd<v>.`, computed from the version string. A PGlite test selects the
  predicate over stored tokens (pd6 coached once and twice, pd6 uncoached, a coached pd6 builder
  run, pd5, pd3 and a pd1 golden) and asserts it equals `isCoached` row by row as literal booleans,
  so the SQL and TypeScript rules cannot drift apart unseen.
- Cost: the predicate decodes the token of each row it reads. The query keeps the board order and
  the limit, so the scan reads rows in board order until 50 match. On a board where one view is
  rare it may read the whole board, which is small for one friend group. If boards grow, the fix is
  a stored `coached` column written at submit, with a migration.
- Postgres `decode` and the jsonb cast throw on malformed input. Stored tokens are canonical (the
  submit handler re-encodes every run with `encodeToken`), so this cannot happen for an admitted
  row; a hand-inserted bad token would make the filtered query fail with a 503, not mislabel rows.
- The submit reply's rank is still the overall board rank (`rankOf` ignores the coach filter).
- The board client sends `coach` only for a filtered view, so the default request URL is
  unchanged. The coach view is part of the request key and refetches on change, and a reply for
  another view, or without `coach`, is shown as an error. Once the board has shown rows, the chip
  row stays mounted through filtered loads, errors and empty views, which say "No coached runs on
  this board yet." or "No uncoached runs on this board yet." An empty All board keeps the existing
  empty state with no chips.

## Carryovers and limits

- A reload during the matchday returns to the finished draft (the saved snapshot is still the
  draft), and decisions made so far are lost. The results are saved only once the cup finishes.
- `savedRun.rebuild` now checks the draft part of a coached token and that the token is in the form
  this build writes. Before, a coached run's results never restored. The guard test was committed
  failing first (`385bc84`).
- There is no "Watch live" replay of a finished run from the results page yet. The matchday only
  plays new runs, so no screen shows the goals-only fallback today.
- The phone e2e for manager mode runs on pixel-7. WebKit cannot grant clipboard permissions, and
  the test reads the share link from the clipboard.

Principles: no fabricated state (every number shown is the engine's own), the token is the only
truth, keep the matchday reversible and out of the default path, and prove the UI in a real
browser.
