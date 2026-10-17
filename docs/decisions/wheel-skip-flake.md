# Wheel skip flake (out-of-band side fix)

Tier Green. Branch `test/wheel-skip-flake`, off `origin/main` at `b8e5c2c`. Only
`e2e/wheel-results.spec.ts` changed. No product code changed.

## Symptom

Hosted CI runs 39052173584 and 39062736785 (attempt 1) failed
`[webkit-wheel] › e2e/wheel-results.spec.ts:24:11 › wheel results at 1440px › skip results stay in
the windows until the next pick and spin`, and its retry, at 120 s on the `Tap to skip` click.
The call log from 39062736785:

```
- waiting for getByRole('button', { name: 'Tap to skip' })
  - locator resolved to <button type="button" class="_6i8mIW_skip">Tap to skip</button>
- attempting click action
  - waiting for element to be visible, enabled and stable
  - element is not stable
- retrying click action
  - waiting for element to be visible, enabled and stable
- element was detached from the DOM, retrying
  - locator resolved to <button type="button" class="_6i8mIW_skip">Tap to skip</button>
- attempting click action
  - waiting for element to be visible, enabled and stable
  - element is visible, enabled and stable
  - scrolling into view if needed
  - done scrolling
  - element is not visible
- retrying click action
  - waiting for element to be visible, enabled and stable
- element was detached from the DOM, retrying
```

The locator resolves exactly twice and then never again.

## Root cause

The brief's hypothesis was a per-frame remount. Measured, it is not.

A probe spec logged the `Tap to skip` node identity and its bounding rect on every animation frame
in local WebKit (Playwright 1.64.0), from Start until 6 s later:

```
390
92ms node=NEW rect=110.80,423.00,79.20,44.00
1826ms node=gone rect=none
2138ms node=NEW rect=288.80,423.00,79.20,44.00
4271ms node=gone rect=none
1440
104ms node=NEW rect=635.80,360.50,79.20,44.00
1821ms node=gone rect=none
2151ms node=NEW rect=906.80,360.50,79.20,44.00
4268ms node=gone rect=none
```

The button mounts once per wheel and never moves. `Wheel.tsx` renders it only while
`state === "spinning"`, so it lives for one region spin (1.7 s) and then one type spin (2.1 s), as
designed. The two resolves in the CI log are those two buttons. On a slow, CPU-bound hosted WebKit
runner the click's actionability retries outlast both spins. After the type wheel settles there is
no skip button, so the click waits out the 120 s test timeout. The test raced a wall-clock window.

Not a product defect in the sense the brief described. No per-frame remount means no per-frame
focus loss. The fix is test side.

## Fix

The skip variant now owns time. It installs Playwright's clock before `goto`, pauses it before
Start, then advances it 100 ms at a time inside the existing `expect.poll` until the reel's
transform has moved. Time is frozen, so the reel cannot finish and the button cannot unmount while
Playwright checks actionability. After the click it resumes the clock. The natural and reduced
variants are unchanged.

The first draft ran one `runFor(400)` before the poll. Under the slow-runner harness the 390px case
failed 3 of 3 with `Received string: ""`, because the reel's `requestAnimationFrame` was registered
in a React effect after `runFor` had returned, and a paused clock never fires it. Advancing inside
the poll removes that order dependence.

Rejected options:

- `click({ force: true })` or `dispatchEvent("click")`. Both still need the button attached, so a
  late click still waits forever once both spins end. They shrink the race, they do not remove it.
- A keyboard shortcut. None exists for skip (`DraftBoard.tsx` keydown handles Escape and 1 to 3).

## RED and GREEN

No RED commit. The guard is the existing spec, and the failure needs a slow runner that local
macOS WebKit is not. Plain local runs never reproduced it: the brief's command gave 60 passed of 60,
and 20 of 20 skip runs under 14 `yes` CPU burners with `--workers 8`.

To reproduce the CI signature locally, a throwaway harness copies the spec, keeps only the skip
variant, and adds an init script that busy-waits `BURN` ms of real time
(`Performance.prototype.now`) on every animation frame, a stand-in for software paint on a starved
runner. Each cell is `--repeat-each 5` over both widths, `--retries 0 --timeout 40000`:

| Spec              | BURN 250                                                                                 | BURN 500                             |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| before (`b8e5c2c`) | 10 failed: 7 `locator.click: Test timeout` on `Tap to skip`, 2 on `toHaveCount`, 1 on `toBeVisible` | 10 failed, all `locator.click: Test timeout` |
| after (`b56ff55`)  | 10 passed                                                                                | 10 passed                            |

The 7 click failures carry the same call log shape as CI: resolve, detach, never resolve again.

After the fix, without the harness:

- `PLAYWRIGHT_PORT=3647 CI=1 pnpm exec playwright test e2e/wheel-results.spec.ts --project webkit-wheel --repeat-each 10`: 60 passed.
- Same spec, `--project chromium --repeat-each 5`: 30 passed.

## Carryover, not fixed here

A keyboard user who focuses `Tap to skip` and lets the reel finish loses focus to `body` when the
button unmounts. That happens once per wheel, not per frame. It is a separate a11y question for the
wheel component, outside this flake.

## NOT RUN

- Hosted CI on this branch.
- The full e2e suite locally. Only `e2e/wheel-results.spec.ts` ran, on webkit-wheel and chromium.
- `pnpm build` at this head. It ran at `b8e5c2c`; this branch changes only an e2e spec and docs.
