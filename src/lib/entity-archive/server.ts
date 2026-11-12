import { randomBytes } from "crypto";
import { access } from "fs/promises";
import JSZip from "jszip";
import { Prisma } from "@/app/generated/prisma";
import { db } from "@/lib/db";
import { annotationKind } from "@/lib/annotations";
import { isEntityTypeCode } from "@/lib/entity-types";
import { assetPathFromUrl } from "@/lib/assets/shared";
import { resolveAssetPath } from "@/lib/assets/server";
import {
  ArchiveEntity,
  ArchiveError,
  ImportPlan,
  archiveFileName,
  archiveUserIds,
  buildArchive,
  parseArchive,
  planImport,
} from "./format";

// ids per `in` query and rows per insert; keeps every command far below the
// database's message size limit even for long chapters
const READ_BATCH = 500;
const WRITE_BATCH = 200;
// total uncompressed JSON accepted from one upload
const MAX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;

const chunks = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** A MongoDB ObjectId: 4 bytes of time, 5 random, 3 counter. */
let objectIdCounter = randomBytes(3).readUIntBE(0, 3);
const processRandom = randomBytes(5);
export function newObjectId(): string {
  const buffer = Buffer.alloc(12);
  buffer.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
  processRandom.copy(buffer, 4);
  objectIdCounter = (objectIdCounter + 1) % 0x1000000;
  buffer.writeUIntBE(objectIdCounter, 9, 3);
  return buffer.toString("hex");
}

const isObjectId = (id: unknown): id is string =>
  typeof id === "string" && /^[0-9a-f]{24}$/i.test(id);

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export type ExportStage = "reading" | "notes" | "packing";

export interface ExportProgress {
  stage: ExportStage;
  /** entities found so far, or batches / percent done in the stage */
  done: number;
  /** 0 when not known yet */
  total: number;
}

export interface ExportOptions {
  onProgress?: (progress: ExportProgress) => void;
  /** checked between steps; return true to stop with `ExportCancelled` */
  isCancelled?: () => boolean;
}

export class ExportCancelled extends Error {
  constructor() {
    super("Download cancelled");
  }
}

export interface ExportResult {
  data: Buffer;
  filename: string;
  totalEntities: number;
  warnings: string[];
}

/**
 * Everything under an entity as a ZIP: the entities with all their fields,
 * their annotations and their saved playgrounds. Private annotations
 * (thoughts) of other users are only included for admins.
 */
