import type { PokemonType } from "@/data/pokedex";
import type { Attributes, Role, RoleFits } from "@/scouting/types";

export type { PokemonType } from "@/data/pokedex";
export type { Attributes, Role, RoleFits } from "@/scouting/types";

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type SpeciesId = Brand<number, "SpeciesId">;
export type SlotId = Brand<string, "SlotId">;
export type Seed = Brand<string, "Seed">;
export type IsoDate = Brand<string, "IsoDate">;
export type Quality = Brand<number, "Quality">;

export const ENGINE_VERSION = "pokedraft-engine-7" as const;

export const GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type Gen = (typeof GENS)[number];

export const REGIONS = [
  "kanto",
  "johto",
  "hoenn",
  "sinnoh",
  "unova",
  "kalos",
  "alola",
  "galar",
  "paldea",
] as const;
export type Region = (typeof REGIONS)[number];

export const LINES = ["GK", "DEF", "MID", "ATT"] as const;
export type Line = (typeof LINES)[number];

export interface Species {
  readonly id: SpeciesId;
  readonly name: string;
  readonly gen: Gen;
  readonly region: Region;
  readonly types: readonly [PokemonType] | readonly [PokemonType, PokemonType];
  readonly special: boolean;
  readonly evoChainId: number;
  readonly attrs: Attributes;
  readonly fits: RoleFits;
  readonly quality: Readonly<Record<Role, Quality>>;
  readonly bestRoles: readonly Role[];
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
}

export const FORMATION_IDS = [
  "4-3-3",
  "4-4-2",
  "4-2-3-1",
  "4-1-4-1",
  "3-5-2",
  "3-4-3",
  "3-4-2-1",
  "5-3-2",
] as const;
export type FormationId = (typeof FORMATION_IDS)[number];

export type Channel = "L" | "C" | "R";

export interface Slot {
  readonly id: SlotId;
  readonly label: string;
  readonly role: Role;
  readonly line: Line;
  readonly channel: Channel;
  readonly x: number;
  readonly y: number;
}

export type Eleven<T> = readonly [T, T, T, T, T, T, T, T, T, T, T];
export type Five<T> = readonly [T, T, T, T, T];

export interface Formation {
  readonly id: FormationId;
  readonly slots: Eleven<Slot>;
  readonly adjacency: readonly (readonly [SlotId, SlotId])[];
}

export type StarterIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type BenchIndex = 0 | 1 | 2 | 3 | 4;
export type SlotRef =
  | { readonly kind: "starter"; readonly index: StarterIndex }
  | { readonly kind: "bench"; readonly index: BenchIndex };

export const STARTERS = 11;
export const BENCH_SIZE = 5;
export const SQUAD_SIZE = STARTERS + BENCH_SIZE;

export interface Lineup<T extends SpeciesId | null = SpeciesId | null> {
  readonly formation: FormationId;
  readonly starters: Eleven<T>;
  readonly bench: Five<T>;
}
export type FullLineup = Lineup<SpeciesId>;

export type GenSet = readonly Gen[];
export type DraftStyle = "open" | "classic3";
export type DraftOrder = "squadFirst" | "positionFirst";

export type DraftSettings =
  | {
      readonly mode: "builder";
      readonly formation: FormationId;
      readonly gens: GenSet;
      readonly legendaries: boolean;
    }
  | {
      readonly mode: "cup8";
      readonly formation: FormationId;
      readonly gens: GenSet;
      readonly style: DraftStyle;
      readonly order: DraftOrder;
    }
  | {
      readonly mode: "kanto151";
      readonly formation: FormationId;
      readonly order: DraftOrder;
    };
export type Mode = DraftSettings["mode"];

export const DRAFT_ROUNDS = SQUAD_SIZE;
export const SPECIAL_CAP = 3;
export const REROLLS: Readonly<Record<Exclude<Mode, "builder">, number>> = {
  cup8: 3,
  kanto151: 5,
};

export type Roll =
  | {
      readonly kind: "combo";
      readonly region: Region;
      readonly type: PokemonType;
      readonly offers: readonly SpeciesId[] | null;
    }
  | { readonly kind: "species"; readonly species: SpeciesId };

export type RerollTarget = "type" | "region" | "species";

