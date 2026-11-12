/**
 * Entity archive format — what "download with children" writes and what
 * "upload" reads. Everything here is pure (no database, no zip library) so
 * the round trip can be tested on its own; `./server.ts` does the I/O.
 *
 * An archive is a set of JSON files:
 *   - `000_structure_info.json`: format version, counts and the file tree
 *   - one file per entity; a container whose children have no children of
 *     their own (a chapter and its verses) carries them inline in `children`
 *
 * Reading is driven by entity ids, not by file layout: every record names its
 * children in `childrenIds`, so an entity that sits under two parents is
 * stored once and linked twice, and files written by older versions of the
 * app (no `formatVersion`, no annotations, inline children without ids,
 * a single nested JSON tree) are read by the same code.
 *
 * When the Entity schema gains a field: add it to `ArchiveEntity`, write it
 * in `toFileRecord`, read it in `normalizeEntity` (with a default for older
 * archives) and list it in `KNOWN_ENTITY_KEYS`. Bump `ARCHIVE_FORMAT_VERSION`
 * only when an older reader would lose data by ignoring the change.
 */

export const ARCHIVE_FORMAT_VERSION = 2;
export const STRUCTURE_FILE = "000_structure_info.json";

export interface ArchiveLanguageValue {
  language: string;
  value: string;
}

export interface ArchiveAttribute {
  key: string;
  value: string;
}

export interface ArchiveAnnotation {
  kind: string;
  language: string;
  title: string;
  text: string;
  order: number;
  userId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchivePlayground {
  title: string;
  nodes: unknown;
  edges: unknown;
  userId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchiveEntity {
  /** id in the database the archive was written from */
  id: string;
  type: string;
  order: number;
  text: ArchiveLanguageValue[];
  meaning: ArchiveLanguageValue[];
  attributes: ArchiveAttribute[];
  imageThumbnail: string;
  audio: string;
  notes: string;
  bookmarked: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** children in the order the parent lists them */
  childrenIds: string[];
  annotations: ArchiveAnnotation[];
  playgrounds: ArchivePlayground[];
}

export interface HierarchyStructure {
  fileName: string;
  childCount: number;
  totalChildCount: number;
  children?: HierarchyStructure[];
}

export interface StructureInfo {
  formatVersion?: number;
  stats: {
    totalEntities: number;
    totalAnnotations?: number;
    totalPlaygrounds?: number;
    maxDepth: number;
    entityCounts: Record<string, number>;
    createdAt: string;
    rootEntityType: string;
    rootEntityId?: string;
  };
  warnings?: string[];
  hierarchy: HierarchyStructure;
}

export class ArchiveError extends Error {}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

export interface BuiltArchive {
  /** file name -> JSON text, in the order they were written */
  files: Map<string, string>;
  structure: StructureInfo;
  warnings: string[];
}

const FILE_TITLE_LANGUAGES = ["SLP1", "IAST", "ITRANS", "ENG"];

/** ASCII-only, lower-case, at most 30 characters; may come back empty. */
export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[<>:"/\\|?*.]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 30)
    .replace(/_+$/, "");
}

function entityTitle(entity: ArchiveEntity): string {
  for (const lang of FILE_TITLE_LANGUAGES) {
    const value = entity.text.find((t) => t.language === lang)?.value?.trim();
    if (value && !value.startsWith("$")) {
      const title = sanitizeFileName(value);
      if (title) return title;
    }
  }
  return `entity_${entity.id.slice(-8)}`;
}

export function archiveFileName(entity: ArchiveEntity, date = new Date()) {
  const type = sanitizeFileName(entity.type) || "entity";
  return `${type}_${entityTitle(entity)}_${date.toISOString().split("T")[0]}.zip`;
}

function toFileRecord(entity: ArchiveEntity): Record<string, unknown> {
  return {
    id: entity.id,
    type: entity.type,
    order: entity.order,
    text: entity.text,
    meaning: entity.meaning,
    attributes: entity.attributes,
    imageThumbnail: entity.imageThumbnail,
    audio: entity.audio,
    notes: entity.notes,
    bookmarked: entity.bookmarked,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    annotations: entity.annotations,
    playgrounds: entity.playgrounds,
    childrenIds: entity.childrenIds,
  };
}

/**
 * Lays out everything reachable from `rootId` as archive files. `entities`
 * must hold every entity of the hierarchy, keyed by id; children that are
 * listed but absent (dangling references in the database) are reported in
 * `warnings` and left out.
 */
export function buildArchive(
  rootId: string,
  entities: Map<string, ArchiveEntity>,
  now = new Date(),
): BuiltArchive {
  const root = entities.get(rootId);
  if (!root) throw new ArchiveError("Entity not found");

  const files = new Map<string, string>();
  const warnings: string[] = [];
  const written = new Set<string>();
  const entityCounts: Record<string, number> = {};
  let totalAnnotations = 0;
  let totalPlaygrounds = 0;
  let maxDepth = 0;
  let dangling = 0;

  const count = (entity: ArchiveEntity) => {
    written.add(entity.id);
    entityCounts[entity.type] = (entityCounts[entity.type] || 0) + 1;
    totalAnnotations += entity.annotations.length;
    totalPlaygrounds += entity.playgrounds.length;
  };

  const presentChildren = (entity: ArchiveEntity) => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of entity.childrenIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (entities.has(id)) ids.push(id);
      else dangling++;
    }
    return ids;
  };

