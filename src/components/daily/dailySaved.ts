export interface SavedDailySnapshot {
  readonly screen: "draft" | "results" | "matchday";
  readonly token: string;
  readonly daily: string | null;
}

const SCREENS = new Set<string>(["draft", "results", "matchday"]);

export function parseDailySaved(value: unknown): SavedDailySnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.screen !== "string" || !SCREENS.has(candidate.screen)) {
    return null;
  }
  if (typeof candidate.token !== "string") {
    return null;
  }
  if (candidate.daily !== null && typeof candidate.daily !== "string") {
    return null;
  }
  return {
    screen: candidate.screen as SavedDailySnapshot["screen"],
    token: candidate.token,
    daily: candidate.daily,
  };
}
