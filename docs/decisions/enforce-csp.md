# Enforce Content-Security-Policy (row 7csp, Red)

Branch `fix/enforce-csp` off `origin/main` at `90ee0f72`. Wave 7 row 7csp (Red).

## Scope

- `next.config.ts`: flips the security header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`. Preserves the exact policy directives, including `'unsafe-inline'` for script and style, `'self'`, and `report-uri /api/csp-report`. Updates header comment citing the production runtime telemetry.
- `src/__tests__/security-headers.test.ts`: updates the security headers test suite to assert that `Content-Security-Policy` is present with the exact policy value, and asserts that `Content-Security-Policy-Report-Only` is absent.

## RED output (`7055f5a8`)

Copied verbatim from `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/7csp/red-security-headers.txt`:

```text
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-7csp

 ❯ src/__tests__/security-headers.test.ts (2 tests | 2 failed) 4ms
   ❯ security headers (catches a site that can be framed, sniffed or loaded with any script) (2)
     × sends nosniff, a referrer policy, a permissions policy, frame denial and enforcing CSP on every path 3ms
     × enforces Content-Security-Policy and does not send report-only CSP 1ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/security-headers.test.ts > security headers (catches a site that can be framed, sniffed or loaded with any script) > sends nosniff, a referrer policy, a permissions policy, frame denial and enforcing CSP on every path
AssertionError: expected { …(6) } to deeply equal { …(6) }

- Expected
+ Received

@@ -1,7 +1,7 @@
  {
-   "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; report-uri /api/csp-report",
+   "Content-Security-Policy-Report-Only": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; report-uri /api/csp-report",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow",

 ❯ src/__tests__/security-headers.test.ts:12:41

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  src/__tests__/security-headers.test.ts > security headers (catches a site that can be framed, sniffed or loaded with any script) > enforces Content-Security-Policy and does not send report-only CSP
AssertionError: expected [ 'x-robots-tag', …(6) ] to include 'content-security-policy'
 ❯ src/__tests__/security-headers.test.ts:26:18

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed (2)
   Start at  14:37:56
   Duration  77ms (transform 50%, tests 21%, import 20%, worker 8%)
```

## Decisions and telemetry

- **Production telemetry confirms zero violations (decision 8).** Analyzed 17,803 production runtime log records from Vercel covering 2026-10-20T18:25:50.149Z to 2026-10-21T17:51:04.383Z (downloaded via pagination to `$S/logs/vercel-prod-logs.jsonl`). Exactly zero reports were sent to `/api/csp-report`. There are no legitimate site resources triggering CSP violations on real client devices.
- **Enforce Content-Security-Policy while keeping report-uri (`principle-defense-in-depth`).** Switched from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`. Kept `report-uri /api/csp-report` active so any violation attempts or unexpected client issues in production continue to be logged and monitored.
- **No nonces (`principle-static-first`).** Nonces force dynamic rendering in Next.js, preventing static generation of core pages. Keeping `'unsafe-inline'` for script-src and style-src complies with decision 8 and maintains static generation performance.

## Gates run

Re-executed at branch HEAD:
- `pnpm vitest run src/__tests__/security-headers.test.ts`: 2 passed in 1 file
- `pnpm lint`: clean (exit 0)
- `pnpm typecheck`: clean (exit 0)
- `pnpm test`: 2,234 passed in 252 files (exit 0)
- `pnpm build`: clean (exit 0)
- All 9 `check:*` scripts: clean (exit 0)
- `prettier --check`: clean (exit 0)

## NOT RUN

- Owner physical device test (iPhone Safari, Android Chrome).
- Owner VoiceOver screen reader pass.
