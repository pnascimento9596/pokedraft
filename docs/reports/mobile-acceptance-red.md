# Mobile acceptance suite, red table

GATE 4 of dispatch 7 (`e2e/mobile-acceptance.spec.ts`) lands before the mobile fixes. This file lists every test the pristine app fails today, with the line it fails with. Each row has an entry in `KNOWN_RED` in the spec, so CI is green now. A fix PR deletes the entries it turns green. A kept entry whose test now passes fails CI with "Expected to fail, but passed". A deleted entry whose test still fails fails CI with the failure line.

## How the failures were taken

- The app under test was the production build of `origin/main` at `928e4b1`, served by `next start`. There was no database, so every request to `/api/leaderboard` was answered by a route stub.
- The command was `MOBILE_ACCEPTANCE_UNMARKED=1 PLAYWRIGHT_BASE_URL=http://localhost:<port> pnpm exec playwright test e2e/mobile-acceptance.spec.ts --retries=0 --workers=3`. The flag makes every test report its raw verdict.
- The engines were Playwright 1.64 on macOS, with WebKit 27.2 for `iphone-se` and `iphone-14` and Chromium 156 for `pixel-7`. CI runs Linux builds of both, so a number below can differ a little there.
- This table comes from one unmarked run. Three marked runs followed. In each of them every one of these tests was an expected failure and nothing else failed.

## Results by group on the pristine app

Each cell reads pass / fail / skipped. A fail here is a marked test.

| Group | iphone-se | iphone-14 | pixel-7 |
| --- | --- | --- | --- |
| 0 self-check | 14 / 0 / 0 | 14 / 0 / 0 | 14 / 0 / 0 |
| 1 flow | 0 / 3 / 0 | 0 / 3 / 0 | 0 / 3 / 0 |
| 2 overflow | 21 / 1 / 0 | 21 / 1 / 0 | 21 / 1 / 0 |
| 3 targets | 0 / 22 / 0 | 0 / 22 / 0 | 0 / 22 / 0 |
| 4 picker | 2 / 3 / 0 | 2 / 3 / 0 | 3 / 2 / 0 |
| 5 drag and scroll | 3 / 0 / 0 | 3 / 0 / 0 | 3 / 0 / 0 |
| 6 keyboard | 1 / 0 / 0 | 1 / 0 / 0 | 1 / 0 / 0 |
| 7 landscape | 0 / 0 / 22 | 21 / 1 / 0 | 0 / 0 / 22 |
| all (92 tests per project) | 41 / 29 / 22 | 62 / 30 / 0 | 42 / 28 / 22 |

`7 landscape` is specified for iPhone 14 only, so the other two projects skip its 22 tests.

## Red table

`fixed-by` is a guess at the owning fix PR theme, one of `mobile-foundations`, `draft-layout`, `sheets`, `keyboard`, `targets` or `other`. The lane owner assigns it. The failure line is the first line of the Playwright error, unedited.

