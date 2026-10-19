# One-tap play (Wave 4, row 4a)

Branch `feat/one-tap-play` off `origin/main` at `34af10e`. Yellow. No file under `src/engine`,
`src/data` or `src/scouting` changed, so the goldens are untouched.

## Scope

Brief decisions 11 and 14, with the hand-off's 4a decisions applied as written.

- The home Play buttons go straight to `/play`. The "Settings confirmed?" dialog is gone.
- The `/play` start card summary gains a Matchday line and an Edit link to `/#settings`.
- The Matchday selector (Manager mode, Match view) moves from Settings and records into the home
  Play card.
- A finished draft's button says "Kick off" when the cup plays a matchday, else "See results".

Files:

- `src/components/home/SidePanel.tsx`: Play buttons run the old "Yes, play" side effects and push
  the href, with prefetch on pointer enter and focus. `MatchdaySettings` in the Play card, bound to
  `panel`. The Matchday section in Settings and records is removed, and with it the `disabled` and
  `hint` props of the local `Segmented`, which only that section used. The settings region is
  `id="settings"`; on that hash it opens, scrolls its heading into view and focuses it, on load and
  on `hashchange`.
- `src/components/home/ConfirmPlay.tsx`, `ConfirmPlay.module.css` and the `confirmPlay()` helper
  are deleted. `playTarget()` in `src/ui/settings.ts` keeps the one part Play still needs: the href
  and the settings read back from it, so Play clears the slot `/play` will open.
- `src/ui/settingsSummary.ts`: `settingsSummary(settings, matchday)` now requires the matchday and
  ends with `{ label: "Matchday", value: "Sim, Quick" | "Sim, Live" | "Manager, Live" }`.
- `src/components/SettingsSummary.tsx` and its CSS: optional `editHref` renders an "Edit" link
  (accessible name "Edit settings", 44 px `btn--sm`). The `stacked` variant, used only by the
  dialog, is deleted.
- `src/components/matchday/MatchdaySettings.tsx`: the selector is controlled only. The stored-panel
  logic (storage events from other tabs, a local choice that covers blocked storage) moves into
  `useStoredMatchday()`, which the start card uses so its summary line and its selector share one
  value.
- `src/components/run/PlayScreen.tsx`: the start card uses `useStoredMatchday()`, passes it to the
  summary and the selector, and shows Edit except on the Daily (fixed settings).
- `src/components/run/LiveRun.tsx` and `DraftBoard.tsx`: `kickOff = playsMatchday(loadPanel())`,
  read once like `showRatings`, picks the button label. The testid stays `see-results`.
- `src/components/home/HomeScreen.tsx`: the builder's squad-link sync keeps `location.hash`
  (found by the new e2e, see below).
- Tests: `PlayCard.test.tsx` replaces `ConfirmPlay.test.tsx`; new `start-card.test.tsx`;
  `settingsSummary.test.ts` rewritten for `playTarget` and the Matchday item;
  `MatchdaySettings.test.tsx` renders the start-screen wiring through `useStoredMatchday`;
  `SidePanel.test.tsx`, `Builder.test.tsx` and `announce-builder.test.tsx` mock `useRouter`,
  because `HomeScreen` now always mounts it.
- e2e: `one-tap-play.spec.ts` replaces `settings-confirm.spec.ts` (also in the `iphone-14`
  project). `challenge-ratings` and `draft-modes` drop the "Yes, play" click. `mobile/scenes.ts`
  drops the "play confirmation open" scene; the existing "play start" scene covers the start card.
  `quick-not-broadcast` reads the Play card's own `match-view-quick`, because home now has two.

## RED commits and output (verbatim excerpts)

RED 1 `616ee23`, 23 of 27 failed in 3 files. GREEN `b51c22b`.

