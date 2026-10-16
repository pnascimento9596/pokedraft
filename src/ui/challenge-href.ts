import { decodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION } from "@/engine/types";
import { DEFAULT_PANEL, playHref } from "./settings";

export function challengeHref(token: string): string | null {
  if (!/^pd[1-4]\./.test(token)) return null;
  try {
    const { settings, seed } = decodeToken(token.replace(/^pd\d+\./, `pd${RUN_TOKEN_VERSION}.`));
    if (settings.mode === "builder") return null;
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
  } catch {
    return null;
  }
}