| Assertion | Project | Failing step | Failure line | fixed-by |
| --- | --- | --- | --- | --- |
| 1 flow: 8-0 Challenge Classic, start to results with taps only | iphone-se | round 1 pick a candidate | `1 flow: 8-0 Challenge Classic. 28 of 34 steps needed a page scroll or were covered. First failing step: round 1 pick a candidate: the element is not fully inside the visual viewport (element spans y 598 to 805, viewport 320x568, scrollY 0)` | draft-layout |
| 1 flow: 8-0 Challenge Classic, start to results with taps only | iphone-14 | round 1 pick a candidate | `1 flow: 8-0 Challenge Classic. 28 of 34 steps needed a page scroll or were covered. First failing step: round 1 pick a candidate: the element is not fully inside the visual viewport (element spans y 598 to 805, viewport 390x664, scrollY 0)` | draft-layout |
| 1 flow: 8-0 Challenge Classic, start to results with taps only | pixel-7 | round 1 place in an empty slot | `1 flow: 8-0 Challenge Classic. 25 of 34 steps needed a page scroll or were covered. First failing step: round 1 place in an empty slot: the element is not fully inside the visual viewport (element spans y 1365 to 1431, viewport 412x839, scrollY 0)` | draft-layout |
| 1 flow: 151 Challenge, start to results with taps only | iphone-se | round 1 the offered player | `1 flow: 151 Challenge. 29 of 34 steps needed a page scroll or were covered. First failing step: round 1 the offered player: the element is not fully inside the visual viewport (element spans y 598 to 696, viewport 320x568, scrollY 0)` | draft-layout |
| 1 flow: 151 Challenge, start to results with taps only | iphone-14 | round 1 the offered player | `1 flow: 151 Challenge. 29 of 34 steps needed a page scroll or were covered. First failing step: round 1 the offered player: the element is not fully inside the visual viewport (element spans y 598 to 696, viewport 390x664, scrollY 0)` | draft-layout |
| 1 flow: 151 Challenge, start to results with taps only | pixel-7 | round 1 place in an empty slot | `1 flow: 151 Challenge. 21 of 34 steps needed a page scroll or were covered. First failing step: round 1 place in an empty slot: the element is not fully inside the visual viewport (element spans y 1256 to 1322, viewport 412x839, scrollY 0)` | draft-layout |
| 1 flow: Daily, start to results with taps only | iphone-se | round 1 pick a candidate | `1 flow: Daily. 33 of 34 steps needed a page scroll or were covered. First failing step: round 1 pick a candidate: the element is not fully inside the visual viewport (element spans y 616 to 676, viewport 320x568, scrollY 0)` | draft-layout |
| 1 flow: Daily, start to results with taps only | iphone-14 | round 1 place in an empty slot | `1 flow: Daily. 32 of 34 steps needed a page scroll or were covered. First failing step: round 1 place in an empty slot: the element is not fully inside the visual viewport (element spans y 1447 to 1513, viewport 390x664, scrollY 0)` | draft-layout |
| 1 flow: Daily, start to results with taps only | pixel-7 | round 1 place in an empty slot | `1 flow: Daily. 30 of 34 steps needed a page scroll or were covered. First failing step: round 1 place in an empty slot: the element is not fully inside the visual viewport (element spans y 1478 to 1544, viewport 412x839, scrollY 0)` | draft-layout |
| 2 overflow: daily results submitted | all three | /daily dark 320px | `2 overflow: daily results submitted. 2 of 8 measurements overflow. First: /daily dark 320px: widest right edge 334, documentElement.scrollWidth 320; section[testid=submit-panel].hay-SW_panel > p[testid=submit-success].hay-SW_success "#4WWWWWWWWWWWWWWWWWWWW is on t" reaches x=334` | mobile-foundations |
| 3 targets: home | all three | scan at dark 390px | `3 targets: home. 14 of 32 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: home settings open | all three | scan at dark 390px | `3 targets: home settings open. 29 of 49 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: builder full | all three | scan at dark 390px | `3 targets: builder full. 14 of 32 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: picker open | all three | scan at dark 390px | `3 targets: picker open. 21 of 141 interactive elements are under 44x44 at dark 390px. First: button[type=button] "Close picker" 53.8x32` | targets |
| 3 targets: play start | all three | scan at dark 390px | `3 targets: play start. 8 of 8 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: draft round 1 | all three | scan at dark 390px | `3 targets: draft round 1. 11 of 30 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: draft round 9 | all three | scan at dark 390px | `3 targets: draft round 9. 11 of 30 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: draft 151 round 1 | all three | scan at dark 390px | `3 targets: draft 151 round 1. 10 of 27 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: results | all three | scan at dark 390px | `3 targets: results. 23 of 40 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: daily results | all three | scan at dark 390px | `3 targets: daily results. 23 of 40 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: daily results submitted | all three | scan at dark 390px | `3 targets: daily results submitted. 22 of 39 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: daily start | all three | scan at dark 390px | `3 targets: daily start. 8 of 8 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: leaderboard 50 rows | all three | scan at dark 390px | `3 targets: leaderboard 50 rows. 11 of 61 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: leaderboard 1 row | all three | scan at dark 390px | `3 targets: leaderboard 1 row. 10 of 11 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: leaderboard empty | all three | scan at dark 390px | `3 targets: leaderboard empty. 11 of 11 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: leaderboard 503 | all three | scan at dark 390px | `3 targets: leaderboard 503. 11 of 11 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: history empty | all three | scan at dark 390px | `3 targets: history empty. 8 of 8 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: history seeded | all three | scan at dark 390px | `3 targets: history seeded. 7 of 19 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: how to play | all three | scan at dark 390px | `3 targets: how to play. 15 of 15 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: shared run | all three | scan at dark 390px | `3 targets: shared run. 21 of 38 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: broken run link | all three | scan at dark 390px | `3 targets: broken run link. 8 of 8 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 3 targets: 404 | all three | scan at dark 390px | `3 targets: 404. 8 of 8 interactive elements are under 44x44 at dark 390px. First: a[href=/] "pokedraft" 103.1x31.3` | targets |
| 4 picker: closes on a swipe down on its header (real touch on pixel-7, mouse Pointer Events only on WebKit) | iphone-se, iphone-14 | swipe down 240px from the header | `4 picker: swipe down on the header. the sheet is still open after a pointer swipe down 240px from its header (x=16 y=57 w=138.4 h=26.9 (spans y 57 to 83.9))` | sheets |
| 4 picker: closes on a swipe down on its header (real touch on pixel-7, mouse Pointer Events only on WebKit) | pixel-7 | swipe down 240px from the header | `4 picker: swipe down on the header. the sheet is still open after a touch swipe down 240px from its header (x=16 y=57 w=138.4 h=26.9 (spans y 57 to 83.9))` | sheets |
| 4 picker: closes on the browser Back button and the page stays on the builder | all three | page.goBack() | `4 picker: browser Back. Back left the builder: the URL is now /how-to-play` | sheets |
| 4 picker: focus returns to the tapped slot when it closes | iphone-se, iphone-14 | close the sheet, read document.activeElement | `4 picker: focus return. after the sheet closed, focus is on <body> and not on the tapped slot slot-s6 (iOS Safari does not focus a tapped button, so the page has to restore focus itself)` | sheets |
| 7 landscape: picker open | iphone-14 | / 750x340, the primary action after scrolling it into view | `7 landscape: picker open. 1 problems. First: / 750x340: the primary action is not reachable after scrolling it into view: the element is not fully inside the visual viewport (x=72 y=287.9 w=606 h=58 (spans y 287.9 to 345.8))` | sheets |