export async function exportEntityArchive(
  entityId: string,
  user: { id: string; isAdmin: boolean },
  options: ExportOptions = {},
): Promise<ExportResult> {
  if (!isObjectId(entityId)) throw new ArchiveError("Entity not found");
  const report = options.onProgress ?? (() => {});
  const checkCancelled = () => {
    if (options.isCancelled?.()) throw new ExportCancelled();
  };
  report({ stage: "reading", done: 0, total: 0 });

  // breadth-first over `children`; the visited set also stops cycles
  const entities = new Map<string, ArchiveEntity>();
  const requested = new Set<string>([entityId]);
  let frontier = [entityId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const ids of chunks(frontier, READ_BATCH)) {
      checkCancelled();
      const rows = await db.entity.findMany({ where: { id: { in: ids } } });
      for (const row of rows) {
        entities.set(row.id, {
          id: row.id,
          type: row.type,
          order: row.order,
          text: row.text.map((t) => ({ language: t.language, value: t.value })),
          meaning: row.meaning.map((t) => ({
            language: t.language,
            value: t.value,
          })),
          attributes: row.attributes.map((a) => ({
            key: a.key,
            value: a.value,
          })),
          imageThumbnail: row.imageThumbnail ?? "",
          audio: row.audio ?? "",
          notes: row.notes ?? "",
          bookmarked: row.bookmarked,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          childrenIds: row.children,
          annotations: [],
          playgrounds: [],
        });
        for (const childId of row.children) {
          if (!requested.has(childId)) {
            requested.add(childId);
            next.push(childId);
          }
        }
      }
      // `requested` is every entity discovered so far: a lower bound that
      // grows level by level, so the fraction rises but can step back
      report({ stage: "reading", done: entities.size, total: requested.size });
    }
    frontier = next;
  }
  if (!entities.has(entityId)) throw new ArchiveError("Entity not found");

  const noteBatches = chunks([...entities.keys()], READ_BATCH);
  report({ stage: "notes", done: 0, total: noteBatches.length });
  for (const [batchIndex, ids] of noteBatches.entries()) {
    checkCancelled();
    const [annotations, playgrounds] = await Promise.all([
      db.entityAnnotation.findMany({
        where: { entityId: { in: ids } },
        orderBy: [{ kind: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      }),
      db.entityPlayground.findMany({
        where: { entityId: { in: ids } },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    for (const a of annotations) {
      const isPrivate = annotationKind(a.kind)?.private;
      if (isPrivate && !user.isAdmin && a.userId !== user.id) continue;
      entities.get(a.entityId)?.annotations.push({
        kind: a.kind,
        language: a.language,
        title: a.title ?? "",
        text: a.text,
        order: a.order,
        userId: a.userId,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      });
    }
    for (const p of playgrounds) {
      entities.get(p.entityId)?.playgrounds.push({
        title: p.title,
        nodes: p.nodes,
        edges: p.edges,
        userId: p.userId,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      });
    }
    report({ stage: "notes", done: batchIndex + 1, total: noteBatches.length });
  }

  checkCancelled();
  const built = buildArchive(entityId, entities);

  const zip = new JSZip();
  const date = new Date();
  for (const [name, content] of built.files) zip.file(name, content, { date });
  report({ stage: "packing", done: 0, total: 100 });
  let lastPercent = -1;
  const data = await zip.generateAsync(
    {
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
      platform: "UNIX",
    },
    (meta) => {
      const percent = Math.floor(meta.percent);
      if (percent !== lastPercent) {
        lastPercent = percent;
        report({ stage: "packing", done: percent, total: 100 });
      }
    },
  );
  checkCancelled();

  return {
    data,
    filename: archiveFileName(entities.get(entityId)!, date),
    totalEntities: built.structure.stats.totalEntities,
    warnings: built.warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

export interface ImportResult {
  entityId: string;
  totalEntities: number;
  totalAnnotations: number;
  totalPlaygrounds: number;
  warnings: string[];
}

const isZip = (data: Buffer) =>
  data.length > 3 && data[0] === 0x50 && data[1] === 0x4b;

async function readUploadFiles(data: Buffer, fileName: string) {
  if (!isZip(data)) {
    // a single JSON tree (the older download format)
    return [{ name: fileName || "upload.json", content: data.toString("utf8") }];
  }
  let zip: JSZip;
  try {
    // CRC check: a corrupted archive fails here instead of importing garbage
    zip = await JSZip.loadAsync(data, { checkCRC32: true });
  } catch (error) {
    throw new ArchiveError(
      `The ZIP file is damaged or not a ZIP: ${error instanceof Error ? error.message : error}`,
    );
  }
  const files: { name: string; content: string }[] = [];
  let total = 0;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.toLowerCase().endsWith(".json")) continue;
    if (entry.name.startsWith("__MACOSX/")) continue;
    const content = await entry.async("text");
    total += content.length;
    if (total > MAX_UNCOMPRESSED_BYTES) {
      throw new ArchiveError("The archive is too large to import");
    }
    files.push({ name: entry.name, content });
  }
  return files;
}

/** Asset files the imported entities point at but this server does not have. */
async function countMissingAssets(plan: ImportPlan): Promise<number> {
  const paths = new Set<string>();
  for (const entity of plan.entities) {
    for (const url of [entity.imageThumbnail, entity.audio]) {
      const path = assetPathFromUrl(url);
      if (path) paths.add(path);
    }
  }
  let missing = 0;
  for (const path of paths) {
    try {
      await access(resolveAssetPath(path));
    } catch {
      missing++;
    }
  }
  return missing;
}

// Prisma rejects `undefined` inside Json values
const toJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? []));

async function removeImported(entityIds: string[]) {
  for (const ids of chunks(entityIds, READ_BATCH)) {
    await db.entityPlayground.deleteMany({ where: { entityId: { in: ids } } });
    await db.entityAnnotation.deleteMany({ where: { entityId: { in: ids } } });
    await db.entity.deleteMany({ where: { id: { in: ids } } });
  }
}

/**
 * Imports an uploaded archive (current or older ZIP layout, or a legacy JSON
 * tree) as new entities, optionally under `parentId`.
 *
 * The upload is read and validated completely before the first write, every
 * row is inserted under an id chosen up front, and the new tree is linked to
 * its parent only as the very last step. If anything fails on the way, the
 * rows inserted so far are removed again — an import either arrives whole or
 * leaves nothing behind.
 */
export async function importEntityArchive(input: {
  data: Buffer;
  fileName: string;
  parentId?: string | null;
  userId: string;
}): Promise<ImportResult> {
  const parentId = input.parentId || null;

  const archive = parseArchive(await readUploadFiles(input.data, input.fileName));
  const warnings = [...archive.warnings];

  let rootOrder: number | undefined;
  if (parentId) {
    const parent = isObjectId(parentId)
      ? await db.entity.findUnique({
          where: { id: parentId },
          select: { id: true },
        })
      : null;
    if (!parent) throw new ArchiveError("The entity to import under was not found");
    const last = await db.entity.findFirst({
      where: { parents: { has: parentId } },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    rootOrder = last ? last.order + 1 : 0;
  }

  const authorIds = archiveUserIds(archive).filter(isObjectId);
  const knownUsers = authorIds.length
    ? await db.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true },
      })
    : [];

  const plan = planImport(archive, {
    newId: newObjectId,
    importerId: input.userId,
    knownUserIds: knownUsers.map((u) => u.id),
    parentId,
    rootOrder,
  });
  warnings.push(...plan.warnings);

  const unknownTypes = new Set(
    plan.entities.map((e) => e.type).filter((type) => !isEntityTypeCode(type)),
  );
  if (unknownTypes.size > 0) {
    warnings.push(
      `Entity type(s) this app does not define were kept as they are: ${[...unknownTypes].join(", ")}`,
    );
  }

  const entityIds = plan.entities.map((e) => e.id);
  try {
    let inserted = 0;
    for (const batch of chunks(plan.entities, WRITE_BATCH)) {
      const res = await db.entity.createMany({ data: batch });
      inserted += res.count;
    }
    if (inserted !== plan.entities.length) {
      throw new Error(
        `Only ${inserted} of ${plan.entities.length} entities were stored`,
      );
    }
    for (const batch of chunks(plan.annotations, WRITE_BATCH)) {
      await db.entityAnnotation.createMany({ data: batch });
    }
    for (const batch of chunks(plan.playgrounds, WRITE_BATCH)) {
      await db.entityPlayground.createMany({
        data: batch.map((p) => ({
          ...p,
          nodes: toJson(p.nodes),
          edges: toJson(p.edges),
        })),
      });
    }
    // last: until here nothing in the existing library points at the import
    if (parentId) {
      await db.entity.update({
        where: { id: parentId },
        data: { children: { push: plan.rootId } },
      });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    try {
      await removeImported(entityIds);
    } catch (cleanupError) {
      console.error("Import cleanup failed:", cleanupError);
      throw new Error(
        `Import failed and could not be undone completely; partially imported content starts at entity ${plan.rootId}. Cause: ${reason}`,
      );
    }
    throw new Error(`Import failed, nothing was imported. Cause: ${reason}`);
  }

  const missingAssets = await countMissingAssets(plan).catch(() => 0);
  if (missingAssets > 0) {
    warnings.push(
      `${missingAssets} image or audio file(s) the content refers to are not on this server; copy them into the assets folder under the same paths`,
    );
  }

  return {
    entityId: plan.rootId,
    totalEntities: plan.entities.length,
    totalAnnotations: plan.annotations.length,
    totalPlaygrounds: plan.playgrounds.length,
    warnings,
  };
}
