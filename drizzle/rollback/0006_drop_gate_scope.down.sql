ALTER TABLE "rate_limit_events" DROP CONSTRAINT "rate_limit_events_scope_chk";
ALTER TABLE "rate_limit_buckets" DROP CONSTRAINT "rate_limit_buckets_scope_chk";
ALTER TABLE "rate_limit_events" ADD CONSTRAINT "rate_limit_events_scope_chk" CHECK ("rate_limit_events"."scope" IN ('submit', 'gate'));
ALTER TABLE "rate_limit_buckets" ADD CONSTRAINT "rate_limit_buckets_scope_chk" CHECK ("rate_limit_buckets"."scope" IN ('submit', 'gate'));
