/**
 * Sanskrit Sahitya pipeline. Server only.
 *
 *   data/sanskritsahitya-com-data ──capture──▶ SahityaRawRecords ──build──▶ Entities
 *   (JSON, one folder per work)               originals, verbatim         + annotations
 *
 * Capture stores every book, chapter and data row of a work exactly as it is
 * in the source, keyed by a stable key (see sahitya-format.ts). Capturing
 * again compares hashes and reports what was added, changed and removed.
 *
 * Build turns the originals into entities with the current processor. It
 * never needs the source files. Entities are updated in place — the original
 * remembers the entity it built — so bookmarks, notes, audio, playgrounds and
 * your own annotations survive a rebuild. An entity edited by hand since it
 * was built is left as it is (unless overwriting is asked for). Annotations
 * the build wrote (source "sanskritsahitya:…") are replaced; edited ones are
 * not, because editing clears their source.
 */

import { randomBytes, randomUUID } from "crypto";
import { Prisma } from "@/app/generated/prisma";
import { db } from "@/lib/db";
import {
  RawRecordInput,
  SahityaHeader,
  countFields,
  headerRecords,
  newRowKeyState,
  rowRecords,
  type RowKeyState,
} from "./sahitya-format";
import {
  BuildOptions,
  BuiltEntity,
  SAHITYA_PROCESSOR_VERSION,
  buildRecord,
  buildRoot,
  entityHash,
  planStructure,
  suggestRootType,
  workContext,
} from "./sahitya-processor";
import {
  SAHITYA_SOURCE,
  STRUCTURAL_SECTION_KEYS,
  isHandledField,
} from "./sahitya-fields";
import {
  WorkFiles,
  discoverWorks,
  filesSignature,
  findWork,
  gitRevision,
  readWorkFile,
} from "./sahitya-sources";

const RAW = "SahityaRawRecords";
const ENTITIES = "Entities";

const chunks = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const oid = (id: string) => ({ $oid: id });

/** A MongoDB ObjectId: 4 bytes of time, 5 random, 3 counter. */
let objectIdCounter = randomBytes(3).readUIntBE(0, 3);
const processRandom = randomBytes(5);
function newObjectId(): string {
  const buffer = Buffer.alloc(12);
  buffer.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
  processRandom.copy(buffer, 4);
  objectIdCounter = (objectIdCounter + 1) % 0x1000000;
  buffer.writeUIntBE(objectIdCounter, 9, 3);
  return buffer.toString("hex");
}

async function command(cmd: Record<string, unknown>): Promise<Record<string, any>> {
  const r = (await db.$runCommandRaw(cmd as Prisma.InputJsonObject)) as Record<string, any>;
  const errs = r?.writeErrors as Array<{ errmsg?: string }> | undefined;
  if (errs?.length) throw new Error(errs[0]?.errmsg ?? "Database write failed");
  return r;
}

async function requireSource(work: string) {
  const source = await db.sahityaSource.findUnique({ where: { work } });
  if (!source) throw new Error(`${work} has not been captured yet`);
  return source;
}

const headerOf = (source: { header: unknown; title: string }): SahityaHeader =>
  ((source.header as SahityaHeader | null) ?? { title: source.title }) as SahityaHeader;

/* ------------------------------------------------------------------ */
/* Capture                                                             */
/* ------------------------------------------------------------------ */

export interface RawWriteResult {
  added: number;
  changed: number;
  unchanged: number;
}

/**
 * Upserts originals. A key already stored by this same run under another
 * position (a verse number repeated in a later shard) gets "#2", "#3"…
 */
