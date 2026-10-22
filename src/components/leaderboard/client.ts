import { z } from "zod";
import { ENGINE_VERSION, FORMATION_IDS } from "@/engine/types";
import {
  BOARD_MODES,
  BOARD_SCOPES,
  COACH_FILTERS,
  ENGINE_FILTERS,
  SUBMIT_ERROR_STATUS,
  type BoardEntry,
  type BoardMode,
  type BoardScope,
  type CoachFilter,
  type EngineFilter,
  type SubmitEntry,
  type SubmitErrorCode,
} from "@/leaderboard/contract";

// The daily challenge is always an 8-0 Challenge, so a daily board is always cup8. Only the
// all-time board filters by engine; a daily view always reads `current` here and sends nothing.
export interface BoardView {
  readonly mode: BoardMode;
  readonly scope: BoardScope;
  readonly date: string;
  readonly coach: CoachFilter;
  readonly engine: EngineFilter;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const entrySchema = z.object({
  squadSpeciesIds: z
    .array(z.number().int().min(1).max(1025))
    .length(16)
    .refine((ids) => new Set(ids).size === 16)
    .optional(),
  rank: z.number(),
  nickname: z.string(),
  mode: z.enum(BOARD_MODES),
  variant: z.string(),
  dailyDate: z.string().nullable(),
  token: z.string(),
  teamScore: z.number(),
  wins: z.number(),
  draws: z.number(),
  losses: z.number(),
  createdAt: z.string(),
  coached: z.boolean(),
  engineVersion: z.string(),
  seed: z.string(),
  formation: z.enum(FORMATION_IDS).nullable(),
}) satisfies z.ZodType<BoardEntry>;

const boardOkSchema = z.object({
  coach: z.enum(COACH_FILTERS),
  engine: z.enum(ENGINE_FILTERS),
  entries: z.array(entrySchema),
});
const seedBoardOkSchema = z.object({
  mode: z.enum(BOARD_MODES),
  scope: z.literal("seed"),
  seed: z.string(),
  entries: z.array(entrySchema),
});
const submitEntrySchema = entrySchema.extend({
  rank: z.number().nullable(),
}) satisfies z.ZodType<SubmitEntry>;
const submitOkSchema = z.object({ entry: submitEntrySchema });
const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), nickname: z.string().optional() }),
});

export function parseBoardView(q: URLSearchParams, today: string): BoardView {
  const mode = (BOARD_MODES as readonly (string | null)[]).includes(q.get("mode"))
    ? (q.get("mode") as BoardMode)
    : "cup8";
  const scope = (BOARD_SCOPES as readonly (string | null)[]).includes(q.get("scope"))
    ? (q.get("scope") as BoardScope)
    : "daily";
  const date = q.get("date");
  const coach = (COACH_FILTERS as readonly (string | null)[]).includes(q.get("coach"))
    ? (q.get("coach") as CoachFilter)
    : "all";
  return {
    mode: scope === "daily" ? "cup8" : mode,
    scope,
    date: date !== null && ISO_DATE.test(date) ? date : today,
    coach,
    engine: scope === "all" && q.get("engine") === "all" ? "all" : "current",
  };
}

export function boardHref(view: {
  mode: BoardMode;
  scope: BoardScope;
  date?: string | null;
  coach?: CoachFilter;
  engine?: EngineFilter;
}) {
  const q = new URLSearchParams({ mode: view.mode, scope: view.scope });
  if (view.scope === "daily" && view.date) q.set("date", view.date);
  if (view.coach !== undefined && view.coach !== "all") q.set("coach", view.coach);
  if (view.scope === "all" && view.engine === "all") q.set("engine", "all");
  return `/leaderboard?${q.toString()}`;
}

// `coach` and `engine` are sent only for a non-default view, so the default request is unchanged.
function apiQuery(view: BoardView): string {
  const q = new URLSearchParams({ mode: view.mode, scope: view.scope });
  if (view.scope === "daily") q.set("date", view.date);
  if (view.coach !== "all") q.set("coach", view.coach);
  if (view.scope === "all" && view.engine === "all") q.set("engine", "all");
  return `/api/leaderboard?${q.toString()}`;
}

// A daily board lists every engine that played its date.
function replyEngine(view: BoardView): EngineFilter {
  return view.scope === "all" ? view.engine : "all";
}

export type BoardResult =
  | { readonly kind: "ok"; readonly entries: readonly BoardEntry[] }
  | { readonly kind: "error"; readonly reason: "offline" | "network" | "unexpected" };

async function getBoard(
  url: string,
  signal: AbortSignal | undefined,
  read: (body: unknown) => readonly BoardEntry[] | null,
): Promise<BoardResult> {
  let res: Response;
  try {
    res = await fetch(url, { signal, cache: "no-store" });
  } catch {
    return { kind: "error", reason: "network" };
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { kind: "error", reason: "unexpected" };
  }
  if (!res.ok) {
    const err = apiErrorSchema.safeParse(body);
    const offline = err.success && err.data.error.code === "DB_UNAVAILABLE";
    return { kind: "error", reason: offline || res.status === 503 ? "offline" : "unexpected" };
  }
  const entries = read(body);
  return entries === null ? { kind: "error", reason: "unexpected" } : { kind: "ok", entries };
}

// Any reply that is not a well-formed BoardOk for the requested coach and engine view is an
// error, never an empty board or another view's rows.
export function fetchBoard(view: BoardView, signal?: AbortSignal): Promise<BoardResult> {
  return getBoard(apiQuery(view), signal, (body) => {
    const ok = boardOkSchema.safeParse(body);
    return ok.success && ok.data.coach === view.coach && ok.data.engine === replyEngine(view)
      ? ok.data.entries
      : null;
  });
}

export function fetchSeedBoard(
  mode: BoardMode,
  seed: string,
  signal?: AbortSignal,
): Promise<BoardResult> {
  const q = new URLSearchParams({ mode, seed });
  return getBoard(`/api/leaderboard?${q.toString()}`, signal, (body) => {
    const ok = seedBoardOkSchema.safeParse(body);
    return ok.success && ok.data.mode === mode && ok.data.seed === seed ? ok.data.entries : null;
  });
}

export type SubmitFailure = SubmitErrorCode | "NETWORK" | "UNEXPECTED";

export type SubmitResult =
  | { readonly kind: "ok"; readonly entry: SubmitEntry }
  | { readonly kind: "error"; readonly code: SubmitFailure; readonly nickname?: string };

function isSubmitCode(code: string): code is SubmitErrorCode {
  return Object.hasOwn(SUBMIT_ERROR_STATUS, code);
}

export async function submitRun(
  nickname: string,
  token: string,
  coach: CoachFilter,
): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname, token, engineVersion: ENGINE_VERSION, coach }),
    });
  } catch {
    return { kind: "error", code: "NETWORK" };
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { kind: "error", code: "UNEXPECTED" };
  }
  if (res.ok) {
    const ok = submitOkSchema.safeParse(body);
    return ok.success
      ? { kind: "ok", entry: ok.data.entry }
      : { kind: "error", code: "UNEXPECTED" };
  }
  const err = apiErrorSchema.safeParse(body);
  if (err.success && isSubmitCode(err.data.error.code)) {
    const { code, nickname } = err.data.error;
    return nickname === undefined ? { kind: "error", code } : { kind: "error", code, nickname };
  }
  return { kind: "error", code: "UNEXPECTED" };
}
