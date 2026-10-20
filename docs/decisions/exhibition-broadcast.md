# Exhibitions on the Broadcast (5c2)

Wave 5 row 5c2, Yellow. Branch `feat/exhibition-broadcast` off `origin/main` at `aeb66b6` (which
includes 5c1 #138). The row spec is hand-off section 4.3 "5c2 exhibitions on the Broadcast with
manager controls". No file under `src/engine`, `src/data` or `src/scouting` changed;
`goldens.test.ts` is byte-identical.

## Who notices

An exhibition no longer prints a text replay. "Kick off" plays it on the 2D Broadcast, the same
pitch, ticker and scoreboard as a cup match, with the player's Live or Quick view.

- One match, manager mode on: the touchline sheet opens. The match stops at half time, at an
  injury and at 65 minutes for fatigue, and a sub or a tactic made there changes the result.
- One match, manager mode off: it plays like a sim, with no stop and no touchline.
- Two legs: both legs play on the Broadcast with no stop, even in manager mode. The format picker
  says "Manager controls in one match only." When leg 2 goes to extra time, the card under the
  pitch says so, lists the extra time goals and gives the aggregate line.
- Squads now field their bench: an injured player is replaced and tired players come off, so the
  same link can show a different score than it did under 5c1 (see "Re-pinned scores").
- "Play rematch" sits under the full-time line and moves focus back to "Kick off".
- Exhibitions stay unranked. History, lifetime totals and the leaderboard are untouched.

## Scope and files

- `src/ui/manager/exhibition-decide.ts` (new): `decideExhibition` re-runs `simulateMatch` on the
  exhibition fixture with the accumulated `manager` actions at match index 0, as `touchline.ts`'s
  `decide` does with `runCup`.
- `src/ui/manager/touchline.ts`: `record` extracted from `decide` (precheck plus append) so both
  paths share it; `ENGINE_REFUSAL` exported. `decide` behaves as before.
- `src/components/results/exhibition.ts`: `exhibitionFixture` passes `lineup: own`; `singleSeed`
  and `legSeed` exported so the Broadcast and the decide re-run use the seed the result used.
- `src/components/exhibition/ExhibitionMatch.tsx` and `.module.css` (new; the CSS is a rename of
  `ExhibitionReplay.module.css`): mounts `MatchPlayer` directly with the touchline.
- `src/components/exhibition/ExhibitionScreen.tsx`: renders `ExhibitionMatch`.
- `src/components/matchday/MatchPlayer.tsx`: optional `label` for the region name.
- Deleted: `src/components/results/ExhibitionReplay.tsx` and its test.
- Tests: `exhibition-decide.test.ts` and `ExhibitionMatch.test.tsx` (new),
  `exhibition.test.ts` and `ExhibitionScreen.test.tsx` (re-pinned and played to full time).
- e2e: `exhibition-broadcast.spec.ts` (new), `touchline-helpers.ts` (new, moved out of
  `touchline-sheet.spec.ts`), `exhibition-route`, `exhibition-two-legs`, `platform-experience` and
  `mobile/scenes.ts` play through the Broadcast. `scripts/e2e/render-pins.ts` gained
  `EXHIBITION_BROADCAST`; `e2e/pins.ts` regenerated with `pnpm e2e:pins`.

## RED

`05ca319`, verbatim summary:

```
 Test Files  4 failed (4)
      Tests  8 failed | 9 passed (17)
```

8 of 17 failed in the 2 files that loaded: the three re-pinned `exhibition.test.ts` cases and five
`ExhibitionScreen.test.tsx` cases that look for "Kick off". `exhibition-decide.test.ts` (4 tests)
and `ExhibitionMatch.test.tsx` (4 tests) failed to load:

```
Error: Failed to resolve import "../ExhibitionMatch" from "src/components/exhibition/__tests__/ExhibitionMatch.test.tsx". Does the file exist?
Error: Cannot find module '../exhibition-decide' imported from .../src/ui/manager/__tests__/exhibition-decide.test.ts
AssertionError: expected { user: 4, opp: 1 } to deeply equal { user: 4, opp: +0 }
```

GREEN `39990b9`.

Second RED `f8bc6ea` guards focus after a rematch (the button now unmounts with the match):

```
AssertionError: expected <body><div>…(1)</div></body> to be <button type="button" …(2)></button> // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```

GREEN `521d5aa`.

Third RED `a3c87ac`. The first full Playwright run at `849d2ad` failed one test, `7 landscape:
two-leg exhibition` on iphone-14: "content reaches y=1780 but the page scrolls only to 1537". The
scene now ends on the Broadcast, and the lines past y=1537 are ticker items inside the ticker's own
220 px scroll box, reachable by scrolling it. `pageScrollReach` counted them as page content. A
self-check with a 200 px scrolling list went RED with the landscape scene (2 of 4 run failed):

```
    Error: expect(received).toBeLessThanOrEqual(expected)
    Expected: <= 200
    Received:    3600
```

GREEN `6e29059` clamps each element's bottom to its nearest ancestor that does not show vertical
overflow (html and body excluded, so the overflow:hidden traps still fail). `mobile-acceptance`
on iphone-14, iphone-se and pixel-7 then passed 270, 54 skipped.

## Re-pinned scores

Passing `lineup: own` turns subs and injuries on, so the engine draws differently. Every re-pin
names the change in its test title.

`src/components/results/__tests__/exhibition.test.ts` (Pokedex 1 to 16 both sides, seed
`opponent-0`):

- One match, rematch 0: 4-1 is now 4-0. Goals 23' Charizard (solo run), 44' Venusaur, 78'
  Beedrill, 85' Charizard (pen). Metapod (11) is injured at 19' and Beedrill (15) comes on;
  fatigue subs at 60' and 75'.
- Level aggregate goes to extra time: was rematch 1 (0-2, 2-0, 4-5 on penalties, other side), now
  rematch 24 (0-1, 1-0, aggregate 1-1, 4-2 on penalties, your side).
- Extra time settles the tie: was rematch 24 (leg 2 2-0 with 91' Caterpie, aggregate 2-1), now
  rematch 26 (0-0, then leg 2 2-2 after 90 and 3-2 with 118' Charizard (pen), aggregate 3-2, your
  side).
- Rematches 0, 6, 20 and 7 in the other cases kept their literals.

`ExhibitionScreen.test.tsx`: the mirror match 4-1 is now 4-0; the `n=1` single 0-1 is now 1-1; the
two-legs `n=3` aggregate stays 0-1.

`e2e/pins.ts`, `MIRROR_EXHIBITION`:

| Pin                        | Before                                                | After                                                   |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `firstSingle`              | 1-3                                                   | 1-3                                                     |
| `extraTimeRematch`         | 1                                                     | 7                                                       |
| `extraTime`                | 0-1, 5-6, agg 5-7, 117' Talonflame (solo run)         | 3-3, 2-3, agg 5-6, 103' Zeraora, assist Dragalge        |
| `singleAtExtraTimeRematch` | 3-1                                                   | 5-5                                                     |
| `aggregateRematch`         | 2                                                     | 8                                                       |
| `aggregate`                | 5-10                                                  | 10-2                                                    |

`EXHIBITION_ROUTE` kept its pins (friendly vs golden 0-6, golden mirror 1-3). New
`EXHIBITION_BROADCAST`: 0-6 with no decision, 0-5 with the touchline's default sub at 45 ("45'
Butterfree on for Metapod (tactical, your call)").

No stored or ranked data depends on exhibition results.

## Measurements

Right edge of everything under `main` (the fixed touchline sheet excluded and measured on its
own), Playwright chromium, macOS fonts:

| State                              | 320 px | 308 px |
| ---------------------------------- | ------ | ------ |
| Before kick off                    | 304    | 292    |
| Half-time stop                     | 304    | 292    |
| Half-time stop, sheet content      | 310    | 298    |
| Full time                          | 304    | 292    |
| Route page, two legs, widest name  | 304    | 292    |

The page never scrolls sideways at either width. Elements inside a box that clips overflow are
capped at that box. At full time the Follow camera can leave a sprite past the touchline inside
the pitch: unclipped it reaches 439.4 at 320 and 420.2 at 308 (4 of 6 repeats), so the first
uncapped run of the test failed on a box nobody can see past. Capped, it is 304 and 292 every run. The sheet is the matchday's edge-to-edge bottom
sheet, unchanged here, so its content is held to the viewport width and
`touchline-sheet.spec.ts` keeps owning its layout.

## Product decisions applied

- Exhibitions play on the Broadcast through `MatchPlayer`, not `MatchdayFlow`, which stays
  cup-bound.
- Subs and injuries are on for every exhibition (`lineup: own`).
- Manager controls only in one match. `playTwoLegs` re-seeds leg 2 up to 20,000 times to avoid a
  level aggregate; a leg-1 decision would change which seed breaks the tie, so the feedback would
  not be honest.
- Manager mode off plays like a sim; the Live or Quick view still follows the settings.

## Implementation decisions

- The text replay is gone for both formats. The hand-off puts the Broadcast on exhibitions; two
  text paths would drift. This supersedes the 5c1 note that the Broadcast replaces it "for one
  match".
- Two legs: the pitch shows leg 2's 90 minutes. Extra time and penalties come from a separate
  knockout simulation that breaks the tie, so drawing them on the pitch would invent a match. The
  card says "The pitch shows its 90 minutes." and lists the extra time goals.
- Settings are read once at "Kick off": no hydration mismatch, and the controls cannot change
  mid-match.
- The touchline's ratings follow `showRatings`, the friendly's switch, because exhibitions are not
  challenges.
- `MatchPlayer` takes a `label` so a screen reader hears "Exhibition against Their squad", not
  "Final against".
- "Play rematch" shows only at full time; a rematch moves focus to "Kick off" (second RED).
- `record` is shared by the cup and exhibition decide paths so they refuse the same moves with the
  same words.
- The landscape failure was the probe, not the page: the ticker list is the matchday's own scroll
  box, unchanged here. Fixing the probe keeps it honest for every scene that ends on the Broadcast
  instead of special-casing this one.
- The full-time theme screenshots wait for running CSS transitions; the first set caught buttons
  mid-fade after `emulateMedia`.
- The touchline e2e helpers moved to `e2e/touchline-helpers.ts`; they were private to one spec.
- The Broadcast scoreboard keeps "Your XI" like every cup match; the page, footer and picker say
  "Your squad".
- The 5c1 carryover (a fast double tap on "Play rematch" can count once) is unchanged: the button
  now unmounts on the first tap, so a second tap has nothing to hit.

## Brief vs code

- The hand-off line references held: `decide` in `touchline.ts` and `exhibitionFixture` in
  `exhibition.ts` were where the brief said.
- The brief's "two legs shows no stop" needed both legs on the Broadcast. The brief named only one
  match there; leaving two legs as text would keep two replay paths, so both moved.

## Gates

At `849d2ad` (`a3c87ac` and `6e29059` change only `e2e/mobile-acceptance.spec.ts` and
`e2e/mobile/helpers.ts`; lint and typecheck exited 0 again at `6e29059`; later commits only add
docs and screenshots):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0
  (`check:client-bundle`: "client bundle holds no retained engine bundle; server build holds 20
  files with it"). Prettier passed on the touched files.
- Unit tests: 1,998 passed in 229 files.
- Playwright (`CI=1`, headless, `--retries=0`). The full suite at `849d2ad`, all projects: 1,076
  passed, 67 skipped, 1 failed (the landscape probe above). The full suite again at `6e29059`, all
  projects: 1,077 passed, 67 skipped, 0 failed (18.0m). `mobile-acceptance` on the three phone
  projects at `6e29059`: 270 passed, 54 skipped.
- At `cee7a76` (spec-only change): `exhibition-broadcast`, `touchline-sheet`, `exhibition-route`
  and `exhibition-two-legs` on chromium, 21 passed; this run wrote the committed screenshots. The
  headroom test alone with `--repeat-each=6`: 6 passed.

## NOT RUN

- The e2e specs against the RED build.
- `exhibition-broadcast.spec.ts` on WebKit and the phone projects (it is chromium-only by design).
- Measurements under Linux fonts (hosted CI runs the specs, which assert the 308 rule).
- Review, hosted CI, the phone check and the screen reader pass.

## Carryovers

- The 5c1 double-tap note above.
- The touchline sheet's own 320 px layout belongs to `touchline-sheet.spec.ts`.

Browser proof: `docs/reports/exhibition-broadcast/` (`{390,360,320}-halftime-stop.png`,
`{390,360,320}-sub-made.png`, `{390,360,320}-fulltime.png`, `390-two-legs.png`,
`fulltime-{390,360,320}-{light,dark}.png`).
