# Submission attempts: only runs that reach the replay count

## Decision

Each hashed IP still gets 10 submission attempts per rolling hour. An attempt is now spent only by
a submission that is admitted to the server replay. This deliberately reverses the Dispatch 5 rule
that every attempt counts (`dispatch-5.md`, "the dispatch requires every attempt to count") and
replaces its guard test, "counts rejected submissions toward the per-IP limit".

| Rejection | Spends an attempt | Database work |
| --- | --- | --- |
| Invalid body, bad nickname, malformed token, builder run, daily settings mismatch | No | None |
| `ENGINE_VERSION_MISMATCH` (stale page body or old token version) | No | None |
| `DUPLICATE_TOKEN`, `DAILY_ALREADY_SUBMITTED` found at admission | No | One read statement |
| Retry of an accepted run under the same nickname | No (unchanged) | Two statements |
| `ILLEGAL_ACTION` from the replay | Yes | Admission statement |
| Accepted run | Yes | Admission, insert, rank |
| Insert race lost to a concurrent copy | Yes | Admission, insert, lookup |

## Why

- The limit exists to bound the expensive path: the deterministic engine replay plus the insert.
  Pre-database rejections never reach either. Counting them made junk more expensive for the
  server, not less: each one cost an admission write that a parse failure does not otherwise need.
- A flood of junk requests is a volume problem for the platform layer (Vercel firewall and DDoS
  mitigation), not for a 10-per-hour budget that NAT-sharing friends also share. `GET` on the
  board is already unthrottled and costs a read, so a free read-only conflict answer adds no new
  class of exposure.
- Players hit these rejections by accident: a typo in a nickname, a page left open across an engine
  release ("reload to submit"), or a nickname already used on today's daily board. None of those
  should cost one of ten.
- A failed replay still counts. A real client never produces one, so it signals a tampered token,
  and it is the CPU-heavy step the limit protects.

## Ordering

Admission answers retry, then token conflict, then daily conflict, then the limit. A caller who has
used the hour's attempts still learns that a run is already listed or a daily nickname is taken,
both of which the public board shows anyway. A conflict that appears only between the admission
statement and the insert (a concurrent submission) still spends that caller's attempt; the unique
indexes stay authoritative.

## Guards

- `hardening.test.ts`: 12 malformed tokens, a stale engine version and an empty nickname leave
  `rate_limit_events` and `rate_limit_buckets` empty, and the next valid run gets 201.
- `handlers.test.ts`: two accepted runs plus 4 `DUPLICATE_TOKEN` and 1 `DAILY_ALREADY_SUBMITTED`
  record exactly 2 events; a conflict is answered 409 when the hour is used up while a fresh run
  gets 429; an `ILLEGAL_ACTION` replay failure records 1 event.
