# Credential Rotation Runbook

## Overview

This runbook documents the exact operational procedures for rotating credentials across Neon Postgres, Vercel production and preview environments, and application secrets.

## Invariants

1. Never print credentials, connection strings, passcodes, or auth tokens to stdout, stderr, logs, or commit history.
2. Destructive operations (Neon role password reset, env deletion, credential rotation) require explicit owner approval (one-word yes) before execution.
3. Every rotation must be followed by production verification:
   - Health check (`/api/health?db=1`) returning HTTP 200 with `db.status: ok`.
   - Real-API smoke submission with a test nickname that is immediately removed.
   - Negative verification that the old credential is rejected.

---

## 1. Neon Database Role Password Rotation

### Pre-conditions
- Neon project ID: `summer-lab-87419384` (project name: `pokedraft`).
- Primary branch: `main` (`br-morning-snow-b7dn8iy8`).
- Preview branch: `preview` (`br-rough-bird-b79ahwsx`).
- Role: `neondb_owner`.

### Step 1: Owner Consent Gate
Ask the repository owner for explicit one-word confirmation ("yes") before calling the destructive Neon password reset API.

### Step 2: Reset Role Password
Reset the password for the role via Neon MCP or API:
- Role: `neondb_owner`
- Target branch ID: `br-morning-snow-b7dn8iy8`
- Tool: `reset_postgres_role_password`

### Step 3: Update Vercel Environment Variables
Pipe the new connection string directly into Vercel environment configuration without printing:
```bash
# Update Production DATABASE_URL
vercel env rm DATABASE_URL production -y
vercel env add DATABASE_URL production < <(neon-connection-string)

# Update Preview DATABASE_URL if preview branch was also rotated
vercel env rm DATABASE_URL preview -y
vercel env add DATABASE_URL preview < <(neon-preview-connection-string)
```

### Step 4: Trigger Production Redeployment
Deploy the latest commit with the updated environment variables:
```bash
vercel --prod
```

### Step 5: Verification
1. **Health Check:**
   ```bash
   curl -s "https://pokedraft-woad.vercel.app/api/health?db=1"
   ```
   Assert JSON response includes `"db":{"status":"ok"}`.

2. **Negative Check (Old Credential Refused):**
   Attempt connection using the prior `DATABASE_URL`. Assert connection fails with authentication error (HTTP 500 or password authentication failed).

3. **Smoke Submission Check:**
   Perform an authenticated run submission to verify write permissions, followed by row cleanup.

---

## 2. IP Hash Secret Rotation (`IP_HASH_SECRET`)

### Considerations
- `IP_HASH_SECRET` keys the HMAC digest for client IP addresses.
- Rotating `IP_HASH_SECRET` resets rate-limit tracking and orphans past `ip_hash` records on existing leaderboard rows.
- Rotate only upon explicit owner request.

### Procedure
1. Generate high-entropy secret (at least 32 characters):
   ```bash
   openssl rand -hex 32
   ```
2. Set in Vercel for production and preview without echoing:
   ```bash
   vercel env rm IP_HASH_SECRET production -y
   vercel env add IP_HASH_SECRET production
   ```
3. Redeploy and verify that submissions continue to compute valid IP hashes.
