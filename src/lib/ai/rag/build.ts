import { createHash } from "crypto";
import { db } from "@/lib/db";
import { entityChildTypes } from "@/lib/entity-types";
import { AiConfig, AI_NOT_CONFIGURED, getAiConfig } from "../config";
import {
  childIds,
  CONTAINER_TYPES,
  countChildren,
  entityTitle,
  PASSAGE_SELECT,
  PassageRow,
  pickLanguage,
  ROOT_TYPES,
} from "../retrieval";
import {
  EMBED_NOT_CONFIGURED,
  EmbedConfig,
  embedModelId,
  embedTexts,
  getEmbedConfig,
} from "./embeddings";
import { extractGraph } from "./extract";
import { bumpRagEpoch, chunkScope, scopeContainerIds } from "./store";
import { chunkText, Extraction, fold, passageText, toBytes } from "./text";

/**
 * Builds the knowledge index for a scope — one verse, a chapter, a book or
 * the whole library — in two independent stages:
 *
 *   embeddings  a vector per entity, for semantic search
 *   graph       the characters, concepts, places and states each verse
 *               mentions, read by the chat model
 *
 * A build runs in the server process, one at a time, container by
 * container. It is incremental (entities whose text has not changed are
 * skipped), so an interrupted or cancelled build is resumed by starting it
 * again. Progress is written to `RagBuild` for the UI to poll.
 */

export type RagBuildOptions = {
  embeddings: boolean;
  graph: boolean;
  /** redo entities that are already indexed */
  force: boolean;
};

const EMBED_BATCH = 32;
const GRAPH_BATCH = 8;
const KNOWN_NAMES = 60;
const MAX_ALIASES = 12;
const MAX_CONSECUTIVE_FAILURES = 5;
/** A running build with no heartbeat for this long has died with its server. */
export const STALE_BUILD_MS = 3 * 60 * 1000;
const PROGRESS_EVERY_MS = 1500;
const HEARTBEAT_EVERY_MS = 20 * 1000;
/** One extraction call may think for a while, but not for ever. */
const EXTRACT_TIMEOUT_MS = 4 * 60 * 1000;

const globalForBuilds = globalThis as unknown as {
  ragBuildAborts?: Map<string, AbortController>;
};
const aborts = (globalForBuilds.ragBuildAborts ??= new Map());

class BuildCancelled extends Error {}

const hashText = (value: string) =>
  createHash("sha1").update(value).digest("hex").slice(0, 16);

export type Container = {
  id: string;
  type: string;
  /** "Book › Chapter" */
  reference: string;
  title: string;
  /** the container above it inside the scope; null at the top */
  parentId: string | null;
  /** 0 for the scope itself (or a top-level entry of the library) */
  depth: number;
};

type ContainerRow = {
  id: string;
  type: string;
  order: number;
  parents: string[];
  text: { language: string; value: string }[];
};
const CONTAINER_SELECT = {
  id: true,
  type: true,
  order: true,
  parents: true,
  text: true,
} as const;

/** Titles of the books/chapters above an entity, outermost first. */
async function ancestorTitles(parentId: string | undefined) {
  const titles: string[] = [];
  let cursor = parentId;
  for (let depth = 0; cursor && depth < 5; depth++) {
    const parent: ContainerRow | null = await db.entity.findUnique({
      where: { id: cursor },
      select: CONTAINER_SELECT,
    });
    if (!parent) break;
    // the deity / author a book is filed under is not part of its reference
    if (!ROOT_TYPES.includes(parent.type))
      titles.unshift(entityTitle(parent.text));
    cursor = parent.parents[0];
  }
  return titles;
}

