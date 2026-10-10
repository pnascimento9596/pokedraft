CREATE TABLE "leaderboard_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nickname" text NOT NULL,
	"mode" text NOT NULL,
	"variant" text NOT NULL,
	"daily_date" date,
	"seed" text NOT NULL,
	"token" text NOT NULL,
	"team_score" integer NOT NULL,
	"wins" integer NOT NULL,
	"draws" integer NOT NULL,
	"losses" integer NOT NULL,
	"engine_version" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_entries_mode_chk" CHECK ("leaderboard_entries"."mode" IN ('cup8', 'kanto151')),
	CONSTRAINT "leaderboard_entries_nickname_chk" CHECK (char_length("leaderboard_entries"."nickname") BETWEEN 2 AND 20 AND "leaderboard_entries"."nickname" = btrim("leaderboard_entries"."nickname")),
	CONSTRAINT "leaderboard_entries_daily_mode_chk" CHECK ("leaderboard_entries"."daily_date" IS NULL OR "leaderboard_entries"."mode" = 'cup8'),
	CONSTRAINT "leaderboard_entries_record_chk" CHECK ("leaderboard_entries"."wins" >= 0 AND "leaderboard_entries"."draws" >= 0 AND "leaderboard_entries"."losses" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_entries_daily_nickname_uq" ON "leaderboard_entries" USING btree ("nickname","mode","daily_date") WHERE "leaderboard_entries"."daily_date" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_entries_token_uq" ON "leaderboard_entries" USING btree (md5("token"));--> statement-breakpoint
CREATE INDEX "leaderboard_entries_board_idx" ON "leaderboard_entries" USING btree ("mode","daily_date","wins" DESC NULLS LAST,"draws" DESC NULLS LAST,"team_score" DESC NULLS LAST,"created_at");--> statement-breakpoint
CREATE INDEX "leaderboard_entries_ip_recent_idx" ON "leaderboard_entries" USING btree ("ip_hash","created_at");