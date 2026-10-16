import { expect, test } from "@playwright/test";
import { ENGINE_VERSION, TOKEN_VERSIONS } from "./pins";

test("health serves dynamic deployment metadata without requiring a database", async ({
  request,
}) => {
  const response = await request.get("/api/health?probe=e2e");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toMatchObject({
    engine: ENGINE_VERSION,
    tokenVersions: TOKEN_VERSIONS,
  });
});