  const uniqueFileName = (entity: ArchiveEntity, indexes: number[]) => {
    const type = sanitizeFileName(entity.type) || "entity";
    const prefix = indexes.length
      ? indexes.map((i) => String(i + 1).padStart(3, "0")).join("_")
      : "000";
    let name = `${prefix}_${type}_${entityTitle(entity)}.json`;
    if (files.has(name) || name === STRUCTURE_FILE) {
      name = `${prefix}_${type}_${entity.id}.json`;
    }
    return name;
  };

  const write = (
    entity: ArchiveEntity,
    indexes: number[],
    depth: number,
  ): HierarchyStructure => {
    count(entity);
    maxDepth = Math.max(maxDepth, depth);

    const childIds = presentChildren(entity);
    const record = toFileRecord({ ...entity, childrenIds: childIds });
    const fileName = uniqueFileName(entity, indexes);
    // reserve the name before descending so children cannot take it
    files.set(fileName, "");
    const structure: HierarchyStructure = {
      fileName,
      childCount: 0,
      totalChildCount: 0,
    };

    // children not stored yet, in reading order (only used for file naming;
    // the order the parent lists them in is kept in `childrenIds`)
    const fresh = childIds
      .filter((id) => !written.has(id))
      .map((id) => entities.get(id)!)
      .sort((a, b) => a.order - b.order);

    const inline =
      fresh.length > 0 &&
      fresh.every((child) => presentChildren(child).length === 0);

    if (inline) {
      // presentChildren() above already counted any dangling grandchildren
      record.children = fresh.map((child) => {
        count(child);
        return toFileRecord({ ...child, childrenIds: [] });
      });
      maxDepth = Math.max(maxDepth, depth + 1);
      structure.childCount = fresh.length;
      structure.totalChildCount = fresh.length;
    } else if (fresh.length > 0) {
      const childStructures: HierarchyStructure[] = [];
      fresh.forEach((child, i) => {
        // an earlier sibling's subtree may have stored it meanwhile
        if (written.has(child.id)) return;
        childStructures.push(write(child, [...indexes, i], depth + 1));
      });
      structure.children = childStructures;
      structure.childCount = childStructures.length;
      structure.totalChildCount = childStructures.reduce(
        (sum, c) => sum + 1 + c.totalChildCount,
        0,
      );
    }

    files.set(fileName, JSON.stringify(record, null, 2));
    return structure;
  };

  const hierarchy = write(root, [], 0);

