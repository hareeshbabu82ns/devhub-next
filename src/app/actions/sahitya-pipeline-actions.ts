"use server";

/**
 * Sanskrit Sahitya manager actions (Scraper → Sanskrit Sahitya). Long jobs
 * are driven from the browser one step per request, so the page shows real
 * progress, can stop between steps, and no request holds a whole work:
 *
 *   capture: beginCapture → captureFile (per source file) → finishCapture
 *   build:   beginBuild   → buildBatch…                   → finishBuild
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as pipeline from "@/lib/sahitya/sahitya-pipeline";
import { SAHITYA_PROCESSOR_VERSION } from "@/lib/sahitya/sahitya-processor";
import { WORK_PATTERN } from "@/lib/sahitya/sahitya-sources";
import type { RowKeyState } from "@/lib/sahitya/sahitya-format";

export type SahityaResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

const Work = z.string().regex(WORK_PATTERN, "Invalid work name");
const ObjectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid entity id");
const MAX_BATCH = 2000;

async function requireUser(): Promise<{ isAdmin: boolean } | string> {
  const session = await auth();
  if (!session?.user) return "Please sign in";
  return { isAdmin: session.user.role === "ADMIN" };
}

function fail(error: unknown): { status: "error"; error: string } {
  if (error instanceof z.ZodError) {
    return { status: "error", error: error.issues.map((i) => i.message).join(", ") };
  }
  console.error("Sahitya pipeline:", error);
  return { status: "error", error: error instanceof Error ? error.message : String(error) };
}

async function adminRun<T>(
  fn: () => Promise<T>,
  work?: string,
): Promise<SahityaResponse<T>> {
  try {
    const u = await requireUser();
    if (typeof u === "string") return { status: "error", error: u };
    if (!u.isAdmin) return { status: "error", error: "Only administrators can import texts" };
    return { status: "success", data: await fn() };
  } catch (e) {
    if (work) await pipeline.recordError(work, e instanceof Error ? e.message : String(e));
    return fail(e);
  }
}

export interface SahityaOverview {
  rows: pipeline.WorkRow[];
  isAdmin: boolean;
  processorVersion: number;
}

export async function getSahityaOverview(): Promise<SahityaResponse<SahityaOverview>> {
  try {
    const u = await requireUser();
    if (typeof u === "string") return { status: "error", error: u };
    return {
      status: "success",
      data: {
        rows: await pipeline.overview(),
        isAdmin: u.isAdmin,
        processorVersion: SAHITYA_PROCESSOR_VERSION,
      },
    };
  } catch (e) {
    return fail(e);
  }
}

export async function previewSahityaWork(input: {
  work: string;
  offset?: number;
  limit?: number;
  entityType?: string;
  search?: string;
}) {
  try {
    const u = await requireUser();
    if (typeof u === "string") return { status: "error", error: u } as const;
    const p = z
      .object({
        work: Work,
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(50).optional(),
        entityType: z.string().max(32).optional(),
        search: z.string().max(64).optional(),
      })
      .parse(input);
    const data = await pipeline.preview(p.work, p);
    return { status: "success", data } as const;
  } catch (e) {
    return fail(e);
  }
}

/* capture */

export async function beginSahityaCapture(work: string) {
  return adminRun(() => pipeline.beginCapture(Work.parse(work)), work);
}

export async function captureSahityaFile(input: {
  work: string;
  runId: string;
  fileIndex: number;
  state?: RowKeyState;
}) {
  return adminRun(async () => {
    const p = z
      .object({
        work: Work,
        runId: z.string().uuid(),
        fileIndex: z.number().int().min(0).max(999),
        state: z
          .object({
            lastVerse: z.record(z.string(), z.string()),
            textCount: z.record(z.string(), z.number()),
          })
          .optional(),
      })
      .parse(input);
    return pipeline.captureFile(p.work, p.runId, p.fileIndex, p.state);
  }, input.work);
}

export async function finishSahityaCapture(input: {
  work: string;
  runId: string;
  signature: string;
}) {
  return adminRun(async () => {
    const p = z
      .object({ work: Work, runId: z.string().uuid(), signature: z.string().max(10_000) })
      .parse(input);
    return pipeline.finishCapture(p.work, p.runId, p.signature);
  }, input.work);
}

/* build */

export async function beginSahityaBuild(input: {
  work: string;
  entityType?: string;
  parentId?: string | null;
  bookmarkAll?: boolean;
}) {
  return adminRun(async () => {
    const p = z
      .object({
        work: Work,
        entityType: z.string().regex(/^[A-Z_]{1,32}$/).optional(),
        parentId: ObjectId.nullable().optional(),
        bookmarkAll: z.boolean().optional(),
      })
      .parse(input);
    return pipeline.beginBuild(p.work, p);
  }, input.work);
}

export async function buildSahityaBatch(input: {
  work: string;
  afterSeq: number | null;
  size: number;
  overwriteEdited?: boolean;
}) {
  return adminRun(async () => {
    const p = z
      .object({
        work: Work,
        afterSeq: z.number().int().nullable(),
        size: z.number().int().positive().max(MAX_BATCH),
        overwriteEdited: z.boolean().optional(),
      })
      .parse(input);
    return pipeline.buildBatch(p.work, p.afterSeq, p.size, p);
  }, input.work);
}

export async function finishSahityaBuild(input: { work: string; keepRemoved?: boolean }) {
  return adminRun(async () => {
    const p = z.object({ work: Work, keepRemoved: z.boolean().optional() }).parse(input);
    const r = await pipeline.finishBuild(p.work, p);
    revalidatePath("/entities");
    return r;
  }, input.work);
}

/* removing */

export async function deleteSahityaEntities(work: string) {
  return adminRun(async () => {
    const r = await pipeline.deleteBuiltEntities(Work.parse(work));
    revalidatePath("/entities");
    return r;
  }, work);
}

export async function deleteSahityaOriginals(work: string) {
  return adminRun(() => pipeline.deleteOriginals(Work.parse(work)), work);
}

/** Deletes a work imported by the earlier importer (the whole tree). */
export async function deleteLegacySahityaImport(rootId: string) {
  return adminRun(async () => {
    const id = ObjectId.parse(rootId);
    const legacy = await pipeline.legacyImports();
    if (!legacy.some((l) => l.id === id)) throw new Error("Not an earlier Sanskrit Sahitya import");
    const r = await pipeline.deleteEntityTree(id);
    revalidatePath("/entities");
    return r;
  });
}
