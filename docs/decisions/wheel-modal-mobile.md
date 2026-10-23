# A pick lands on the pitch on a phone (Yellow)

## Dispatch

Owner request (2026-10-22): the wheel spins over the pitch in every drafting mode, and once you
pick a Pokémon you are already on the pitch, with every position visible and the picked player's
card with its Scout button on screen. Before this, a pick left a phone at the bottom of the page
and the owner had to scroll up. The whole draft should need less scrolling on a phone, with
elements compressed to fit a phone screen without dropping any of them. The cards on the field
must show their Pokémon clearly and use the space the pitch has.

The owner accepted the picked player's card as a compact bar above the pitch (not beside it), on
the condition that the bar, the whole pitch and Scout fit one screen after a pick.

Scope: `DraftBoard` (shared by the 8-0 Cup, Kanto 151 and the Daily) and the phone draft pitch.
The builder has no wheel and is out of scope. No engine, data, scouting or leaderboard change.

## What changed

- `src/components/run/DraftBoard.tsx`: a `useLayoutEffect` frames the pitch on a phone (the
  one-column layout, `max-width: 959.98px`) whenever a Squad First roll, a candidate selection or
  a signing changes. It scrolls only when the pitch top or the field bottom is off screen. On the
  draft's first frame it keeps the hub (and its sound toggle) in view when the pitch top already
  shows in the top half. It runs before paint, so a pick never paints at the old scroll spot and
  a tap cannot land on a moving target. The old Squad First scroll effect now skips phones;
  desktop is unchanged.
- `src/components/pitch/Pitch.module.css`: under a 540 px pitch container on the draft pitch
  (`data-fit`), the field height is `clamp(300px, 100svh - 215px, 580px)` and a negative top
  margin takes back the empty band the tilt leaves. Field cards grow with the pitch:
  `--pitch-sprite` is `clamp(36px, min(16cqi, 10.5% of the field height), 64px)`. The slot label
  and the rating float over the sprite instead of taking a row. The bench is tighter. The dead
  `data-fit` 520 px field and 88 px token rules are removed.
- `--pitch-sprite` is registered with `@property` so its `cqi` resolves once, on the field. An
  unregistered variable resolved inside each sprite box (its own container) and pinned the
  sprite at 36 px. The name is not `--sprite`, because `@property` is global and
  `Broadcast.module.css` uses `--sprite` as a unitless scale.
- `src/components/run/DraftBoard.module.css`: on a phone the picked player's bar is one compact
  row (smaller padding, single-line hint and delta with an ellipsis).

## Tests

- RED commit `a3c5eacb` adds two guards to `e2e/mobile-draft.spec.ts`: a Position First pick
  made from the bench lands with every position on screen, and a Squad First pick lands with the
  picked card, Scout and every position on screen. Both failed on `origin/main`.
- `e2e/pitch-density-drag.spec.ts` now pins the grown sprite per viewport (57.3, 52.5 and
  37.1 px at 390x844, 360x800 and 320x568) instead of 48 px.
- `e2e/draft-flow.spec.ts` expects the 580 px field at 844 px tall instead of 520 px.
- `e2e/mobile-draft.spec.ts` "pointer drag from candidate card directly drops onto empty slot"
  scrolls the target slot to just above the open picker. With the shorter pitch, `block: "end"`
  put the slot under the picker, where a release places nothing.

## Decisions

- Frame by scrolling the page, not by turning the pitch into a fixed overlay. The pitch, picker
  and drag-to-place already work in page flow, and a fixed layer would fork their geometry. Fit
  plus one before-paint scroll gives the same result with a smaller blast radius.
- Size the field from `svh`, so the fit holds with mobile browser chrome showing.
- Phone only. Desktop keeps its two-column layout and its existing scroll.
