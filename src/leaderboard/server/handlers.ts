import { createHash } from "node:crypto";
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
import { toBoardEntry, type Board, type LeaderboardStore } from "./store";

export const RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 } as const;
const MAX_BODY_BYTES = 16 * 1024;

export interface SubmitDeps {
  readonly store: LeaderboardStore;
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

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`pokedraft-ip:${ip}`).digest("hex");
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

  const now = deps.now();
  const ipHash = hashIp(clientIp(req));
  try {
    const recent = await deps.store.countRecentByIp(
      ipHash,
      new Date(now.getTime() - RATE_LIMIT.windowMs),
    );
    if (recent >= RATE_LIMIT.max) {
      return submitError("RATE_LIMITED", "Ten submissions per hour. Try again later.", {
        "retry-after": "3600",
      });
    }
  } catch {
    return submitError("DB_UNAVAILABLE", "The leaderboard is unavailable.");
  }

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

  let result: ReturnType<typeof engineReplay>;
  try {
    result = replay(run);
  } catch (e) {
    return tokenError(e);
  }
  const { cup } = result;
  const mode = run.settings.mode;
  const board: Board = { mode, dailyDate };

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
    if (!inserted.ok) {
      return inserted.conflict === "daily"
        ? submitError(
            "DAILY_ALREADY_SUBMITTED",
            "That nickname already has a run on today's board.",
          )
        : submitError("DUPLICATE_TOKEN", "This run is already on the leaderboard.");
    }
    const rank = await deps.store.rankOf(inserted.row, board);
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
