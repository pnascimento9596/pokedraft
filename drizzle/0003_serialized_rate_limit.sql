CREATE TABLE "rate_limit_buckets" (
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"attempts" timestamp with time zone[] NOT NULL,
	CONSTRAINT "rate_limit_buckets_scope_key_hash_pk" PRIMARY KEY("scope","key_hash"),
	CONSTRAINT "rate_limit_buckets_scope_chk" CHECK ("rate_limit_buckets"."scope" IN ('submit', 'gate'))
);
--> statement-breakpoint
INSERT INTO "rate_limit_buckets" (scope, key_hash, attempts)
SELECT scope, key_hash, array_agg(created_at ORDER BY created_at)
FROM "rate_limit_events"
GROUP BY scope, key_hash;
