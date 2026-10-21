# Client Zod and daily first paint (row 7zd, Yellow)

Branch `feat/client-zod-daily-paint` off `origin/main` at `a26daf01`. Wave 7 row 7zd (Yellow).

## Scope

- `src/components/daily/dailySaved.ts`: exports narrow handwritten validator `parseDailySaved(value: unknown)` replacing `savedSchema` Zod object in `DailyScreen.tsx` for localStorage parsing.
- `src/components/daily/DailyScreen.tsx`: removes `import { z } from "zod"`, uses `parseDailySaved`, adds `serverToday?: IsoDate | null` prop, and provides a server snapshot fallback `() => (serverToday !== null ? DEFAULT_PANEL.formation : null)` to support dynamic server rendering without client layout shifts.
- `src/app/daily/page.tsx`: adds `DailyContent()` calling `await connection()` and passing `dailyDate(new Date())` to `<DailyScreen serverToday={...} />`, turning `/daily` into a dynamic server-rendered setup panel matching `/play`.
- `src/app/daily/__tests__/page.test.tsx`: server rendering guard verifying challenge setup renders on server without loading line.
- `src/components/daily/__tests__/daily-saved.test.ts`: 29 tests verifying bundle boundary (no zod import in DailyScreen) and literal fuzz table matching Zod accept and reject semantics.
- `e2e/server-html.spec.ts`: adds `/daily start panel` asserting initial response stream carries "Daily 8-0 Challenge", 16 rounds text, and "Start run".

## RED output (`86ca539c`)

Copied verbatim from `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/7zd-guard-red.log`:

```text
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-7zd

 ❯ src/components/daily/__tests__/daily-saved.test.ts (0 test)
 ❯ src/app/daily/__tests__/page.test.tsx (1 test | 1 failed) 13ms
   ❯ Daily page server render (catches /daily serving a loading line on first paint) (1)
     × server-renders the daily challenge setup instead of the loading line 12ms

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/components/daily/__tests__/daily-saved.test.ts [ src/components/daily/__tests__/daily-saved.test.ts ]
Error: Cannot find module '../dailySaved' imported from /Users/paulo/Projects/pokedraft-7zd/src/components/daily/__tests__/daily-saved.test.ts
 ❯ src/components/daily/__tests__/daily-saved.test.ts:5:1
      3| import { describe, expect, it } from "vitest";
      4| import { z } from "zod";
      5| import { parseDailySaved } from "../dailySaved";
       | ^
      6|
      7| const savedSchema = z.object({

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/app/daily/__tests__/page.test.tsx > Daily page server render (catches /daily serving a loading line on first paint) > server-renders the daily challenge setup instead of the loading line
AssertionError: expected '<main class="page"><!--$--><p class="…' not to contain 'Loading the daily challenge'

Expected: "Loading the daily challenge"
Received: "<main class="page"><!--$--><p class="kicker page-loading">Loading the daily challenge</p><!--/$--></main>"

 ❯ src/app/daily/__tests__/page.test.tsx:11:22
      9|     const { prelude } = await prerender(<DailyPage />);
     10|     const html = await new Response(prelude).text();
     11|     expect(html).not.toContain("Loading the daily challenge");
       |                      ^
     12|     expect(html).toContain("Daily challenge");
     13|     expect(html).toContain("Today&#x27;s draft");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  2 failed (2)
      Tests  1 failed (1)
   Start at  15:52:27
   Duration  249ms (import 50%, transform 42%, tests 6%, worker 2%)
```

## Client module audit (section 4.2)

- `src/components/daily/DailyScreen.tsx`: "use client" component. Previously imported `zod` directly for `savedSchema`. Now replaced with handwritten `parseDailySaved`, removing direct zod import from client daily screen.
- `src/components/leaderboard/client.ts`: imported by `LeaderboardScreen.tsx` for client-side API response validation. Reaches `/leaderboard` client chunk.
- `src/components/run/savedRun.ts`: imported by `LiveRun.tsx` (dynamically loaded via `import("./LiveRun")`). Reaches `/play` client chunk on demand.
- `src/ui/runs.ts`: imported by `HomeScreen.tsx`, `HistoryList.tsx`, `LifetimePanel.tsx`, `ExhibitionScreen.tsx` for stats and history schema parsing. Reaches client chunks on `/`, `/history`, `/exhibition`.
- `src/ui/lifetime.ts`: imported by `LifetimePanel.tsx`. Reaches `/history` client chunk.
- `src/ui/backup.ts`: imported by `LifetimePanel.tsx`. Reaches `/history` client chunk.
- `src/instrumentation-client.ts`: runs on client before app modules to configure `z.config({ jitless: true })` to prevent CSP eval violations when Zod is evaluated on client.
- No server-side Zod schema modified.

## Measurements

- Client JS: `src/components/daily/dailySaved.ts` is 602 bytes uncompressed (282 bytes gzip). `DailyScreen.tsx` removes `import { z } from "zod"`.
- FCP and LCP under 4x CPU throttle (headless Playwright, 390x844 viewport, 5 runs):
  - FCP median: 64.0 ms (runs: 160 ms, 64 ms, 64 ms, 64 ms, 64 ms)
  - LCP median: 64.0 ms (runs: 160 ms, 64 ms, 64 ms, 64 ms, 64 ms)
  - FCP and LCP match because the challenge panel is delivered in the initial server response stream, eliminating the delayed second paint from client-side hydration.
  - Headless numbers exclude GPU raster.

## Decisions

- **Dynamic request-time connection for `/daily` (`principle-parity-with-play`).** `/play` and `/leaderboard` use `await connection()` so that dynamic daily date and URL settings render directly into the first response stream. Bringing `/daily` to parity eliminates the mobile LCP penalty of painting a loading placeholder line.
- **Narrow validator over general schema library (`principle-minimal-surface`).** Daily run restoration only reads three primitive fields from localStorage: screen, token, and daily date. Hand-writing the 20-line validator preserves exact accept and reject semantics while decoupling `DailyScreen.tsx` from Zod.

## Gates run

Re-executed at branch HEAD:
- `pnpm vitest run src/app/daily/__tests__/page.test.tsx src/components/daily/__tests__/`: 34 passed in 3 files
- `pnpm lint`: clean (exit 0)
- `pnpm typecheck`: clean (exit 0)
- `pnpm test`: 2,275 passed in 255 files (exit 0)
- `pnpm build`: clean (exit 0)
- All 9 `check:*` scripts: clean (exit 0)
- `pnpm format:check`: clean (exit 0)
- Retained bundle checks (`check-retained-replays.mts`, `measure-retained-json.mjs`): 13 golden replays passed, 2,891,853 bytes across 4 copies
- Local Playwright (`e2e/server-html.spec.ts`, `e2e/layout-shift.spec.ts`, `e2e/board-ux.spec.ts`, `e2e/data-split.spec.ts`, `e2e/leaderboard.spec.ts`): 28 passed across 5 files

## NOT RUN

- Owner physical device test (iPhone Safari, Android Chrome).
- Owner VoiceOver screen reader pass.
