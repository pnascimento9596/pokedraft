import {
  FORMATION_IDS,
  GENS,
  type DraftOrder,
  type DraftSettings,
  type DraftStyle,
  type FormationId,
  type Gen,
} from "@/engine/types";
import { readJson, writeJson } from "./storage";
import { readTokenRun, versusOf, type Versus } from "./versus";

export const MATCH_VIEWS = ["quick", "live"] as const;
export type MatchView = (typeof MATCH_VIEWS)[number];
export const MANAGER_MODE_LABEL = "Manager mode";
export const MANAGER_MODE_HINT =
  "Make tactics and substitutions from the touchline during each match";

export const MANAGER_PLAYS_LIVE = "Manager mode plays live";

export const MATCH_VIEW_LABEL: Readonly<Record<MatchView, string>> = {
  quick: "Quick sim",
  live: "Live match",
};

export const SPIN_SPEEDS = ["normal", "fast"] as const;
export type SpinSpeed = (typeof SPIN_SPEEDS)[number];
export const SPIN_SPEED_LABEL: Readonly<Record<SpinSpeed, string>> = {
  normal: "Normal",
  fast: "Fast",
};
export const SPIN_FAST_FACTOR = 0.4;

export function spinMs(ms: number, speed: SpinSpeed): number {
  return speed === "fast" ? Math.round(ms * SPIN_FAST_FACTOR) : ms;
}

// Everything the home panel controls. Challenge settings are derived from it. `managerMode` and
// `matchView` are how the player watches the cup; they never reach the run token's settings.
export interface PanelSettings {
  readonly formation: FormationId;
  readonly gens: readonly Gen[];
  readonly legendaries: boolean;
  readonly style: DraftStyle;
  readonly order: DraftOrder;
  readonly showRatings: boolean;
  readonly showChallengeRatings: boolean;
  readonly managerMode: boolean;
  readonly matchView: MatchView;
  readonly spinSpeed: SpinSpeed;
}

export const DEFAULT_PANEL: PanelSettings = {
  formation: "4-3-3",
  gens: GENS,
  legendaries: false,
  style: "open",
  order: "squadFirst",
  showRatings: false,
  showChallengeRatings: false,
  managerMode: false,
  matchView: "quick",
  spinSpeed: "normal",
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
    order: r.order === "positionFirst" || r.order === "squadFirst" ? r.order : DEFAULT_PANEL.order,
    showRatings: typeof r.showRatings === "boolean" ? r.showRatings : DEFAULT_PANEL.showRatings,
    showChallengeRatings:
      typeof r.showChallengeRatings === "boolean"
        ? r.showChallengeRatings
        : DEFAULT_PANEL.showChallengeRatings,
    managerMode: typeof r.managerMode === "boolean" ? r.managerMode : DEFAULT_PANEL.managerMode,
    matchView: (MATCH_VIEWS as readonly unknown[]).includes(r.matchView)
      ? (r.matchView as MatchView)
      : DEFAULT_PANEL.matchView,
    spinSpeed: (SPIN_SPEEDS as readonly unknown[]).includes(r.spinSpeed)
      ? (r.spinSpeed as SpinSpeed)
      : DEFAULT_PANEL.spinSpeed,
  };
}

export function loadPanel(): PanelSettings {
  return parsePanel(readJson<unknown>(PANEL_KEY, null));
}

export function savePanel(panel: PanelSettings): void {
  writeJson(PANEL_KEY, panel);
}

export type Matchday = Pick<PanelSettings, "managerMode" | "matchView">;

// With manager mode off and the quick view, the cup goes straight to the results as it always has.
export function playsMatchday(panel: Matchday): boolean {
  return panel.managerMode || panel.matchView === "live";
}

// Nobody can coach a five-second match, so manager mode plays live. The saved view stays as chosen
// and comes back when manager mode goes off.
export function matchdayView(panel: Matchday): MatchView {
  return panel.managerMode ? "live" : panel.matchView;
}

export type ChallengeMode = "cup8" | "kanto151";

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

// The settings are read back from the /play link, so Play clears the run slot /play will open.
export function playTarget(
  mode: ChallengeMode,
  panel: PanelSettings,
): { readonly href: string; readonly settings: DraftSettings } {
  const href = playHref(mode, panel);
  const parsed = parsePlayQuery(new URL(href, "http://pokedraft.invalid").searchParams);
  if (parsed === null) throw new Error(`home panel produced an unreadable play link: ${href}`);
  return { href, settings: parsed.settings };
}

// The same-seed challenge link for a run's settings, or null for a builder friendly.
export function challengeLink(settings: DraftSettings, seed: string): string | null {
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
}

// A run to beat counts only on the seed and settings this link plays, so two different cups are
// never compared.
function readVersus(
  vs: string | null,
  settings: DraftSettings,
  seed: string | null,
): Versus | null {
  if (vs === null || seed === null) return null;
  const run = readTokenRun(vs);
  if (run === null) return null;
  const same = challengeLink(run.settings, run.seed) === challengeLink(settings, seed);
  return same ? versusOf(run, vs) : null;
}

function readSettings(q: URLSearchParams): DraftSettings | null {
  const mode = q.get("mode");
  const formation = q.get("f");
  if (!(FORMATION_IDS as readonly (string | null)[]).includes(formation)) return null;
  const order = q.get("order") === "positionFirst" ? "positionFirst" : "squadFirst";
  const f = formation as FormationId;
  if (mode === "kanto151") return { mode, formation: f, order };
  if (mode !== "cup8") return null;
  const g = q.get("g") ?? "123456789";
  const gens = GENS.filter((n) => g.includes(String(n)));
  if (gens.length === 0) return null;
  const style = q.get("style") === "classic3" ? "classic3" : "open";
  return { mode, formation: f, gens, style, order };
}

export function parsePlayQuery(q: URLSearchParams): {
  settings: DraftSettings;
  seed: string | null;
  vs: Versus | null;
} | null {
  const settings = readSettings(q);
  if (settings === null) return null;
  const seed = q.get("seed");
  return { settings, seed, vs: readVersus(q.get("vs"), settings, seed) };
}

export function freshSeed(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
