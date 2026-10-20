# Head-to-head challenges (Wave 5, row 5b)

Branch `feat/head-to-head` off `origin/main` at `71a86ec` (PR #131, which ships 5a's `shareLink`).
Yellow. No file under `src/engine`, `src/data` or `src/scouting` changed, so the goldens are
untouched.

## Scope

- **Challenge a friend.** Live results of a ranked run (cup8 or 151, Daily included) show a
  "Challenge a friend" button in `ShareActions`. It shares `versusHref(token)`, the same-seed
  `/play` link plus `&vs=<token>`, through 5a's `useLinkShare` (share sheet on a phone, clipboard on
  a computer, the "Link" box when both fail) with the text "I went 1-1-2. Can you beat it on the
  same seed?". A builder friendly has no seed to challenge, so the button is not there.
- **One challenge link.** `ShareActions`' inline copy of the challenge link is deleted. The shared
  page's "Challenge this Seed" calls `challengeHref(token)`. `challengeHref` now reads the token
  through `readTokenRun` (`src/ui/versus.ts`) and builds the link with `challengeLink(settings,
  seed)` (`src/ui/settings.ts`), so the link and the `vs` check below share one definition.
- **The `vs` param.** `parsePlayQuery` returns `{ settings, seed, vs }`. `vs` is a `Versus`:
  `{ kind: "live", token }` for a `pd6` token, `{ kind: "retained", token, engine }` for `pd1` to
  `pd5`. `PlayScreen` passes it through `Challenge` to `LiveRun`. New run deletes `vs` from the
  address along with `seed`.
- **HeadToHead.** `src/components/results/HeadToHead.tsx` renders right after the results hero
  through a new `versus` slot on `ResultsView`. It is pure over your `{ draft, cup }` and an
  `Opponent`: their `{ draft, cup }`, or the retained engine number. It shows the verdict, both
  records and Team Scores, a round table (each round either side played, `finalScore`, "Out" for a
  round a side did not reach, "(won on pens)" or "(lost on pens)" after a shootout), and "Send it
  back", which shares your own run the same way. `opponentOf(versus)` replays a live token with the
  live engine and returns null when it does not replay; `LiveRun` calls it only on the results
  screen.
- **Verdict.** `seedVerdict` orders like the board: wins, then draws, then Team Score. "You win the
  seed", "They win the seed", or "Level on the seed" when all three tie.
- **Retained runs.** A `pd1` to `pd5` `vs` still plays the same seed and settings. HeadToHead shows
  only "Their run used engine v5, so there is no side by side." and Send it back. No server change.

Files: `src/ui/{versus.ts,settings.ts,challenge-href.ts}`,
`src/components/results/{HeadToHead.tsx,HeadToHead.module.css,ShareActions.tsx,ResultsView.tsx}`,
`src/components/run/{PlayScreen.tsx,LiveRun.tsx}`, `scripts/e2e/render-pins.ts`, `e2e/pins.ts`
(regenerated). Tests: `src/ui/__tests__/{versus.test.ts,settings.test.ts}`,
`src/components/results/__tests__/{HeadToHead.test.tsx,ShareActions.test.tsx}`,
`src/components/run/__tests__/versus-run.test.tsx`, `e2e/head-to-head.spec.ts`.

## RED commit and output (verbatim excerpts)

RED `0a7df7b`, tests only. `pnpm vitest run` on the five touched test files: 5 of 31 tests failed,
and `versus.test.ts` and `HeadToHead.test.tsx` failed to load because `src/ui/versus.ts` and
`HeadToHead.tsx` did not exist yet.

```
     × reads each 8-0 link back to the settings it was made from 4ms
     × reads each 151 link back to the settings it was made from 1ms
     × opens the share sheet with the record dare and the same-seed link carrying the run 28ms
     × New run drops the run to beat along with the seed (catches a fresh seed still compared with the old run) 432ms
     × shows the head-to-head right after the hero on the results (catches a challenge whose results never compare) 10025ms
 FAIL  src/ui/__tests__/versus.test.ts [ src/ui/__tests__/versus.test.ts ]
Error: Cannot find module '../versus' imported from /Users/paulo/Projects/pokedraft-head-to-head/src/ui/__tests__/versus.test.ts
 FAIL  src/components/results/__tests__/HeadToHead.test.tsx [ src/components/results/__tests__/HeadToHead.test.tsx ]
Error: Failed to resolve import "../HeadToHead" from "src/components/results/__tests__/HeadToHead.test.tsx". Does the file exist?
AssertionError: expected { …(2) } to deeply equal { …(3) }
  [
-   "/play?mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3",
+   "/play?mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3&vs=pd6.W1siYyIs...",
  ]
TestingLibraryElementError: Unable to find an element by: [data-testid="h2h-verdict"]
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Challenge a friend"
 Test Files  5 failed (5)
      Tests  5 failed | 26 passed (31)
```

The New run line is the bug the brief names: at the base, New run deleted only `seed` and left
`vs` in the address. Three new cases passed at RED because nothing they forbid existed yet:
"is not offered on a builder friendly", "is not offered on someone else's shared run, which keeps
Challenge this Seed" (labelled "regression guard, no RED: behaviour already correct"), and "shows
no head-to-head when the run to beat is from another seed". The mismatched seed's RED is the parse
case "ignores a vs from another seed" in `versus.test.ts`, which failed to load at RED.

GREEN `d46b88a`: 49 of 49 pass in the five files. `37b4091` adds the e2e spec and the pins.
`67039e2` keeps round names on one line at 320 px and starts the e2e friend from a clean run slot.

