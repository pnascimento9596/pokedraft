# Keep settled wheel results visible

## Scope and authority

The user reported blank region and type windows after a spin and asked for a fix under `pokedraft-mode`. This is a Yellow display-only change. The fix preserves draft rolls, candidate selection, rerolls, timing, and engine/data contracts. Merge deploys production. The portable mode requires deployment confirmation unless the dispatch grants it; this request does not explicitly grant deployment.

## GATE 0

Baseline `origin/main` was `0ff0b43`. The working tree was clean. The supplied desktop screenshot shows blank windows with the correct Hoenn/Fire header and announcement.

Production browser reproduction used a seeded Classic Squad First run. After natural completion, both settled reels retained `translate3d(0px, -1680px, 0px)`. Their result top was -1300.296875 while their wheel extended from 299.703125 to 473.703125. The result existed in the DOM but was clipped out of view.

`src/components/wheel/Wheel.tsx:109` writes transform and blur imperatively. The branches at lines 150 and 157 reuse unkeyed reel divs. React retains those styles when replacing the long strip with the three settled faces. `src/components/wheel/Wheel.module.css:42` clips the displaced result. `src/components/run/DraftBoard.tsx:306` already keeps the reveal keyed to the current roll through candidate selection.

## Decision

Give the spinning strip and settled reel distinct keys. React replaces the animated DOM node instead of retaining its transform and filter. No new state or timeout is needed.

Fix Root Causes directs the correction to DOM identity rather than draft state. Model the Domain preserves the existing spinning/settled states and roll identity. Test Behavior, Not Implementation adds observable result and clipping checks. Prove It Works requires browser proof beyond DOM text. Sequence Work into Verifiable Units places failing guards before the fix.

## Playbook

1. Reproduce it yourself on the matching surface via the control skill (Non-negotiables), even when a debug or instrumentation protocol says to ask the user to reproduce. Completed in production Chromium.
2. Binary-search the cause. Completed with actual inline styles and result/window bounds, plus independent React reconciliation recon.
3. Plan the fix. Delegated the two-key fix and component guards to a fresh subagent. architect skipped: dispatch fixed the design.
4. Verify on the same surface. Browser regression checks natural finish, mid-spin skip, reduced motion, selection, and the next round at 390 and 1440 px in Chromium and WebKit.
5. Stage the commits so the failing repro lands before the fix in git history. Component guards and the production browser failure precede the fix.
6. Run Opening a PR. Uses an isolated worktree from origin/main, explicit staging, conventional commits, and exact-head independent review.

how uses first-person GATE 0 recon. swarm, arena, deslop, control-ui, control-cli, create-skill, and reflect are skip: not installed. Technical Writing and Unslop apply to the decision, commits, and PR. No-comments review covers the changed files.

## Validation

The component guards failed before the fix with 4 failures and 5 passes. The natural-finish cases retained `translate3d(0, -1680px, 0)`. After the fix all 9 focused wheel tests passed.

The production browser guard failed before the fix with `Expected: true`, `Received: false` for the result bounds inside the wheel window. After the fix all 12 browser cases passed in 36.0 seconds against the local production build. Each case also verifies the result through candidate selection and after the next round's spin.

`pnpm lint`, `pnpm typecheck`, `pnpm test --maxWorkers=4`, and `pnpm build` passed. The full unit suite had 739 passes across 80 files. The first broad unit run occurred before the fix and had 4 expected guard failures and 735 passes; the final run supersedes it. The initial browser test harness used an unsupported describe-level browserName override. It was corrected to a dedicated WebKit project before the actual RED browser run.

The no-comments check found 0 added or modified comments, TypeScript suppressions, or ESLint suppressions in the source/test/config diff. GLM 5.3 Flash high review and GitHub CI receipts are recorded externally on the final PR head, so recording a receipt does not change the reviewed bytes.

Production deployment and post-deploy verification are NOT RUN until deployment is authorized. Real iPhone/Android hardware is NOT RUN. No engine, database, or generated-data changes were made.
