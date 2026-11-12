import { randomUUID } from "crypto";
import {
  ExportCancelled,
  ExportProgress,
  ExportStage,
  exportEntityArchive,
} from "./server";

/**
 * Background exports. A download of a large book can take a while to build,
 * so it runs here, detached from the request that started it; the browser
 * polls the job and fetches the finished ZIP when it is ready. Jobs live in
 * this server process only (a restart drops them) and finished ZIPs are
 * kept for a limited time.
 */

export type ExportJobStatus = "running" | "ready" | "failed" | "cancelled";

export interface ExportJobInfo {
  id: string;
  entityId: string;
  status: ExportJobStatus;
  stage: ExportStage | null;
  /** 0-100 overall; null while it cannot be estimated */
  percent: number | null;
  message: string;
  filename?: string;
  size?: number;
  totalEntities?: number;
  warnings: string[];
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

interface ExportJob extends ExportJobInfo {
  userId: string;
  cancel: boolean;
  data?: Buffer;
}

const KEEP_FINISHED_MS = 30 * 60 * 1000;
const MAX_JOBS_PER_USER = 3;

// share one registry across hot reloads and route modules
const globalJobs = globalThis as unknown as {
  __entityExportJobs?: Map<string, ExportJob>;
};
const jobs = (globalJobs.__entityExportJobs ??= new Map());

function prune() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (
      job.finishedAt &&
      now - new Date(job.finishedAt).getTime() > KEEP_FINISHED_MS
    ) {
      jobs.delete(id);
    }
  }
}

// share of the overall bar each stage covers
const STAGE_RANGE: Record<ExportStage, [number, number]> = {
  reading: [0, 50],
  notes: [50, 70],
  packing: [70, 100],
};

function describe(progress: ExportProgress): Pick<ExportJobInfo, "percent" | "message"> {
  const [from, to] = STAGE_RANGE[progress.stage];
  const fraction =
    progress.total > 0 ? Math.min(1, progress.done / progress.total) : 0;
  const percent = Math.round(from + (to - from) * fraction);
  switch (progress.stage) {
    case "reading":
      return {
        percent,
        message: `Reading content (${progress.done.toLocaleString()} found)`,
      };
    case "notes":
      return { percent, message: "Reading commentaries and playgrounds" };
    case "packing":
      return { percent, message: `Packing ZIP (${progress.done}%)` };
  }
}

export const toJobInfo = (job: ExportJob): ExportJobInfo => ({
  id: job.id,
  entityId: job.entityId,
  status: job.status,
  stage: job.stage,
  percent: job.percent,
  message: job.message,
  filename: job.filename,
  size: job.size,
  totalEntities: job.totalEntities,
  warnings: job.warnings,
  error: job.error,
  startedAt: job.startedAt,
  finishedAt: job.finishedAt,
});

/** Starts an export, or returns the user's export of that entity already underway. */
export function startExportJob(
  entityId: string,
  user: { id: string; isAdmin: boolean },
): ExportJobInfo {
  prune();
  const existing = [...jobs.values()].find(
    (j) =>
      j.userId === user.id && j.entityId === entityId && j.status === "running",
  );
  if (existing) return toJobInfo(existing);

  const running = [...jobs.values()].filter(
    (j) => j.userId === user.id && j.status === "running",
  ).length;
  if (running >= MAX_JOBS_PER_USER) {
    throw new Error(
      `${running} downloads are already being prepared; wait for one to finish`,
    );
  }

  const job: ExportJob = {
    id: randomUUID(),
    entityId,
    userId: user.id,
    status: "running",
    stage: null,
    percent: 0,
    message: "Starting",
    warnings: [],
    startedAt: new Date().toISOString(),
    cancel: false,
  };
  jobs.set(job.id, job);

  // deliberately not awaited: the request returns while this runs
  void exportEntityArchive(entityId, user, {
    onProgress: (progress) => {
      job.stage = progress.stage;
      Object.assign(job, describe(progress));
    },
    isCancelled: () => job.cancel,
  })
    .then((result) => {
      job.data = result.data;
      job.size = result.data.length;
      job.filename = result.filename;
      job.totalEntities = result.totalEntities;
      job.warnings = result.warnings;
      job.status = "ready";
      job.percent = 100;
      job.message = `Ready (${result.totalEntities.toLocaleString()} entities)`;
    })
    .catch((error) => {
      if (error instanceof ExportCancelled) {
        job.status = "cancelled";
        job.message = "Cancelled";
      } else {
        console.error(`Export ${job.id} of ${entityId} failed:`, error);
        job.status = "failed";
        job.error = error instanceof Error ? error.message : String(error);
        job.message = "Failed";
      }
    })
    .finally(() => {
      job.finishedAt = new Date().toISOString();
    });

  return toJobInfo(job);
}

export function getExportJob(id: string, userId: string): ExportJob | null {
  prune();
  const job = jobs.get(id);
  return job && job.userId === userId ? job : null;
}

/** The user's most recent export of an entity that is still useful to show. */
export function latestExportJob(
  entityId: string,
  userId: string,
): ExportJob | null {
  prune();
  let latest: ExportJob | null = null;
  for (const job of jobs.values()) {
    if (job.userId !== userId || job.entityId !== entityId) continue;
    if (job.status !== "running" && job.status !== "ready") continue;
    if (!latest || job.startedAt > latest.startedAt) latest = job;
  }
  return latest;
}

export function cancelExportJob(id: string, userId: string): boolean {
  const job = getExportJob(id, userId);
  if (!job) return false;
  if (job.status === "running") job.cancel = true;
  else jobs.delete(id);
  return true;
}