/** Every container of a scope in reading order, with its "Book › Chapter" reference. */
export async function listContainers(
  scopeId: string | null,
): Promise<Container[]> {
  const rows = new Map<string, ContainerRow>();
  let prefix: string[] = [];
  if (scopeId) {
    const scope = await db.entity.findUnique({
      where: { id: scopeId },
      select: CONTAINER_SELECT,
    });
    if (!scope) throw new Error("The selected content no longer exists");
    prefix = await ancestorTitles(scope.parents[0]);
    rows.set(scope.id, scope);
    let frontier = [scope.id];
    for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
      const children = await db.entity.findMany({
        where: {
          parents: { hasSome: frontier },
          type: { in: CONTAINER_TYPES },
        },
        select: CONTAINER_SELECT,
      });
      frontier = [];
      for (const child of children) {
        if (rows.has(child.id)) continue;
        rows.set(child.id, child);
        frontier.push(child.id);
      }
    }
  } else {
    const all = await db.entity.findMany({
      where: { type: { in: CONTAINER_TYPES } },
      select: CONTAINER_SELECT,
    });
    for (const row of all) rows.set(row.id, row);
  }

  // position in reading order: the chain of `order` values from the top
  type Described = {
    titles: string[];
    path: number[];
    parentId: string | null;
  };
  const described = new Map<string, Described>();
  const describe = (row: ContainerRow, guard = 0): Described => {
    const known = described.get(row.id);
    if (known) return known;
    const parent =
      row.id === scopeId || guard > 8
        ? undefined
        : row.parents.map((id) => rows.get(id)).find(Boolean);
    const above = parent
      ? describe(parent, guard + 1)
      : { titles: row.id === scopeId ? prefix : [], path: [] };
    const result = {
      titles: ROOT_TYPES.includes(row.type)
        ? above.titles
        : [...above.titles, entityTitle(row.text)],
      path: [...above.path, row.order],
      parentId: parent?.id ?? null,
    };
    described.set(row.id, result);
    return result;
  };

  return [...rows.values()]
    .map((row) => ({ row, ...describe(row) }))
    .sort((a, b) => {
      for (let i = 0; i < Math.min(a.path.length, b.path.length); i++) {
        if (a.path[i] !== b.path[i]) return a.path[i] - b.path[i];
      }
      return a.path.length - b.path.length;
    })
    .map(({ row, titles, path, parentId }) => ({
      id: row.id,
      type: row.type,
      title: entityTitle(row.text),
      reference: titles.join(" › ") || entityTitle(row.text),
      parentId,
      depth: path.length - 1,
    }));
}

type Item = {
  row: PassageRow;
  isLeaf: boolean;
  reference: string;
  text: string;
  meaning: string;
  /** hash of the text that is embedded */
  embedHash: string;
  /** hash of the text the graph is extracted from */
  graphHash: string;
  embedText: string;
};

const toItem = (
  row: PassageRow,
  container: Container,
  embed: EmbedConfig | null,
): Item => {
  const isLeaf = entityChildTypes(row.type).length === 0;
  const reference = isLeaf
    ? `${container.reference} › ${row.order + 1}`
    : `${container.reference} › ${entityTitle(row.text)}`;
  const text = pickLanguage(row.text, ["SAN", "TEL", "IAST", "ENG"]);
  const meaning = pickLanguage(row.meaning, ["ENG", "TEL", "SAN"]);
  const body = chunkText({ reference, text, meaning });
  const embedText = `${embed?.documentPrefix ?? ""}${body}`;
  return {
    row,
    isLeaf,
    reference,
    text,
    meaning,
    embedText,
    embedHash: hashText(embedText),
    graphHash: hashText(passageText({ text, meaning })),
  };
};

type KnownConcept = {
  label: string;
  aliases: Set<string>;
  description: string;
  hits: number;
};

type Run = {
  id: string;
  options: RagBuildOptions;
  embed: EmbedConfig | null;
  ai: AiConfig | null;
  signal: AbortSignal;
  counters: {
    done: number;
    embedded: number;
    extracted: number;
    failed: number;
    stage: string;
    message: string;
  };
  lastFlush: number;
  known: Map<string, KnownConcept>;
  touched: Set<string>;
  consecutiveFailures: number;
};

/** Writes progress and the heartbeat; throws when a cancel was requested. */
async function flush(run: Run, force = false) {
  if (!force && Date.now() - run.lastFlush < PROGRESS_EVERY_MS) return;
  run.lastFlush = Date.now();
  const build = await db.ragBuild.update({
    where: { id: run.id },
    data: { ...run.counters, heartbeatAt: new Date() },
    select: { cancel: true },
  });
  if (build.cancel || run.signal.aborted) throw new BuildCancelled();
}