  if (dangling > 0) {
    // each dangling id was seen at least once while laying out; report the
    // distinct ones
    const missing = new Set<string>();
    for (const id of written) {
      for (const childId of entities.get(id)!.childrenIds) {
        if (!entities.has(childId)) missing.add(childId);
      }
    }
    warnings.push(
      `${missing.size} child reference(s) point to entities that no longer exist and were left out`,
    );
  }

  const structure: StructureInfo = {
    formatVersion: ARCHIVE_FORMAT_VERSION,
    stats: {
      totalEntities: written.size,
      totalAnnotations,
      totalPlaygrounds,
      maxDepth,
      entityCounts,
      createdAt: now.toISOString(),
      rootEntityType: root.type,
      rootEntityId: root.id,
    },
    warnings: warnings.length ? warnings : undefined,
    hierarchy,
  };

  // structure first, so it is the first thing seen when the zip is opened
  const ordered = new Map<string, string>();
  ordered.set(STRUCTURE_FILE, JSON.stringify(structure, null, 2));
  for (const [name, content] of files) ordered.set(name, content);

  return { files: ordered, structure, warnings };
}

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

export interface ParsedArchive {
  formatVersion: number;
  rootId: string;
  /** every entity reachable from the root, root first */
  entities: ArchiveEntity[];
  warnings: string[];
}

// fields a record may carry; anything else is reported instead of silently
// dropped, so a schema change that the reader does not know about is visible
const KNOWN_ENTITY_KEYS = new Set([
  "id",
  "_id",
  "type",
  "order",
  "text",
  "meaning",
  "attributes",
  "imageThumbnail",
  "audio",
  "notes",
  "bookmarked",
  "createdAt",
  "updatedAt",
  "annotations",
  "playgrounds",
  "children",
  "childrenIds",
  // relations and view-model fields older exports may contain; the links are
  // rebuilt from `children` / `childrenIds`
  "parents",
  "parentIds",
  "textData",
  "meaningData",
  "childrenCount",
  "parentsCount",
]);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asString = (v: unknown): string =>
  typeof v === "string"
    ? v
    : typeof v === "number" || typeof v === "boolean"
      ? String(v)
      : "";

function asId(v: unknown): string | null {
  if (typeof v === "string" && v) return v;
  if (isObject(v) && typeof v.$oid === "string" && v.$oid) return v.$oid;
  return null;
}

