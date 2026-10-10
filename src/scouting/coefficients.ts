import type { PokemonType, Shape } from "@/data/pokedex";
import type { MoveTrait } from "./move-traits";
import type { Attr, Role } from "./types";

// Every number the scouting model uses lives in this table. Logic files read it and hold none.

export type Feature =
  "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "height" | "reach" | "weight" | "small" | "light";

type AttrMods = Partial<Record<Attr, number>>;

export interface ScoutingCoefficients {
  scale: { floor: number; span: number; min: number; max: number };
  blend: Record<Attr, Partial<Record<Feature, number>>>;
  shape: Record<Shape, AttrMods>;
  heavy: { thresholdKg: number; perDoubling: number; cap: number; attrs: AttrMods };
  bodyLength: Partial<Record<Shape, number>>;
  frame: {
    reach: number;
    weight: number;
    cap: number;
    attrs: AttrMods;
    sizeAbilities: readonly string[];
  };
  baby: { allAttrs: number };
  moves: {
    points: Record<string, number>;
    traits: Record<MoveTrait, { cap: number; attrs: AttrMods }>;
  };
  abilities: { hiddenWeight: number; capPerAttr: number };
  type: { capPerAttr: number; mods: Partial<Record<PokemonType, AttrMods>> };
  review: { maxAdjustments: number; maxMagnitude: number };
  roleWeights: Record<Role, AttrMods>;
  roleLine: Record<Role, 0 | 1 | 2 | 3>;
  compat: {
    sameRole: number;
    sameLine: number;
    lineGap: Record<1 | 2, number>;
    keeperOutfield: number;
    pairs: ReadonlyArray<readonly [Role, Role, number]>;
  };
}

