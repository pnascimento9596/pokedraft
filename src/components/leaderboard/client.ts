import { z } from "zod";
import { ENGINE_VERSION } from "@/engine";
import {
  BOARD_MODES,
  BOARD_SCOPES,
  COACH_FILTERS,
  SUBMIT_ERROR_STATUS,
  type BoardEntry,
  type BoardMode,
  type BoardScope,
  type CoachFilter,
  type SubmitEntry,
  type SubmitErrorCode,
} from "@/leaderboard/contract";

// The daily challenge is always an 8-0 Challenge, so a daily board is always cup8.
export interface BoardView {
  readonly mode: BoardMode;
  readonly scope: BoardScope;
  readonly date: string;
  readonly coach: CoachFilter;
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
}) satisfies z.ZodType<BoardEntry>;

const boardOkSchema = z.object({ coach: z.enum(COACH_FILTERS), entries: z.array(entrySchema) });
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
  };
}

export function boardHref(view: {
  mode: BoardMode;
  scope: BoardScope;
  date?: string | null;
  coach?: CoachFilter;
}) {
  const q = new URLSearchParams({ mode: view.mode, scope: view.scope });
  if (view.scope === "daily" && view.date) q.set("date", view.date);
  if (view.coach !== undefined && view.coach !== "all") q.set("coach", view.coach);
  return `/leaderboard?${q.toString()}`;
}

// `coach` is sent only for a filtered view, so the default All request is unchanged.
function apiQuery(view: BoardView): string {
  const q = new URLSearchParams({ mode: view.mode, scope: view.scope });
  if (view.scope === "daily") q.set("date", view.date);
  if (view.coach !== "all") q.set("coach", view.coach);
  return `/api/leaderboard?${q.toString()}`;
}

export type BoardResult =
  | { readonly kind: "ok"; readonly entries: readonly BoardEntry[] }
  | { readonly kind: "error"; readonly reason: "offline" | "network" | "unexpected" };

// Any reply that is not a well-formed BoardOk for the requested coach view is an error, never an
// empty board or another view's rows.
export async function fetchBoard(view: BoardView, signal?: AbortSignal): Promise<BoardResult> {
  let res: Response;
  try {
    res = await fetch(apiQuery(view), { signal, cache: "no-store" });
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
  const ok = boardOkSchema.safeParse(body);
  return ok.success && ok.data.coach === view.coach
    ? { kind: "ok", entries: ok.data.entries }
    : { kind: "error", reason: "unexpected" };
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
