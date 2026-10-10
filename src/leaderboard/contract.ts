import { z } from "zod";
import { toIsoDate } from "@/engine";

export const BOARD_MODES = ["cup8", "kanto151"] as const;
export type BoardMode = (typeof BOARD_MODES)[number];

export const BOARD_SCOPES = ["daily", "all"] as const;
export type BoardScope = (typeof BOARD_SCOPES)[number];

export const BOARD_LIMIT = 50;
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;
export const TOKEN_MAX = 4096;

export const submitBodySchema = z.object({
  nickname: z.string(),
  token: z.string().min(1).max(TOKEN_MAX),
  engineVersion: z.string().optional(),
});
export type SubmitBody = z.infer<typeof submitBodySchema>;

export const SUBMIT_ERROR_STATUS = {
  INVALID_BODY: 400,
  NICKNAME_INVALID: 422,
  TOKEN_MALFORMED: 422,
  INVALID_SETTINGS: 422,
  ILLEGAL_ACTION: 422,
  BUILDER_NOT_RANKED: 422,
  DAILY_SETTINGS_MISMATCH: 422,
  ENGINE_VERSION_MISMATCH: 409,
  DAILY_ALREADY_SUBMITTED: 409,
  DUPLICATE_TOKEN: 409,
  RATE_LIMITED: 429,
  DB_UNAVAILABLE: 503,
} as const;
export type SubmitErrorCode = keyof typeof SUBMIT_ERROR_STATUS;

export const BOARD_ERROR_STATUS = {
  INVALID_QUERY: 400,
  DB_UNAVAILABLE: 503,
} as const;
export type BoardErrorCode = keyof typeof BOARD_ERROR_STATUS;

export interface ApiError<C extends string> {
  readonly error: { readonly code: C; readonly message: string };
}

export interface BoardEntry {
  readonly rank: number;
  readonly nickname: string;
  readonly mode: BoardMode;
  readonly variant: string;
  readonly dailyDate: string | null;
  readonly token: string;
  readonly teamScore: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly createdAt: string;
}

// The run is saved before its rank is looked up, so a failed lookup leaves rank null.
export interface SubmitEntry extends Omit<BoardEntry, "rank"> {
  readonly rank: number | null;
}

export interface SubmitOk {
  readonly entry: SubmitEntry;
}

export interface BoardOk {
  readonly mode: BoardMode;
  readonly scope: BoardScope;
  readonly date: string | null;
  readonly entries: readonly BoardEntry[];
}

export const boardQuerySchema = z.discriminatedUnion("scope", [
  z.object({
    mode: z.enum(BOARD_MODES),
    scope: z.literal("daily"),
    date: z.string().refine((d) => {
      try {
        toIsoDate(d);
        return true;
      } catch {
        return false;
      }
    }),
  }),
  z.object({ mode: z.enum(BOARD_MODES), scope: z.literal("all"), date: z.undefined() }),
]);
export type BoardQuery = z.infer<typeof boardQuerySchema>;
