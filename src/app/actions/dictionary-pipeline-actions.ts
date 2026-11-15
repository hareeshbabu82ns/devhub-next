"use server";

/**
 * Dictionary manager actions. Long jobs are driven from the browser one
 * batch per request, so the page shows real progress, can cancel or resume,
 * and no request has to hold a whole dictionary in memory.
 *
 *   capture: beginCapture → captureBatch… → finishCapture   (SQLite → originals)
 *   adopt:   beginAdopt   → adoptBatch…   → finishCapture   (old entries → originals)
 *   build:   beginBuild   → buildBatch…   → finishBuild     (originals → entries)
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { DictionaryName, LEXICON_ALL_DICT } from "@/lib/dictionary/dictionary-constants";
import { DICTIONARY_PROCESSOR_VERSION } from "@/lib/dictionary/dictionary-processor";
import * as pipeline from "@/lib/dictionary/dictionary-pipeline";
import { sourceSpec } from "@/lib/dictionary/dictionary-sources";

export type PipelineResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

const DictEnum = z.enum(LEXICON_ALL_DICT as [DictionaryName, ...DictionaryName[]]);
const Origin = z.string().regex(pipeline.ORIGIN_PATTERN, "Invalid dictionary code");
const MAX_BATCH = 5000;

async function requireUser(): Promise<{ isAdmin: boolean } | string> {
  const session = await auth();
  if (!session?.user) return "Please sign in";
  return { isAdmin: session.user.role === "ADMIN" };
}

async function requireAdmin(): Promise<string | null> {
  const u = await requireUser();
  if (typeof u === "string") return u;
  return u.isAdmin ? null : "Only administrators can change dictionaries";
}

function fail(error: unknown): { status: "error"; error: string } {
  if (error instanceof z.ZodError) {
    return { status: "error", error: error.issues.map((i) => i.message).join(", ") };
  }
  console.error("Dictionary pipeline:", error);
  return { status: "error", error: error instanceof Error ? error.message : String(error) };
}

async function adminRun<T>(fn: () => Promise<T>): Promise<PipelineResponse<T>> {
  try {
    const denied = await requireAdmin();
    if (denied) return { status: "error", error: denied };
    return { status: "success", data: await fn() };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface PipelineOverview {
  rows: pipeline.PipelineRow[];
  isAdmin: boolean;
  processorVersion: number;
  indexes: pipeline.IndexStatus;
}

export async function getPipelineOverview(): Promise<PipelineResponse<PipelineOverview>> {
  try {
    const u = await requireUser();
    if (typeof u === "string") return { status: "error", error: u };
    const [rows, indexes] = await Promise.all([
      pipeline.pipelineOverview(),
      pipeline.indexStatus(),
    ]);
    return {
      status: "success",
      data: { rows, isAdmin: u.isAdmin, processorVersion: DICTIONARY_PROCESSOR_VERSION, indexes },
    };
  } catch (e) {
    return fail(e);
  }
}

export async function fixSearchIndexes(): Promise<PipelineResponse<pipeline.IndexStatus>> {
  return adminRun(() => pipeline.ensureIndexes());
}

// ---------------------------------------------------------------------------
// Capture originals
// ---------------------------------------------------------------------------

export async function beginCapture(input: {
  dictionary: DictionaryName;
  limitRows?: number;
}): Promise<PipelineResponse<pipeline.CaptureBegin>> {
  return adminRun(async () => {
    const { dictionary, limitRows } = z
      .object({ dictionary: DictEnum, limitRows: z.number().int().positive().optional() })
      .parse(input);
    return pipeline.beginCapture(dictionary, { limitRows });
  });
}

export async function captureBatch(input: {
  dictionary: DictionaryName;
  runId: string;
  offset: number;
  size: number;
  signature: string;
}): Promise<PipelineResponse<pipeline.CaptureBatchResult>> {
  return adminRun(async () => {
    const p = z
      .object({
        dictionary: DictEnum,
        runId: z.string().uuid(),
        offset: z.number().int().min(0),
        size: z.number().int().positive().max(MAX_BATCH),
        signature: z.string().min(1),
      })
      .parse(input);
    return pipeline.captureBatch(p.dictionary, p.runId, p.offset, p.size, p.signature);
  });
}

export async function finishCapture(input: {
  origin: string;
  runId: string;
  complete: boolean;
  signature?: string | null;
  fromEntries?: boolean;
}): Promise<PipelineResponse<{ removed: number; rawCount: number }>> {
  return adminRun(async () => {
    const p = z
      .object({
        origin: Origin,
        runId: z.string().uuid(),
        complete: z.boolean(),
        signature: z.string().nullable().optional(),
        fromEntries: z.boolean().optional(),
      })
      .parse(input);
    const dict = pipeline.dictionaryForOrigin(p.origin);
    return pipeline.finishCapture(p.origin, p.runId, {
      complete: p.complete,
      signature: p.fromEntries ? null : p.signature,
      sourceFile: p.fromEntries
        ? pipeline.FROM_ENTRIES
        : dict
          ? sourceSpec(dict).file
          : undefined,
    });
  });
}

export async function beginAdopt(input: {
  origin: string;
}): Promise<PipelineResponse<{ runId: string; total: number }>> {
  return adminRun(async () => pipeline.beginAdopt(Origin.parse(input.origin)));
}

export async function adoptBatch(input: {
  origin: string;
  runId: string;
  after: number;
  size: number;
}): Promise<PipelineResponse<pipeline.CaptureBatchResult & { skipped: number; last: number }>> {
  return adminRun(async () => {
    const p = z
      .object({
        origin: Origin,
        runId: z.string().uuid(),
        after: z.number().int(),
        size: z.number().int().positive().max(MAX_BATCH),
      })
      .parse(input);
    return pipeline.adoptBatch(p.origin, p.runId, p.after, p.size);
  });
}

// ---------------------------------------------------------------------------
// Build search entries
// ---------------------------------------------------------------------------

export async function beginBuild(input: {
  origin: string;
  resume?: boolean;
}): Promise<PipelineResponse<pipeline.BuildBegin>> {
  return adminRun(async () => {
    const p = z.object({ origin: Origin, resume: z.boolean().optional() }).parse(input);
    return pipeline.beginBuild(p.origin, { resume: p.resume });
  });
}

export async function buildBatch(input: {
  origin: string;
  cursor: pipeline.BuildCursor | null;
  nextIndex: number;
  size: number;
}): Promise<PipelineResponse<pipeline.BuildBatchResult>> {
  return adminRun(async () => {
    const p = z
      .object({
        origin: Origin,
        cursor: z.object({ seq: z.number().int(), key: z.string().min(1).max(100) }).nullable(),
        nextIndex: z.number().int().min(1),
        size: z.number().int().positive().max(MAX_BATCH),
      })
      .parse(input);
    return pipeline.buildBatch(p.origin, p.cursor, p.nextIndex, p.size);
  });
}

export async function finishBuild(input: {
  origin: string;
  keepEdits?: boolean;
}): Promise<PipelineResponse<pipeline.BuildFinish>> {
  return adminRun(async () => {
    const p = z.object({ origin: Origin, keepEdits: z.boolean().optional() }).parse(input);
    try {
      const r = await pipeline.finishBuild(p.origin, { keepEdits: p.keepEdits });
      revalidatePath("/dictionary");
      return r;
    } catch (e) {
      await pipeline.recordError(p.origin, e instanceof Error ? e.message : String(e));
      throw e;
    }
  });
}

export async function discardStaging(input: {
  origin: string;
}): Promise<PipelineResponse<{ removed: number }>> {
  return adminRun(async () => ({ removed: await pipeline.discardStaging(Origin.parse(input.origin)) }));
}

export async function recoverSwap(input: {
  origin: string;
}): Promise<PipelineResponse<{ restored: number }>> {
  return adminRun(async () => ({
    restored: await pipeline.recoverInterruptedSwap(Origin.parse(input.origin)),
  }));
}

export async function rebuildOneEntry(input: {
  id: string;
}): Promise<PipelineResponse<{ updated: boolean }>> {
  return adminRun(async () => {
    const id = z.string().regex(/^[0-9a-f]{24}$/i).parse(input.id);
    const updated = await pipeline.rebuildEntry(id);
    revalidatePath("/dictionary");
    return { updated };
  });
}

// ---------------------------------------------------------------------------
// Removing
// ---------------------------------------------------------------------------

export async function deleteDictionaryData(input: {
  origin: string;
  what: "entries" | "originals" | "both";
}): Promise<PipelineResponse<{ entries: number; originals: number }>> {
  return adminRun(async () => {
    const p = z
      .object({ origin: Origin, what: z.enum(["entries", "originals", "both"]) })
      .parse(input);
    const entries = p.what !== "originals" ? await pipeline.deleteEntries(p.origin) : 0;
    const originals = p.what !== "entries" ? await pipeline.deleteOriginals(p.origin) : 0;
    revalidatePath("/dictionary");
    return { entries, originals };
  });
}

// ---------------------------------------------------------------------------
// Inspecting originals (any signed-in user may look)
// ---------------------------------------------------------------------------

export async function searchOriginals(input: {
  origin: string;
  query: string;
  field: pipeline.RawSearchField;
  afterSeq?: number;
  limit?: number;
}): Promise<PipelineResponse<{ items: pipeline.RawSearchItem[]; hasMore: boolean }>> {
  try {
    const u = await requireUser();
    if (typeof u === "string") return { status: "error", error: u };
    const p = z
      .object({
        origin: Origin,
        query: z.string().max(200),
        field: z.enum(["headword", "key", "text"]),
        afterSeq: z.number().int().min(0).optional(),
        limit: z.number().int().positive().max(200).optional(),
      })
      .parse(input);
    return { status: "success", data: await pipeline.searchOriginals(p.origin, p) };
  } catch (e) {
    return fail(e);
  }
}

export async function getOriginalDetail(input: {
  origin: string;
  key: string;
}): Promise<PipelineResponse<pipeline.OriginalDetail | null>> {
  try {
    const u = await requireUser();
    if (typeof u === "string") return { status: "error", error: u };
    const p = z.object({ origin: Origin, key: z.string().min(1).max(100) }).parse(input);
    return { status: "success", data: await pipeline.originalDetail(p.origin, p.key) };
  } catch (e) {
    return fail(e);
  }
}

export async function getCompanionTables(input: {
  origin: string;
}): Promise<PipelineResponse<Awaited<ReturnType<typeof pipeline.companionTables>>>> {
  try {
    const u = await requireUser();
    if (typeof u === "string") return { status: "error", error: u };
    return { status: "success", data: await pipeline.companionTables(Origin.parse(input.origin)) };
  } catch (e) {
    return fail(e);
  }
}