async function withRetry<T>(run: Run, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (run.signal.aborted) throw new BuildCancelled();
    console.warn("RAG build step failed, retrying once:", error);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return work();
  }
}

async function embedItems(run: Run, container: Container, items: Item[]) {
  const embed = run.embed!;
  const model = embedModelId(embed);
  for (let i = 0; i < items.length; i += EMBED_BATCH) {
    const batch = items.slice(i, i + EMBED_BATCH);
    const vectors = await withRetry(run, () =>
      embedTexts(
        embed,
        batch.map((item) => item.embedText),
        run.signal,
      ),
    );
    await Promise.all(
      batch.map((item, j) => {
        const data = {
          parentId: container.id,
          type: item.row.type,
          order: item.row.order,
          hash: item.embedHash,
          model,
          dim: vectors[j].length,
          vector: toBytes(vectors[j]),
        };
        return db.ragChunk.upsert({
          where: { entityId: item.row.id },
          create: { entityId: item.row.id, ...data },
          update: data,
        });
      }),
    );
    run.counters.embedded += batch.length;
    run.counters.done += batch.length;
    await flush(run);
  }
}

async function saveConcepts(run: Run, extraction: Extraction) {
  for (const concept of extraction.concepts) {
    run.touched.add(concept.key);
    const known = run.known.get(concept.key);
    if (!known) {
      await db.ragConcept.upsert({
        where: { key: concept.key },
        create: {
          key: concept.key,
          kind: concept.kind,
          label: concept.label,
          original: concept.original,
          description: concept.description,
        },
        update: {},
      });
      run.known.set(concept.key, {
        label: concept.label,
        aliases: new Set(),
        description: concept.description,
        hits: 1,
      });
      continue;
    }
    known.hits++;
    const update: {
      aliases?: { push: string };
      description?: string;
      model?: string;
    } = {};
    const spelling = fold(concept.label);
    if (
      spelling !== fold(known.label) &&
      !known.aliases.has(spelling) &&
      known.aliases.size < MAX_ALIASES
    ) {
      known.aliases.add(spelling);
      update.aliases = { push: concept.label };
    }
    if (!known.description && concept.description) {
      known.description = concept.description;
      update.description = concept.description;
      // the description is part of what is embedded
      update.model = "";
    }
    if (Object.keys(update).length > 0) {
      await db.ragConcept.update({ where: { key: concept.key }, data: update });
    }
  }
}

async function extractGroup(
  run: Run,
  container: Container,
  group: Item[],
  previous: Map<string, string[]>,
) {
  const known = [...run.known.values()]
    .sort((a, b) => b.hits - a.hits)
    .slice(0, KNOWN_NAMES)
    .map((c) => c.label);
  let extraction: Extraction | null = null;
  try {
    extraction = await extractGraph(
      run.ai!,
      {
        source: container.reference,
        known,
        passages: group.map((item) => ({
          label: `verse ${item.row.order + 1}`,
          text: passageText(item),
        })),
      },
      AbortSignal.any([run.signal, AbortSignal.timeout(EXTRACT_TIMEOUT_MS)]),
    );
  } catch (error) {
    if (run.signal.aborted) throw new BuildCancelled();
    console.warn(`RAG extraction failed for ${container.reference}:`, error);
  }

  run.counters.done += group.length;
  if (!extraction || extraction.concepts.length === 0) {
    // left unmarked, so the next build tries these verses again
    run.counters.failed += group.length;
    if (++run.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      throw new Error(
        "The chat model keeps returning unusable replies for the knowledge graph. Check AI_MODEL and try again.",
      );
    }
    return;
  }
  run.consecutiveFailures = 0;

  await saveConcepts(run, extraction);
  const ids = group.map((item) => item.row.id);
  await Promise.all(
    group.map((item, i) => {
      for (const key of previous.get(item.row.id) ?? []) run.touched.add(key);
      const data = {
        parentId: container.id,
        type: item.row.type,
        order: item.row.order,
        graphHash: item.graphHash,
        mentions: extraction.mentions.get(i + 1) ?? [],
      };
      return db.ragChunk.upsert({
        where: { entityId: item.row.id },
        create: { entityId: item.row.id, ...data },
        update: data,
      });
    }),
  );
  await db.ragRelation.deleteMany({ where: { entityId: { in: ids } } });
  if (extraction.relations.length > 0) {
    await db.ragRelation.createMany({
      data: extraction.relations.map((r) => ({
        from: r.from,
        to: r.to,
        label: r.label,
        why: r.why,
        entityId: ids[(r.passage ?? 1) - 1],
        parentId: container.id,
      })),
    });
  }
  run.counters.extracted += group.length;
}

