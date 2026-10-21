# App surfaces carryover sweep (Wave 7 row 7q2)

- Status: ACCEPTED
- Date: 2026-10-21
- Scope: Yellow tier (UI and app surface performance and determinism)
- Branch: `fix/app-surface-carryovers`

## Context

Wave 7 row 7q2 closes all remaining app surface carryover items from prior waves (Wave 4 and Wave 6):
1. Item 4e: "Goal for This squad!" capitalization on shared replays.
2. Item 4j: draft drawer and builder picker pointer swipes setting React state on every move.
3. Item 4g: alt text repeating visible name in `Wheel.tsx` and `BossRoster.tsx`.
4. Item 4i: landscape side insets.
5. Item 4h2: two 4 px frame-noise diffs in frozen broadcast frame.
6. Item 6b3: 320 px and 308 px touchline set-piece select text truncation.
7. Test runner flake: lazy-import race in `Builder.test.tsx` and `coach-mark.test.tsx`.

## Decisions

### 1. Direct DOM transform for swipe gestures (4j)

Both `src/components/builder/Picker.tsx` and `src/components/run/DraftBoard.tsx` maintained `[swipeY, setSwipeY]` React state that was updated on every `pointermove` event during downward drag gestures. Because `Picker` and `DraftBoard` are large components (rendering candidate grids, formations, coach marks and matchday hooks), updating state on every move event caused unnecessary 60 Hz re-renders.

- Removed `useState(0)` for `swipeY` from both components.
- In `Picker.tsx`, `onPointerMove` sets `ref.current.style.transform = dy > 0 ? "translateY(" + dy + "px)" : ""` directly on the `<dialog>` element ref. On pointer up or cancel, the transform is reset to `""`.
- In `DraftBoard.tsx`, `onPointerMove` sets `drawerRef.current.style.transform = dy > 0 ? "translateY(" + dy + "px)" : ""` directly on the drawer element ref. On pointer up or cancel, the transform is reset to `""`.
- Guard tests committed in RED-then-GREEN order (`src/components/builder/__tests__/picker-swipe-render.test.tsx` and `src/components/run/__tests__/drawer-swipe-render.test.tsx`) assert that pointer moves update the transform on the element directly without triggering component re-renders (spying on `valueAt` and `useCoachDismissed`).

### 2. Test runner determinism for dynamic imports

`Builder.test.tsx` and `coach-mark.test.tsx` each experienced an intermittent flake on hosted runners when dynamic imports (`@/components/builder/live` and `../LiveRun`) raced with component mount.
- Pre-warmed `import("@/components/builder/live")` in `beforeAll` of `Builder.test.tsx`.
- Pre-warmed `import("../LiveRun")` in `beforeAll` of `coach-mark.test.tsx`.

### 3. Citations for closed carryovers

- 4e ("Goal for This squad!" capitalization): closed by PR #127 commit `ef542fb0b8773d3dc924a01252331342e09393c9` (`src/components/results/format.ts:25` and `MatchReplay.test.tsx:96-110`).
- 4g (alt text repeating visible name): closed by PR #127 commit `ef542fb0b8773d3dc924a01252331342e09393c9` (`src/components/wheel/Wheel.tsx:57` and `src/components/results/BossRoster.tsx:56` both use `alt=""`).
- 4i (landscape side insets): closed by `e2e/safe-area-insets.spec.ts:101-134` verifying viewport padding and safe area rules.
- 4h2 (two 4 px frame-noise diffs): closed as measured raster noise between identical builds in `docs/decisions/wave4-carryovers.md:105-118`.
- 6b3 (320 px and 308 px set-piece select truncation): closed by PR #156, guarded by `e2e/penalty-takers.spec.ts:47-80`.

## Verification

- Unit test suites: 257 files, 2,277 tests passed.
- Lint, typecheck, build, 9 check scripts, and format:check all passed.
- Guard tests prove zero re-renders during swipe drags.
