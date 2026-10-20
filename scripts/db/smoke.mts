import { connect } from "./connect.mjs";

// Insert, read back, prove the daily and fingerprint unique indexes, then clean up. For a Neon
// test branch.
const { sql, host } = connect();
console.log(`[db:smoke] target endpoint ${host}`);
const tag = process.pid;
const insert = (nickname: string, dailyDate: string | null, token: string, fingerprint: string) =>
  sql.query(
    `INSERT INTO leaderboard_entries
       (nickname, mode, variant, daily_date, seed, token, team_score, wins, draws, losses, engine_version, coached, run_fingerprint, ip_hash)
     VALUES ($1, 'cup8', 'open.squadFirst.g123456789', $2, 's', $3, 700, 4, 1, 1, 'pokedraft-engine-1', false, $4, 'h')
     RETURNING id`,
    [nickname, dailyDate, token, fingerprint],
  );
const refusal = (attempt: Promise<unknown>) =>
  attempt.then(
    () => "inserted",
    (e: { code?: string }) => e.code ?? "error",
  );
await insert("smoke", "2000-01-01", `smoke-a-${tag}`, `smoke-a-${tag}`);
const read = await sql.query(
  "SELECT nickname, mode, daily_date::text AS daily_date, wins, draws, losses, team_score, coached, run_fingerprint IS NOT NULL AS fingerprinted FROM leaderboard_entries WHERE nickname = 'smoke'",
);
console.log("[db:smoke] select", read);
const dup = await refusal(insert("smoke", "2000-01-01", `smoke-b-${tag}`, `smoke-b-${tag}`));
console.log(`[db:smoke] second daily row for the same nickname: ${dup}`);
const copy = await refusal(insert("smoke-copy", null, `smoke-c-${tag}`, `smoke-a-${tag}`));
console.log(`[db:smoke] second row with the same mode and run_fingerprint: ${copy}`);
await sql.query("DELETE FROM leaderboard_entries WHERE nickname IN ('smoke', 'smoke-copy')");
if (dup !== "23505") throw new Error("daily unique index did not reject the duplicate");
if (copy !== "23505") throw new Error("fingerprint unique index did not reject the copy");
console.log("[db:smoke] OK");