export async function writeRawRecords(
  work: string,
  records: RawRecordInput[],
  runId: string,
): Promise<RawWriteResult> {
  const result: RawWriteResult = { added: 0, changed: 0, unchanged: 0 };
  for (const part of chunks(records, 1000)) {
    const existing = await db.sahityaRawRecord.findMany({
      where: { work, key: { in: part.map((r) => r.key) } },
      select: { key: true, hash: true, runId: true, seq: true },
    });
    const have = new Map(existing.map((e) => [e.key, e]));
    for (const r of part) {
      const prev = have.get(r.key);
      if (prev && prev.runId === runId && prev.seq !== r.seq) {
        // repeated key across shards: find a free suffix
        const base = r.key;
        for (let d = 2; ; d++) {
          const candidate = `${base}#${d}`;
          const taken = await db.sahityaRawRecord.findUnique({
            where: { work_key: { work, key: candidate } },
            select: { runId: true, seq: true, hash: true, key: true },
          });
          if (!taken || taken.runId !== runId || taken.seq === r.seq) {
            r.key = candidate;
            if (taken) have.set(candidate, taken);
            else have.delete(candidate);
            break;
          }
        }
      }
    }
    const updates = part.map((r) => {
      const prev = have.get(r.key);
      const common = { seq: r.seq, ref: r.ref, file: r.file, runId, removed: false };
      if (prev && prev.hash === r.hash) {
        result.unchanged++;
        return { q: { work, key: r.key }, u: { $set: common } };
      }
      if (prev) result.changed++;
      else result.added++;
      return {
        q: { work, key: r.key },
        u: {
          $set: { ...common, work, key: r.key, kind: r.kind, row: r.row, hash: r.hash },
          $currentDate: { importedAt: true },
        },
        upsert: true,
      };
    });
    await command({ update: RAW, updates, ordered: false });
  }
  return result;
}

export interface CaptureBegin {
  runId: string;
  work: string;
  files: string[];
  signature: string;
}

export async function beginCapture(work: string): Promise<CaptureBegin> {
  const found = await findWork(work);
  return {
    runId: randomUUID(),
    work,
    files: found.files,
    signature: await filesSignature(found.files),
  };
}

export interface CaptureFileResult extends RawWriteResult {
  file: string;
  rows: number;
  /** pass to the next file of the same capture */
  state: RowKeyState;
}

