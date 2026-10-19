# PWA and viewport (Wave 4, row 4i)

Branch `feat/pwa-viewport` off `origin/main` at `5c7d4fb` (PR #122, row 4g). Yellow. No file
under `src/engine`, `src/data` or `src/scouting` changed, so the goldens are untouched.

## Scope

- **Manifest.** `src/app/manifest.ts` serves `/manifest.webmanifest` with name and short name
  "pokedraft", the layout's description, `start_url` "/", `display` "standalone", and
  `background_color` and `theme_color` set to `THEME_COLOR_DARK` from `src/design/theme-color.ts`
  (imported, not copied). Icons are 192 and 512 (`purpose: "any"`) plus a 512 maskable. Next adds
  `<link rel="manifest">` to every page. No service worker.
- **Icons.** `public/icons/icon.svg` is the source: a cream and navy soccer ball on the dark pitch
  green with a halfway line and centre circle. No Pokémon art or likeness. The ball sits inside
  the maskable safe circle (radius 140 of 512, the safe zone is 204.8). `pnpm assets:icons`
  (`scripts/assets/build-icons.mjs`) renders it with `sharp`, already a direct dependency:
  `public/icons/icon-{192,512}.png` with rounded corners, `public/icons/icon-maskable-512.png`
  and `src/app/apple-icon.png` (180) full bleed. Next turns `src/app/apple-icon.png` into the
  `<link rel="apple-touch-icon">` on every page.
- **Gate.** `src/passcode.ts` adds `/manifest.webmanifest`, `/icons/<name>.png` and
  `/apple-icon.png` to the public paths.
- **Safe areas.**
  - `.page` padding-bottom is `calc(32px + env(safe-area-inset-bottom, 0px))`.
  - `.site-header` padding-top is `calc(12px + env(safe-area-inset-top, 0px))`.
  - At 480px and below the header is a fixed-height row, so its `padding-block` top is
    `calc(6px + env(safe-area-inset-top, 0px))` and `--site-header-h` is
    `calc(57px + env(safe-area-inset-top, 0px))` (see "Brief vs code").
  - The draft toast (`.error` below 960px) has `top: calc(8px + env(safe-area-inset-top, 0px))`.
- **Overscroll.** `body:has([data-draft-board]) { overscroll-behavior: none; }`, with
  `data-draft-board` on the `DraftBoard` root. `LiveRun` mounts `DraftBoard` only on the draft
  screen, so setup, results and every other page keep the default.

Files: `src/app/manifest.ts`, `src/app/apple-icon.png`, `public/icons/icon.svg`,
`public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`,
`scripts/assets/build-icons.mjs`, `package.json` (`assets:icons`), `src/passcode.ts`,
`src/app/globals.css`, `src/components/run/DraftBoard.module.css`,
`src/components/run/DraftBoard.tsx`, and the tests `src/app/__tests__/manifest.test.ts`,
`src/__tests__/proxy.test.ts` and `e2e/pwa-viewport.spec.ts`.

## RED commit and output (verbatim excerpts)

RED `cd43845`. Unit: 1 of 16 tests failed in 1 file, and `manifest.test.ts` failed to load.

```
 ❯ src/app/__tests__/manifest.test.ts (0 test)
 ❯ src/__tests__/proxy.test.ts (16 tests | 1 failed) 19ms
   ❯ passcode gate (catches a gate that breaks link previews or leaks the API) (16)
     × keeps the install files public (catches a home screen install that hits the gate, since browsers fetch the manifest without cookies) 2ms

 FAIL  src/app/__tests__/manifest.test.ts [ src/app/__tests__/manifest.test.ts ]
Error: Cannot find module '../manifest' imported from /Users/paulo/Projects/pokedraft-pwa-viewport/src/app/__tests__/manifest.test.ts

 FAIL  src/__tests__/proxy.test.ts > passcode gate (catches a gate that breaks link previews or leaks the API) > keeps the install files public (catches a home screen install that hits the gate, since browsers fetch the manifest without cookies)
AssertionError: expected [ '/manifest.webmanifest', …(4) ] to deeply equal []
```

E2E (`CI=1`, chromium, against a build of `5c7d4fb`): 5 of 6 failed, retries included. The
sixth, "draft toast keeps its 8px top without a notch", is a regression guard, no RED: behaviour
already correct.

```
  ✘  2 [chromium] › e2e/pwa-viewport.spec.ts:38:5 › /manifest.webmanifest serves (417ms)
  ✘  3 [chromium] › e2e/pwa-viewport.spec.ts:66:5 › page bottom padding includes the inset (630ms)
  ✘  4 [chromium] › e2e/pwa-viewport.spec.ts:76:5 › desktop header top padding includes the inset (639ms)
  ✓  1 [chromium] › e2e/pwa-viewport.spec.ts:86:5 › draft toast keeps its 8px top without a notch (783ms)
  ✘  5 [chromium] › e2e/pwa-viewport.spec.ts:91:5 › draft toast sits below the notch (367ms)
  ✘  10 [chromium] › e2e/pwa-viewport.spec.ts:98:5 › body overscroll none on /play, auto on / (653ms)
    Error: expect(received).toBe(expected) // Object.is equality
    Expected: 200
    Received: 404
    -   "headerHeight": 104,
    -   "headerTop": "53px",
    -   "pageBottom": "66px",
    +   "headerHeight": 57,
    +   "headerTop": "6px",
    +   "pageBottom": "32px",
    Expected: "59px"
    Received: "12px"
    Expected: "55px"
    Received: "8px"
    Expected: "none"
    Received: "auto"
  5 failed
  1 passed (4.8s)
```

Each failing test passed its no-notch baseline assertion first, so every failure is the missing
inset or rule, not the harness. Prettier reformatted the spec after this run (line wrapping
only), which is why the committed line numbers differ by two.

GREEN `171688a`. `2434ddb` adds the `/how-to-play` bottom check and the screenshots.

## Measurements

- Safe areas, Chromium 156 with `Emulation.setSafeAreaInsetsOverride` at top 47, bottom 34 (an
  iPhone 14 in portrait), 390x844:

  | Element | No insets | With insets |
  | --- | --- | --- |
  | `.site-header` padding-top | 6px | 53px |
  | `.site-header` height | 57px | 104px |
  | `main.page` padding-bottom on `/` and `/how-to-play` | 32px | 66px |
  | Draft toast `top` | 8px | 55px |

  At 1280x720 the header's padding-top is 12px, and 59px with the insets.
- Body `overscroll-behavior-y`: `auto` on `/` and on the `/play` setup screen, `none` once the
  draft board shows.
- Icons, rendered twice in a row with the same `sharp` (0.35.5): byte-identical. SHA-256:
  - `icon-192.png` (9,482 bytes) `ad7927aaa7e826a11f9b302b04684e3e5fbffc65c589933cf12a21d639b82aea`
  - `icon-512.png` (27,804 bytes) `0321be39e19c562fd214f65c253281815d6f5f433d676a6f13579e7e90db2b52`
  - `icon-maskable-512.png` (25,748 bytes) `11a5554f8fa83179eab2d241b4bd71b7203773dfb7cd82036729ffbcf7cfd236`
  - `apple-icon.png` (8,400 bytes) `3c6ba106bd28f981c11e63357903373fdad23aac5cdb66c17fd8efaeb84dfb11`
- `next build` lists `/manifest.webmanifest` and `/apple-icon.png` as static routes.

## Product decisions applied (hand-off 4.3, 4i)

- Manifest fields, dark theme colours from `theme-color.ts`, icons 192, 512 and maskable 512, no
  service worker.
- Original icon art, committed SVG source and a deterministic `sharp` script, plus a 180 apple
  icon. `sharp` resolves (`package.json` lists it), so the `ImageResponse` fallback was not
  needed and no dependency was added.
- The three safe-area insets and the `:has` overscroll rule, CSS only.

## Implementation decisions

- **Guards measure computed values, not rule text.** The hand-off says a safe-area `env()`
  override is not emulatable in Playwright. Chromium 156 accepts
  `Emulation.setSafeAreaInsetsOverride` over CDP, and a probe page returned 66px for
  `calc(32px + env(safe-area-inset-bottom, 0px))` at bottom 34. The spec uses it, so the guards
  check what a notched phone gets instead of the stylesheet text. The spec runs in the chromium
  project only, as CDP is Chromium only. (Prove It Works.)
- **The install files are public through the passcode gate.** Browsers fetch the manifest
  without cookies unless the link has `crossorigin="use-credentials"`, so with
  `FRIENDS_PASSCODE` set the manifest would 307 to `/gate` and installing would fail. The
  manifest and icons hold nothing private. The patterns are exact (`/icons/<name>.png`, no
  subfolders), and the proxy test lists near misses that stay gated. STATE does not say whether
  production sets the passcode, so this is a guard for when it does.
- **Rounded "any" icons, full bleed maskable and apple icons.** Android and iOS cut their own
  shape from the maskable and apple icons, and iOS draws transparent corners black, so only the
  "any" icons carry the rounded corners. The script applies them with a `dest-in` mask so the
  SVG stays one source.
- **`assets:icons` script.** It is the lever a reviewer reruns to check that the PNGs come from
  the SVG. (Build the Lever.)
- **No unit test compares rendered pixels to the committed PNGs.** `librsvg` antialiasing may
  differ between macOS arm64 and the Linux CI runner, so a byte-equality test could fail on CI
  for a reason unrelated to a stale icon. The determinism check is the twice-run hash
  comparison above, and the unit test pins each file's PNG signature and size. (Laziness
  Protocol.)
