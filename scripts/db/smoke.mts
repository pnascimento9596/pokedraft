import { connect } from "./connect.mjs";

// Insert, read back, prove the daily unique index, then clean up. For a Neon test branch.
const { sql, host } = connect();
console.log(`[db:smoke] target endpoint ${host}`);
const insert = (key: string) =>
  sql.query(
    `INSERT INTO leaderboard_entries
       (nickname, mode, variant, daily_date, seed, token, team_score, wins, draws, losses, engine_version, coached, run_fingerprint, ip_hash)
     VALUES ('smoke', 'cup8', 'open.squadFirst.g123456789', '2000-01-01', 's', $1, 700, 4, 1, 1, 'pokedraft-engine-1', false, $1, 'h')
     RETURNING id`,
    [key],
  );
await insert(`smoke-a-${process.pid}`);
const read = await sql.query(
  "SELECT nickname, mode, daily_date::text AS daily_date, wins, draws, losses, team_score, coached, run_fingerprint IS NOT NULL AS fingerprinted FROM leaderboard_entries WHERE nickname = 'smoke'",
);
console.log("[db:smoke] select", read);
const dup = await insert(`smoke-b-${process.pid}`).then(
  () => "inserted",
  (e: { code?: string }) => e.code ?? "error",
);
console.log(`[db:smoke] second daily row for the same nickname: ${dup}`);
await sql.query("DELETE FROM leaderboard_entries WHERE nickname = 'smoke'");
if (dup !== "23505") throw new Error("daily unique index did not reject the duplicate");
console.log("[db:smoke] OK");