## Measurements

- The two golden seeds, from the live engine (`pnpm e2e:pins`, `HEAD_TO_HEAD` in `e2e/pins.ts`).
  The run to beat is the golden engine-5 draft under the `pd6` prefix. The challenger drafts the
  first offered player into the first open slot.
  - `golden-cup8` (4-2-3-1 Classic): you 1-1-2, Team Score 406; them 5-0-1, Team Score 593. They
    win the seed. Their Quarter-final is 2-2, lost on pens.
  - `golden-kanto151` (3-5-2 Position First): you 5-0-1, Team Score 580; them 3-0-1, Team Score
    480. You win the seed.
- No horizontal scroll at 390, 360 and 320 px with the round table showing:
  `document.documentElement.scrollWidth` equals the viewport width each time.
- No hydration error in the console on the challenge run (the e2e watches `console` errors).

## Gates

At `67039e2`: `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0, and all nine `check:*`
scripts exited 0 (`check:client-bundle`: "client bundle holds no retained engine bundle; server
build holds 20 files with it"). 1,863 unit tests passed in 221 files. Prettier passed on the 17
touched files. Playwright (`CI=1`, headless, `--retries=0`, build of `67039e2`): `head-to-head`
5 of 5, and with `challenge`, `share`, `share-sheet`, `draft-modes`, `platform-experience`,
`run-persist`, `leaderboard`, `history-controls`, `lifetime-history`, `results-interactions`,
`theme-results`, `layout-shift`, `old-links`, `server-html`, `one-tap-play` and `a11y`, 128 passed
and 5 skipped by their own project gates. PNGs the related specs rewrote under `docs/reports` were
reverted.

## Product decisions applied (hand-off 4.3, 5b)

- Challenge a friend on live results, ranked only, through `shareLink`, with the hand-off's text.
- The shared page's Challenge this Seed calls `challengeHref`; the inline duplicate is gone.
- `vs` read by `parsePlayQuery`, threaded to `LiveRun` and the results; New run deletes it.
- A `vs` whose seed, mode or settings differ from the link's is ignored. Never compare different
  seeds.
- HeadToHead after the hero with both records and Team Scores, the round table from `finalScore`,
  the board-order verdict and its three lines, and Send it back.
- A retained `vs` plays the same seed and gets the one engine line. No server change, no invented
  result.

## Implementation decisions

- **`vs` is checked against the canonical challenge link, not field by field.** `readVersus`
  compares `challengeLink(vsSettings, vsSeed)` with `challengeLink(querySettings, querySeed)`.
  That is the link both sides would build, so mode, formation, order, gens, style and seed all have
  to match, and a builder token never matches. A link with no `seed` ignores `vs`, because Start
  would draw a fresh seed. (Model the Domain: one definition of "the same challenge".)
- **`versus.ts` imports only the token codec and labels.** `settings.ts` is on the home page, so
  the replay stays in `HeadToHead.tsx`, which only the lazily loaded `LiveRun` chunk imports.
  `check:client-bundle` passes.
- **`vs` is not part of the run slot key.** The slot stays `{ settings, seed, daily }`, so the
  saved run and its checkpoint keep working exactly as before. `vs` stays in the address, so a
  reload of a challenge shows the head-to-head again. A browser that already finished a run on that
  seed reopens it and compares it with `vs`: it is still that player's run on the same seed.
- **New run hides the comparison at once.** `Challenge` passes `vs` only while the query seed is in
  use. New run drops the query seed before the address updates, so a quick Start cannot compare a
  fresh seed with the old run.
- **The retained engine number is the token version.** Each retained bundle's `ENGINE_VERSION` is
  `pokedraft-engine-N` for token `pdN` (N from 1 to 5, read from `src/engine/versions/v<N>`), and
  the client cannot load those bundles to ask them.
- **The round table lists a round when either side played it.** Rounds neither side reached are
  left out, a side that went out reads "Out", and a shootout says who won it, because "2-2" alone
  hides the result.
- **Send it back shows its own status line and Link box.** It sits in the HeadToHead card, so its
  feedback stays next to the button, the same way `ShareActions` does it.
- **Both challenge links encode `vs` with `encodeURIComponent`.** The hand-off writes it once
  without. A run token is base64url after `pdN.`, so the bytes are the same either way; one helper
  (`versusHref`) builds both.
- **E2E verdicts are literal in the spec, records come from `pins.ts`.** The verdict is what the
  test checks, so it is not generated by the code under test. An engine bump that flips a verdict
  fails the spec and gets a human look.

## Brief vs code

- **ShareActions' inline challenge link sat at `ShareActions.tsx:51-63`**, not `:39-51`: 5a added
  the share text above it.
- **`parsePlayQuery` (`settings.ts:154-171`), `newRun` (`PlayScreen.tsx:171-180`) and the live
  results (`LiveRun.tsx:215-239`)** matched the hand-off at `71a86ec`.
- **The e2e's "two golden seeds"** are `golden-cup8` and `golden-kanto151`, the seeds of the
  retained golden fixtures, so the same seeds also prove the retained line with the real `pd5`
  tokens.
- **Spec churn.** `settings.test.ts`'s four round-trip cases gain `vs: null`, the new literal shape
  of `parsePlayQuery`. `challenge.spec.ts` needed no change and passes. No test was deleted.

## NOT RUN

- Review and hosted CI (the coordinator runs both).
- The full Playwright suite (5b changes no shared e2e helper).
- The real share sheet on a phone and a screen reader pass over HeadToHead (owner actions).

## Carryovers

None folded into this row.
