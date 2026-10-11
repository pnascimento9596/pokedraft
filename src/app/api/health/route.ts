import { connection } from "next/server";
import { ENGINE_VERSION, RUN_TOKEN_VERSION } from "@/engine/types";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";

export async function GET(request: Request): Promise<Response> {
  await connection();
  const metadata = {
    sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    env: process.env.VERCEL_ENV || null,
    region: process.env.VERCEL_REGION || null,
    engine: ENGINE_VERSION,
    tokenVersions: [...RETAINED_TOKEN_VERSIONS, RUN_TOKEN_VERSION],
  };
  const headers = { "cache-control": "no-store" };
  if (new URL(request.url).searchParams.get("db") !== "1") {
    return Response.json(metadata, { headers });
  }
  try {
    const [{ getDb }, { sql }] = await Promise.all([import("@/db/client"), import("drizzle-orm")]);
    await getDb().execute(sql`select 1`);
    return Response.json({ ...metadata, db: { status: "ok" } }, { headers });
  } catch {
    return Response.json({ ...metadata, db: { status: "unavailable" } }, { headers, status: 503 });
  }
}