- **`/` gets the bottom inset twice on a notched phone.** The home page is the only page with
  `SiteFooter`, whose padding already includes the inset, so on `/` the gap between the main
  card and the footer grows by the inset (34px on an iPhone 14). It is spacing above the footer,
  never a clipped control. A selector to cancel it would add a rule outside the row's named
  properties for a cosmetic gap.

## Brief vs code

- **The header at phone widths.** The code map says `.site-header` has `padding: 12px` and
  plans `calc(12px + inset)`. At 480px and below, the phone block (`globals.css:505-511` at
  `5c7d4fb`, 511-517 at `171688a`) overrides it with a fixed
  `height: var(--site-header-h)` (57px) and `padding-block: 6px`, so the planned rule never
  reaches a phone. Adding only the top padding would leave no room for the 44px row inside the
  fixed 57px height. Decided again on the hand-off's principle, that the header clears the notch.
  The phone rule adds the inset to both its top padding and `--site-header-h`. `--site-header-h` also sizes the `/play`
  and `/leaderboard` minimum heights, which now subtract the taller header. The `@media` query
  itself is unchanged (row 4h2 owns those values).
- **The footer already had the inset.** `.site-footer` (`globals.css:263-270`) already pads by
  `calc(28px + env(safe-area-inset-bottom, 0px))`. It renders only on `/`.
