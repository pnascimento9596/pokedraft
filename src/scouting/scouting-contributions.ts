import raw from "@/data/scouting-contributions.json";
import type { ScoutingContributionsRecord } from "./scouting-schema";

export type { ScoutingContributionsRecord } from "./scouting-schema";

export const SCOUTING_CONTRIBUTIONS: readonly ScoutingContributionsRecord[] =
  raw as ScoutingContributionsRecord[];

export const SCOUTING_CONTRIBUTIONS_BY_ID: ReadonlyMap<number, ScoutingContributionsRecord> =
  new Map(SCOUTING_CONTRIBUTIONS.map((entry) => [entry.id, entry]));
