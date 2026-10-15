import type { SynergyReason } from "@/engine/types";

export const SYNERGY_REASON_LABEL: Readonly<Record<SynergyReason, string>> = {
  sharedType: "Shared Type",
  evoLine: "Evo Line",
  sameGen: "Same Region",
  coverage: "Type Cover",
};
