"use server";

/**
 * Dictionary import (from SQLite) driven in batches by the browser, so the
 * page shows real progress and can cancel, and no single request has to
 * hold a whole dictionary in memory.
 *
 *   begin → batch, batch, … → finish        (or cancel at any point)
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DictionaryName,
  LEXICON_ALL_DICT,
} from "@/lib/dictionary/dictionary-constants";
import {
  clearStaging,
  isStagingOrigin,
  originFor,
  originStats,
  promoteStaging,
  readProcessedBatch,
  readSqliteInfo,
  stagingOrigin,
  writeEntries,
} from "@/lib/dictionary/dictionary-transfer";

export type TransferResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

const DictEnum = z.enum(LEXICON_ALL_DICT as [DictionaryName, ...DictionaryName[]]);
const ModeEnum = z.enum(["replace", "merge"]);

const MAX_BATCH = 5000;

async function requireAdmin(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return "Please sign in";
  if (session.user.role !== "ADMIN") return "Only administrators can change dictionaries";
  return null;
}

function fail(error: unknown): { status: "error"; error: string } {
  if (error instanceof z.ZodError) {
    return { status: "error", error: error.issues.map((i) => i.message).join(", ") };
  }
  console.error("Dictionary transfer failed:", error);
  return { status: "error", error: error instanceof Error ? error.message : String(error) };
}

export interface DictionaryOverviewRow {
  dictionary: DictionaryName | null;
  origin: string;
  wordCount: number;
  lastImported: string | null;
  /** Entries waiting in an unfinished import */
  stagedCount: number;
  sqlite: {
    exists: boolean;
    size?: number;
    modifiedAt?: string;
    rows?: number;
    error?: string;
  };
}

export interface DictionaryOverview {
  rows: DictionaryOverviewRow[];
  isAdmin: boolean;
}

export async function getDictionaryOverview(): Promise<TransferResponse<DictionaryOverview>> {
  try {
    const session = await auth();
    if (!session?.user) return { status: "error", error: "Please sign in" };
    const stats = await originStats();
    const rows: DictionaryOverviewRow[] = LEXICON_ALL_DICT.map((dict) => {
      const origin = originFor(dict);
      const live = stats.get(origin);
      const info = readSqliteInfo(dict);
      return {
        dictionary: dict,
        origin,
        wordCount: live?.count ?? 0,
        lastImported: live?.lastImported?.toISOString() ?? null,
        stagedCount: stats.get(stagingOrigin(origin))?.count ?? 0,
        sqlite: {
          exists: info.exists,
          size: info.size,
          modifiedAt: info.modifiedAt?.toISOString(),
          rows: info.rows,
          error: info.error,
        },
      };
    });
    // Origins in the database that no SQLite source maps to (e.g. restored)
    const known = new Set(rows.map((r) => r.origin));
    for (const [origin, s] of stats) {
      if (known.has(origin) || isStagingOrigin(origin)) continue;
      rows.push({
        dictionary: null,
        origin,
        wordCount: s.count,
        lastImported: s.lastImported?.toISOString() ?? null,
        stagedCount: stats.get(stagingOrigin(origin))?.count ?? 0,
        sqlite: { exists: false },
      });
    }
    return {
      status: "success",
      data: { rows, isAdmin: session.user.role === "ADMIN" },
    };
  } catch (e) {
    return fail(e);
  }
}

const BeginSchema = z.object({
  dictionary: DictEnum,
  mode: ModeEnum,
  limitRows: z.number().int().positive().optional(),
});

/** Prepares an import; returns how many rows will be read */
export async function beginDictionaryImport(
  input: z.infer<typeof BeginSchema>,
): Promise<TransferResponse<{ total: number; sourceRows: number }>> {
  try {
    const denied = await requireAdmin();
    if (denied) return { status: "error", error: denied };
    const { dictionary, limitRows } = BeginSchema.parse(input);
    const info = readSqliteInfo(dictionary);
    if (!info.exists) return { status: "error", error: "Upload the SQLite file first" };
    if (info.error || info.rows === undefined) {
      return { status: "error", error: info.error ?? "Cannot read the SQLite file" };
    }
    // Start from a clean staging area (an earlier import may have stopped)
    await clearStaging(originFor(dictionary));
    const total = limitRows ? Math.min(limitRows, info.rows) : info.rows;
    return { status: "success", data: { total, sourceRows: info.rows } };
  } catch (e) {
    return fail(e);
  }
}

const BatchSchema = z.object({
  dictionary: DictEnum,
  mode: ModeEnum,
  offset: z.number().int().min(0),
  size: z.number().int().positive().max(MAX_BATCH),
  validate: z.boolean().optional(),
});

export interface BatchResult {
  rowsRead: number;
  written: number;
  skipped: number;
  invalid: number;
  errors: string[];
}

export async function importDictionaryBatch(
  input: z.infer<typeof BatchSchema>,
): Promise<TransferResponse<BatchResult>> {
  try {
    const denied = await requireAdmin();
    if (denied) return { status: "error", error: denied };
    const { dictionary, mode, offset, size, validate } = BatchSchema.parse(input);
    const batch = readProcessedBatch(dictionary, offset, size, { validate });
    const { written, skipped } = await writeEntries(
      originFor(dictionary),
      batch.words,
      mode,
    );
    return {
      status: "success",
      data: {
        rowsRead: batch.rowsRead,
        written,
        skipped,
        invalid: batch.invalid,
        errors: batch.errors,
      },
    };
  } catch (e) {
    return fail(e);
  }
}

const FinishSchema = z.object({ dictionary: DictEnum, mode: ModeEnum });

/** Replace: swap the staged entries in. Merge: nothing left to do. */
export async function finishDictionaryImport(
  input: z.infer<typeof FinishSchema>,
): Promise<TransferResponse<{ wordCount: number }>> {
  try {
    const denied = await requireAdmin();
    if (denied) return { status: "error", error: denied };
    const { dictionary, mode } = FinishSchema.parse(input);
    const origin = originFor(dictionary);
    if (mode === "replace") await promoteStaging(origin);
    const wordCount = await db.dictionaryWord.count({ where: { origin } });
    revalidatePath("/dictionary");
    return { status: "success", data: { wordCount } };
  } catch (e) {
    return fail(e);
  }
}

const OriginSchema = z.object({ origin: z.string().regex(/^[A-Z0-9_]{1,32}$/) });

/** Throws away a stopped or cancelled import's staged entries */
export async function cancelDictionaryImport(
  input: z.infer<typeof OriginSchema>,
): Promise<TransferResponse<{ removed: number }>> {
  try {
    const denied = await requireAdmin();
    if (denied) return { status: "error", error: denied };
    const { origin } = OriginSchema.parse(input);
    return { status: "success", data: { removed: await clearStaging(origin) } };
  } catch (e) {
    return fail(e);
  }
}

/** Deletes every entry of a dictionary (any origin, including restored ones) */
export async function deleteDictionaryOrigin(
  input: z.infer<typeof OriginSchema>,
): Promise<TransferResponse<{ deleted: number }>> {
  try {
    const denied = await requireAdmin();
    if (denied) return { status: "error", error: denied };
    const { origin } = OriginSchema.parse(input);
    const r = await db.dictionaryWord.deleteMany({ where: { origin } });
    await clearStaging(origin);
    revalidatePath("/dictionary");
    return { status: "success", data: { deleted: r.count } };
  } catch (e) {
    return fail(e);
  }
}