async function processContainer(
  run: Run,
  container: Container,
  rows: PassageRow[],
) {
  const items = rows.map((row) => toItem(row, container, run.embed));
  const existing = await db.ragChunk.findMany({
    where: { entityId: { in: rows.map((r) => r.id) } },
    select: {
      entityId: true,
      hash: true,
      model: true,
      graphHash: true,
      mentions: true,
    },
  });
  const chunks = new Map(existing.map((c) => [c.entityId, c]));
  run.counters.message = container.reference;

  if (run.options.embeddings) {
    run.counters.stage = "embed";
    const model = embedModelId(run.embed!);
    const pending = items.filter((item) => {
      const chunk = chunks.get(item.row.id);
      return (
        run.options.force ||
        chunk?.model !== model ||
        chunk.hash !== item.embedHash
      );
    });
    run.counters.done += items.length - pending.length;
    await embedItems(run, container, pending);
  }

  if (run.options.graph) {
    run.counters.stage = "graph";
    const leaves = items.filter(
      (item) => item.isLeaf && (item.text || item.meaning),
    );
    const pending = leaves.filter(
      (item) =>
        run.options.force ||
        chunks.get(item.row.id)?.graphHash !== item.graphHash,
    );
    run.counters.done += items.length - pending.length;
    const previous = new Map(
      existing.map((c) => [c.entityId, c.mentions.map((m) => m.key)]),
    );
    const concurrency = Math.max(
      1,
      Math.min(8, Number(process.env.AI_RAG_CONCURRENCY) || 1),
    );
    const groups: Item[][] = [];
    for (let i = 0; i < pending.length; i += GRAPH_BATCH) {
      groups.push(pending.slice(i, i + GRAPH_BATCH));
    }
    for (let i = 0; i < groups.length; i += concurrency) {
      await Promise.all(
        groups
          .slice(i, i + concurrency)
          .map((group) => extractGroup(run, container, group, previous)),
      );
      await flush(run);
    }
  }
  await flush(run);
}

/** Brings `count` in line with the index and drops concepts nothing mentions. */
export async function recountConcepts(keys: string[] | null) {
  const all =
    keys ??
    (await db.ragConcept.findMany({ select: { key: true } })).map((c) => c.key);
  for (let i = 0; i < all.length; i += 300) {
    const part = all.slice(i, i + 300);
    const counted = (await db.ragChunk.aggregateRaw({
      pipeline: [
        { $match: { "mentions.key": { $in: part } } },
        { $unwind: "$mentions" },
        { $match: { "mentions.key": { $in: part } } },
        { $group: { _id: "$mentions.key", n: { $sum: 1 } } },
      ],
    })) as unknown as { _id: string; n: number }[];
    const counts = new Map(counted.map((c) => [c._id, c.n]));
    const unused = part.filter((key) => !counts.has(key));
    await Promise.all(
      [...counts].map(([key, count]) =>
        db.ragConcept.updateMany({ where: { key }, data: { count } }),
      ),
    );
    if (unused.length > 0) {
      await db.ragConcept.deleteMany({ where: { key: { in: unused } } });
      await db.ragRelation.deleteMany({
        where: { OR: [{ from: { in: unused } }, { to: { in: unused } }] },
      });
    }
  }
}

/** Gives every concept a vector in the current embedding space. */
async function embedConcepts(run: Run) {
  const embed = run.embed;
  if (!embed) return;
  const model = embedModelId(embed);
  const pending = await db.ragConcept.findMany({
    where: { model: { not: model } },
    select: { id: true, kind: true, label: true, description: true },
  });
  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batch = pending.slice(i, i + EMBED_BATCH);
    const vectors = await withRetry(run, () =>
      embedTexts(
        embed,
        batch.map(
          (c) =>
            `${embed.documentPrefix}${c.label} (${c.kind}). ${c.description}`,
        ),
        run.signal,
      ),
    );
    await Promise.all(
      batch.map((c, j) =>
        db.ragConcept.update({
          where: { id: c.id },
          data: { model, vector: toBytes(vectors[j]) },
        }),
      ),
    );
    await flush(run);
  }
}

