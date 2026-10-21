# Credential rotation (Wave 7 row 7cr)

- Status: ACCEPTED
- Date: 2026-10-21
- Scope: Red tier (database access, environment variables, runbook)
- Branch: `fix/credential-rotation`

## Context

Wave 7 row 7cr establishes the credential rotation runbook for Neon database credentials (`DATABASE_URL`), `IP_HASH_SECRET`, and passcode gate secrets, adhering to zero credential leaks and explicit owner gating rules.

## Decisions

1. **Runbook establishment (`docs/runbooks/credential-rotation.md`):**
   - Outlines exact operational instructions for rotating the Neon `neondb_owner` role password on branch `br-morning-snow-b7dn8iy8`.
   - Documents pipe-based updating of Vercel Production and Preview environment variables without echoing or storing raw secrets in shell history or logs.
   - Enforces explicit owner consent (one-word yes) prior to triggering destructive `reset_postgres_role_password`.
   - Establishes verification gates: production `/api/health?db=1` response verification, negative connection failure check on old credential, and ephemeral smoke run submission.

2. **`IP_HASH_SECRET` policy:**
   - Retained without rotation unless specifically requested by owner, as rotation orphans past IP hash telemetry and rate-limit tracking history.

## Verification

- Lint, typecheck, tests, build, and all 9 check scripts clean.
- Format check clean.
- Runbook committed and audited against security invariants.
