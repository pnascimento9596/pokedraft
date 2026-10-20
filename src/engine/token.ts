import { z } from "zod";
import { asSpeciesId, normalizeSettings } from "./settings";
import {
  DraftError,
  FORMATION_IDS,
  RUN_TOKEN_VERSION,
  RunTokenError,
  type BenchIndex,
  type DraftAction,
  type DraftOrder,
  type DraftSettings,
  type DraftStyle,
  type Gen,
  type ManagerAction,
  type SetPiece,
  type Tactic,
  type RerollTarget,
  type RunToken,
  type Seed,
  type SlotRef,
  type StarterIndex,
} from "./types";

const PREFIX = /^pd(\d+)\.(.*)$/;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const DECODE = new Map<string, number>([...ALPHABET].map((c, i) => [c, i]));

function toBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += ALPHABET[b0 >> 2]! + ALPHABET[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)]!;
    if (b1 !== undefined) out += ALPHABET[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)]!;
    if (b2 !== undefined) out += ALPHABET[b2 & 63]!;
  }
  return out;
}

function malformed(message: string): never {
  throw new RunTokenError("malformed", message);
}

function fromBase64Url(text: string): Uint8Array {
  if (text.length % 4 === 1) malformed("base64url length is impossible");
  const sextets = [...text].map((c) => DECODE.get(c) ?? malformed(`invalid base64url char ${c}`));
  const bytes = new Uint8Array(Math.floor((sextets.length * 6) / 8));
  let acc = 0;
  let bits = 0;
  let n = 0;
  for (const s of sextets) {
    acc = (acc << 6) | s;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[n++] = (acc >> bits) & 255;
      acc &= (1 << bits) - 1;
    }
  }
  if (acc !== 0) malformed("base64url has non-zero trailing bits");
  return bytes;
}

type SlotCode = `s${StarterIndex}` | `b${BenchIndex}`;
const SLOT_CODES = [
  ...Array.from({ length: 11 }, (_, i) => `s${i}`),
  ...Array.from({ length: 5 }, (_, i) => `b${i}`),
] as [SlotCode, ...SlotCode[]];

function slotCode(ref: SlotRef): SlotCode {
  return ref.kind === "starter" ? `s${ref.index}` : `b${ref.index}`;
}

function slotRef(code: SlotCode): SlotRef {
  const index = Number(code.slice(1));
  return code[0] === "s"
    ? { kind: "starter", index: index as StarterIndex }
    : { kind: "bench", index: index as BenchIndex };
}

const STYLE_CODES = { open: "o", classic3: "c" } as const satisfies Record<DraftStyle, string>;
const ORDER_CODES = { squadFirst: "s", positionFirst: "p" } as const satisfies Record<
  DraftOrder,
  string
>;
const TACTIC_CODES = {
  balanced: "b",
  attack: "a",
  defend: "d",
  press: "p",
  counter: "k",
} as const satisfies Record<Tactic, string>;
const SET_PIECE_CODES = { penalty: "p", freeKick: "f" } as const satisfies Record<SetPiece, string>;
const TARGET_CODES = { type: "t", region: "r", species: "s" } as const satisfies Record<
  RerollTarget,
  string
>;

function invert<K extends string, V extends string>(table: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(table).map(([k, v]) => [v, k])) as Record<V, K>;
}
const STYLES = invert(STYLE_CODES);
const ORDERS = invert(ORDER_CODES);
const TARGETS = invert(TARGET_CODES);
const TACTIC_BY_CODE = invert(TACTIC_CODES);
const SET_PIECE_BY_CODE = invert(SET_PIECE_CODES);

const formation = z.enum(FORMATION_IDS);
const gens = z.string().regex(/^[1-9]+$/);
const styleCode = z.enum(["o", "c"]);
const orderCode = z.enum(["s", "p"]);
const settingsSchema = z.union([
  z.tuple([z.literal("b"), formation, gens, z.union([z.literal(0), z.literal(1)])]),
  z.tuple([z.literal("c"), formation, gens, styleCode, orderCode]),
  z.tuple([z.literal("k"), formation, orderCode]),
]);