function asDate(v: unknown): string | undefined {
  const raw = isObject(v) && "$date" in v ? v.$date : v;
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function asOrder(v: unknown, fallback: number): number {
  const n = typeof v === "string" && v.trim() ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/**
 * Language values in any shape the app has ever written:
 *   [{ language, value }]   current
 *   [{ lang, value }]       raw database documents
 *   { SAN: "…" } / { SAN: { text: "…" } }   v1 upload files
 *   "…"                     a display string (language unknown)
 */
function normalizeLanguageValues(
  raw: unknown,
  note: (issue: string) => void,
  field: string,
): ArchiveLanguageValue[] {
  if (raw === null || raw === undefined) return [];
  if (typeof raw === "string") {
    if (!raw) return [];
    note(`${field} without a language was stored as ENG`);
    return [{ language: "ENG", value: raw }];
  }
  if (Array.isArray(raw)) {
    const out: ArchiveLanguageValue[] = [];
    for (const item of raw) {
      if (!isObject(item)) {
        note(`${field} entries that are not objects were skipped`);
        continue;
      }
      const language = asString(item.language ?? item.lang);
      const value = item.value ?? item.text;
      if (!language || (typeof value !== "string" && value != null)) {
        note(`${field} entries without a language or text were skipped`);
        continue;
      }
      out.push({ language, value: asString(value) });
    }
    return out;
  }
  if (isObject(raw)) {
    const out: ArchiveLanguageValue[] = [];
    for (const [language, v] of Object.entries(raw)) {
      const value = isObject(v) ? (v.text ?? v.value) : v;
      if (typeof value === "string") out.push({ language, value });
    }
    return out;
  }
  note(`${field} in an unknown shape was skipped`);
  return [];
}

function normalizeAttributes(
  raw: unknown,
  note: (issue: string) => void,
): ArchiveAttribute[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    const out: ArchiveAttribute[] = [];
    for (const item of raw) {
      if (!isObject(item) || !asString(item.key)) {
        note("attributes without a key were skipped");
        continue;
      }
      out.push({ key: asString(item.key), value: asString(item.value) });
    }
    return out;
  }
  if (isObject(raw)) {
    return Object.entries(raw).map(([key, value]) => ({
      key,
      value: asString(value),
    }));
  }
  note("attributes in an unknown shape were skipped");
  return [];
}

function normalizeAnnotations(
  raw: unknown,
  note: (issue: string) => void,
): ArchiveAnnotation[] {
  if (!Array.isArray(raw)) return [];
  const out: ArchiveAnnotation[] = [];
  raw.forEach((item, idx) => {
    if (!isObject(item) || typeof item.text !== "string" || !item.kind) {
      note("annotations without a kind or text were skipped");
      return;
    }
    out.push({
      kind: asString(item.kind),
      language: asString(item.language ?? item.lang) || "ENG",
      title: asString(item.title),
      text: item.text,
      order: asOrder(item.order, idx),
      userId: asId(item.userId),
      createdAt: asDate(item.createdAt),
      updatedAt: asDate(item.updatedAt),
    });
  });
  return out;
}

function normalizePlaygrounds(
  raw: unknown,
  note: (issue: string) => void,
): ArchivePlayground[] {
  if (!Array.isArray(raw)) return [];
  const out: ArchivePlayground[] = [];
  for (const item of raw) {
    if (!isObject(item) || !Array.isArray(item.nodes)) {
      note("saved playgrounds without nodes were skipped");
      continue;
    }
    out.push({
      title: asString(item.title) || "Untitled",
      nodes: item.nodes,
      edges: Array.isArray(item.edges) ? item.edges : [],
      userId: asId(item.userId),
      createdAt: asDate(item.createdAt),
      updatedAt: asDate(item.updatedAt),
    });
  }
  return out;
}

/** Collects repeated issues as "<issue> (<n> entities)". */
class IssueLog {
  private counts = new Map<string, number>();
  note = (issue: string) =>
    this.counts.set(issue, (this.counts.get(issue) || 0) + 1);
  list(): string[] {
    return [...this.counts].map(([issue, n]) =>
      n > 1 ? `${issue} (${n} times)` : issue,
    );
  }
}

function normalizeEntity(
  raw: Record<string, unknown>,
  id: string,
  childrenIds: string[],
  fallbackOrder: number,
  where: string,
  log: IssueLog,
): ArchiveEntity {
  const type = asString(raw.type).trim();
  if (!type) throw new ArchiveError(`${where}: entity has no type`);

  for (const key of Object.keys(raw)) {
    if (!KNOWN_ENTITY_KEYS.has(key)) {
      log.note(`unknown field "${key}" was ignored`);
    }
  }

  // exports of the view model carry the display string in `text` and the
  // real per-language values in `textData`
  const text = normalizeLanguageValues(
    Array.isArray(raw.textData) || isObject(raw.textData)
      ? raw.textData
      : raw.text,
    log.note,
    "text",
  );
  const meaning = normalizeLanguageValues(
    Array.isArray(raw.meaningData) || isObject(raw.meaningData)
      ? raw.meaningData
      : raw.meaning,
    log.note,
    "meaning",
  );
  if (text.length === 0) log.note("entities without any text were imported");

  return {
    id,
    type,
    order: asOrder(raw.order, fallbackOrder),
    text,
    meaning,
    attributes: normalizeAttributes(raw.attributes, log.note),
    imageThumbnail: asString(raw.imageThumbnail),
    audio: asString(raw.audio),
    notes: asString(raw.notes),
    bookmarked: raw.bookmarked === true,
    createdAt: asDate(raw.createdAt),
    updatedAt: asDate(raw.updatedAt),
    childrenIds,
    annotations: normalizeAnnotations(raw.annotations, log.note),
    playgrounds: normalizePlaygrounds(raw.playgrounds, log.note),
  };
}

function hierarchyFileNames(node: unknown, out: string[] = []): string[] {
  if (!isObject(node)) return out;
  if (typeof node.fileName === "string") out.push(node.fileName);
  if (Array.isArray(node.children)) {
    for (const child of node.children) hierarchyFileNames(child, out);
  }
  return out;
}

/**
 * Reads the files of an archive (or a single legacy JSON tree, passed as one
 * file) into a validated, id-linked list of entities. Throws `ArchiveError`
 * when the archive is incomplete or unreadable — nothing should be written
 * to the database in that case.
 */
export function parseArchive(
  files: { name: string; content: string }[],
): ParsedArchive {
  const log = new IssueLog();
  const warnings: string[] = [];

  const parseJson = (name: string, content: string): unknown => {
    try {
      // tolerate a UTF-8 byte order mark from hand-edited files
      return JSON.parse(content.replace(/^﻿/, ""));
    } catch (error) {
      throw new ArchiveError(
        `${name} is not valid JSON: ${error instanceof Error ? error.message : error}`,
      );
    }
  };

  const baseName = (name: string) => name.split("/").pop() || name;
  const jsonFiles = files.filter(
    (f) =>
      f.name.toLowerCase().endsWith(".json") &&
      !baseName(f.name).startsWith("."),
  );
  if (jsonFiles.length === 0) {
    throw new ArchiveError("The archive contains no entity files");
  }

  let structure: Record<string, unknown> | null = null;
  const structureFile = jsonFiles.find(
    (f) => baseName(f.name) === STRUCTURE_FILE,
  );
  if (structureFile) {
    const parsed = parseJson(structureFile.name, structureFile.content);
    if (!isObject(parsed)) {
      throw new ArchiveError(`Invalid ${STRUCTURE_FILE} format`);
    }
    structure = parsed;
  }

  const formatVersion =
    structure && typeof structure.formatVersion === "number"
      ? structure.formatVersion
      : 1;
  if (formatVersion > ARCHIVE_FORMAT_VERSION) {
    throw new ArchiveError(
      `This archive was written by a newer version of the app (format ${formatVersion}); update the app to import it`,
    );
  }

  const records = new Map<string, ArchiveEntity>();
  const fileRoots = new Map<string, string>(); // base file name -> record id

  const collect = (raw: unknown, key: string, index: number): string => {
    if (!isObject(raw)) {
      throw new ArchiveError(`${key} is not an entity`);
    }
    const ownId = asId(raw.id) ?? asId(raw._id);
    const id = ownId ?? `@${key}`;
    if (records.has(id)) {
      // the same entity stored twice (v1 archives did this for an entity
      // with two parents): keep the first copy, link to it from both
      if (ownId) log.note("entities stored more than once were imported once");
      else throw new ArchiveError(`${key}: duplicate entity`);
      return id;
    }
    // reserve the slot first so a cycle cannot recurse forever
    records.set(id, null as unknown as ArchiveEntity);

    const childrenIds: string[] = [];
    const seen = new Set<string>();
    const add = (childId: string | null) => {
      if (childId && !seen.has(childId)) {
        seen.add(childId);
        childrenIds.push(childId);
      }
    };
    const inlineIds: string[] = [];
    if (Array.isArray(raw.children)) {
      raw.children.forEach((child, i) => {
        if (isObject(child)) inlineIds.push(collect(child, `${id}/${i}`, i));
        else inlineIds.push(asId(child) ?? "");
      });
    }
    // `childrenIds` holds the parent's own ordering; inline children it does
    // not mention (older files) follow in file order
    if (Array.isArray(raw.childrenIds)) raw.childrenIds.forEach((c) => add(asId(c)));
    inlineIds.forEach(add);

    records.set(id, normalizeEntity(raw, id, childrenIds, index, key, log));
    return id;
  };

  for (const file of jsonFiles) {
    if (file === structureFile) continue;
    const id = collect(parseJson(file.name, file.content), file.name, 0);
    fileRoots.set(baseName(file.name), id);
  }
  if (records.size === 0) {
    throw new ArchiveError("The archive contains no entity files");
  }

  // every file the structure lists must be there: a missing one means the
  // archive was truncated or edited, and importing the rest would lose data
  let rootId: string | undefined;
  if (structure) {
    const listed = hierarchyFileNames(structure.hierarchy);
    if (listed.length === 0) {
      throw new ArchiveError(`Invalid ${STRUCTURE_FILE} format`);
    }
    const missing = listed.filter((name) => !fileRoots.has(baseName(name)));
    if (missing.length > 0) {
      throw new ArchiveError(
        `The archive is incomplete: ${missing.length} entity file(s) are missing (first: ${missing[0]})`,
      );
    }
    rootId = fileRoots.get(baseName(listed[0]));
  } else {
    const referenced = new Set<string>();
    for (const record of records.values()) {
      record.childrenIds.forEach((c) => referenced.add(c));
    }
    const roots = [...records.keys()].filter((id) => !referenced.has(id));
    if (roots.length !== 1) {
      throw new ArchiveError(
        roots.length === 0
          ? "Cannot tell which entity is the root of this file"
          : `Expected one root entity but found ${roots.length}; upload them one at a time`,
      );
    }
    rootId = roots[0];
  }
  if (!rootId) throw new ArchiveError("The archive has no root entity");

  // walk from the root: resolve links, drop what is unreachable
  const reachable: ArchiveEntity[] = [];
  const visited = new Set<string>([rootId]);
  const queue = [rootId];
  let dangling = 0;
  while (queue.length > 0) {
    const entity = records.get(queue.shift()!)!;
    reachable.push(entity);
    entity.childrenIds = entity.childrenIds.filter((childId) => {
      if (!records.has(childId)) {
        dangling++;
        return false;
      }
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push(childId);
      }
      return true;
    });
  }

  if (dangling > 0) {
    const message = `${dangling} child reference(s) point to entities that are not in the archive`;
    // a current-format archive always contains every child it references
    if (formatVersion >= 2) {
      throw new ArchiveError(`The archive is incomplete: ${message}`);
    }
    warnings.push(`${message} and were dropped`);
  }
  if (reachable.length < records.size) {
    warnings.push(
      `${records.size - reachable.length} entity file(s) are not linked to the root and were skipped`,
    );
  }

  const stats = structure && isObject(structure.stats) ? structure.stats : null;
  if (stats && formatVersion >= 2) {
    const expect = (label: string, expected: unknown, actual: number) => {
      if (typeof expected === "number" && expected !== actual) {
        throw new ArchiveError(
          `The archive is incomplete: it should contain ${expected} ${label} but has ${actual}`,
        );
      }
    };
    expect("entities", stats.totalEntities, reachable.length);
    expect(
      "annotations",
      stats.totalAnnotations,
      reachable.reduce((n, e) => n + e.annotations.length, 0),
    );
    expect(
      "saved playgrounds",
      stats.totalPlaygrounds,
      reachable.reduce((n, e) => n + e.playgrounds.length, 0),
    );
  }

  warnings.push(...log.list());
  return { formatVersion, rootId, entities: reachable, warnings };
}

