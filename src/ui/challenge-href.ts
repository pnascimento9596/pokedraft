import { decodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION } from "@/engine/types";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";
import { DEFAULT_PANEL, playHref } from "./settings";

export function challengeHref(token: string): string | null {
  // Every token version's wire format is a subset of the live one, so any known version reads
  // its settings through the live codec without a replay.
  const version = /^pd(\d+)\./.exec(token)?.[1];
  const known =
    Number(version) === RUN_TOKEN_VERSION || RETAINED_TOKEN_VERSIONS.includes(Number(version));
  if (!known) return null;
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
