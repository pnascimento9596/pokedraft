import { z } from "zod";
import {
  countRun,
  ensureLifetime,
  fromStored,
  LifetimeSchema,
  mergeLifetime,
  toStored,
  writeLifetime,
  type LifetimeTotals,
} from "./lifetime";
import { HISTORY_KEY, HISTORY_LIMIT, loadHistory, RunRecordSchema, type RunRecord } from "./runs";
import { writeJson } from "./storage";

export const BACKUP_FORMAT = "pokedraft-backup";
export const BACKUP_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 1_000_000;

const BackupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: z.string().min(1),
  history: z.array(RunRecordSchema).max(HISTORY_LIMIT),
  lifetime: LifetimeSchema,
});
export type Backup = Omit<z.infer<typeof BackupSchema>, "history"> & {
  readonly history: readonly RunRecord[];
};

export type ParsedBackup =
  { readonly ok: true; readonly backup: Backup } | { readonly ok: false; readonly message: string };

const NOT_A_BACKUP = "This file is not a pokedraft backup.";

export function buildBackup(exportedAt: string): Backup {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    history: loadHistory(),
    lifetime: toStored(ensureLifetime()),
  };
}

export function backupFileName(exportedAt: string): string {
  return `pokedraft-backup-${exportedAt.slice(0, 10)}.json`;
}

export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) {
    return { ok: false, message: "This file is too large to be a pokedraft backup." };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: `${NOT_A_BACKUP} It is not valid JSON.` };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, message: NOT_A_BACKUP };
  }
  const header = raw as Record<string, unknown>;
  if (header.format !== BACKUP_FORMAT) return { ok: false, message: NOT_A_BACKUP };
  if (header.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      message: `This backup uses schema version ${String(header.schemaVersion)}. This site reads version ${BACKUP_SCHEMA_VERSION}.`,
    };
  }
  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    const where = issue.path.length === 0 ? "the file" : issue.path.join(".");
    return { ok: false, message: `This backup is damaged at ${where}. Nothing was restored.` };
  }
  return { ok: true, backup: parsed.data };
}

function time(run: RunRecord): number {
  const t = Date.parse(run.at);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

/** Runs from both sides, one per token (this browser's copy wins), newest first, trimmed to the limit. */
export function mergeHistory(
  local: readonly RunRecord[],
  imported: readonly RunRecord[],
): RunRecord[] {
  const seen = new Set(local.map((run) => run.token));
  const merged = [...local, ...imported.filter((run) => !seen.has(run.token))];
  return merged
    .map((run, index) => ({ run, index }))
    .sort((a, b) => time(b.run) - time(a.run) || a.index - b.index)
    .map(({ run }) => run)
    .slice(0, HISTORY_LIMIT);
}

export interface RestoreSummary {
  readonly addedRuns: number;
}

export function restoreBackup(backup: Backup): RestoreSummary {
  const local = loadHistory();
  const lifetime = ensureLifetime();
  const history = mergeHistory(local, backup.history);
  // Runs the backup still holds in full are counted exactly when this browser never counted
  // them. Totals beyond those runs can only be merged as a lower bound, so the larger side wins.
  const counted = [...backup.history].reverse().reduce(countRun, lifetime);
  const merged: LifetimeTotals = mergeLifetime(counted, fromStored(backup.lifetime));
  writeJson(HISTORY_KEY, history);
  writeLifetime(merged);
  const before = new Set(local.map((run) => run.token));
  return { addedRuns: history.filter((run) => !before.has(run.token)).length };
}