async function runBuild(run: Run, scopeId: string | null) {
  const stages = Number(run.options.embeddings) + Number(run.options.graph);
  const scope = scopeId
    ? await db.entity.findUnique({
        where: { id: scopeId },
        select: PASSAGE_SELECT,
      })
    : null;

  // a single verse: index just that entity, inside its chapter
  if (scope && entityChildTypes(scope.type).length === 0) {
    const titles = await ancestorTitles(scope.parents[0]);
    await db.ragBuild.update({
      where: { id: run.id },
      data: { total: stages },
    });
    if (run.options.graph) await loadKnownConcepts(run);
    await processContainer(
      run,
      {
        id: scope.parents[0],
        type: "",
        title: titles[titles.length - 1] ?? "",
        reference: titles.join(" › "),
        parentId: null,
        depth: 0,
      },
      [scope],
    );
    return;
  }

  const containers = await listContainers(scopeId);
  const ids = containers.map((c) => c.id);
  const items = await countChildren(ids);
  await db.ragBuild.update({
    where: { id: run.id },
    data: { total: items * stages },
  });
  if (run.options.graph) await loadKnownConcepts(run);

  for (const container of containers) {
    const rows = await db.entity.findMany({
      where: { id: { in: await childIds([container.id]) } },
      orderBy: { order: "asc" },
      select: PASSAGE_SELECT,
    });
    // entities deleted or moved since the last build leave the index
    const present = new Set(rows.map((r) => r.id));
    const indexed = await db.ragChunk.findMany({
      where: { parentId: container.id },
      select: { entityId: true, mentions: true },
    });
    const gone = indexed.filter((c) => !present.has(c.entityId));
    if (gone.length > 0) {
      for (const chunk of gone)
        for (const m of chunk.mentions) run.touched.add(m.key);
      const goneIds = gone.map((c) => c.entityId);
      await db.ragChunk.deleteMany({ where: { entityId: { in: goneIds } } });
      await db.ragRelation.deleteMany({ where: { entityId: { in: goneIds } } });
    }
    if (rows.length > 0) await processContainer(run, container, rows);
  }
}

async function loadKnownConcepts(run: Run) {
  const concepts = await db.ragConcept.findMany({
    select: { key: true, label: true, aliases: true, description: true },
  });
  for (const c of concepts) {
    run.known.set(c.key, {
      label: c.label,
      aliases: new Set(c.aliases.map(fold)),
      description: c.description,
      hits: 0,
    });
  }
}

async function execute(run: Run, scopeId: string | null) {
  let status = "done";
  let error: string | null = null;
  // a model call can outlast the progress updates around it: keep the
  // heartbeat going, and notice a cancel requested through another server
  const heartbeat = setInterval(() => {
    db.ragBuild
      .update({
        where: { id: run.id },
        data: { heartbeatAt: new Date() },
        select: { cancel: true },
      })
      .then((build) => {
        if (build.cancel) aborts.get(run.id)?.abort();
      })
      .catch(() => undefined);
  }, HEARTBEAT_EVERY_MS);
  try {
    await db.ragBuild.update({
      where: { id: run.id },
      data: { status: "running" },
    });
    await runBuild(run, scopeId);
    run.counters.stage = "concepts";
    run.counters.message = "Finishing";
    await flush(run, true);
    if (run.touched.size > 0) await recountConcepts([...run.touched]);
    await embedConcepts(run);
  } catch (cause) {
    if (cause instanceof BuildCancelled || run.signal.aborted) {
      status = "cancelled";
      // keep what was learned so far consistent
      if (run.touched.size > 0) {
        await recountConcepts([...run.touched]).catch(() => undefined);
      }
    } else {
      status = "failed";
      error = cause instanceof Error ? cause.message : "The build failed";
      console.error("RAG build failed:", cause);
    }
  } finally {
    clearInterval(heartbeat);
    aborts.delete(run.id);
    bumpRagEpoch();
    await db.ragBuild
      .update({
        where: { id: run.id },
        data: {
          ...run.counters,
          status,
          error,
          message: "",
          heartbeatAt: new Date(),
          finishedAt: new Date(),
        },
      })
      .catch((e) => console.error("Could not record the RAG build result:", e));
  }
}

