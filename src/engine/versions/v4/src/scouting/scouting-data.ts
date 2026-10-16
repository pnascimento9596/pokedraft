import raw from "../data/scouting.json";
import type { ScoutingRecord } from "./scouting-schema";

export { ScoutingEntrySchema } from "./scouting-schema";
export type { ScoutingRecord } from "./scouting-schema";

// Generated artifacts are validated before writes and by pnpm build (data:validate).
export const SCOUTING: readonly ScoutingRecord[] = raw as ScoutingRecord[];

export const SCOUTING_BY_ID: ReadonlyMap<number, ScoutingRecord> = new Map(
  SCOUTING.map((entry) => [entry.id, entry]),
);
