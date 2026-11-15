import { db } from "@/lib/db";
import { LANGUAGES } from "@/lib/constants";
import { entityChildTypes } from "@/lib/entity-types";
import { setLanguageValue } from "@/lib/entity-text";
import type { AiConfig, AiSelection } from "./config";
import { requireAiConfig } from "./providers";
import { fillEntity, toSubject } from "./fill";
import {
  FillResult,
  FillTask,
  isAiTitle,
  schoolAnnotation,
  wordsAnnotationTitle,
  wordsToMarkdown,
} from "./fill-format";
import {
  childIds,
  containerIdsUnder,
  countChildren,
  entityTitle,
  PASSAGE_SELECT,
  withReferences,
} from "./retrieval";

/**
 * "Fill with AI" for a whole book or chapter: goes through its verses one by
 * one and writes what is missing. Runs in this server process like the
 * knowledge-index build; progress is kept in `AiFillJob` so the dialog can be
 * closed and any browser can follow or stop it.
 */

export type FillJobOptions = {
  meaning: boolean;
  words: boolean;
  schools: boolean;
  overwrite: boolean;
  language: string;
};

export type FillJobInfo = FillJobOptions & {
  id: string;
  scopeId: string;
  scopeTitle: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  /** "OpenAI · gpt-4o" */
  model: string;
  total: number;
  done: number;
  filled: number;
  skipped: number;
  failed: number;
  message: string;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type FillJobStatus = {
  /** the job in progress, whatever its scope */
  running: FillJobInfo | null;
  /** the most recent job of this scope */
  last: FillJobInfo | null;
  /** verses in this scope */
  verses: number;
};

/** Attribute recording that a verse's meaning was machine-written. */
export const AI_MEANING_ATTRIBUTE = "ai-meaning";

const STALE_JOB_MS = 3 * 60 * 1000;
const PROGRESS_EVERY_MS = 1500;
const HEARTBEAT_EVERY_MS = 20 * 1000;
const ITEM_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_CONSECUTIVE_FAILURES = 5;

const globalForJobs = globalThis as unknown as {
  aiFillAborts?: Map<string, AbortController>;
};
const aborts = (globalForJobs.aiFillAborts ??= new Map());

class JobCancelled extends Error {}

type Run = {
  id: string;
  options: FillJobOptions;
  tasks: FillTask[];
  config: AiConfig;
  userId: string;
  signal: AbortSignal;
  counters: {
    done: number;
    filled: number;
    skipped: number;
    failed: number;
    message: string;
  };
  lastFlush: number;
  consecutiveFailures: number;
};

const SELECT = { ...PASSAGE_SELECT, attributes: true } as const;

async function flush(run: Run, force = false) {
  if (!force && Date.now() - run.lastFlush < PROGRESS_EVERY_MS) return;
  run.lastFlush = Date.now();
  const job = await db.aiFillJob.update({
    where: { id: run.id },
    data: { ...run.counters, heartbeatAt: new Date() },
    select: { cancel: true },
  });
  if (job.cancel || run.signal.aborted) throw new JobCancelled();
}

/**
 * Saves what the model produced for one entity. Returns how many things were
 * written. With `replaceAi`, earlier AI-written annotations of the same kind
 * and language make way for the new ones; anything a person wrote is kept.
 */
export async function saveFillResult(
  entity: {
    id: string;
    meaning: { language: string; value: string }[];
    attributes: { key: string; value: string }[];
  },
  result: FillResult,
  language: string,
  userId: string,
  replaceAi: boolean,
): Promise<number> {
  let written = 0;
  if (result.meaning) {
    await db.entity.update({
      where: { id: entity.id },
      data: {
        meaning: setLanguageValue(entity.meaning, language, result.meaning),
        attributes: [
          ...entity.attributes.filter((a) => a.key !== AI_MEANING_ATTRIBUTE),
          { key: AI_MEANING_ATTRIBUTE, value: `${language} · ${result.model}` },
        ],
      },
    });
    written++;
  }

  const addAnnotations = async (
    kind: string,
    items: { title: string; text: string }[],
  ) => {
    if (items.length === 0) return;
    if (replaceAi) {
      const earlier = await db.entityAnnotation.findMany({
        where: { entityId: entity.id, kind, language },
        select: { id: true, title: true },
      });
      const ids = earlier.filter((a) => isAiTitle(a.title)).map((a) => a.id);
      if (ids.length > 0) {
        await db.entityAnnotation.deleteMany({ where: { id: { in: ids } } });
      }
    }
    const last = await db.entityAnnotation.findFirst({
      where: { entityId: entity.id, kind },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let order = last ? last.order + 1 : 0;
    for (const item of items) {
      await db.entityAnnotation.create({
        data: { entityId: entity.id, kind, language, ...item, order: order++, userId },
      });
      written++;
    }
  };

  if (result.words?.length) {
    await addAnnotations("WORD_MEANING", [
      {
        title: wordsAnnotationTitle(result.model),
        text: wordsToMarkdown(result.words),
      },
    ]);
  }
  if (result.schools?.length) {
    await addAnnotations("COMMENTARY", result.schools.map(schoolAnnotation));
  }
  return written;
}

async function processContainer(run: Run, containerId: string) {
  const { language, overwrite } = run.options;
  const rows = await db.entity.findMany({
    where: { id: { in: await childIds([containerId], true) } },
    orderBy: { order: "asc" },
    select: SELECT,
  });
  if (rows.length === 0) return;
  const passages = await withReferences(rows, run.userId);
  const annotations = await db.entityAnnotation.findMany({
    where: {
      entityId: { in: rows.map((r) => r.id) },
      kind: { in: ["WORD_MEANING", "COMMENTARY"] },
      language,
    },
    select: { entityId: true, kind: true, title: true },
  });
  const has = (entityId: string, kind: string, aiOnly: boolean) =>
    annotations.some(
      (a) =>
        a.entityId === entityId &&
        a.kind === kind &&
        (!aiOnly || isAiTitle(a.title)),
    );

  for (const [i, row] of rows.entries()) {
    const reference = passages[i].reference;
    const tasks = run.tasks.filter((task) => {
      if (overwrite) return true;
      if (task === "meaning") {
        return !row.meaning.some((m) => m.language === language && m.value.trim());
      }
      if (task === "words") return !has(row.id, "WORD_MEANING", false);
      // commentaries people added do not stand in for the web research
      return !has(row.id, "COMMENTARY", true);
    });
    run.counters.message = reference;
    if (tasks.length === 0) {
      run.counters.skipped++;
      run.counters.done++;
      await flush(run);
      continue;
    }
    await flush(run, true);

    let result: FillResult;
    try {
      result = await fillEntity(
        run.config,
        toSubject(row, reference),
        tasks,
        language,
        AbortSignal.any([run.signal, AbortSignal.timeout(ITEM_TIMEOUT_MS)]),
      );
    } catch (error) {
      if (run.signal.aborted) throw new JobCancelled();
      result = {
        model: run.config.label,
        errors: Object.fromEntries(
          tasks.map((t) => [
            t,
            error instanceof Error ? error.message : "The AI request failed",
          ]),
        ),
      };
    }
    const written = await saveFillResult(
      row,
      result,
      language,
      run.userId,
      overwrite,
    );
    const errors = Object.values(result.errors);
    if (written > 0) run.counters.filled++;
    if (errors.length > 0) run.counters.failed++;
    run.counters.done++;

    // every task failing, verse after verse, means the model or the search
    // is not working: stop instead of burning through the whole book
    if (errors.length === tasks.length) {
      if (++run.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        throw new Error(
          `Stopped after ${MAX_CONSECUTIVE_FAILURES} verses in a row failed: ${errors[0]}`,
        );
      }
    } else {
      run.consecutiveFailures = 0;
    }
    await flush(run);
  }
}

async function execute(run: Run, scopeId: string) {
  let status = "done";
  let error: string | null = null;
  const heartbeat = setInterval(() => {
    db.aiFillJob
      .update({
        where: { id: run.id },
        data: { heartbeatAt: new Date() },
        select: { cancel: true },
      })
      .then((job) => {
        if (job.cancel) aborts.get(run.id)?.abort();
      })
      .catch(() => undefined);
  }, HEARTBEAT_EVERY_MS);
  try {
    const scope = await db.entity.findUnique({
      where: { id: scopeId },
      select: { type: true, parents: true },
    });
    if (!scope) throw new Error("The selected content no longer exists");
    const isVerse = entityChildTypes(scope.type).length === 0;
    const containers = isVerse ? [] : await containerIdsUnder(scopeId);
    await db.aiFillJob.update({
      where: { id: run.id },
      data: {
        status: "running",
        total: isVerse ? 1 : await countChildren(containers, true),
      },
    });
    for (const containerId of containers) {
      await processContainer(run, containerId);
    }
    run.counters.message = "";
    await flush(run, true);
  } catch (cause) {
    if (cause instanceof JobCancelled || run.signal.aborted) {
      status = "cancelled";
    } else {
      status = "failed";
      error = cause instanceof Error ? cause.message : "The job failed";
      console.error("AI fill job failed:", cause);
    }
  } finally {
    clearInterval(heartbeat);
    aborts.delete(run.id);
    await db.aiFillJob
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
      .catch((e) => console.error("Could not record the AI fill result:", e));
  }
}

/** Marks jobs whose server went away, and returns the one still running. */
export async function liveFillJob() {
  const active = await db.aiFillJob.findMany({
    where: { status: { in: ["queued", "running"] } },
    orderBy: { startedAt: "desc" },
  });
  let live: (typeof active)[number] | null = null;
  for (const job of active) {
    if (!live && Date.now() - job.heartbeatAt.getTime() < STALE_JOB_MS) {
      live = job;
      continue;
    }
    await db.aiFillJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error:
          "Interrupted (the server restarted). Start it again: verses already filled are skipped.",
        finishedAt: new Date(),
      },
    });
  }
  return live;
}