export const COEFFICIENTS: ScoutingCoefficients = {
  // Baseline attribute = floor + span * percentile(blend), then additive mods, clamped to [min, max].
  scale: { floor: 25, span: 70, min: 1, max: 99 },

  // Feature weights per attribute. Features are population percentiles (0..1).
  // small = 1 - height percentile, light = 1 - weight percentile. reach is the height
  // percentile after the bodyLength discount below, so a serpent's length is not its reach.
  blend: {
    PAC: { spe: 0.9, height: 0.1 },
    ACC: { spe: 0.75, light: 0.15, small: 0.1 },
    SHO: { atk: 0.6, spa: 0.3, spe: 0.1 },
    PAS: { spa: 0.6, spd: 0.25, spe: 0.15 },
    VIS: { spa: 0.65, spd: 0.35 },
    DRI: { spe: 0.5, atk: 0.2, light: 0.15, small: 0.15 },
    TEC: { atk: 0.4, spa: 0.4, spe: 0.2 },
    DEF: { def: 0.5, spd: 0.3, hp: 0.2 },
    TAK: { atk: 0.4, def: 0.35, weight: 0.25 },
    AER: { reach: 0.55, atk: 0.2, hp: 0.15, weight: 0.1 },
    PHY: { weight: 0.4, hp: 0.25, def: 0.2, atk: 0.15 },
    STA: { hp: 0.85, spd: 0.15 },
    DIV: { spe: 0.35, reach: 0.35, def: 0.3 },
    HAN: { def: 0.4, spd: 0.35, hp: 0.25 },
    REF: { spe: 0.6, spd: 0.4 },
    GKP: { spd: 0.45, spa: 0.3, def: 0.25 },
    KIC: { atk: 0.6, spa: 0.2, hp: 0.2 },
  },

  // Body plan. upright, humanoid, and legs kick naturally; arms (no legs) suits goalkeeping;
  // fish, ball, blob, and squiggle lack feet; wings and bug-wings help in the air.
  shape: {
    upright: { DRI: 6, TEC: 5, SHO: 4, PAS: 3, KIC: 4 },
    humanoid: { DRI: 7, TEC: 7, SHO: 5, PAS: 5, KIC: 5, HAN: 6, DIV: 3 },
    legs: { DRI: 5, TEC: 3, SHO: 4, KIC: 4, PAC: 2 },
    quadruped: { DRI: 1, PAC: 2, ACC: 2, TEC: -2, PAS: -2, HAN: -12 },
    arms: { HAN: 10, DIV: 6, REF: 2, DRI: -8, TEC: -7, SHO: -2, PAC: -3, KIC: -8 },
    fish: {
      PAC: -25,
      ACC: -22,
      DRI: -22,
      TEC: -14,
      SHO: -12,
      PAS: -10,
      KIC: -12,
      TAK: -10,
      AER: -8,
      STA: -6,
      HAN: -14,
      DIV: -8,
    },
    ball: { DRI: -22, TEC: -12, SHO: -8, PAS: -6, KIC: -8, TAK: -6, HAN: -10 },
    blob: {
      PAC: -6,
      ACC: -6,
      DRI: -14,
      TEC: -12,
      SHO: -10,
      PAS: -8,
      KIC: -10,
      TAK: -8,
      AER: -6,
      HAN: -8,
    },
    squiggle: { DRI: -12, TEC: -12, SHO: -10, PAS: -8, KIC: -10, TAK: -4, HAN: -10 },
    tentacles: { DRI: -6, TEC: -4, SHO: -6, KIC: -6, TAK: 2, HAN: 4 },
    heads: { DRI: -6, TEC: -6, SHO: -4, KIC: -4, AER: 3 },
    wings: { AER: 12, PAC: 2, DRI: -4, TEC: -4, SHO: -3, KIC: -3, HAN: -6 },
    "bug-wings": { AER: 8, ACC: 3, DRI: -3, TEC: -3, HAN: -6 },
    armor: { PHY: 4, DEF: 4, ACC: -3, DRI: -4, TEC: -4 },
  },

  // Agility and diving penalty for extreme weight: perDoubling points per doubling above thresholdKg.
  heavy: {
    thresholdKg: 150,
    perDoubling: 4,
    cap: 12,
    attrs: { ACC: 1, DRI: 1, DIV: 1, PAC: 0.5, AER: 0.5 },
  },

  // Pokédex height is body length for these shapes; reach takes this share of it.
  bodyLength: { squiggle: 0.4 },

  // Keeper reach and frame: cap * (2 * blend - 1) from the reach and weight percentiles, so a
  // big frame gains up to cap and a tiny body loses up to cap. Skipped for species with an
  // ability in sizeAbilities, whose trait already sets the body in the goal mouth.
  frame: {
    reach: 0.5,
    weight: 0.5,
    cap: 6,
    attrs: { DIV: 1, HAN: 1 },
    sizeAbilities: ["schooling"],
  },

  baby: { allAttrs: -6 },

  // Points per trait move. Near-universal TM moves score 0 or 1 so they carry no signal.
  moves: {
    points: {
      "pyro-ball": 10,
      "thunderous-kick": 8,
      "high-jump-kick": 6,
      "jump-kick": 5,
      "rolling-kick": 5,
      "triple-kick": 5,
      "blaze-kick": 5,
      "axe-kick": 5,
      "trop-kick": 4,
      "double-kick": 3,
      "triple-axel": 3,
      "low-sweep": 1,
      "low-kick": 1,
      "mega-kick": 1,
      protect: 0,
      detect: 1,
      "quick-guard": 2,
      "wide-guard": 2,
      "crafty-shield": 3,
      "baneful-bunker": 4,
      obstruct: 4,
      "silk-trap": 4,
      "burning-bulwark": 4,
      "spiky-shield": 5,
      "mat-block": 5,
      "kings-shield": 6,
      headbutt: 0,
      "zen-headbutt": 1,
      "iron-head": 1,
      "skull-bash": 1,
      "headlong-rush": 3,
      "head-smash": 4,
    },
    traits: {
      kick: { cap: 24, attrs: { SHO: 1, KIC: 1, TEC: 0.75, DRI: 0.5 } },
      reflex: { cap: 8, attrs: { REF: 1, DIV: 0.75, HAN: 0.5 } },
      header: { cap: 5, attrs: { AER: 1, SHO: 0.25 } },
    },
  },

  abilities: { hiddenWeight: 0.5, capPerAttr: 8 },

  // Small type nudges, capped per attribute.
  type: {
    capPerAttr: 3,
    mods: {
      fighting: { TAK: 3, PHY: 2, TEC: 2 },
      electric: { PAC: 2, ACC: 3, REF: 2 },
      flying: { AER: 3 },
      steel: { DEF: 3, PHY: 2, ACC: -2 },
      rock: { PHY: 3, ACC: -2 },
      ground: { PHY: 2, TAK: 1 },
      psychic: { VIS: 3, GKP: 2, PAS: 1 },
      ghost: { DRI: 2 },
      dragon: { PHY: 2, SHO: 1 },
      fairy: { PAS: 2 },
      dark: { TAK: 2, DRI: 1 },
      normal: { STA: 1 },
    },
  },

  review: { maxAdjustments: 6, maxMagnitude: 12 },

  // Layer 3 role blends. Each row sums to 1. GK reads only goalkeeping attributes plus AER and PHY.
  roleWeights: {
    GK: { DIV: 0.25, REF: 0.25, HAN: 0.2, GKP: 0.15, KIC: 0.05, AER: 0.05, PHY: 0.05 },
    CB: { DEF: 0.3, TAK: 0.25, AER: 0.15, PHY: 0.15, PAC: 0.05, PAS: 0.05, STA: 0.05 },
    FB: { DEF: 0.2, TAK: 0.2, PAC: 0.2, STA: 0.15, PAS: 0.1, ACC: 0.1, DRI: 0.05 },
    WB: { PAC: 0.2, STA: 0.2, PAS: 0.15, DEF: 0.1, TAK: 0.1, DRI: 0.1, ACC: 0.1, TEC: 0.05 },
    DM: { TAK: 0.25, DEF: 0.2, PAS: 0.15, STA: 0.15, PHY: 0.15, VIS: 0.1 },
    CM: { PAS: 0.25, VIS: 0.15, STA: 0.15, TEC: 0.15, DRI: 0.1, TAK: 0.1, SHO: 0.1 },
    AM: { VIS: 0.2, PAS: 0.2, TEC: 0.2, DRI: 0.2, SHO: 0.15, ACC: 0.05 },
    WM: { PAS: 0.2, PAC: 0.15, STA: 0.15, DRI: 0.15, TEC: 0.1, ACC: 0.1, VIS: 0.1, TAK: 0.05 },
    W: { PAC: 0.25, DRI: 0.25, ACC: 0.15, SHO: 0.15, TEC: 0.1, PAS: 0.1 },
    ST: { SHO: 0.35, TEC: 0.15, ACC: 0.1, PAC: 0.1, AER: 0.1, PHY: 0.1, DRI: 0.1 },
  },

  // Out-of-position familiarity, adapted from wcdraft POSITION_COMPATIBILITY_FACTORS
  // (same line 1.00, one line 0.75, two lines 0.45, keeper/outfield 0.15). Softened here
  // because the attribute blend already prices most of the skill gap; wcdraft's factor
  // carried the whole penalty. Lines: 0 GK, 1 defence, 2 midfield, 3 attack.
  roleLine: { GK: 0, CB: 1, FB: 1, WB: 1, DM: 2, CM: 2, AM: 2, WM: 2, W: 3, ST: 3 },
  compat: {
    sameRole: 1,
    sameLine: 0.95,
    lineGap: { 1: 0.85, 2: 0.7 },
    keeperOutfield: 0.5,
    pairs: [
      ["FB", "WB", 0.98],
      ["DM", "CM", 0.97],
      ["CM", "AM", 0.97],
      ["WB", "WM", 0.95],
      ["WM", "W", 0.95],
      ["CB", "DM", 0.92],
      ["AM", "ST", 0.92],
      ["AM", "W", 0.92],
      ["FB", "WM", 0.9],
      ["WB", "W", 0.88],
    ],
  },
};