export type DraftPhase =
  | { readonly kind: "building" }
  | { readonly kind: "awaitingSlot" }
  | { readonly kind: "choosing"; readonly roll: Roll; readonly slot: SlotRef | null }
  | { readonly kind: "complete" };

export interface DraftState {
  readonly settings: DraftSettings;
  readonly seed: Seed;
  readonly round: number;
  readonly rerollsInRound: number;
  readonly rerollsUsed: number;
  readonly lineup: Lineup;
  readonly drafted: readonly SpeciesId[];
  readonly phase: DraftPhase;
}

export type DraftAction =
  | { readonly type: "chooseSlot"; readonly slot: SlotRef }
  | { readonly type: "pick"; readonly species: SpeciesId; readonly slot: SlotRef | null }
  | { readonly type: "reroll"; readonly target: RerollTarget }
  | { readonly type: "place"; readonly species: SpeciesId; readonly slot: SlotRef }
  | { readonly type: "clear"; readonly slot: SlotRef }
  | { readonly type: "swap"; readonly a: SlotRef; readonly b: SlotRef };

export type DraftErrorCode =
  | "wrongPhase"
  | "wrongMode"
  | "invalidSettings"
  | "slotOccupied"
  | "slotMismatch"
  | "slotRequired"
  | "notOffered"
  | "ineligible"
  | "alreadyDrafted"
  | "noRerolls"
  | "invalidTarget"
  | "noAlternatives";

export class DraftError extends Error {
  constructor(
    readonly code: DraftErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DraftError";
  }
}

export interface LineStrength {
  readonly GK: number;
  readonly DEF: number;
  readonly MID: number;
  readonly ATT: number;
}

export interface SlotRating {
  readonly slot: SlotId;
  readonly species: SpeciesId;
  readonly role: Role;
  readonly fit: number;
  readonly familiarity: number;
  readonly quality: Quality;
}

export type SynergyReason = "sharedType" | "evoLine" | "sameGen" | "coverage";

export interface SynergyEdge {
  readonly a: SlotId;
  readonly b: SlotId;
  readonly reasons: readonly SynergyReason[];
  readonly value: number;
}

export interface TeamRating {
  readonly score: number;
  readonly core: number;
  readonly drag: number;
  readonly synergy: number;
  readonly bench: number;
  readonly lines: LineStrength;
  readonly slots: Eleven<SlotRating>;
  readonly weakest: readonly SlotId[];
  readonly edges: readonly SynergyEdge[];
}

export const CUP_ROUNDS = ["G1", "G2", "G3", "R32", "R16", "QF", "SF", "F"] as const;
export type CupRound = (typeof CUP_ROUNDS)[number];
export type KnockoutRound = Exclude<CupRound, "G1" | "G2" | "G3">;

export interface Opponent {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly formation?: FormationId;
  readonly tacticalStyle?: "balanced" | "pressing" | "possession" | "direct";
  readonly captain?: OpponentPlayerRef;
  readonly theme?: Species["types"][number];
  readonly lines: LineStrength;
  /**
   * The Boss Club's eleven, lineup order (index 0 is the goalkeeper). Engine 4 and later field
   * actual Pokemon; retained runs hold shirt refs for the unnamed opponents their engine rolled.
   */
  readonly roster: readonly OpponentPlayerRef[];
}

export type Side = "user" | "opp";
export type Shirt = Brand<number, "Shirt">;

/** Who an opponent goal, assist or penalty belongs to: a Pokemon, or a legacy shirt number. */
export type OpponentPlayerRef =
  | { readonly kind: "species"; readonly id: SpeciesId }
  | { readonly kind: "shirt"; readonly number: Shirt };

export type GoalKind = "open-play" | "header" | "solo" | "free-kick" | "penalty";

export type GoalEvent =
  | {
      readonly side: "user";
      readonly minute: number;
      readonly penalty: boolean;
      readonly kind?: GoalKind;
      readonly scorer: SpeciesId;
      readonly assist: SpeciesId | null;
    }
  | {
      readonly side: "opp";
      readonly minute: number;
      readonly penalty: boolean;
      readonly kind?: GoalKind;
      readonly scorer: OpponentPlayerRef;
      readonly assist: OpponentPlayerRef | null;
    };

