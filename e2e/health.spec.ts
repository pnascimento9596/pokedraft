import { expect, test } from "@playwright/test";

test("health serves dynamic deployment metadata without requiring a database", async ({
  request,
}) => {
  const response = await request.get("/api/health?probe=e2e");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toMatchObject({
    engine: "pokedraft-engine-5",
    tokenVersions: [1, 2, 3, 4, 5],
  });
});
