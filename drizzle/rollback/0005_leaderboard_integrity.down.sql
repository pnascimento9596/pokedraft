DROP INDEX IF EXISTS "leaderboard_entries_coached_board_idx";
DROP INDEX IF EXISTS "leaderboard_entries_fingerprint_uq";
ALTER TABLE "leaderboard_entries" ALTER COLUMN "coached" DROP NOT NULL;
ALTER TABLE "leaderboard_entries" ALTER COLUMN "run_fingerprint" DROP NOT NULL;
