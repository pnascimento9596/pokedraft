import {
  GENS,
  dailySeed,
  toIsoDate,
  type DraftSettings,
  type FormationId,
  type IsoDate,
} from "@/engine";

export const DAILY_TIME_ZONE = "America/New_York";

const NY_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAILY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dailyDate(now: Date): IsoDate {
  return toIsoDate(NY_DATE.format(now));
}

export function previousDate(date: IsoDate): IsoDate {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return toIsoDate(d.toISOString().slice(0, 10));
}

export function dailySettings(formation: FormationId): DraftSettings {
  return { mode: "cup8", formation, gens: GENS, style: "open", order: "squadFirst" };
}

export function isDailySettings(s: DraftSettings): boolean {
  return (
    s.mode === "cup8" &&
    s.style === "open" &&
    s.order === "squadFirst" &&
    s.gens.length === GENS.length &&
    GENS.every((g) => s.gens.includes(g))
  );
}

// A run counts for the daily board of the date its seed was derived from. Yesterday stays
// open so a run started just before midnight in New York can still be submitted.
export function dailyDateForSeed(seed: string, now: Date): IsoDate | null {
  const today = dailyDate(now);
  for (const date of [today, previousDate(today)]) {
    if (dailySeed(date) === seed) return date;
  }
  return null;
}
