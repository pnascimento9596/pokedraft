# Builder link previews (row 7bp, Yellow)

Branch `feat/builder-link-previews` off `origin/main` at `fc890c09`. Wave 7 row 7bp (Yellow).

## Scope

- `src/app/builder-metadata.ts`: exports `builderTokenFromUrl`, `builderTitle`, and `builderMetadata`. Decodes builder tokens with `draftFromBuilderToken`, computing squad formation, starter count, and rating score when full. Emits OpenGraph and Twitter cards pointing to `/card?b=...` with 1200x630 dimensions.
- `src/app/page.tsx`: adds `generateMetadata({ searchParams })` for `/` when `b` is present and valid. Renders dynamic request connection via `connection()` inside `<Suspense fallback={null}>` to satisfy partial prerendering.
- `src/app/gate/page.tsx`: detects builder link `b` parameter in `searchParams.next` and passes through squad preview metadata for unauthenticated preview bots without unlocking the gate.
- `e2e/share-sheet.spec.ts`: Playwright assertions for `/?b=` and `/gate?next=%2F%3Fb%3D...` metadata, card image headers (HTTP 200, `image/png`), dimensions (1200x630 via `sharp`), and fallback on invalid token.
- `src/app/__tests__/builder-metadata.test.ts` and `src/app/gate/__tests__/page.test.tsx`: unit tests for URL parsing, metadata generation, and gate pass-through.

## RED output (`057f8942`)

Copied verbatim from `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/7bp/vitest-red.log`:

```text
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-7bp

 ❯ src/app/__tests__/builder-metadata.test.ts (0 test)
 ❯ src/app/gate/__tests__/page.test.tsx (10 tests | 1 failed) 631ms
   ✓ gate page error copy (catches a silent or unannounced unlock failure) (5)
     ✓ error=1 announces its copy in an alert 15ms
     ✓ error=limited announces its copy in an alert 2ms
     ✓ error=unavailable announces its copy in an alert 1ms
     ✓ error=something-else announces its copy in an alert 1ms
     ✓ shows no alert without an error and posts to /gate/unlock with the next path 1ms
   ❯ gated share metadata (catches query links losing their title, description and card) (5)
     ✓ replays a query-format link through its own engine 208ms
     ✓ replays a query-format link through its own engine 205ms
     ✓ replays a query-format link through its own engine 194ms
     ✓ keeps legacy dot links previewable 2ms
     × passes through squad preview metadata for a gated builder link 2ms

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/app/__tests__/builder-metadata.test.ts [ src/app/__tests__/builder-metadata.test.ts ]
Error: Cannot find module '../builder-metadata' imported from /Users/paulo/Projects/pokedraft-7bp/src/app/__tests__/builder-metadata.test.ts
 ❯ src/app/__tests__/builder-metadata.test.ts:2:1
      1| import { describe, expect, it } from "vitest";
      2| import { builderMetadata, builderTokenFromUrl } from "../builder-metad…
       | ^
      3| import { generateMetadata as generateHomeMetadata } from "../page";
      4|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/app/gate/__tests__/page.test.tsx > gated share metadata (catches query links losing their title, description and card) > passes through squad preview metadata for a gated builder link
AssertionError: expected 'pokedraft' to be 'pokedraft squad: 4-3-3, Team Score 375' // Object.is equality

Expected: "pokedraft squad: 4-3-3, Team Score 375"
Received: "pokedraft"

 ❯ src/app/gate/__tests__/page.test.tsx:108:24
    106|       searchParams: Promise.resolve({ next: `/?b=${encodeURIComponent(…
    107|     });
    108|     expect(meta.title).toBe("pokedraft squad: 4-3-3, Team Score 375");
       |                        ^
    109|     expect(meta.description).toBe("4-3-3 squad with Team Score 375. Bu…
    110|     expect(meta.openGraph?.images).toEqual([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  2 failed (2)
      Tests  1 failed | 9 passed (10)
   Start at  15:07:33
   Duration  1.08s (tests 62%, transform 22%, import 16%)
```

## Decisions

- **Gate pass-through for preview bots (`principle-defense-in-depth`).** Unauthenticated link preview bots requesting `/?b=...` without a cookie receive a 307 redirect to `/gate?next=%2F%3Fb%3D...`. By having `/gate` inspect `next` for a builder token via `builderTokenFromUrl` and delegate to `builderMetadata`, chat applications (iMessage, Discord, WhatsApp) render the squad title, description, and card image without weakening the gate. `/` remains fully protected.
- **Preview image via public canonical `/card?b=` path.** `/card` is an allowlisted public path under `src/passcode.ts` and accepts `b` query parameters. Using `/card?b=${encodeURIComponent(b)}` reuses the established card rendering pipeline with zero new image routes.
- **Partial prerendering with dynamic connection.** Next.js 16 flags dynamic `generateMetadata({ searchParams })` when the underlying route content lacks dynamic markers. Wrapping `<HomeScreen />` with `<Suspense fallback={null}><HomeContent /></Suspense>` calling `await connection()` aligns `/` with `/play` and `/gate`, enabling partial prerendering without breaking static assets.

## Gates run

Re-executed at branch HEAD:
- `pnpm vitest run src/app/__tests__/builder-metadata.test.ts src/app/gate/__tests__/page.test.tsx`: 20 passed in 2 files
- `pnpm lint`: clean (exit 0)
- `pnpm typecheck`: clean (exit 0)
- `pnpm test`: 2,245 passed in 253 files (exit 0)
- `pnpm build`: clean (exit 0)
- All 9 `check:*` scripts: clean (exit 0)
- `pnpm format:check`: clean (exit 0)
- Local Playwright (`e2e/share-sheet.spec.ts`, `e2e/data-split.spec.ts`, `e2e/builder.spec.ts`, `e2e/share.spec.ts`): 51 passed across 4 test files

## NOT RUN

- Owner physical device test (iPhone Safari, Android Chrome).
- Owner VoiceOver screen reader pass.