## Elements under 44 by 44

The failure messages of `3 targets` print every violator. 86 distinct elements appear across the 22 scenes. Each is measured on its own box. The repo has no pseudo-element hit-area padding to count. Its `::before` and `::after` rules draw a divider, the wheel payline, a hero ring, a heading bar and a title rule, and none of them sits on a control. Sizes are CSS px from `iphone-14` (WebKit), taken from the 390 px and 320 px blocks the messages print, so an element whose width follows the viewport appears once per width. Chromium differs by a fraction of a pixel on text-sized controls and by more on native ones. The formation `select` is 26 high in WebKit and 40 in Chromium, and the date input is 105 wide in WebKit and 139 in Chromium.

| Scenes | Element | Text | Size |
| --- | --- | --- | --- |
| 21 | `a[href=/]` | pokedraft | 103.1x31.3 |
| 21 | `a[href=/daily]` | Daily | 47.9x31.7 |
| 21 | `a[href=/history]` | History | 63.9x31.7 |
| 21 | `a[href=/how-to-play]` | How to play | 93.4x31.7 |
| 21 | `a[href=/leaderboard]` | Leaderboard | 96.5x31.7 |
| 21 | `button[type=button]` | Theme: auto. Change theme | 42.6x32 |
| 21 | `summary` | Images: Pixel. Open image settings | 61.3x32 |
| 7 | `button[type=button]` | Download image | 146.6x40 |
| 4 | `summary` | Scouting notes | 336x19.1 |
| 4 | `summary` | Scouting notes | 266x19.1 |
| 4 | `button[type=button]` | Share | 70.8x40 |
| 3 | `button[type=button]` | Sound off | 80.5x32 |
| 3 | `button[type=button]` | Randomize | 104.9x40 |
| 3 | `button[type=button]` | Clear all | 95.2x40 |
| 3 | `button[type=button]` | Reset | 68.6x40 |
| 3 | `button[type=button]` | Copy link | 96.2x40 |
| 3 | `button[type=button]` | Play a friendly cup | 164.2x40 |
| 3 | `input[type=date]` | Date | 105.4x40 |
| 2 | `a[href=/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open]` | Play a regular challenge | 131.2x17.3 |
| 2 | `button[type=button]` | Settings and records | 328x32 |
| 2 | `button[type=button]` | Settings and records | 258x32 |
| 2 | `button[type=button]` | Reroll type, 3 left | 114.1x32 |
| 2 | `button[type=button]` | Reroll region, 3 left | 128.3x32 |
| 1 | `select` | Filter by generationAll gensGen 1 KantoG | 115x24 |
| 1 | `select` | Formation | 328x26 |
| 1 | `select` | Formation | 258x26 |
| 1 | `button[type=button]` | Normal | 56x28 |
| 1 | `button[type=button]` | Fighting | 58.8x28 |
| 1 | `button[type=button]` | Flying | 47.7x28 |
| 1 | `button[type=button]` | Poison | 50.8x28 |
| 1 | `button[type=button]` | Ground | 54x28 |
| 1 | `button[type=button]` | Rock | 40.4x28 |
| 1 | `button[type=button]` | Bug | 34.3x28 |
| 1 | `button[type=button]` | Ghost | 45.8x28 |
| 1 | `button[type=button]` | Steel | 42.8x28 |
| 1 | `button[type=button]` | Fire | 35.8x28 |
| 1 | `button[type=button]` | Water | 47.6x28 |
| 1 | `button[type=button]` | Grass | 46.1x28 |
| 1 | `button[type=button]` | Electric | 58.3x28 |
| 1 | `button[type=button]` | Psychic | 55.1x28 |
| 1 | `button[type=button]` | Ice | 30.6x28 |
| 1 | `button[type=button]` | Dragon | 53.6x28 |
| 1 | `button[type=button]` | Dark | 40.1x28 |
| 1 | `button[type=button]` | Fairy | 41.4x28 |
| 1 | `button[type=button]` | All | 32.7x30 |
| 1 | `button[type=button]` | Gen 1 Kanto | 77.3x30 |
| 1 | `button[type=button]` | Gen 2 Johto | 78.5x30 |
| 1 | `button[type=button]` | Gen 3 Hoenn | 81.3x30 |
| 1 | `button[type=button]` | Gen 4 Sinnoh | 85.5x30 |
| 1 | `button[type=button]` | Gen 5 Unova | 80.4x30 |
| 1 | `button[type=button]` | Gen 6 Kalos | 78.4x30 |
| 1 | `button[type=button]` | Gen 7 Alola | 76.7x30 |
| 1 | `button[type=button]` | Gen 8 Galar | 78.2x30 |
| 1 | `button[type=button]` | Gen 9 Paldea | 83.4x30 |
| 1 | `a[href=#builder]` | The builder | 89.5x32 |
| 1 | `a[href=#cup]` | The cup | 66.2x32 |
| 1 | `a[href=#cup8]` | The 8-0 Challenge | 131.4x32 |
| 1 | `a[href=#fair]` | Fair rolls | 82.2x32 |
| 1 | `a[href=#friendly]` | Friendlies | 83.6x32 |
| 1 | `a[href=#kanto151]` | The 151 Challenge | 126.3x32 |
| 1 | `a[href=#score]` | Team Score | 90.8x32 |
| 1 | `button[type=button]` | Hide settings and records | 328x32 |
| 1 | `button[type=button]` | Hide settings and records | 258x32 |
| 1 | `button[type=button]` | Close picker | 53.8x32 |
| 1 | `button[type=button]` | Reroll, 5 left | 84.7x32 |
| 1 | `button[type=button]` | Open | 160x34 |
| 1 | `button[type=button]` | Classic | 160x34 |
| 1 | `button[type=button]` | Squad First | 160x34 |
| 1 | `button[type=button]` | Position First | 160x34 |
| 1 | `button[type=button]` | Open | 125x34 |
| 1 | `button[type=button]` | Classic | 125x34 |
| 1 | `button[type=button]` | Squad First | 125x34 |
| 1 | `button[type=button]` | Position First | 125x34 |
| 1 | `a[href=/]` | Start a run | 111.4x40 |
| 1 | `a[href=/]` | Start drafting | 134.3x40 |
| 1 | `a[href=/]` | Play your own | 132.1x40 |
| 1 | `a[href=/]` | Play a new run | 137.3x40 |
| 1 | `a[href=/]` | Back to the start | 151.9x40 |
| 1 | `a[href=/daily]` | Play the daily | 125.7x40 |
| 1 | `a[href=/leaderboard?mode=cup8&scope=daily&date=2026-10-09]` | View leaderboard | 154.7x40 |
| 1 | `button[type=button]` | New run | 91.2x40 |
| 1 | `button[type=button]` | Try again | 95.8x40 |
| 1 | `input[testid=submit-nickname]` | Submit to the all-time board | 233.3x40 |
| 1 | `input[testid=submit-nickname]` | Submit to the all-time board | 251x40 |
| 1 | `input[testid=submit-nickname]` | Submit to today's daily board | 233.3x40 |
| 1 | `input[testid=submit-nickname]` | Submit to today's daily board | 251x40 |

