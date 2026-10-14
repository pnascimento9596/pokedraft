import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

it("keeps the all-time index in migration metadata so the next generate cannot create it again", () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  const previous = JSON.parse(
    readFileSync(path.join(root, "drizzle/meta/0001_snapshot.json"), "utf8"),
  );
  const current = JSON.parse(
    readFileSync(path.join(root, "drizzle/meta/0002_snapshot.json"), "utf8"),
  );
  expect(current.prevId).toBe(previous.id);
  expect(
    current.tables["public.leaderboard_entries"].indexes.leaderboard_entries_alltime_idx,
  ).toMatchObject({
    name: "leaderboard_entries_alltime_idx",
    isUnique: false,
    method: "btree",
  });
});
