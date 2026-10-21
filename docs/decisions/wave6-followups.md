# Wave 6 owner follow-ups (Green)

## Scope

Record the owner items done after the Wave 6 summary (PR #157): the passcode gate, the restore
points, the calibration decision, the interim grace count and the Vercel build delay. Docs only.

## Decisions

- **Calibration.** Engine 7 stays as calibrated. P7 (+0.046) and P8 (68.78%) are accepted as
  measured: neither is something players feel, and P8 was 68.5% at engine 6. P1 good (+1.07) is the
  one miss players could notice, and its cause is known (Defend's own multiplier against direct
  sides). It becomes an engine 8 row, bundled with other engine changes, because every engine
  change is a version bump.
- **Passcode.** The owner asked the agent to set it. The agent generated it locally, never printed
  it, and stored it and its cookie digest in 0600 files for the owner and the Wave 7 live checks.
- **Vercel.** A missing production build is a delay before it is a miss: wait 30 minutes before
  starting a manual deployment.

## Evidence

The program log, Wave 6, "Owner follow-ups (2026-10-21)".

## NOT RUN

- The phone check and the screen reader pass (owner action).
- The final grace-window count, after `2026-10-23T04:00:00Z`.
- The e2e suite on this branch: nothing under `src/` or `e2e/` changed. CI runs it.
