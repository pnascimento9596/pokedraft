import raw from "../../../_blobs/5f4b34e37a1fa78c1c4dafe65cc3dafce5e0532f8f982474898a7187ebe4d74d.json";
import type { ScoutingRecord } from "./scouting-schema";

export { ScoutingEntrySchema } from "./scouting-schema";
export type { ScoutingRecord } from "./scouting-schema";

// Generated artifacts are validated before writes and by pnpm build (data:validate).
export const SCOUTING: readonly ScoutingRecord[] = raw as ScoutingRecord[];

export const SCOUTING_BY_ID: ReadonlyMap<number, ScoutingRecord> = new Map(
  SCOUTING.map((entry) => [entry.id, entry]),
);