/* ------------------------------------------------------------------ */
/* Planning the import                                                 */
/* ------------------------------------------------------------------ */

export interface PlannedEntity {
  id: string;
  type: string;
  order: number;
  text: ArchiveLanguageValue[];
  meaning: ArchiveLanguageValue[];
  attributes: ArchiveAttribute[];
  imageThumbnail: string;
  audio: string;
  notes: string;
  bookmarked: boolean;
  parents: string[];
  children: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlannedAnnotation {
  entityId: string;
  kind: string;
  language: string;
  title: string;
  text: string;
  order: number;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlannedPlayground {
  entityId: string;
  title: string;
  nodes: unknown;
  edges: unknown;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ImportPlan {
  rootId: string;
  entities: PlannedEntity[];
  annotations: PlannedAnnotation[];
  playgrounds: PlannedPlayground[];
  warnings: string[];
}

const toDate = (iso?: string) => (iso ? new Date(iso) : undefined);

/** User ids the archive attributes annotations and playgrounds to. */
export function archiveUserIds(archive: ParsedArchive): string[] {
  const ids = new Set<string>();
  for (const entity of archive.entities) {
    for (const a of entity.annotations) if (a.userId) ids.add(a.userId);
    for (const p of entity.playgrounds) if (p.userId) ids.add(p.userId);
  }
  return [...ids];
}

/**
 * Turns a parsed archive into the exact rows to insert. Every entity gets a
 * fresh id (so importing never overwrites anything and an archive can be
 * imported twice); parent/child links are rewritten to the new ids.
 *
 * Annotations and playgrounds keep their author when that user exists in
 * this database (`knownUserIds`); otherwise they go to the importing user,
 * so private notes do not become invisible to everyone.
 */
export function planImport(
  archive: ParsedArchive,
  options: {
    newId: () => string;
    importerId: string;
    knownUserIds?: Iterable<string>;
    /** entity to attach the root under */
    parentId?: string | null;
    /** position of the root among the parent's children */
    rootOrder?: number;
  },
): ImportPlan {
  const known = new Set(options.knownUserIds ?? []);
  const warnings: string[] = [];
  const idMap = new Map<string, string>();
  for (const entity of archive.entities) idMap.set(entity.id, options.newId());

  const parents = new Map<string, string[]>();
  for (const entity of archive.entities) {
    for (const childId of entity.childrenIds) {
      const list = parents.get(childId) ?? [];
      list.push(idMap.get(entity.id)!);
      parents.set(childId, list);
    }
  }

  let reassigned = 0;
  const author = (userId: string | null) => {
    if (userId && known.has(userId)) return userId;
    if (userId) reassigned++;
    return options.importerId;
  };

  const entities: PlannedEntity[] = [];
  const annotations: PlannedAnnotation[] = [];
  const playgrounds: PlannedPlayground[] = [];

  for (const entity of archive.entities) {
    const id = idMap.get(entity.id)!;
    const isRoot = entity.id === archive.rootId;
    const ownParents = parents.get(entity.id) ?? [];
    entities.push({
      id,
      type: entity.type,
      order:
        isRoot && typeof options.rootOrder === "number"
          ? options.rootOrder
          : entity.order,
      text: entity.text,
      meaning: entity.meaning,
      attributes: entity.attributes,
      imageThumbnail: entity.imageThumbnail,
      audio: entity.audio,
      notes: entity.notes,
      bookmarked: entity.bookmarked,
      parents:
        isRoot && options.parentId
          ? [options.parentId, ...ownParents]
          : ownParents,
      children: entity.childrenIds.map((childId) => idMap.get(childId)!),
      createdAt: toDate(entity.createdAt),
      updatedAt: toDate(entity.updatedAt),
    });
    for (const a of entity.annotations) {
      annotations.push({
        entityId: id,
        kind: a.kind,
        language: a.language,
        title: a.title,
        text: a.text,
        order: a.order,
        userId: author(a.userId),
        createdAt: toDate(a.createdAt),
        updatedAt: toDate(a.updatedAt),
      });
    }
    for (const p of entity.playgrounds) {
      playgrounds.push({
        entityId: id,
        title: p.title,
        nodes: p.nodes,
        edges: p.edges,
        userId: author(p.userId),
        createdAt: toDate(p.createdAt),
        updatedAt: toDate(p.updatedAt),
      });
    }
  }

  if (reassigned > 0) {
    warnings.push(
      `${reassigned} annotation(s) or playground(s) were written by users that do not exist here and now belong to you`,
    );
  }

  return {
    rootId: idMap.get(archive.rootId)!,
    entities,
    annotations,
    playgrounds,
    warnings,
  };
}
