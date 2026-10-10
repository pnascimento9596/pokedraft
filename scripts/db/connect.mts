import { neon } from "@neondatabase/serverless";

export function connect(): { sql: ReturnType<typeof neon>; host: string } {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL_UNPOOLED or DATABASE_URL. Never print its value.");
  return { sql: neon(url), host: new URL(url).hostname };
}
