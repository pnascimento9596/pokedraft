import { createHmac } from "node:crypto";
import {
  ENGINE_VERSION,
  RunTokenError,
  decodeToken,
  encodeToken,
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
import { logServerError, requestIdOf } from "@/observability/log";
import type { RateLimiter } from "@/ratelimit/store";
import type { LeaderboardRow } from "@/db/schema";
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

function boardError(code: BoardErrorCode, message: string, headers?: Record<string, string>) {
  const body: ApiError<BoardErrorCode> = { error: { code, message } };
  return json(body, BOARD_ERROR_STATUS[code], headers);
}

function unavailable(where: string, requestId: string, e: unknown): Response {
  logServerError(where, requestId, e);
  return submitError("DB_UNAVAILABLE", "The leaderboard is unavailable.", {
    "x-request-id": requestId,
  });
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

interface Submission {
  readonly nickname: string;
  readonly run: RunToken;
  readonly token: string;
  readonly board: Board;
}

// Everything that can be checked without the database. A rejection is returned, not sent, so the
// caller can count the attempt first.
async function parseSubmission(
  req: Request,
  now: Date,
): Promise<
  { readonly ok: true; readonly sub: Submission } | { readonly ok: false; readonly res: Response }
> {
  const reject = (res: Response) => ({ ok: false, res }) as const;
  let raw: unknown;
  try {
    raw = await readJson(req);
  } catch {
    return reject(submitError("INVALID_BODY", "The body must be JSON under 16 KB."));
  }
  const body = submitBodySchema.safeParse(raw);
  if (!body.success) return reject(submitError("INVALID_BODY", "Expected { nickname, token }."));
  if (body.data.engineVersion !== undefined && body.data.engineVersion !== ENGINE_VERSION) {
    return reject(
      submitError(
        "ENGINE_VERSION_MISMATCH",
        `This page runs ${body.data.engineVersion}; the server runs ${ENGINE_VERSION}. Reload and play again.`,
      ),
    );
  }
  const nick = parseNickname(body.data.nickname);
  if (!nick.ok) {
    return reject(submitError("NICKNAME_INVALID", `Nickname rejected (${nick.reason}).`));
  }

  let run: RunToken;
  try {
    run = decodeToken(body.data.token);
  } catch (e) {
    return reject(tokenError(e));
  }
  if (run.settings.mode === "builder") {
    return reject(
      submitError("BUILDER_NOT_RANKED", "Builder squads are friendlies and are never ranked."),
    );
  }
  const dailyDate = dailyDateForSeed(run.seed, now);
  if (dailyDate !== null && !isDailySettings(run.settings)) {
    return reject(
      submitError(
        "DAILY_SETTINGS_MISMATCH",
        "Daily runs use cup8, all regions, Open style, squad first.",
      ),
    );
  }
  // One run has many encodings (JSON spacing, gens order, 25.0 for 25). Dedupe and store the
  // canonical one, so the token index sees one run as one row.
  const token = encodeToken(run);
  const board: Board = { mode: run.settings.mode, dailyDate };
  return { ok: true, sub: { nickname: nick.nickname, run, token, board } };
}

// A retry of an accepted run (same run, same nickname) gets the saved entry back with 200.
async function rankOrNull(
  store: LeaderboardStore,
  row: LeaderboardRow,
  board: Board,
  requestId: string,
): Promise<number | null> {
  try {
    return await store.rankOf(row, board);
  } catch (e) {
    logServerError("submit.rank", requestId, e);
    return null;
  }
}

async function savedEntry(
  row: LeaderboardRow,
  store: LeaderboardStore,
  requestId: string,
): Promise<Response> {
  const board: Board = { mode: row.mode, dailyDate: row.dailyDate };
  const rank = await rankOrNull(store, row, board, requestId);
  const ok: SubmitOk = { entry: toBoardEntry(row, rank) };
  return json(ok, 200);
}

export async function handleSubmit(req: Request, deps: SubmitDeps): Promise<Response> {
  const replay = deps.replay ?? engineReplay;
  const now = deps.now();
  const rid = requestIdOf(req.headers);
  if (!usableSecret(deps.ipHashSecret)) {
    console.error("IP_HASH_SECRET is missing or shorter than 32 characters");
    return submitError("DB_UNAVAILABLE", "The leaderboard is unavailable.");
  }
  const ipHash = hashIp(clientIp(req), deps.ipHashSecret);
  const parsed = await parseSubmission(req, now);

  // The token probe runs before the limiter so a retry after a lost response costs no attempt.
  let existing: LeaderboardRow | null = null;
  if (parsed.ok) {
    try {
      existing = await deps.store.byToken(parsed.sub.token);
    } catch (e) {
      return unavailable("submit.probe", rid, e);
    }
    if (existing?.nickname === parsed.sub.nickname) return savedEntry(existing, deps.store, rid);
  }

  try {
    if (!(await deps.limiter.consume("submit", ipHash, now, RATE_LIMIT))) {
      return submitError("RATE_LIMITED", "Ten submissions per hour. Try again later.", {
        "retry-after": "3600",
      });
    }
  } catch (e) {
    return unavailable("submit.limiter", rid, e);
  }
  if (!parsed.ok) return parsed.res;
  const { nickname, run, token, board } = parsed.sub;
  if (existing !== null) return conflictError("token");
  try {
    if (await deps.store.dailyTaken(nickname, board)) return conflictError("daily");
  } catch (e) {
    return unavailable("submit.daily", rid, e);
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
      nickname,
      mode: board.mode,
      variant: variantOf(run.settings),
      dailyDate: board.dailyDate,
      seed: run.seed,
      token,
      teamScore: cup.rating.score,
      wins: cup.wins,
      draws: cup.draws,
      losses: cup.losses,
      engineVersion: cup.engine,
      ipHash,
    });
    if (!inserted.ok) {
      // A concurrent copy of this same submission won the insert race.
      const winner = await deps.store.byToken(token);
      if (winner?.nickname === nickname) return savedEntry(winner, deps.store, rid);
      return conflictError(inserted.conflict);
    }
    // The run is saved. A rank that cannot be computed must not turn that into a failure.
    const rank = await rankOrNull(deps.store, inserted.row, board, rid);
    const ok: SubmitOk = { entry: toBoardEntry(inserted.row, rank) };
    return json(ok, 201);
  } catch (e) {
    return unavailable("submit.insert", rid, e);
  }
}

export async function handleBoard(
  url: URL,
  store: LeaderboardStore,
  requestId: string = requestIdOf(new Headers()),
): Promise<Response> {
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
  } catch (e) {
    logServerError("board.read", requestId, e);
    return boardError("DB_UNAVAILABLE", "The leaderboard is unavailable.", {
      "x-request-id": requestId,
    });
  }
}
