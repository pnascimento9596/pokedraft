import { readAnyToken } from "./read-token";
import { DEFAULT_PANEL, playHref } from "./settings";

export function challengeHref(token: string): string | null {
  const run = readAnyToken(token);
  if (run === null || run.settings.mode === "builder") return null;
  const { settings, seed } = run;
  return playHref(
    settings.mode,
    {
      ...DEFAULT_PANEL,
      formation: settings.formation,
      order: settings.order,
      ...(settings.mode === "cup8" ? { gens: settings.gens, style: settings.style } : {}),
    },
    seed,
  );
}