/** Starts a job in the background and returns its id. */
export async function startFillJob(
  scopeId: string,
  options: FillJobOptions,
  userId: string,
  selection?: AiSelection | null,
): Promise<string> {
  if (!options.meaning && !options.words && !options.schools) {
    throw new Error("Choose what to fill in");
  }
  if (!(LANGUAGES as readonly string[]).includes(options.language)) {
    throw new Error("Unknown language");
  }
  const config = await requireAiConfig(selection, userId);
  const running = await liveFillJob();
  if (running) {
    throw new Error(
      `Another fill is running (${running.scopeTitle}). Wait for it to finish or stop it.`,
    );
  }
  const scope = await db.entity.findUnique({
    where: { id: scopeId },
    select: { text: true, type: true },
  });
  if (!scope) throw new Error("The selected content no longer exists");
  if (entityChildTypes(scope.type).length === 0) {
    throw new Error("Open the verse and use Fill with AI there.");
  }

  const job = await db.aiFillJob.create({
    data: {
      scopeId,
      scopeTitle: entityTitle(scope.text),
      userId,
      status: "queued",
      ...options,
      providerId: config.providerId,
      model: config.label,
    },
  });
  const controller = new AbortController();
  aborts.set(job.id, controller);
  const run: Run = {
    id: job.id,
    options,
    tasks: (["meaning", "words", "schools"] as const).filter((t) => options[t]),
    config,
    userId,
    signal: controller.signal,
    counters: { done: 0, filled: 0, skipped: 0, failed: 0, message: "" },
    lastFlush: 0,
    consecutiveFailures: 0,
  };
  // not awaited: the request returns and the job carries on in this process
  void execute(run, scopeId);
  return job.id;
}

