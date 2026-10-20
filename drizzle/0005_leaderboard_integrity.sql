ALTER TABLE "leaderboard_entries" ALTER COLUMN "coached" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ALTER COLUMN "run_fingerprint" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_entries_fingerprint_uq" ON "leaderboard_entries" USING btree ("mode","run_fingerprint");--> statement-breakpoint
CREATE INDEX "leaderboard_entries_coached_board_idx" ON "leaderboard_entries" USING btree ("mode","coached","wins" DESC NULLS FIRST,"draws" DESC NULLS FIRST,"team_score" DESC NULLS FIRST,"created_at");