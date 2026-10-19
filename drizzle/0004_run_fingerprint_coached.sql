DROP INDEX IF EXISTS "leaderboard_entries_ip_recent_idx";--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD COLUMN "coached" boolean;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD COLUMN "run_fingerprint" text;