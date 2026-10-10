import { createHmac } from "node:crypto";
import {
  ENGINE_VERSION,
  RunTokenError,
  decodeToken,
  replay as engineReplay,
  type DraftSettings,
  type RunToken,
  type RunTokenErrorCode,
} from "@/engine";
import {
  BOARD_ERROR_STATUS,
  SUBMIT_ERROR_STATUS,
  boardQuerySchema,
  submitBodySchema,
  type ApiError,
  type BoardErrorCode,
  type BoardOk,
  type SubmitErrorCode,
  type SubmitOk,
} from "../contract";
import { dailyDateForSeed, isDailySettings } from "../daily";
import { parseNickname } from "../nickname";
import type { RateLimiter } from "@/ratelimit/store";
import { toBoardEntry, type Board, type Conflict, type LeaderboardStore } from "./store";

export const RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 } as const;
export const IP_HASH_SECRET_MIN = 32;
const MAX_BODY_BYTES = 16 * 1024;

export interface SubmitDeps {
  readonly store: LeaderboardStore;
  readonly limiter: RateLimiter;
  readonly ipHashSecret: string | undefined;
  readonly now: () => Date;
  readonly replay?: (token: RunToken) => ReturnType<typeof engineReplay>;
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

function submitError(code: SubmitErrorCode, message: string, headers?: Record<string, string>) {
  const body: ApiError<SubmitErrorCode> = { error: { code, message } };
  return json(body, SUBMIT_ERROR_STATUS[code], headers);
}

function boardError(code: BoardErrorCode, message: string) {
  const body: ApiError<BoardErrorCode> = { error: { code, message } };
  return json(body, BOARD_ERROR_STATUS[code]);
}

const TOKEN_ERROR: Record<RunTokenErrorCode, SubmitErrorCode> = {
  malformed: "TOKEN_MALFORMED",
  unknownVersion: "ENGINE_VERSION_MISMATCH",
  invalidSettings: "INVALID_SETTINGS",
  invalidAction: "ILLEGAL_ACTION",
};

function tokenError(e: unknown): Response {
  if (e instanceof RunTokenError) return submitError(TOKEN_ERROR[e.code], e.message);
  throw e;
}

function conflictError(conflict: Conflict): Response {
  return conflict === "daily"
    ? submitError("DAILY_ALREADY_SUBMITTED", "That nickname already has a run on this daily board.")
    : submitError("DUPLICATE_TOKEN", "This run is already on the leaderboard.");
}

// Vercel sets x-real-ip to the client address (it is what @vercel/functions ipAddress() reads).
// x-forwarded-for is only the fallback for other hosts and local runs.
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}

export function hashIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function usableSecret(secret: string | undefined): secret is string {
  return secret !== undefined && secret.length >= IP_HASH_SECRET_MIN;
}

export function variantOf(s: DraftSettings): string {
  switch (s.mode) {
    case "cup8":
      return `${s.style}.${s.order}.g${s.gens.join("")}`;
    case "kanto151":
      return s.order;
    case "builder":
      return "builder";
  }
}

async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new SyntaxError("too large");
  return JSON.parse(text);
}

export async function handleSubmit(req: Request, deps: SubmitDeps): Promise<Response> {
  const replay = deps.replay ?? engineReplay;
  const now = deps.now();
  if (!usableSecret(deps.ipHashSecret)) {
    console.error("IP_HASH_SECRET is missing or shorter than 32 characters");
    return submitError("DB_UNAVAILABLE", "The leaderboard is unavailable.");
  }
  const ipHash = hashIp(clientIp(req), deps.ipHashSecret);
  try {
    if (!(await deps.limiter.consume("submit", ipHash, now, RATE_LIMIT))) {
      return submitError("RATE_LIMITED", "Ten submissions per hour. Try again later.", {
        "retry-after": "3600",
      });
    }
  } catch {
    return submitError("DB_UNAVAILABLE", "The leaderboard is unavailable.");
  }

  let raw: unknown;
  try {
    raw = await readJson(req);
  } catch {
    return submitError("INVALID_BODY", "The body must be JSON under 16 KB.");
  }
  const body = submitBodySchema.safeParse(raw);
  if (!body.success) return submitError("INVALID_BODY", "Expected { nickname, token }.");
  if (body.data.engineVersion !== undefined && body.data.engineVersion !== ENGINE_VERSION) {
    return submitError(
      "ENGINE_VERSION_MISMATCH",
      `This page runs ${body.data.engineVersion}; the server runs ${ENGINE_VERSION}. Reload and play again.`,
    );
  }
  const nick = parseNickname(body.data.nickname);
  if (!nick.ok) return submitError("NICKNAME_INVALID", `Nickname rejected (${nick.reason}).`);

  let run: RunToken;
  try {
    run = decodeToken(body.data.token);
  } catch (e) {
    return tokenError(e);
  }
  if (run.settings.mode === "builder") {
    return submitError("BUILDER_NOT_RANKED", "Builder squads are friendlies and are never ranked.");
  }
  const dailyDate = dailyDateForSeed(run.seed, now);
  if (dailyDate !== null && !isDailySettings(run.settings)) {
    return submitError(
      "DAILY_SETTINGS_MISMATCH",
      "Daily runs use cup8, all regions, Open style, squad first.",
    );
  }

  const mode = run.settings.mode;
  const board: Board = { mode, dailyDate };
  try {
    const conflict = await deps.store.conflictFor(body.data.token, nick.nickname, board);
    if (conflict !== null) return conflictError(conflict);
  } catch {
    return submitError("DB_UNAVAILABLE", "The leaderboard is unavailable.");
  }

  let result: ReturnType<typeof engineReplay>;
  try {
    result = replay(run);
  } catch (e) {
    return tokenError(e);
  }
  const { cup } = result;

  try {
    const inserted = await deps.store.insert({
      nickname: nick.nickname,
      mode,
      variant: variantOf(run.settings),
      dailyDate,
      seed: run.seed,
      token: body.data.token,
      teamScore: cup.rating.score,
      wins: cup.wins,
      draws: cup.draws,
      losses: cup.losses,
      engineVersion: cup.engine,
      ipHash,
    });
    if (!inserted.ok) return conflictError(inserted.conflict);
    // The run is saved. A rank that cannot be computed must not turn that into a failure.
    const rank = await deps.store.rankOf(inserted.row, board).catch(() => null);
    const ok: SubmitOk = { entry: toBoardEntry(inserted.row, rank) };
    return json(ok, 201);
  } catch {
    return submitError("DB_UNAVAILABLE", "The leaderboard is unavailable.");
  }
}

export async function handleBoard(url: URL, store: LeaderboardStore): Promise<Response> {
  const q = url.searchParams;
  const parsed = boardQuerySchema.safeParse({
    mode: q.get("mode") ?? undefined,
    scope: q.get("scope") ?? undefined,
    date: q.get("date") ?? undefined,
  });
  if (!parsed.success) {
    return boardError(
      "INVALID_QUERY",
      "Expected mode=cup8|kanto151 and scope=daily&date= or scope=all.",
    );
  }
  const { mode, scope } = parsed.data;
  const date = parsed.data.scope === "daily" ? parsed.data.date : null;
  try {
    const rows = await store.top({ mode, dailyDate: date });
    const ok: BoardOk = { mode, scope, date, entries: rows.map((r, i) => toBoardEntry(r, i + 1)) };
    return json(ok, 200);
  } catch {
    return boardError("DB_UNAVAILABLE", "The leaderboard is unavailable.");
  }
}
