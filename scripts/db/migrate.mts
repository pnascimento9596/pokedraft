import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { connect } from "./connect.mjs";

const { sql, host } = connect();
console.log(`[db:migrate] target endpoint ${host}`);
await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
const applied = (await sql.query(
  "SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
)) as { created_at: string }[];
console.log(`[db:migrate] OK, ${applied.length} migration(s) recorded`);
