import type { FullConfig } from "@playwright/test";
import { checkServerSha, worktreeHead } from "./local-server";

// Runs after the webServer step, so the server is up whether Playwright started it or reused one.
// CI never reuses a server, and PLAYWRIGHT_BASE_URL targets a deployment, so both skip the check.
export default async function globalSetup(config: FullConfig): Promise<void> {
  if (process.env.CI || process.env.PLAYWRIGHT_BASE_URL) return;
  const baseURL = config.projects[0]?.use.baseURL;
  if (baseURL === undefined) return;
  const response = await fetch(`${baseURL}/api/health`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${baseURL}/api/health answered ${response.status}`);
  const { sha } = (await response.json()) as { sha?: string | null };
  const check = checkServerSha(baseURL, worktreeHead(), sha ?? null);
  if (check.kind === "mismatch") throw new Error(check.message);
  if (check.kind === "unknown") {
    console.warn(
      `Server commit check skipped: ${check.reason}. The suite may be testing another build.`,
    );
  }
}