const slot = z.enum(SLOT_CODES);
const speciesId = z.number().int().min(1).max(1025);
const actionSchema = z.union([
  z.tuple([z.literal("c"), slot]),
  z.tuple([z.literal("p"), speciesId, slot.nullable()]),
  z.tuple([z.literal("r"), z.enum(["t", "r", "s"])]),
  z.tuple([z.literal("l"), speciesId, slot]),
  z.tuple([z.literal("x"), slot]),
  z.tuple([z.literal("w"), slot, slot]),
]);

const cupMatch = z.number().int().min(0).max(7);
const matchMinute = z.number().int().min(0).max(120);
const starter = z.number().int().min(0).max(10);
const tacticTuple = z.tuple([
  z.literal("t"),
  cupMatch,
  matchMinute,
  z.enum(["b", "a", "d", "p", "k"]),
]);
const subTuple = z.tuple([
  z.literal("u"),
  cupMatch,
  matchMinute,
  starter,
  z.number().int().min(0).max(4),
]);
// Nominated takers: p for penalties, f for free kicks; a null slot is the automatic choice.
const takerTuple = z.tuple([z.enum(["p", "f"]), cupMatch, matchMinute, starter.nullable()]);

/**
 * The coach decisions a token of `version` may carry. Nominated takers arrive with engine 7, so a
 * pd6 token never carries one: the frozen engine 6 codec would refuse it after the flip.
 */
export function managerSchemaFor(version: number) {
  // RED scaffolding: no version has the taker tuple yet.
  void version;
  void takerTuple;
  return z.union([tacticTuple, subTuple]) as unknown as z.ZodUnion<
    [typeof tacticTuple, typeof subTuple, typeof takerTuple]
  >;
}
const managerSchema = managerSchemaFor(RUN_TOKEN_VERSION);

// Engine 6 appends the coach's decisions as a fourth element, left out when there are none.
const payloadSchema = z.union([
  z.tuple([z.unknown(), z.string().refine((s) => s.trim().length > 0), z.array(z.unknown())]),
  z.tuple([
    z.unknown(),
    z.string().refine((s) => s.trim().length > 0),
    z.array(z.unknown()),
    z.array(z.unknown()),
  ]),
]);

type CompactSettings = z.infer<typeof settingsSchema>;
type CompactAction = z.infer<typeof actionSchema>;
type CompactManager = z.infer<typeof managerSchema>;

function compactManager(a: ManagerAction): CompactManager {
  switch (a.type) {
    case "tactic":
      return ["t", a.match, a.minute, TACTIC_CODES[a.tactic]];
    case "sub":
      return ["u", a.match, a.minute, a.slot, a.bench];
    case "taker":
      return [SET_PIECE_CODES[a.set], a.match, a.minute, a.slot];
  }
}

function expandManager(c: CompactManager): ManagerAction {
  switch (c[0]) {
    case "t":
      return { type: "tactic", match: c[1], minute: c[2], tactic: TACTIC_BY_CODE[c[3]] };
    case "u":
      return {
        type: "sub",
        match: c[1],
        minute: c[2],
        slot: c[3] as StarterIndex,
        bench: c[4] as BenchIndex,
      };
    default:
      return {
        type: "taker",
        match: c[1],
        minute: c[2],
        set: SET_PIECE_BY_CODE[c[0]],
        slot: c[3] as StarterIndex | null,
      };
  }
}

function gensCode(list: readonly Gen[]): string {
  return list.join("");
}

function compactSettings(s: DraftSettings): CompactSettings {
  switch (s.mode) {
    case "builder":
      return ["b", s.formation, gensCode(s.gens), s.legendaries ? 1 : 0];
    case "cup8":
      return ["c", s.formation, gensCode(s.gens), STYLE_CODES[s.style], ORDER_CODES[s.order]];
    case "kanto151":
      return ["k", s.formation, ORDER_CODES[s.order]];
  }
}

