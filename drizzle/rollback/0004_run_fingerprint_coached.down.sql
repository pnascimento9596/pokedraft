ALTER TABLE "leaderboard_entries" DROP COLUMN IF EXISTS "coached";
ALTER TABLE "leaderboard_entries" DROP COLUMN IF EXISTS "run_fingerprint";
CREATE INDEX IF NOT EXISTS "leaderboard_entries_ip_recent_idx" ON "leaderboard_entries" USING btree ("ip_hash","created_at");
