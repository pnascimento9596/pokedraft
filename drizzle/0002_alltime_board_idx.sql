CREATE INDEX "leaderboard_entries_alltime_idx" ON "leaderboard_entries" USING btree ("mode","wins" DESC NULLS LAST,"draws" DESC NULLS LAST,"team_score" DESC NULLS LAST,"created_at");