/** Marks builds whose server went away, and returns the one still running. */
export async function liveBuild() {
  const active = await db.ragBuild.findMany({
    where: { status: { in: ["queued", "running"] } },
    orderBy: { startedAt: "desc" },
  });
  let live: (typeof active)[number] | null = null;
  for (const build of active) {
    if (!live && Date.now() - build.heartbeatAt.getTime() < STALE_BUILD_MS) {
      live = build;
      continue;
    }
    await db.ragBuild.update({
      where: { id: build.id },
      data: {
        status: "failed",
        error:
          "Interrupted (the server restarted). Start it again to continue where it stopped.",
        finishedAt: new Date(),
      },
    });
    // it never reached its own clean-up: bring the mention counts up to date
    if (build.graph) {
      await recountConcepts(null).catch((e) =>
        console.error("Recounting concepts failed:", e),
      );
      bumpRagEpoch();
    }
  }
  return live;
}

/** Starts a build in the background and returns its id. */
export async function startRagBuild(
  scopeId: string | null,
  options: RagBuildOptions,
  userId: string,
): Promise<string> {
  if (!options.embeddings && !options.graph) {
    throw new Error("Choose what to build");
  }
  const embed = getEmbedConfig();
  const chat = getAiConfig();
  // reading 100,000 verses is a lot of work: a smaller, faster model can be
  // given to the builder alone
  const ai = chat && {
    ...chat,
    model: process.env.AI_RAG_MODEL?.trim() || chat.model,
  };
  if (options.embeddings && !embed) throw new Error(EMBED_NOT_CONFIGURED);
  if (options.graph && !ai) throw new Error(AI_NOT_CONFIGURED);

  const running = await liveBuild();
  if (running) {
    throw new Error(
      `Another build is running (${running.scopeTitle}). Wait for it to finish or cancel it.`,
    );
  }

  let scopeTitle = "Entire library";
  if (scopeId) {
    const scope = await db.entity.findUnique({
      where: { id: scopeId },
      select: { text: true, type: true, order: true },
    });
    if (!scope) throw new Error("The selected content no longer exists");
    scopeTitle =
      entityChildTypes(scope.type).length === 0
        ? `Verse ${scope.order + 1}`
        : entityTitle(scope.text);
  }

  const build = await db.ragBuild.create({
    data: { scopeId, scopeTitle, userId, status: "queued", ...options },
  });
  const controller = new AbortController();
  aborts.set(build.id, controller);
  const run: Run = {
    id: build.id,
    options,
    embed,
    ai,
    signal: controller.signal,
    counters: {
      done: 0,
      embedded: 0,
      extracted: 0,
      failed: 0,
      stage: "",
      message: "",
    },
    lastFlush: 0,
    known: new Map(),
    touched: new Set(),
    consecutiveFailures: 0,
  };
  // not awaited: the request returns and the build carries on in this process
  void execute(run, scopeId);
  return build.id;
}

export async function cancelRagBuild(buildId: string) {
  await db.ragBuild.updateMany({
    where: { id: buildId, status: { in: ["queued", "running"] } },
    data: { cancel: true },
  });
  // stops a model call that is in flight, when the build runs in this process
  aborts.get(buildId)?.abort();
}

/** Removes the index of a scope (the library content itself is untouched). */
export async function removeRagIndex(scopeId: string | null) {
  const running = await liveBuild();
  if (running) throw new Error("A build is running. Cancel it first.");
  if (!scopeId) {
    await db.ragChunk.deleteMany({});
    await db.ragRelation.deleteMany({});
    await db.ragConcept.deleteMany({});
  } else {
    const containerIds = await scopeContainerIds(scopeId);
    const scope = chunkScope(containerIds);
    await db.ragChunk.deleteMany({
      where: { OR: [scope, { entityId: scopeId }] },
    });
    await db.ragRelation.deleteMany({
      where: { OR: [scope, { entityId: scopeId }] },
    });
    await recountConcepts(null);
  }
  bumpRagEpoch();
}