```
     × returns the 8-0 /play link and the settings /play reads back from it 3ms
     × drops regions and style for the 151 challenge, which ignores them 1ms
     × lists formation, regions, style, order and Matchday for the 8-0 challenge 3ms
     × lists only formation, order and Matchday for the 151 challenge 0ms
     × says All regions when every generation is on 0ms
     × settingsSummary includes Matchday: Manager, Live when manager mode is on over a saved Quick choice 0ms
     × says Sim, Live for a live match without manager mode 0ms
     × Play navigates to /play with no dialog 121ms
     × Play 151 navigates to the 151 link without regions or style 33ms
     × clears the saved run for that mode, so Play starts fresh instead of restoring old results 23ms
     × prefetches /play when a Play button is pointed at or focused 25ms
     × shows Manager mode and Match view in the Play card and nowhere else in the side panel 22ms
     × binds to the panel: manager on disables Quick with the hint and keeps the saved Quick 25ms
     × gives the settings region id settings and points both toggles at it 5ms
     × opens the settings and focuses their heading when the page loads at #settings 5ms
     × reopens collapsed settings when the hash changes to #settings 17ms
     × still lets the player collapse and re-expand the settings 4ms
     × lists Matchday: Sim, Quick by default 35ms
     × reads Matchday: Manager, Live from the saved panel 10ms
     × follows the start card's own Manager mode switch 17ms
     × links Edit settings to the home settings anchor 156ms
     × draft complete with manager on says Kick off 954ms
     × says Kick off for a live match without manager mode 167ms
 Test Files  3 failed (3)
      Tests  23 failed | 4 passed (27)
AssertionError: expected 'See results' to be 'Kick off' // Object.is equality
AssertionError: expected [ 'Order', 'Squad First' ] to deeply equal [ 'Matchday', 'Manager, Live' ]
TestingLibraryElementError: Unable to find an accessible element with the role "link" and name "Edit settings"
TestingLibraryElementError: Unable to find an accessible element with the role "switch" and name `/Manager mode/`
TypeError: d.showModal is not a function
TypeError: playTarget is not a function
```

The 4 that pass at RED pin behaviour that already held: no focus move on a plain home visit, the
server HTML renders the settings open, no Edit on the Daily (there was no Edit at all), and a quick
sim still says See results.

The same RED commit's `one-tap-play.spec.ts`, run against a build of the pre-fix sources
(`34af10e`, served from a scratch worktree, `--project chromium`): 9 failed, 2 passed. Excerpt:

```
  ✘ Play 8-0 goes straight to the matching /play URL with no dialog, and Start drafts
    Expected: "http://localhost:3991/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=open"
    Received: "http://localhost:3991/"
  ✘ the Play card holds the one home Matchday selector, and the start card summary follows it
      - waiting for getByRole('region', { name: 'Play' }).getByTestId('manager-mode')
  ✘ Edit lands on an open settings panel at 390
      - waiting for getByRole('link', { name: 'Edit settings' })
  ✘ draft complete with manager on says Kick off
    Error: locator.click: Test timeout of 180000ms exceeded.
      - waiting for getByRole('region', { name: 'Play' }).getByTestId('manager-mode')
```

The e2e "Kick off" guard fails at RED on the missing Play card switch, before it reaches the label.
The unit guard of the same name is the one that fails on the label itself (`expected 'See results'
to be 'Kick off'`).

RED 2 `8dd0a64`, 1 of 13 failed. Fix `565e78e`.

```
     × keeps #settings in the URL when the builder writes its squad link (catches the hash dropped once the builder loads) 236ms
AssertionError: expected '' to be '#settings' // Object.is equality
      Tests  1 failed | 12 passed (13)
```

Found by the first GREEN e2e run: the desktop Edit test failed once (`Received:
"http://localhost:3968/"`) and passed on retry. A probe that waited 4 s after Edit at CPU throttle
1x, 4x and 8x lost the hash 9 of 9 times, with focus still on the settings heading. The cause is
`HomeScreen`'s builder URL sync: once the builder engine loads (a pointer over the pitch is
enough), it rewrote the URL to the bare path. It now keeps the hash. The desktop e2e hovers the
pitch after Edit and checks the hash 2 s later.

## Product decisions applied

- Decision 14. Play goes straight to `/play`. The side effects of "Yes, play" stay:
  `writeRunCheckpoint(slot, null)` and `writeSession(runSlotKey(slot), RUN_CLEARED)`, so Play still
  starts a fresh run. Prefetch moved from dialog open to pointer enter and focus on each button.