/** Captures one file of a work. Call for every file in order. */
export async function captureFile(
  work: string,
  runId: string,
  fileIndex: number,
  state: RowKeyState = newRowKeyState(),
): Promise<CaptureFileResult> {
  const found = await findWork(work);
  const file = found.files[fileIndex];
  if (!file) throw new Error(`${work} has no file #${fileIndex + 1}`);
  const { header, rows } = await readWorkFile(file);
  const records: RawRecordInput[] = [];
  let stats: Record<string, number>;

  if (fileIndex === 0) {
    records.push(...headerRecords(header, file));
    stats = countFields(rows);
    for (const [list, prefix] of [["books", "book."], ["chapters", "chapter."]] as const) {
      const counts = countFields(header[list] ?? []);
      for (const [k, v] of Object.entries(counts)) stats[prefix + k] = v;
    }
    await db.sahityaSource.upsert({
      where: { work },
      create: {
        work,
        title: header.title,
        files: found.files,
        header: header as Prisma.InputJsonValue,
        fieldStats: stats,
      },
      update: {
        title: header.title,
        files: found.files,
        header: header as Prisma.InputJsonValue,
        fieldStats: stats,
        lastError: null,
      },
    });
  } else {
    const source = await requireSource(work);
    stats = { ...((source.fieldStats as Record<string, number>) ?? {}) };
    countFields(rows, stats);
    // later shards may add header keys of their own (they normally carry
    // only the title); keep anything new
    const prevHeader = headerOf(source);
    const extra = Object.fromEntries(
      Object.entries(header).filter(([k]) => !(k in prevHeader)),
    );
    await db.sahityaSource.update({
      where: { work },
      data: {
        fieldStats: stats,
        ...(Object.keys(extra).length
          ? { header: { ...prevHeader, ...extra } as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  records.push(...rowRecords(rows, file, fileIndex, state));
  const written = await writeRawRecords(work, records, runId);
  return { ...written, file, rows: rows.length, state };
}

export interface CaptureFinish {
  total: number;
  removed: number;
}

/** Marks originals the capture did not see as removed and records the run. */
export async function finishCapture(
  work: string,
  runId: string,
  signature: string,
): Promise<CaptureFinish> {
  const removed = await db.sahityaRawRecord.updateMany({
    where: { work, removed: false, NOT: { runId } },
    data: { removed: true },
  });
  const total = await db.sahityaRawRecord.count({ where: { work, removed: false } });
  await db.sahityaSource.update({
    where: { work },
    data: {
      rawCount: total,
      capturedAt: new Date(),
      sourceSignature: signature,
      sourceRevision: await gitRevision(),
    },
  });
  return { total, removed: removed.count };
}

/** Whole capture in one call (CLI). */
export async function captureWork(
  work: string,
  onFile?: (r: CaptureFileResult, index: number, total: number) => void,
): Promise<CaptureFinish & RawWriteResult> {
  const begin = await beginCapture(work);
  let state = newRowKeyState();
  const sum: RawWriteResult = { added: 0, changed: 0, unchanged: 0 };
  for (let i = 0; i < begin.files.length; i++) {
    const r = await captureFile(work, begin.runId, i, state);
    state = r.state;
    sum.added += r.added;
    sum.changed += r.changed;
    sum.unchanged += r.unchanged;
    onFile?.(r, i, begin.files.length);
  }
  return { ...sum, ...(await finishCapture(work, begin.runId, begin.signature)) };
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

export interface BuildRunOptions extends BuildOptions {
  /** existing entity to place the work under */
  parentId?: string | null;
}

export interface BuildBegin {
  total: number;
  rootEntityId: string;
  rootCreated: boolean;
  moved: number;
}

const toDbLv = (xs: { language: string; value: string }[]) =>
  xs.map((x) => ({ lang: x.language, value: x.value }));

/** Creates or updates the work's root entity and lays out the structure. */
export async function beginBuild(work: string, opts: BuildRunOptions = {}): Promise<BuildBegin> {
  const source = await requireSource(work);
  if (!source.capturedAt) throw new Error(`${work} has no complete capture yet`);
  const prevOpts = (source.options as BuildRunOptions | null) ?? {};
  const options: BuildRunOptions = {
    entityType: opts.entityType || prevOpts.entityType || suggestRootType(work),
    bookmarkAll: opts.bookmarkAll ?? prevOpts.bookmarkAll ?? false,
    parentId: opts.parentId === undefined ? prevOpts.parentId ?? null : opts.parentId,
  };
  const ctx = workContext(work, headerOf(source), options);
  const root = buildRoot(ctx);

  if (options.parentId) {
    const parent = await db.entity.findUnique({ where: { id: options.parentId }, select: { id: true } });
    if (!parent) throw new Error("The chosen parent entity does not exist");
  }

  let rootId = source.rootEntityId;
  const existingRoot = rootId
    ? await db.entity.findUnique({ where: { id: rootId }, select: { id: true, parents: true } })
    : null;
  const parents = options.parentId ? [options.parentId] : [];
  let rootCreated = false;
  if (existingRoot) {
    await db.entity.update({
      where: { id: existingRoot.id },
      data: {
        type: root.type,
        text: root.text,
        meaning: root.meaning,
        attributes: root.attributes,
        parents,
      },
    });
    // moved to another parent: leave the old one's children list
    for (const old of existingRoot.parents.filter((p) => !parents.includes(p))) {
      const p = await db.entity.findUnique({ where: { id: old }, select: { children: true } });
      if (p) {
        await db.entity.update({
          where: { id: old },
          data: { children: p.children.filter((c) => c !== existingRoot.id) },
        });
      }
    }
  } else {
    rootId = newObjectId();
    rootCreated = true;
    await db.entity.create({
      data: {
        id: rootId,
        type: root.type,
        order: 0,
        text: root.text,
        meaning: root.meaning,
        attributes: root.attributes,
        bookmarked: options.bookmarkAll ?? false,
        notes: "",
        parents,
      },
    });
  }
  if (options.parentId) {
    const p = await db.entity.findUnique({ where: { id: options.parentId }, select: { children: true } });
    if (p && !p.children.includes(rootId!)) {
      await db.entity.update({
        where: { id: options.parentId },
        data: { children: { push: rootId! } },
      });
    }
  }

  // structure plan
  const items = await db.sahityaRawRecord.findMany({
    where: { work, removed: false },
    select: { key: true, kind: true, ref: true, seq: true, parentKey: true, pos: true },
  });
  const plan = planStructure(items);
  const changes = items.filter((it) => {
    const p = plan.get(it.key)!;
    return it.parentKey !== p.parentKey || it.pos !== p.pos;
  });
  for (const part of chunks(changes, 1000)) {
    await command({
      update: RAW,
      updates: part.map((it) => {
        const p = plan.get(it.key)!;
        return { q: { work, key: it.key }, u: { $set: { parentKey: p.parentKey, pos: p.pos } } };
      }),
      ordered: false,
    });
  }

  await db.sahityaSource.update({
    where: { work },
    data: {
      rootEntityId: rootId,
      options: options as Prisma.InputJsonValue,
      lastError: null,
    },
  });
  return { total: items.length, rootEntityId: rootId!, rootCreated, moved: changes.length };
}

export interface BuildBatchResult {
  done: number;
  lastSeq: number | null;
  created: number;
  updated: number;
  unchanged: number;
  /** edited by hand since the last build; content left as it is */
  kept: number;
  annotations: number;
}

/**
 * Builds the next `size` originals after `afterSeq`. Books and chapters come
 * before rows in seq order, so a row's parent always exists by the time the
 * row is built.
 */
export async function buildBatch(
  work: string,
  afterSeq: number | null,
  size: number,
  opts: { overwriteEdited?: boolean } = {},
): Promise<BuildBatchResult> {
  const source = await requireSource(work);
  if (!source.rootEntityId) throw new Error("Start the build first");
  const options = (source.options as BuildRunOptions | null) ?? {};
  const ctx = workContext(work, headerOf(source), options);
  const recs = await db.sahityaRawRecord.findMany({
    where: { work, removed: false, ...(afterSeq === null ? {} : { seq: { gt: afterSeq } }) },
    orderBy: { seq: "asc" },
    take: size,
    select: {
      key: true,
      kind: true,
      seq: true,
      row: true,
      parentKey: true,
      pos: true,
      entityId: true,
      builtHash: true,
    },
  });
  const result: BuildBatchResult = {
    done: recs.length,
    lastSeq: recs.length ? recs[recs.length - 1].seq : null,
    created: 0,
    updated: 0,
    unchanged: 0,
    kept: 0,
    annotations: 0,
  };
  if (recs.length === 0) return result;

  // parents
  const parentKeys = [...new Set(recs.map((r) => r.parentKey ?? "").filter(Boolean))];
  const parentRecs = parentKeys.length
    ? await db.sahityaRawRecord.findMany({
        where: { work, key: { in: parentKeys } },
        select: { key: true, entityId: true },
      })
    : [];
  const parentIds = new Map<string, string>([["", source.rootEntityId]]);
  for (const p of parentRecs) if (p.entityId) parentIds.set(p.key, p.entityId);
  // parents built in this same batch get their id below, before their rows
  const batchIds = new Map<string, string>();

  const existingIds = recs.map((r) => r.entityId).filter((x): x is string => !!x);
  const existing = existingIds.length
    ? await db.entity.findMany({
        where: { id: { in: existingIds } },
        select: { id: true, type: true, text: true, meaning: true, attributes: true },
      })
    : [];
  const existingById = new Map(existing.map((e) => [e.id, e]));

  const creates: Prisma.EntityCreateManyInput[] = [];
  const updates: Record<string, unknown>[] = [];
  const rawUpdates: Record<string, unknown>[] = [];
  const annotationOwners: string[] = [];
  const annotations: Prisma.EntityAnnotationCreateManyInput[] = [];
  const now = { $date: new Date().toISOString() };

  for (const rec of recs) {
    const built: BuiltEntity = buildRecord(ctx, rec);
    const hash = entityHash(built);
    const parentKey = rec.parentKey ?? "";
    const parentId =
      batchIds.get(parentKey) ?? parentIds.get(parentKey) ?? source.rootEntityId;
    const current = rec.entityId ? existingById.get(rec.entityId) : undefined;
    let entityId: string;

    if (current) {
      entityId = current.id;
      const currentHash = entityHash(current);
      const edited = rec.builtHash !== null && currentHash !== rec.builtHash;
      if (edited && !opts.overwriteEdited) {
        result.kept++;
        updates.push({
          q: { _id: oid(entityId) },
          u: { $set: { order: built.order, parents: [oid(parentId)] } },
        });
      } else if (currentHash === hash) {
        result.unchanged++;
        updates.push({
          q: { _id: oid(entityId) },
          u: { $set: { order: built.order, parents: [oid(parentId)] } },
        });
      } else {
        result.updated++;
        updates.push({
          q: { _id: oid(entityId) },
          u: {
            $set: {
              type: built.type,
              order: built.order,
              text: toDbLv(built.text),
              meaning: toDbLv(built.meaning),
              attributes: built.attributes,
              parents: [oid(parentId)],
              updatedAt: now,
            },
          },
        });
      }
    } else {
      entityId = newObjectId();
      result.created++;
      creates.push({
        id: entityId,
        type: built.type,
        order: built.order,
        text: built.text,
        meaning: built.meaning,
        attributes: built.attributes,
        bookmarked: options.bookmarkAll ?? false,
        notes: "",
        parents: [parentId],
        children: [],
      });
    }
    batchIds.set(rec.key, entityId);
    annotationOwners.push(entityId);
    built.annotations.forEach((a) =>
      annotations.push({
        entityId,
        kind: a.kind,
        language: a.language,
        title: a.title,
        text: a.text,
        order: a.order,
        source: a.source,
      }),
    );
    rawUpdates.push({
      q: { work, key: rec.key },
      u: {
        $set: {
          entityId: oid(entityId),
          builtHash: hash,
          builtVersion: SAHITYA_PROCESSOR_VERSION,
        },
      },
    });
  }

  for (const part of chunks(creates, 200)) await db.entity.createMany({ data: part });
  for (const part of chunks(updates, 500)) {
    await command({ update: ENTITIES, updates: part, ordered: false });
  }
  // annotations edited by hand ("edited:sanskritsahitya:<field>") stay, and
  // the build does not add a fresh copy next to them
  const editedSources = new Set<string>();
  for (const part of chunks(annotationOwners, 500)) {
    await db.entityAnnotation.deleteMany({
      where: { entityId: { in: part }, source: { startsWith: `${SAHITYA_SOURCE}:` } },
    });
    const edited = await db.entityAnnotation.findMany({
      where: { entityId: { in: part }, source: { startsWith: `edited:${SAHITYA_SOURCE}:` } },
      select: { entityId: true, source: true },
    });
    for (const e of edited) editedSources.add(`${e.entityId}|${e.source!.slice("edited:".length)}`);
  }
  const fresh = annotations.filter((a) => !editedSources.has(`${a.entityId}|${a.source}`));
  for (const part of chunks(fresh, 200)) {
    await db.entityAnnotation.createMany({ data: part });
  }
  result.annotations = fresh.length;
  for (const part of chunks(rawUpdates, 1000)) {
    await command({ update: RAW, updates: part, ordered: false });
  }
  return result;
}

export interface BuildFinish {
  entities: number;
  removedEntities: number;
  parentsLinked: number;
}

/** Deletes entities whose originals left the source, then sets children lists. */
export async function finishBuild(
  work: string,
  opts: { keepRemoved?: boolean } = {},
): Promise<BuildFinish> {
  const source = await requireSource(work);
  if (!source.rootEntityId) throw new Error("Start the build first");

  // originals that left the source
  const gone = await db.sahityaRawRecord.findMany({
    where: { work, removed: true },
    select: { key: true, entityId: true },
  });
  let removedEntities = 0;
  if (!opts.keepRemoved) {
    const ids = gone.map((g) => g.entityId).filter((x): x is string => !!x);
    for (const part of chunks(ids, 500)) {
      await db.entityAnnotation.deleteMany({ where: { entityId: { in: part } } });
      await db.entityPlayground.deleteMany({ where: { entityId: { in: part } } });
      removedEntities += (await db.entity.deleteMany({ where: { id: { in: part } } })).count;
    }
    await db.sahityaRawRecord.deleteMany({ where: { work, removed: true } });
  }

  // children lists, in reading order; anything else under a parent (added
  // by hand) stays, after the imported children
  const recs = await db.sahityaRawRecord.findMany({
    where: { work, removed: false, entityId: { not: null } },
    select: { key: true, parentKey: true, pos: true, seq: true, entityId: true },
  });
  const keyToId = new Map(recs.map((r) => [r.key, r.entityId!]));
  const ours = new Set(recs.map((r) => r.entityId!));
  const goneIds = new Set(gone.map((g) => g.entityId).filter(Boolean) as string[]);
  const byParent = new Map<string, typeof recs>();
  for (const r of recs) {
    const pid = r.parentKey ? keyToId.get(r.parentKey) ?? source.rootEntityId : source.rootEntityId;
    byParent.set(pid, [...(byParent.get(pid) ?? []), r]);
  }
  // every entity of ours is checked, so one that lost its children of ours
  // (they moved elsewhere) has them dropped too; only differing lists are written
  const parentIdsToSet = new Set<string>([source.rootEntityId, ...byParent.keys()]);
  for (const r of recs) if (r.entityId) parentIdsToSet.add(r.entityId);

  let parentsLinked = 0;
  for (const part of chunks([...parentIdsToSet], 500)) {
    const current = await db.entity.findMany({
      where: { id: { in: part } },
      select: { id: true, children: true },
    });
    const updates: Record<string, unknown>[] = [];
    for (const p of current) {
      const mine = (byParent.get(p.id) ?? [])
        .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0) || a.seq - b.seq)
        .map((r) => r.entityId!);
      const others = p.children.filter((c) => !ours.has(c) && !goneIds.has(c));
      const children = [...mine, ...others];
      if (mine.length) parentsLinked++;
      if (children.length === p.children.length && children.every((c, i) => c === p.children[i])) {
        continue;
      }
      updates.push({ q: { _id: oid(p.id) }, u: { $set: { children: children.map(oid) } } });
    }
    if (updates.length) await command({ update: ENTITIES, updates, ordered: false });
  }

  const entities = recs.length + 1;
  await db.sahityaSource.update({
    where: { work },
    data: {
      entityCount: entities,
      builtAt: new Date(),
      builtVersion: SAHITYA_PROCESSOR_VERSION,
      lastError: null,
    },
  });
  return { entities, removedEntities, parentsLinked };
}

/** Whole build in one call (CLI). */
export async function buildWork(
  work: string,
  opts: BuildRunOptions & { overwriteEdited?: boolean; batchSize?: number } = {},
  onBatch?: (r: BuildBatchResult, done: number, total: number) => void,
) {
  const begin = await beginBuild(work, opts);
  let afterSeq: number | null = null;
  let done = 0;
  const sum = { created: 0, updated: 0, unchanged: 0, kept: 0, annotations: 0 };
  for (;;) {
    const r = await buildBatch(work, afterSeq, opts.batchSize ?? 500, {
      overwriteEdited: opts.overwriteEdited,
    });
    if (r.done === 0) break;
    done += r.done;
    afterSeq = r.lastSeq;
    for (const k of Object.keys(sum) as (keyof typeof sum)[]) sum[k] += r[k];
    onBatch?.(r, done, begin.total);
  }
  return { ...begin, ...sum, ...(await finishBuild(work)) };
}

export async function recordError(work: string, message: string): Promise<void> {
  await db.sahityaSource
    .update({ where: { work }, data: { lastError: message.slice(0, 2000) } })
    .catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/* Removing                                                            */
/* ------------------------------------------------------------------ */

/** Collects an entity and everything below it. */
async function collectTree(rootId: string): Promise<string[]> {
  const seen = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length) {
    const next: string[] = [];
    for (const part of chunks(frontier, 500)) {
      const rows = await db.entity.findMany({
        where: { id: { in: part } },
        select: { children: true },
      });
      for (const r of rows) for (const c of r.children) if (!seen.has(c)) {
        seen.add(c);
        next.push(c);
      }
    }
    frontier = next;
  }
  return [...seen];
}

/** Deletes an entity tree (and its annotations, playgrounds) and unlinks it. */
export async function deleteEntityTree(rootId: string): Promise<number> {
  const root = await db.entity.findUnique({ where: { id: rootId }, select: { parents: true } });
  if (!root) return 0;
  const ids = await collectTree(rootId);
  let deleted = 0;
  for (const part of chunks(ids, 500)) {
    await db.entityAnnotation.deleteMany({ where: { entityId: { in: part } } });
    await db.entityPlayground.deleteMany({ where: { entityId: { in: part } } });
    deleted += (await db.entity.deleteMany({ where: { id: { in: part } } })).count;
  }
  for (const pid of root.parents) {
    const p = await db.entity.findUnique({ where: { id: pid }, select: { children: true } });
    if (p) {
      await db.entity.update({
        where: { id: pid },
        data: { children: p.children.filter((c) => c !== rootId) },
      });
    }
  }
  return deleted;
}

/** Deletes the entities built for a work; the originals stay. */
export async function deleteBuiltEntities(work: string): Promise<number> {
  const source = await requireSource(work);
  const deleted = source.rootEntityId ? await deleteEntityTree(source.rootEntityId) : 0;
  await db.sahityaRawRecord.updateMany({
    where: { work },
    data: { entityId: null, builtHash: null, builtVersion: null },
  });
  await db.sahityaSource.update({
    where: { work },
    data: { rootEntityId: null, entityCount: 0, builtAt: null, builtVersion: null },
  });
  return deleted;
}

/** Deletes a work's stored originals (only when nothing is built from them). */
export async function deleteOriginals(work: string): Promise<number> {
  const source = await requireSource(work);
  if (source.rootEntityId) throw new Error("Delete the built entities first");
  const r = await db.sahityaRawRecord.deleteMany({ where: { work } });
  await db.sahityaSource.delete({ where: { work } });
  return r.count;
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export interface LegacyImport {
  id: string;
  title: string;
}

/**
 * Works imported by the earlier importer (root with sourceType
 * "sanskritsahitya" and no ssWork). They are not updated by builds.
 */
export async function legacyImports(): Promise<LegacyImport[]> {
  const roots = await db.entity.findMany({
    where: { attributes: { some: { key: "rootTitle" } } },
    select: { id: true, attributes: true },
  });
  return roots
    .filter(
      (r) =>
        r.attributes.some((a) => a.key === "sourceType" && a.value === SAHITYA_SOURCE) &&
        !r.attributes.some((a) => a.key === "ssWork"),
    )
    .map((r) => ({
      id: r.id,
      title: r.attributes.find((a) => a.key === "rootTitle")?.value ?? "",
    }));
}

export interface FieldReport {
  field: string;
  count: number;
}

export interface WorkRow {
  work: string;
  kind: WorkFiles["kind"];
  files: string[];
  note?: string;
  title: string | null;
  suggestedType: string;
  /** source files differ from the last capture */
  sourceChanged: boolean;
  rawCount: number;
  capturedAt: string | null;
  sourceRevision: string | null;
  entityCount: number;
  builtAt: string | null;
  builtVersion: number | null;
  rootEntityId: string | null;
  /** built by an older processor, or captured again since the build */
  needsBuild: boolean;
  options: BuildRunOptions | null;
  fields: FieldReport[];
  unhandledFields: FieldReport[];
  lastError: string | null;
  legacy: LegacyImport[];
}

export async function overview(): Promise<WorkRow[]> {
  const [works, sources, legacy] = await Promise.all([
    discoverWorks(),
    db.sahityaSource.findMany(),
    legacyImports(),
  ]);
  const byWork = new Map(sources.map((s) => [s.work, s]));
  const rows: WorkRow[] = [];
  const names = new Set([...works.map((w) => w.work), ...sources.map((s) => s.work)]);
  for (const name of [...names].sort()) {
    const w = works.find((x) => x.work === name);
    const s = byWork.get(name);
    const signatureNow = w && w.kind === "work" ? await filesSignature(w.files).catch(() => null) : null;
    const header = s ? headerOf(s) : null;
    const stats = (s?.fieldStats as Record<string, number> | null) ?? {};
    const fields = Object.entries(stats)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => a.field.localeCompare(b.field));
    const unhandledFields = fields.filter(({ field }) => {
      if (field.startsWith("book.") || field.startsWith("chapter.")) {
        return !isHandledField(field.split(".")[1], header?.custom, STRUCTURAL_SECTION_KEYS);
      }
      return !isHandledField(field, header?.custom);
    });
    rows.push({
      work: name,
      kind: w?.kind ?? "work",
      files: w?.files ?? s?.files ?? [],
      note: w ? w.note : "no longer in the data folder",
      title: s?.title ?? null,
      suggestedType: suggestRootType(name),
      sourceChanged: !!(s?.sourceSignature && signatureNow && s.sourceSignature !== signatureNow),
      rawCount: s?.rawCount ?? 0,
      capturedAt: s?.capturedAt?.toISOString() ?? null,
      sourceRevision: s?.sourceRevision ?? null,
      entityCount: s?.entityCount ?? 0,
      builtAt: s?.builtAt?.toISOString() ?? null,
      builtVersion: s?.builtVersion ?? null,
      rootEntityId: s?.rootEntityId ?? null,
      needsBuild:
        !!s?.capturedAt &&
        (!s.builtAt ||
          s.builtVersion !== SAHITYA_PROCESSOR_VERSION ||
          s.capturedAt > s.builtAt),
      options: (s?.options as BuildRunOptions | null) ?? null,
      fields,
      unhandledFields,
      lastError: s?.lastError ?? null,
      legacy: s ? legacy.filter((l) => l.title === s.title) : [],
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

export interface PreviewItem {
  key: string;
  kind: string;
  parentKey: string;
  row: unknown;
  built: BuiltEntity;
}

/**
 * Shows what the current processor makes of a few originals. Reads the
 * stored originals when the work is captured, else the first source file.
 */
export async function preview(
  work: string,
  opts: { offset?: number; limit?: number; entityType?: string; search?: string } = {},
): Promise<{ title: string; total: number; root: BuiltEntity; items: PreviewItem[] }> {
  const limit = Math.min(opts.limit ?? 10, 50);
  const offset = opts.offset ?? 0;
  const source = await db.sahityaSource.findUnique({ where: { work } });
  if (source?.capturedAt) {
    const options = { ...((source.options as BuildRunOptions) ?? {}), ...(opts.entityType ? { entityType: opts.entityType } : {}) };
    const ctx = workContext(work, headerOf(source), options);
    const where: Prisma.SahityaRawRecordWhereInput = { work, removed: false };
    if (opts.search) where.OR = [{ key: { contains: opts.search } }, { ref: opts.search }];
    const [total, recs] = await Promise.all([
      db.sahityaRawRecord.count({ where }),
      db.sahityaRawRecord.findMany({
        where,
        orderBy: { seq: "asc" },
        skip: offset,
        take: limit,
        select: { key: true, kind: true, row: true, parentKey: true, pos: true },
      }),
    ]);
    return {
      title: source.title,
      total,
      root: buildRoot(ctx),
      items: recs.map((r) => ({
        key: r.key,
        kind: r.kind,
        parentKey: r.parentKey ?? "",
        row: r.row,
        built: buildRecord(ctx, r),
      })),
    };
  }
  const found = await findWork(work);
  const { header, rows, file } = await readWorkFile(found.files[0]);
  const ctx = workContext(work, header, { entityType: opts.entityType });
  const records = [...headerRecords(header, file), ...rowRecords(rows, file, 0, newRowKeyState())];
  const plan = planStructure(records);
  const filtered = opts.search
    ? records.filter((r) => r.key.includes(opts.search!) || r.ref === opts.search)
    : records;
  return {
    title: header.title,
    total: filtered.length,
    root: buildRoot(ctx),
    items: filtered.slice(offset, offset + limit).map((r) => ({
      key: r.key,
      kind: r.kind,
      parentKey: plan.get(r.key)?.parentKey ?? "",
      row: r.row,
      built: buildRecord(ctx, { ...r, pos: plan.get(r.key)?.pos }),
    })),
  };
}
