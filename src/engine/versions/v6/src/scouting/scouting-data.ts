import raw from "../../../_blobs/9f771c3ad5f68097321551d188f1b0071d7d53cbceb22da217ee29b9d85d4e8e.json";
import type { ScoutingRecord } from "./scouting-schema";

export { ScoutingEntrySchema } from "./scouting-schema";
export type { ScoutingRecord } from "./scouting-schema";

// Generated artifacts are validated before writes and by pnpm build (data:validate).
export const SCOUTING: readonly ScoutingRecord[] = raw as ScoutingRecord[];

export const SCOUTING_BY_ID: ReadonlyMap<number, ScoutingRecord> = new Map(
  SCOUTING.map((entry) => [entry.id, entry]),
);