### Inline text links

WCAG 2.5.8 exempts a link that sits inside a sentence. The suite does not. It tags such a link "[inline link]" in the failure message and keeps it in the count, so the lane owner can decide whether to exempt it.

- `a[href=/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open]` "Play a regular challenge" 131.2x17.3, on daily results and daily results submitted

## Reported, never asserted

- On iphone-se, WebKit, read from CSS and not measured: touch-action on the pitch is none, so a swipe that starts on it does not pan the page.
- On iphone-14, WebKit, read from CSS and not measured: touch-action on the pitch is none, so a swipe that starts on it does not pan the page.
- On pixel-7, a vertical swipe that starts on the pitch did not scroll the page (moved 0px).
- On iphone-se, with the viewport shrunk to 55%, the submit button needs 0 scrolls (shrunk viewport 320x312).
- On iphone-14, with the viewport shrunk to 55%, the submit button needs 0 scrolls (shrunk viewport 390x365).
- On pixel-7, with the viewport shrunk to 55%, the submit button needs 0 scrolls (shrunk viewport 412x461).

Group 6 passes on the pristine app, so the `keyboard` theme has no entry above. A headless viewport shrink does not reproduce an iOS keyboard, so that is an absence of evidence from this suite and not a clean bill.

## Not proven by this suite