/** A saved on-target attempt during regulation or extra time. Side identifies the keeper's team. */
export interface SaveEvent {
  readonly kind: "save";
  readonly side: Side;
  readonly minute: number;
  readonly attacker: SpeciesId;
  readonly keeper: SpeciesId;
}

export type PenKick =
  | { readonly side: "user"; readonly taker: SpeciesId; readonly scored: boolean }
  | { readonly side: "opp"; readonly taker: OpponentPlayerRef; readonly scored: boolean };

export interface Shootout {
  readonly user: number;
  readonly opp: number;
  readonly keeper: SpeciesId;
  readonly kicks: readonly PenKick[];
  /**
   * How the shootout ended. "kicks": on the penalties. "coin": still level after the
   * sudden-death cap, settled by a seeded coin from the match stream. "decree": engine-1 and
   * engine-2 only, which awarded the user the win after 20 level pairs.
   */
  readonly decider: "kicks" | "coin" | "decree";
  /** The coin's winner when decider is "coin", else null. */
  readonly coinWinner: "user" | "opp" | null;
}

export interface Score {
  readonly user: number;
  readonly opp: number;
}

export interface Absence {
  readonly slot: SlotId;
  readonly out: SpeciesId;
  readonly in: SpeciesId | null;
}

/** A touchline instruction. Each changes how much a side attacks and how much it gives away. */
export const TACTICS = ["balanced", "attack", "defend", "press", "counter"] as const;
export type Tactic = (typeof TACTICS)[number];

/**
 * A coach decision recorded in the run token. `match` is the cup match index (0 to 7) and
 * `minute` is the match minute after which the decision applies (0 means before kickoff). A sub
 * replaces whoever plays in formation slot `slot` with bench player `bench`.
 */
export type ManagerAction =
  | {
      readonly type: "tactic";
      readonly match: number;
      readonly minute: number;
      readonly tactic: Tactic;
    }
  | {
      readonly type: "sub";
      readonly match: number;
      readonly minute: number;
      readonly slot: StarterIndex;
      readonly bench: BenchIndex;
    }
  | {
      /**
       * Engine 7: whoever plays in formation slot `slot` takes this set piece from `minute` on;
       * null hands it back to the automatic choice (the best shooter on the pitch).
       */
      readonly type: "taker";
      readonly match: number;
      readonly minute: number;
      readonly set: SetPiece;
      readonly slot: StarterIndex | null;
    };

/** The set pieces a manager can nominate a taker for. */
export const SET_PIECES = ["penalty", "freeKick"] as const;
export type SetPiece = (typeof SET_PIECES)[number];

/** Something that happened on the pitch besides a goal or a save. `slot` is a formation slot. */
export type Incident =
  | {
      readonly kind: "injury";
      /** "opp" only in engine 7, where a Boss Club's players can be injured too. */
      readonly side: Side;
      readonly minute: number;
      readonly slot: StarterIndex;
      readonly player: SpeciesId;
    }
  | {
      readonly kind: "sub";
      /** "opp" only in engine 7: a Boss Club's reserve replacing an injured player. */
      readonly side: Side;
      readonly minute: number;
      readonly slot: StarterIndex;
      readonly out: SpeciesId;
      readonly in: SpeciesId;
      readonly reason: "injury" | "tactical" | "fatigue";
      readonly by: "manager" | "auto";
    }
  | {
      readonly kind: "yellow" | "red";
      readonly side: Side;
      readonly minute: number;
      readonly slot: StarterIndex;
      readonly player: SpeciesId;
      /** True when a second yellow produced this red card. */
      readonly secondYellow: boolean;
    }
  | {
      readonly kind: "tactic";
      readonly side: Side;
      readonly minute: number;
      readonly tactic: Tactic;
      readonly by: "manager" | "auto";
    }
  | {
      /** Engine 7: a Boss Club rests its most tired outfield player at a rotation check. */
      readonly kind: "rotate";
      readonly side: "opp";
      readonly minute: number;
      readonly slot: StarterIndex;
      readonly player: SpeciesId;
    }
  | {
      /**
       * Engine 7: a penalty that did not score. "saved" when the keeper stopped it, "missed" when
       * the taker put it wide. A scored penalty is a goal.
       */
      readonly kind: "penalty";
      readonly side: Side;
      readonly minute: number;
      readonly slot: StarterIndex;
      readonly taker: SpeciesId;
      readonly keeper: SpeciesId;
      readonly outcome: "saved" | "missed";
    };

