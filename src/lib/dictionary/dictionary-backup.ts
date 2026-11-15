/**
 * Search-entry backups (JSON lines): the entries exactly as they are in the
 * database, hand edits included. Server only. For the originals backup see
 * ORIGINALS_TYPE in ./dictionary-pipeline.
 */

import { Prisma } from "@/app/generated/prisma";
import { db } from "@/lib/db";
import { ORIGIN_PATTERN, isInternalOrigin, stagingOrigin } from "./dictionary-pipeline";
import { buildSearchText, generatePhoneticString } from "./word-utils";

export const BACKUP_TYPE = "devhub-dictionary-backup";
/** 1: original format; 2: adds sourceKey, processorVersion, editedAt */
export const BACKUP_VERSION = 2;

export interface BackupHeader {
  type: typeof BACKUP_TYPE;
  version: number;
  exportedAt: string;
  origins: string[];
  includesSource: boolean;
}

export type WriteMode = "replace" | "merge";

export interface EntryInput {
  origin: string;
  wordIndex: number;
  wordLnum?: number | null;
  word: { language: string; value: string }[];
  description: { language: string; value: string }[];
  attributes?: { key: string; value: string }[];
  phonetic?: string;
  sourceData?: unknown;
  sourceKey?: string | null;
  processorVersion?: number | null;
  editedAt?: string | null;
}

/** Validates one backup line; returns an error message or null */
export function validateBackupEntry(e: any): string | null {
  if (!e || typeof e !== "object") return "not an object";
  if (typeof e.origin !== "string" || !ORIGIN_PATTERN.test(e.origin)) return "bad origin";
  if (isInternalOrigin(e.origin)) return "internal origin";
  if (!Number.isInteger(e.wordIndex)) return "bad wordIndex";
  const isLV = (a: any) =>
    Array.isArray(a) &&
    a.every((x) => x && typeof x.language === "string" && typeof x.value === "string");
  if (!isLV(e.word) || e.word.length === 0) return "bad word";
  if (!isLV(e.description)) return "bad description";
  if (
    e.attributes !== undefined &&
    !(
      Array.isArray(e.attributes) &&
      e.attributes.every((x: any) => x && typeof x.key === "string" && typeof x.value === "string")
    )
  ) {
    return "bad attributes";
  }
  if (e.sourceKey !== undefined && e.sourceKey !== null && typeof e.sourceKey !== "string") {
    return "bad sourceKey";
  }
  return null;
}

/**
 * Writes backup entries for one origin. "replace" writes to the staging
 * origin (swap in with finishBuild); "merge" writes straight to the live
 * origin, skipping wordIndexes that already exist.
 */
export async function writeBackupEntries(
  origin: string,
  entries: EntryInput[],
  mode: WriteMode,
): Promise<{ written: number; skipped: number }> {
  if (entries.length === 0) return { written: 0, skipped: 0 };
  let toWrite = entries;
  const target = mode === "replace" ? stagingOrigin(origin) : origin;
  if (mode === "merge") {
    const existing = await db.dictionaryWord.findMany({
      where: { origin, wordIndex: { in: entries.map((e) => e.wordIndex) } },
      select: { wordIndex: true },
    });
    const have = new Set(existing.map((e) => e.wordIndex));
    toWrite = entries.filter((e) => !have.has(e.wordIndex));
  }
  const now = new Date();
  if (toWrite.length > 0) {
    await db.dictionaryWord.createMany({
      data: toWrite.map((e) => ({
        origin: target,
        wordIndex: e.wordIndex,
        wordLnum: e.wordLnum ?? 0,
        word: e.word,
        description: e.description,
        attributes: e.attributes ?? [],
        phonetic: e.phonetic ?? generatePhoneticString(e.word as any, e.description as any),
        searchText: buildSearchText(e.word as any, e.description as any),
        sourceData: (e.sourceData ?? undefined) as Prisma.InputJsonValue | undefined,
        sourceKey: e.sourceKey ?? undefined,
        processorVersion: e.processorVersion ?? undefined,
        editedAt: e.editedAt ? new Date(e.editedAt) : undefined,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }
  return { written: toWrite.length, skipped: entries.length - toWrite.length };
}