function expandSettings(c: CompactSettings): DraftSettings {
  switch (c[0]) {
    case "b":
      return {
        mode: "builder",
        formation: c[1],
        gens: [...c[2]].map(Number) as Gen[],
        legendaries: c[3] === 1,
      };
    case "c":
      return {
        mode: "cup8",
        formation: c[1],
        gens: [...c[2]].map(Number) as Gen[],
        style: STYLES[c[3]],
        order: ORDERS[c[4]],
      };
    case "k":
      return { mode: "kanto151", formation: c[1], order: ORDERS[c[2]] };
  }
}

function compactAction(a: DraftAction): CompactAction {
  switch (a.type) {
    case "chooseSlot":
      return ["c", slotCode(a.slot)];
    case "pick":
      return ["p", a.species, a.slot === null ? null : slotCode(a.slot)];
    case "reroll":
      return ["r", TARGET_CODES[a.target]];
    case "place":
      return ["l", a.species, slotCode(a.slot)];
    case "clear":
      return ["x", slotCode(a.slot)];
    case "swap":
      return ["w", slotCode(a.a), slotCode(a.b)];
  }
}

function expandAction(c: CompactAction): DraftAction {
  switch (c[0]) {
    case "c":
      return { type: "chooseSlot", slot: slotRef(c[1]) };
    case "p":
      return {
        type: "pick",
        species: asSpeciesId(c[1]),
        slot: c[2] === null ? null : slotRef(c[2]),
      };
    case "r":
      return { type: "reroll", target: TARGETS[c[1]] };
    case "l":
      return { type: "place", species: asSpeciesId(c[1]), slot: slotRef(c[2]) };
    case "x":
      return { type: "clear", slot: slotRef(c[1]) };
    case "w":
      return { type: "swap", a: slotRef(c[1]), b: slotRef(c[2]) };
  }
}

export function encodeToken(t: RunToken): string {
  const payload: unknown[] = [compactSettings(t.settings), t.seed, t.actions.map(compactAction)];
  if (t.manager !== undefined && t.manager.length > 0) payload.push(t.manager.map(compactManager));
  return `pd${RUN_TOKEN_VERSION}.${toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))}`;
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return malformed("token body is not UTF-8 JSON");
  }
}

function decodeSettings(raw: unknown): DraftSettings {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) throw new RunTokenError("invalidSettings", "settings have the wrong shape");
  try {
    return normalizeSettings(expandSettings(parsed.data));
  } catch (e) {
    if (e instanceof DraftError) throw new RunTokenError("invalidSettings", e.message);
    throw e;
  }
}

function decodeManager(raw: unknown, index: number): ManagerAction {
  const parsed = managerSchema.safeParse(raw);
  if (!parsed.success)
    throw new RunTokenError("invalidAction", `manager action ${index} is invalid`);
  return expandManager(parsed.data);
}

function decodeAction(raw: unknown, index: number): DraftAction {
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) throw new RunTokenError("invalidAction", `action ${index} is invalid`);
  return expandAction(parsed.data);
}

export function decodeToken(s: string): RunToken {
  const m = PREFIX.exec(s);
  if (m === null) malformed("token has no pd<version>. prefix");
  if (m[1] !== String(RUN_TOKEN_VERSION)) {
    throw new RunTokenError("unknownVersion", `unknown token version ${m[1]}`);
  }
  const payload = payloadSchema.safeParse(parseJson(fromBase64Url(m[2]!)));
  if (!payload.success) malformed("token body has the wrong shape");
  const [rawSettings, seed, rawActions, rawManager] = payload.data;
  const run: RunToken = {
    v: RUN_TOKEN_VERSION,
    settings: decodeSettings(rawSettings),
    seed: seed as Seed,
    actions: rawActions.map(decodeAction),
  };
  return rawManager === undefined || rawManager.length === 0
    ? run
    : { ...run, manager: rawManager.map(decodeManager) };
}
