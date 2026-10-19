import { GENS, type DraftSettings } from "@/engine/types";
import { GEN_REGION, ORDER_LABEL, REGION_LABEL, STYLE_LABEL } from "./labels";
import { matchdayView, type Matchday } from "./settings";

export interface SummaryItem {
  readonly label: string;
  readonly value: string;
}

function matchdaySummary(matchday: Matchday): string {
  return `${matchday.managerMode ? "Manager" : "Sim"}, ${matchdayView(matchday) === "live" ? "Live" : "Quick"}`;
}

export function settingsSummary(
  settings: DraftSettings,
  matchday: Matchday,
): readonly SummaryItem[] {
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
  items.push({ label: "Matchday", value: matchdaySummary(matchday) });
  return items;
}
