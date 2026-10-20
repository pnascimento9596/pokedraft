# Share sheet, card prefetch and run metadata (Wave 5, row 5a)

Branch `feat/share-sheet` off `origin/main` at `5932775` (PR #125). Yellow. No file under
`src/engine`, `src/data` or `src/scouting` changed, so the goldens are untouched.

## Scope

- **One share helper.** `src/components/share/shareLink.ts` exports
  `shareLink({ title, text, path })`, which resolves to `"shared"`, `"cancelled"`, `"copied"` or
  `"manual"`.
  - On a coarse pointer, with `navigator.share` present and `canShare({ url })` not false, it
    calls `navigator.share({ title, text, url })` with the absolute URL. AbortError is
    `"cancelled"`.
  - Otherwise, or when the sheet throws anything but AbortError, it writes the URL to the
    clipboard and returns `"copied"`. A failed or missing clipboard returns `"manual"`.
  - The same file holds the texts: title "pokedraft", `runShareText` ("7-1-0, Team Score 812.
    Beat it?", or "Friendly: 7-0-1, Team Score 845." on a friendly), "Watch this goal." and
    "My pokedraft XI.", plus `SHARE_SAID`, the status line per outcome ("Link shared", nothing,
    "Link copied", "Could not copy the link").
- **Manual fallback.** `ManualLink.tsx` renders a read-only input labelled "Link" holding the
  absolute URL. It takes focus when it appears and selects its text on focus.
  `useLinkShare.ts` keeps the status line and the manual URL for a caller.
- **Callers.** `ShareActions` (results and `/r`), `ShareGoalButton` (results match list and the
  matchday ticker) and the Builder all use the helper. `copyLink.ts` and the Builder's inline
  clipboard copy are deleted. The Builder button is now "Share link" (see decisions).
- **Card share.** `download.ts` splits into `fetchCard(href)` and
  `deliverCard(blob, filename, { path, text })`. `shareFile` passes
  `{ files: [png], url, text }` to `canShare` and `share`. `downloadCard` composes the two.
- **Prefetch.** `useCardDownload(prefetch?)` takes the card source. On mount, on a coarse pointer
  and unless `navigator.connection.saveData` is true, it fetches the card once inside
  `requestIdleCallback` (falling back to `setTimeout(..., 1500)`). Download reuses that blob when
  the card URL (source plus picture settings) still matches, and fetches again if the prefetch
  failed. `ShareActions` passes `{ t: token }`. The Builder passes nothing, so its card stays lazy.
- **Metadata.** `runMetadata(token, run)` in `src/app/r/[token]/title.ts` builds the title,
  `description` ("{finish} with {formation}. Draft your own XI on pokedraft."), and the same in
  `openGraph` and `twitter`, with one image entry: `/r/<token>/opengraph-image`, 1200x630, alt
  "pokedraft run card: {W-D-L}, Team Score {score}". Both `/r/[token]/page.tsx` and the passcode
  gate's `generateMetadata` return it. A broken link gets no description and the alt
  "pokedraft: broken run link". The static `alt` export left `opengraph-image.tsx`.
- **Coached chip.** `CardHeadline` (run kind) gains `coached`. `runCardModel(token, run)` sets it
  from `isCoached(token)`, so `/card?t=` and the `/r` OG image both get it. `ResultPanel` draws a
  "Coached" chip (accent fill) after the formation chip.

Files: `src/components/share/{shareLink.ts,ManualLink.tsx,ManualLink.module.css,useLinkShare.ts,download.ts,useCardDownload.ts,ShareGoalButton.tsx,card.tsx,card-panel.tsx}`,
`src/components/share/copyLink.ts` (deleted), `src/components/results/{ShareActions.tsx,ResultsView.tsx}`,
`src/components/builder/Builder.tsx`, `src/app/r/[token]/{title.ts,page.tsx,opengraph-image.tsx}`,
`src/app/gate/page.tsx`. Tests: `src/components/share/__tests__/{shareLink.test.ts,downloadCard.test.ts,card-model.test.tsx}`
(renamed from `.ts` for the JSX render), `src/components/results/__tests__/ShareActions.test.tsx`,
`src/app/r/[token]/__tests__/metadata.test.ts`, `src/app/gate/__tests__/page.test.tsx`,
`src/components/builder/__tests__/Builder.test.tsx`, `e2e/share-sheet.spec.ts`.

## RED commit and output (verbatim excerpts)

RED `c003ef9`. Unit: 12 of 87 tests failed in 6 of 9 files, and `shareLink.test.ts` failed to
load.

```
 FAIL  src/components/share/__tests__/shareLink.test.ts [ src/components/share/__tests__/shareLink.test.ts ]
Error: Failed to resolve import "../shareLink" from "src/components/share/__tests__/shareLink.test.ts". Does the file exist?
     × passes the run link and its text with the PNG, so the chat gets the challenge too 4ms
     × describes the finish and formation and puts the record and score in the image alt 265ms
     × says Champions for a cup winner 277ms
     × gives a broken link no description and the broken card's own words as alt 0ms
     × marks a coached token's card and puts the chip after the formation 15ms
     × leaves the chip off an uncoached token's card 5ms
     × opens the share sheet with the record, the Team Score and the dare 270ms
     × drops the dare on a friendly 9ms
     × shows the absolute link in a read-only Link field when the clipboard write fails 18ms
     × fetches the card once when idle on a phone, and Download shares that blob with the run link 3ms
     × opens the share sheet with Watch this goal and the goal link 3ms
     × Share link copies the lineup URL on a desktop and says so, and shows the link in a Link field when the copy fails (catches a dead end when the clipboard is blocked) 139ms
AssertionError: expected [ [ 1, {} ] ] to deeply equal [ [ 1, { …(2) } ] ]
AssertionError: expected [] to deeply equal [ { title: 'pokedraft', …(2) } ]
AssertionError: expected [] to deeply equal [ Array(1) ]
AssertionError: expected { kind: 'run', …(7) } to match object { kind: 'run', coached: true }
TestingLibraryElementError: Unable to find an accessible element with the role "textbox" and name "Link"
TypeError: runMetadata is not a function
 Test Files  6 failed | 3 passed (9)
      Tests  12 failed | 75 passed (87)
```

Two new cases passed at RED because there was no prefetch to gate: "never prefetches on a
desktop" and "never prefetches on a phone with Data Saver on". They guard the GREEN prefetch's
two conditions, and are regression guards, no RED: behaviour already correct.

E2E (`CI=1`, chromium, `--retries=0`, against `next start` of a `git archive 5932775` export
built in the scratch directory, because `next build` type-checks the RED unit tests): 6 of 8
failed. The 2 passes are the desktop no-prefetch guard (regression guard, no RED) and the
Coached card proof capture.

```
  ✘  2 [chromium] › e2e/share-sheet.spec.ts:35:7 › link preview metadata (catches a preview with no description or an alt that hides the result) › the passcode gate preview carries the same description and alt (200ms)
  ✘  1 [chromium] › e2e/share-sheet.spec.ts:24:7 › link preview metadata (catches a preview with no description or an alt that hides the result) › /r server HTML carries the description and the card alt (202ms)
  ✘  3 [chromium] › e2e/share-sheet.spec.ts:106:9 › on a phone › a blocked clipboard shows the link in a Link field at 390px (5.6s)
  ✘  5 [chromium] › e2e/share-sheet.spec.ts:106:9 › on a phone › a blocked clipboard shows the link in a Link field at 360px (5.4s)
  ✘  6 [chromium] › e2e/share-sheet.spec.ts:106:9 › on a phone › a blocked clipboard shows the link in a Link field at 320px (5.4s)
  ✓  8 [chromium] › e2e/share-sheet.spec.ts:138:5 › a coached run card renders, for the Coached chip proof capture (388ms)
  ✓  7 [chromium] › e2e/share-sheet.spec.ts:129:7 › on a desktop › results never prefetch the card (3.4s)
  ✘  4 [chromium] › e2e/share-sheet.spec.ts:74:7 › on a phone › Share opens the sheet with the run text, and Download shares the prefetched card (10.4s)
    -     "Out in the group stage with 4-3-3. Draft your own XI on pokedraft.",
    +     "Draft Pokémon into a soccer formation and play a cup.",
    -     "pokedraft run card: 1-1-1, Team Score 283",
    +     "pokedraft run card",
    Error: expect(received).toBe(expected) // Object.is equality
    Expected: 1
    Received: 0
    Error: element(s) not found
  6 failed
  2 passed (11.0s)
```

The gate preview at RED had no `og:image:alt` at all (`Array []`), because its image entry had
no alt. GREEN `6cff46f`. `25b5665` adds the goal and Builder fallback proof and the screenshots.

## Measurements

- Headless browsers expose no Web Share, probed with Playwright 1.64.0 at this head:
  `chromium-desktop {share: 'undefined', canShare: 'undefined', coarse: false}`,
  `chromium-pixel7 {share: 'undefined', canShare: 'undefined', coarse: true}`,
  `webkit-iphone14 {share: 'undefined', canShare: 'undefined', coarse: true}`. WebKit also has no
  `requestIdleCallback` and no `navigator.connection`, so on iPhone the prefetch takes the
  1500 ms timer.
- On the touch profile at 390x844, results made exactly one `/card?t=<token>` request, and
  Download image made none: the e2e records `["/card?t=pd3.W1si..."]` after both taps. On the
  desktop profile results made zero `/card` requests in 3 s.
- The Link field at 390, 360 and 320 px: `document.documentElement.scrollWidth` equals the
  viewport width each time (no horizontal scroll), and the field holds focus.

## Gates

At `0ddcaa6` (comments only after GREEN `6cff46f`): `pnpm lint`, `pnpm typecheck`, `pnpm build`
and all nine `check:*` scripts exited 0; 1,828 unit tests passed in 217 files; Prettier passed on
the 24 touched text files. Playwright (`CI=1`, headless) on a build of `0ddcaa6`: `share-sheet`
9 of 9, and with the related specs 73 passed and 1 skipped by its own touch gate. The full suite
ran once on a build of `6cff46f` with the specs of `25b5665`: 1,013 passed, 67 skipped by their
own project gates, 0 failed, 0 flaky. Every PNG under `docs/reports` that a run rewrote was
reverted afterwards.

## Product decisions applied (hand-off 4.3, 5a)

- The helper, its outcomes, the four texts, the manual input labelled "Link", and the three
  callers.
- Card share with `files`, `url` and `text`. The prefetch on coarse pointers only, skipped with
  Data Saver, inside `requestIdleCallback` with the 1500 ms fallback. Desktop stays lazy.
- `/r` description and alt in `openGraph` and `twitter`.
- The Coached chip after the formation chip, from `isCoached(t)`.
- Decided not to ship: the nickname on the card. `/card` and `/r` cannot know the nickname; only
  the submitting browser does, after submit. A `nick=` query on a public, year-cached image
  endpoint would let anyone print any name on anyone's run. The board already pairs nickname with
  run, and 5d's "Share my rank" puts the nickname in the share text, where the sender owns it.
  This re-decides the brief's premise ("Cards show ... the nickname when submitted").
- Moved to Wave 7: `/?b=` link previews. `generateMetadata` on `/` needs `searchParams`, which
  makes the home page dynamic for every visitor. The right shape is a proxy rewrite of `/?b=` to
  a dynamic lineup route, next to the Wave 7 proxy matcher trim and the `/card` canonical query.
  Proxy changes are Red and 5a is Yellow. The line is on the hand-off's Wave 7 list (section 5), for
  the Wave 5 summary's program-log entry.

## Implementation decisions

- **The alt comes from page metadata, not `generateImageMetadata`.** `generateImageMetadata`
  appends `/<id>` to the image URL (`next-metadata-image-loader.js`, `url: imageUrl + '/' + idParam`),
  and `src/passcode.ts` keeps `/r/<token>/opengraph-image/x` gated, so previews would break
  behind the passcode and fixing that is a Red proxy change. Next 16.4 applies a file-based OG
  image only when the segment's metadata has no `openGraph.images`
  (`metadata-resolution-primitives.js` `mergeStaticMetadata`). The page now names the image
  itself, at the same URL the route already serves, with the dynamic alt. The URL loses the
  `?<contenthash>` query the file convention added. The gate page never had it. (Boundary
  Discipline: stay inside the Yellow fence instead of touching the proxy.)
- **The gate preview sends the same metadata.** Preview bots land on `/gate` when the passcode is
  on, so the description and alt must be there too. `runMetadata` is shared by both pages.
- **Any share error except AbortError falls back to the clipboard.** The hand-off names
  NotAllowedError. A TypeError or DataError from a picky share target is just as final for that
  tap, and the copy still delivers the link.
- **A missing `canShare` does not block the sheet.** Only an explicit `false` does. Every Web
  Share implementation accepts a plain URL, and older Safari has `share` without `canShare`.
- **The Builder's "Copy link" is now "Share link".** On a phone it opens the share sheet, so
  "Copy" would describe the wrong action. Results already say "Share" and copy on a desktop.
  (Experience First.)
- **The prefetch keys on the card URL.** If the picture pack or mirror setting changes after the
  prefetch, Download fetches the matching card instead of sharing a stale one. A failed prefetch
  falls back to a fresh fetch, and its rejection is caught so it never surfaces as an unhandled
  promise.
- **The Link field takes focus when it appears.** A screen reader hears "Link" and the URL, and a
  phone user can long-press to copy without hunting for it.
- **`runCardModel` takes the token.** The `/r` OG image and `/card?t=` draw the same card, so both
  get the chip from the one function instead of each caller passing a flag.

## Brief vs code

- **The brief puts the nickname on the card.** Not shipped; see the re-decision above.
- **The brief wires `/?b=` previews to `generateMetadata` on `/`.** Moved to Wave 7 by the
  hand-off; recorded above.
- **Headless Chromium on `pixel-7` has no `navigator.share`** (measured above), so
  `manager-mode.spec.ts:105` needs no stub: the touch project falls through to the clipboard on
  its own. `run-persist.spec.ts` keeps its stub, which still records the files, and passes.
- **`e2e/helpers.ts` `shareAndReplay` and `e2e/share.spec.ts:19` needed no change.** Both run on
  the desktop project (fine pointer), where Share still copies.
- **`ResultsView.test.tsx:262-266` needed no change.** jsdom has no `matchMedia`, so the helper
  treats it as a fine pointer and copies; the literal "Link copied" and the copied URL still hold.
- **`downloadCard.test.ts` changed shape.** `downloadCard` takes the `{ path, text }` share data
  before the look, so each call gained `RUN_SHARE`.
- **The gate metadata test pinned the old shape.** `src/app/gate/__tests__/page.test.tsx` now
  asserts the description and the image alt as literals for the three retained runs: "Out in the
  group stage with 4-3-3", "Champions with 4-3-3" and "Out in the Round of 16 with 4-2-3-1".
- **Line numbers moved little.** `ShareActions.tsx` `share()` was at :53-56 as mapped;
  `Builder.tsx` copy at :242-250; `download.ts` `shareFile` at :25-37; `opengraph-image.tsx:8`
  static alt. All matched `5932775`.

## Skipped steps

- `no-comments` (Comment Sicko) and `deslop`: skip, not installed. The diff adds four comments,
  each a why the code cannot show: why a phone uses the share sheet and a computer copies, why a
  friendly has no dare, why only a phone prefetches, and the existing NotAllowedError note kept
  in `shareFile`.

## NOT RUN

- Review and hosted CI.
- The real share sheet on a phone (owner phone check, hand-off section 6, items 1.1 and 1.2).
- A real screen reader pass over the Link field (owner item 2).
- WebKit e2e for the share sheet: the share-sheet spec runs in the chromium project with touch
  emulation; WebKit has no Web Share in headless mode either.

## Carryovers

- `/?b=` link previews: Wave 7, with the proxy trim and the `/card` canonical query.