export async function cancelFillJob(jobId: string) {
  await db.aiFillJob.updateMany({
    where: { id: jobId, status: { in: ["queued", "running"] } },
    data: { cancel: true },
  });
  aborts.get(jobId)?.abort();
}

type JobRow = NonNullable<Awaited<ReturnType<typeof liveFillJob>>>;

const jobInfo = (job: JobRow): FillJobInfo => ({
  id: job.id,
  scopeId: job.scopeId,
  scopeTitle: job.scopeTitle,
  status: job.status as FillJobInfo["status"],
  meaning: job.meaning,
  words: job.words,
  schools: job.schools,
  overwrite: job.overwrite,
  language: job.language,
  model: job.model,
  total: job.total,
  done: job.done,
  filled: job.filled,
  skipped: job.skipped,
  failed: job.failed,
  message: job.message ?? "",
  error: job.error,
  startedAt: job.startedAt.toISOString(),
  finishedAt: job.finishedAt?.toISOString() ?? null,
});

export async function fillJobStatus(scopeId: string): Promise<FillJobStatus> {
  const scope = await db.entity.findUnique({
    where: { id: scopeId },
    select: { type: true },
  });
  const isContainer = !!scope && entityChildTypes(scope.type).length > 0;
  const [running, last, verses] = await Promise.all([
    liveFillJob(),
    db.aiFillJob.findFirst({
      where: { scopeId },
      orderBy: { startedAt: "desc" },
    }),
    isContainer
      ? containerIdsUnder(scopeId).then((ids) => countChildren(ids, true))
      : 0,
  ]);
  return {
    running: running ? jobInfo(running) : null,
    last: last ? jobInfo(last) : null,
    verses,
  };
}
