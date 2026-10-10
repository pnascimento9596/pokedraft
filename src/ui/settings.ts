import {
  FORMATION_IDS,
  GENS,
  type DraftOrder,
  type DraftSettings,
  type DraftStyle,
  type FormationId,
  type Gen,
} from "@/engine";
import { readJson, writeJson } from "./storage";

// Everything the home panel controls. Challenge settings are derived from it.
export interface PanelSettings {
  readonly formation: FormationId;
  readonly gens: readonly Gen[];
  readonly legendaries: boolean;
  readonly style: DraftStyle;
  readonly order: DraftOrder;
  readonly showRatings: boolean;
}

export const DEFAULT_PANEL: PanelSettings = {
  formation: "4-3-3",
  gens: GENS,
  legendaries: false,
  style: "open",
  order: "squadFirst",
  showRatings: false,
};

const PANEL_KEY = "pokedraft:panel";

function parsePanel(raw: unknown): PanelSettings {
  if (typeof raw !== "object" || raw === null) return DEFAULT_PANEL;
  const r = raw as Record<string, unknown>;
  const gens = Array.isArray(r.gens)
    ? GENS.filter((g) => (r.gens as unknown[]).includes(g))
    : DEFAULT_PANEL.gens;
  return {
    formation: (FORMATION_IDS as readonly unknown[]).includes(r.formation)
      ? (r.formation as FormationId)
      : DEFAULT_PANEL.formation,
    gens: gens.length > 0 ? gens : DEFAULT_PANEL.gens,
    legendaries: typeof r.legendaries === "boolean" ? r.legendaries : DEFAULT_PANEL.legendaries,
    style: r.style === "classic3" || r.style === "open" ? r.style : DEFAULT_PANEL.style,
    order:
      r.order === "positionFirst" || r.order === "squadFirst" ? r.order : DEFAULT_PANEL.order,
    showRatings: typeof r.showRatings === "boolean" ? r.showRatings : DEFAULT_PANEL.showRatings,
  };
}

export function loadPanel(): PanelSettings {
  return parsePanel(readJson<unknown>(PANEL_KEY, null));
}

export function savePanel(panel: PanelSettings): void {
  writeJson(PANEL_KEY, panel);
}

export type ChallengeMode = "cup8" | "kanto151";

export function challengeSettings(mode: ChallengeMode, panel: PanelSettings): DraftSettings {
  return mode === "cup8"
    ? {
        mode: "cup8",
        formation: panel.formation,
        gens: panel.gens,
        style: panel.style,
        order: panel.order,
      }
    : { mode: "kanto151", formation: panel.formation, order: panel.order };
}

export function builderSettings(panel: PanelSettings): DraftSettings {
  return {
    mode: "builder",
    formation: panel.formation,
    gens: panel.gens,
    legendaries: panel.legendaries,
  };
}

// /play query string. `seed` is optional; a fresh random seed is used when it is absent.
export function playHref(mode: ChallengeMode, panel: PanelSettings, seed?: string): string {
  const q = new URLSearchParams({
    mode,
    f: panel.formation,
    order: panel.order,
  });
  if (mode === "cup8") {
    q.set("g", panel.gens.join(""));
    q.set("style", panel.style);
  }
  if (seed !== undefined) q.set("seed", seed);
  return `/play?${q.toString()}`;
}

export function parsePlayQuery(q: URLSearchParams): {
  settings: DraftSettings;
  seed: string | null;
} | null {
  const mode = q.get("mode");
  const formation = q.get("f");
  if (!(FORMATION_IDS as readonly (string | null)[]).includes(formation)) return null;
  const order = q.get("order") === "positionFirst" ? "positionFirst" : "squadFirst";
  const seed = q.get("seed");
  const f = formation as FormationId;
  if (mode === "kanto151") return { settings: { mode, formation: f, order }, seed };
  if (mode !== "cup8") return null;
  const g = q.get("g") ?? "123456789";
  const gens = GENS.filter((n) => g.includes(String(n)));
  if (gens.length === 0) return null;
  const style = q.get("style") === "classic3" ? "classic3" : "open";
  return { settings: { mode, formation: f, gens, style, order }, seed };
}

export function freshSeed(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