- **`public/favicon.ico` does not exist.** The code map lists it; `public/` holds only
  `creatures/`. The favicon is `src/app/favicon.ico`.
- **Line numbers moved.** At `171688a`, `.page` is at `globals.css:389` (code map 355-360),
  `.site-header` at 316 (283-291), the toast at `DraftBoard.tsx:648` (547) and
  `DraftBoard.module.css:483-490` (445-452).

## Skipped steps

- `no-comments` (Comment Sicko) and `deslop`: skip, not installed. The diff adds three comments,
  each a why the code cannot show: why the "any" icons are rounded, why the install files skip
  the gate, and the header height note that now counts the notch.

## NOT RUN

- Review and hosted CI.
- WebKit and Firefox safe-area checks: CDP is Chromium only, and neither engine exposes an
  inset override to Playwright.
- Landscape side insets (`safe-area-inset-left` and `-right`): not in the row; the gutters do
  not add them. Recorded as a carryover for the phone check.
- Owner phone check: Add to Home Screen (icon, standalone launch), real notch and home bar
  insets, no pull-to-refresh bounce during the draft.
- A real screen reader pass.

## Carryovers

- Landscape notch: the side gutters ignore `safe-area-inset-left` and `-right`. Look at it in the
  owner phone check before deciding.
- The doubled bottom gap on `/` on notched phones, if the phone check finds it odd.