- Decision 11. The Matchday selector is in the Play card and in the pre-run summary (as a line,
  with the start card's existing selector below it).
- Decision 1. Manager on still disables Quick with "Manager mode plays live" in every copy; the
  summary says "Manager, Live" over a saved Quick.
- Hand-off: the Edit link lands on an open panel, scrolled into view, with focus on its heading.
  "Kick off" replaces "See results" only when `playsMatchday`; `MatchdayFlow`'s `fulltime-next`
  "See results" is unchanged.

## Implementation decisions

- One summary function, a required argument. `settingsSummary(settings, matchday)` takes the
  matchday as a required argument, so no caller can show a summary without it. Its only caller
  after the dialog's removal is the start card.
- One value for the start card. The summary line and the selector below it read one
  `useStoredMatchday()` value, so flipping Manager mode on the start card updates the summary at
  once. The server and first client render show the defaults ("Sim, Quick"); a stored manager
  choice changes that text after hydration, the same way the switch already changed.
- `MatchdaySettings` is controlled only. With the start card on the hook, nothing used the
  uncontrolled path, so it moved out rather than staying as a second way in.
- Edit is a link with visible text "Edit" and the name "Edit settings". The visible word matches
  the hand-off. The longer name says what it edits, and it still contains the visible text.
- No Edit on the Daily. Its settings are fixed and never come from home. A shared `/play` link
  keeps Edit: it goes to the player's own settings.
- The heading focus waits for the open panel to render (a counter state and a second effect), so
  4b's collapsed panel will scroll to the right place.
- The Play buttons stay buttons. Links would bring back open-in-new-tab, but the slot clear has
  to run before the navigation, and a new tab would skip it.

## Brief vs code

- The hand-off's risk note says the builder's controlled `MatchdaySettings` in `HomeScreen.tsx` and
  the challenge panel are "separate `PanelSettings` reads". At `34af10e` they are not:
  `HomeScreen.tsx:274-279` binds the builder copy to the same `panel` state the side panel gets.
  Nothing was merged; the Play card copy binds to that same state, so all home copies agree by
  construction. Re-decided on the same principle ("three copies on home would disagree"): the
  builder copy stays beside "Play a friendly cup" (decision 2 needs it there), the Settings copy
  goes, and home has two bound copies of one value, not three.
- With two `MatchdaySettings` on home, `getByTestId("manager-mode")` and the other matchday testids
  are no longer unique on `/`. Specs scope them to the Play card or the friendly row.
- After a client navigation to `/play`, Next keeps the home page mounted and hidden, so its testids
  stay in the DOM. The spec picks the start card's visible switch.
- Line drift: the hand-off cited `SidePanel.tsx:285-301`, `PlayScreen.tsx:207-221` and
  `DraftBoard.tsx:655-662`; all matched at `34af10e`.
- The settings-confirm row's guard "Formation is on screen at 375 and 390 on first load" is not
  carried over. The Play card's selector moves Formation from 714 px to 885 px at 390, below the
  fold. 4b collapses the settings below 1024 px, and the Edit link lands on the panel heading, so
  the guard's premise is gone. `one-tap-play` still checks the settings are open and Formation, Order
  and the switches are visible.

## Measurements

Measured with a headless Chromium script at 844 px high, dark theme, against `next start` builds of
`34af10e` (before) and `565e78e` (after). Values are CSS px from the top of the page.

| Width | Play card bottom, before | after | Formation top, before | after | Start run bottom, before | after |
| --- | --- | --- | --- | --- | --- | --- |
| 390 | 511 | 682 | 714 | 885 | 505 | 601 |
| 360 | 511 | 682 | 714 | 885 | 527 | 623 |
| 320 | 533 | 722 | 736 | 925 | 589 | 641 |

The Play card grows by 171 px at 390 and 360 and by 189 px at 320 (the selector). The top of
Formation moves from inside the 844 px viewport (714 px) to below it (885 px). On the start card,
the Edit link and the Matchday line push Start run down by 96 px at 390 and 360 and by 52 px at 320.
It stays inside the viewport at every width.

## NOT RUN

- A physical phone check and a real screen reader pass (owner actions).
- Review (the coordinator runs GLM).
- Home first-load JS and CLS before and after.

## Carryovers

- 4b: collapse the settings below 1024 px. The `#settings` reveal already opens a collapsed panel.
- PR #114 rewrites the ratings hints in `SidePanel.tsx` and `SidePanel.test.tsx`. This row leaves
  those strings alone; the coordinator merges.
