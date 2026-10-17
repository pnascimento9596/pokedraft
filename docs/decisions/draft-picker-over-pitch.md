# Draft picker over the pitch

## Ask

The owner asked for the draft picker to pop up centered over the pitch, with the pitch visible
behind it. After a pick the picker closes, and the pitch must already be on screen. Before this
fix the player had to scroll up to find it. A follow-up note asked for a true centered pop-up, not
a bottom sheet, and for desktop to change too.

Risk tier: Yellow. The change is UI only. No file under `src/engine`, `src/data` or
`src/scouting` changed.

## Root cause

`ActiveDraftBoard` in `src/components/run/DraftBoard.tsx` scrolled the wheel into view on each
roll below 960px.

- Portrait phones at 500px tall or more showed the wheel in a `position: fixed` bottom sheet.
  Scrolling to an element inside a fixed sheet does not move the page. The page stayed where the
  last slot tap left it, which is low on the pitch after a keeper or defender pick. At 390x667,
  from round 2 on, the pitch top sat at -263px, so the selection bar and the forward line were off
  screen.
- Screens under 500px tall (phone landscape) showed the picker in flow below the pitch. The
  scroll pulled the page more than 1100px down to the picker, and the pitch left the screen.
- Desktop showed the picker in the left column, in flow, so a short window had to scroll to reach
  the cards.

## Fix

- The open picker is a pop-up centered in the viewport at every width, at most 560px wide, over
  the dimmed pitch. It closes after a pick, as it already did on phones, and the Choose a player
  button reopens it. Desktop now behaves the same way.
- Each Squad First roll scrolls the pitch section to the top of the viewport when the pitch top
  is hidden or sits in the lower half. When the pitch top already shows, the page stays put, so
  the hub and the Sound button stay in view on the first roll.
- Position First rolls do not scroll. The player just tapped a slot on the pitch, and the pick
  fills that slot. `e2e/mobile-draft.spec.ts` pins that the pitch does not move there.
- The open picker has `transition-property: none`. The global reduced-motion rule sets every
  transition to 0.01ms, which turned the default `all 0s` into a real one-frame transition and
  painted the picker off center (measured: one frame at `translate: 0% 0%`, bottom at 731px of
  667px).
- The wheel result line uses `--stadium-muted` inside the dark pop-up. axe flagged its light-theme
  color as a contrast failure.

## Evidence

- RED `3c5e178` (bottom-sheet scroll guard) failed on `main`: short portrait `round 2 pitch behind
  the picker, Received: -263`, short landscape `Expected: "fixed", Received: "static"`.
- RED for the centered pop-up (the second test commit) failed on the bottom-sheet fix: picker off
  center by 130px (390x667), 24px (844x390), and not an overlay at 1280x720.
- GREEN: all three viewports pass. A scripted run at 390x844, 390x667, 844x390 and 1280x720 kept
  the pitch top on screen with the picker open and after a pick on rounds 1 to 3.

## Decisions

- Centered pop-up at every width, per the owner's follow-up. (Experience First.)
- On a 320px phone the pop-up covers most of the screen, including the hub. The player minimizes
  it to reach the Sound button or a covered slot. A centered pop-up cannot avoid this, and the
  pitch still shows dimmed above and below it.
- Drag to place still cancels when the drop lands on the pop-up, so a slot under the pop-up takes
  a tap, not a drag. Kept to avoid a placement the player cannot see.
- No new scroll on Position First, because it would move the pitch under the finger that just
  tapped it.
- e2e that assumed the bottom sheet now minimize the picker before tapping covered slots or the
  hub, and check that the pitch top shows instead of counting `scrollIntoView` calls.