/** The state at the end of one five-minute window, for the touchline and the broadcast. */
export interface WindowSnapshot {
  /** The window's last minute (5, 10, ... 90, then 95 ... 120 in extra time). */
  readonly minute: number;
  readonly score: Score;
  readonly tactic: { readonly user: Tactic; readonly opp: Tactic };
  /** Energy 0 to 100 of the user's eleven slots, in formation order; null for an empty slot. */
  readonly energy: readonly (number | null)[];
  /** Who plays in each of the user's eleven slots; null after a red card or an unreplaced injury. */
  readonly onPitch: readonly (SpeciesId | null)[];
  /** Engine 7: the Boss Club's mean outfield energy, rounded. */
  readonly oppEnergy?: number;
}

export type MatchResult =
  | {
      readonly status: "played";
      readonly round: CupRound;
      readonly opponent: Opponent;
      readonly regulation: Score;
      readonly extraTime: Score | null;
      readonly shootout: Shootout | null;
      readonly outcome: "W" | "D" | "L";
      readonly goals: readonly GoalEvent[];
      /** Absent on retained engines that did not record saves. */
      readonly saves?: readonly SaveEvent[];
      /** Engine 6 and later: injuries, substitutions, cards and tactic changes, in minute order. */
      readonly incidents?: readonly Incident[];
      /** Engine 6 and later: one snapshot per five-minute window played. */
      readonly windows?: readonly WindowSnapshot[];
      readonly absences: readonly Absence[];
      readonly rating: number;
      readonly recap: readonly string[];
    }
  | {
      readonly status: "notPlayed";
      readonly round: CupRound;
      /** The ladder opponent the run would have met in this round. */
      readonly opponent: Opponent;
    };

export interface GroupRow {
  readonly team: "user" | string;
  readonly name: string;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly points: number;
}

export type CupFinish = "group" | KnockoutRound | "champion";

export interface PlayerLine {
  readonly species: SpeciesId;
  readonly goals: number;
  readonly assists: number;
  readonly appearances: number;
}

/** How the player of the tournament earned it: the counts, the points each earned, the sum. */
export interface Contribution {
  readonly species: SpeciesId;
  readonly goals: number;
  readonly assists: number;
  /** Matches kept clean while in a GK, CB, FB or DM slot. */
  readonly cleanSheets: number;
  /** 90 a match, 120 after extra time. */
  readonly minutes: number;
  readonly points: {
    readonly goals: number;
    readonly assists: number;
    readonly cleanSheets: number;
    readonly minutes: number;
  };
  readonly total: number;
}

export interface Awards {
  readonly goldenBoot: PlayerLine | null;
  readonly topAssister: PlayerLine | null;
  readonly playerOfTournament: PlayerLine;
  /** Null for a retained-engine run: those engines did not compute one. */
  readonly potContribution: Contribution | null;
}

export interface GroupFixture {
  readonly round: "G1" | "G2" | "G3";
  readonly a: string;
  readonly b: string;
  readonly aGoals: number;
  readonly bGoals: number;
}

export interface CupResult {
  /** The engine that produced this result; older than ENGINE_VERSION for a retained run. */
  readonly engine: `pokedraft-engine-${number}`;
  readonly seed: Seed;
  readonly mode: Mode;
  readonly rating: TeamRating;
  readonly group: readonly GroupRow[];
  readonly groupFixtures?: readonly GroupFixture[];
  readonly matches: readonly MatchResult[];
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly finish: CupFinish;
  readonly flawless: boolean;
  readonly players: readonly PlayerLine[];
  readonly awards: Awards;
}

export const RUN_TOKEN_VERSION = 7 as const;

export interface RunToken {
  readonly v: typeof RUN_TOKEN_VERSION;
  readonly settings: DraftSettings;
  readonly seed: Seed;
  readonly actions: readonly DraftAction[];
  /** Coach decisions for the cup, in match then minute order. Empty when nobody managed. */
  readonly manager?: readonly ManagerAction[];
}

export type RunTokenErrorCode =
  "malformed" | "unknownVersion" | "invalidSettings" | "invalidAction";

export class RunTokenError extends Error {
  constructor(
    readonly code: RunTokenErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RunTokenError";
  }
}
