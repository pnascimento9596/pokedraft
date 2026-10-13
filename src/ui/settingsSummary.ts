import { GENS, type DraftSettings } from "@/engine/types";
import { GEN_REGION, ORDER_LABEL, REGION_LABEL, STYLE_LABEL } from "./labels";
import { parsePlayQuery, playHref, type ChallengeMode, type PanelSettings } from "./settings";

export interface SummaryItem {
  readonly label: string;
  readonly value: string;
}

export function settingsSummary(settings: DraftSettings): readonly SummaryItem[] {
  const items: SummaryItem[] = [{ label: "Formation", value: settings.formation }];
  if (settings.mode === "cup8") {
    const regions =
      settings.gens.length === GENS.length
        ? "All regions"
        : settings.gens.map((g) => REGION_LABEL[GEN_REGION[g]]).join(", ");
    items.push({ label: "Regions", value: regions });
    items.push({ label: "Style", value: STYLE_LABEL[settings.style] });
  }
  if (settings.mode !== "builder")
    items.push({ label: "Order", value: ORDER_LABEL[settings.order] });
  return items;
}

// The settings are read back from the /play link, so the player confirms what /play will parse.
export function confirmPlay(
  mode: ChallengeMode,
  panel: PanelSettings,
): {
  readonly href: string;
  readonly items: readonly SummaryItem[];
  readonly settings: DraftSettings;
} {
  const href = playHref(mode, panel);
  const parsed = parsePlayQuery(new URL(href, "http://pokedraft.invalid").searchParams);
  if (parsed === null) throw new Error(`home panel produced an unreadable play link: ${href}`);
  return { href, items: settingsSummary(parsed.settings), settings: parsed.settings };
}