- WebKit has no touch drag, swipe or wheel API. On `iphone-se` and `iphone-14` a drag is a mouse drag (Pointer Events with pointerType mouse), a list scroll is a `scrollTop` write, and a page scroll is `scrollBy`. Each such test carries a `NOT RUN` annotation.
- A swipe-to-close handler that listens to touch events only, or skips pointerType mouse, would stay red on both WebKit projects after the fix. The fix PR then has to change the test or keep a WebKit entry with that reason.
- The viewport shrink in group 6 is not an iOS keyboard.
- Taps are real touches on every project (`page.touchscreen.tap`).
- The iPhone projects behave like iOS Safari for focus, so a tapped button is not focused. WebKit on macOS does that natively and WebKit on Linux does not. The suite installs a click listener that blurs a tapped button on the WebKit projects only. `pixel-7` keeps the Chromium behaviour, as Chrome on Android focuses a tapped button. This is why the focus-return entry names the two iPhone projects.

## Changing the list

- Find the entries with `grep -n fixedBy e2e/mobile-acceptance.spec.ts`.
- A fix PR deletes the entry or entries for the tests it fixes and nothing else.
- `MOBILE_ACCEPTANCE_UNMARKED=1 pnpm exec playwright test e2e/mobile-acceptance.spec.ts` switches the list off and shows every raw verdict.
