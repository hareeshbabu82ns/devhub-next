"use client";

/**
 * Runs dictionary pipeline jobs from the browser, one batch per request, so
 * the page shows real progress, can cancel, and survives very large
 * dictionaries. Jobs queue and run one after another; a "pipeline" job is a
 * capture followed by a build of the same dictionary.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adoptBatch,
  beginAdopt,
  beginBuild,
  beginCapture,
  buildBatch,
  captureBatch,
  discardStaging,
  finishBuild,
  finishCapture,
} from "@/app/actions/dictionary-pipeline-actions";
import { DictionaryName } from "@/lib/dictionary/dictionary-constants";

export type StepKind = "capture" | "adopt" | "build";

export interface RunSettings {
  batchSize: number;
  /** Capture only the first N rows (testing); empty = all */
  limitRows?: number;
  /** Rebuilds keep entries edited by hand */
  keepEdits: boolean;
  /** Continue an interrupted build instead of starting over */
  resume: boolean;
}

export type JobStatus = "queued" | "running" | "finishing" | "done" | "failed" | "cancelled";

export interface JobState {
  origin: string;
  dictionary: DictionaryName | null;
  steps: StepKind[];
  step: number;
  status: JobStatus;
  total: number;
  done: number;
  stats: {
    added: number;
    changed: number;
    unchanged: number;
    removed: number;
    written: number;
    failed: number;
    kept: number;
  };
  errors: string[];
  startedAt?: number;
  stepStartedAt?: number;
  finishedAt?: number;
  error?: string;
  settings: RunSettings;
}

export const STEP_LABEL: Record<StepKind, string> = {
  capture: "Capturing originals",
  adopt: "Keeping originals from entries",
  build: "Building search entries",
};

export function jobEta(job: JobState): number | null {
  if (job.status !== "running" || !job.stepStartedAt || job.done === 0) return null;
  const elapsed = Date.now() - job.stepStartedAt;
  return ((job.total - job.done) * elapsed) / job.done;
}

const EMPTY_STATS: JobState["stats"] = {
  added: 0,
  changed: 0,
  unchanged: 0,
  removed: 0,
  written: 0,
  failed: 0,
  kept: 0,
};

class Cancelled extends Error {}

function unwrap<T>(r: { status: "success"; data: T } | { status: "error"; error: string }): T {
  if (r.status === "error") throw new Error(r.error);
  return r.data;
}

export function useDictionaryPipelineRunner(onFinished?: (job: JobState) => void) {
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const latest = useRef(jobs);
  latest.current = jobs;
  const cancelled = useRef(new Set<string>());
  const queue = useRef<string[]>([]);
  const busy = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const patch = useCallback((origin: string, p: Partial<JobState>) => {
    const cur = latest.current[origin];
    if (!cur) return;
    const next = { ...latest.current, [origin]: { ...cur, ...p } };
    latest.current = next;
    setJobs(next);
  }, []);

  const addStats = useCallback(
    (origin: string, s: Partial<JobState["stats"]>, errors: string[] = []) => {
      const cur = latest.current[origin];
      if (!cur) return;
      const stats = { ...cur.stats };
      for (const [k, v] of Object.entries(s)) stats[k as keyof typeof stats] += v ?? 0;
      const errs = cur.errors.length < 20 ? [...cur.errors, ...errors].slice(0, 20) : cur.errors;
      patch(origin, { stats, errors: errs });
    },
    [patch],
  );

  const checkCancel = (origin: string) => {
    if (cancelled.current.has(origin)) throw new Cancelled();
  };

  const runCapture = useCallback(
    async (job: JobState) => {
      const { origin, dictionary, settings } = job;
      if (!dictionary) throw new Error("This dictionary has no source file definition");
      const begin = unwrap(
        await beginCapture({ dictionary, limitRows: settings.limitRows }),
      );
      patch(origin, { status: "running", total: begin.total, done: 0, stepStartedAt: Date.now() });
      let done = 0;
      while (done < begin.total) {
        checkCancel(origin);
        const r = unwrap(
          await captureBatch({
            dictionary,
            runId: begin.runId,
            offset: done,
            size: Math.min(settings.batchSize, begin.total - done),
            signature: begin.signature,
          }),
        );
        if (r.read === 0) break;
        done += r.read;
        addStats(origin, { added: r.added, changed: r.changed, unchanged: r.unchanged });
        patch(origin, { done });
      }
      patch(origin, { status: "finishing" });
      const fin = unwrap(
        await finishCapture({
          origin,
          runId: begin.runId,
          complete: !settings.limitRows || settings.limitRows >= begin.sourceRows,
          signature: begin.signature,
        }),
      );
      addStats(origin, { removed: fin.removed });
    },
    [patch, addStats],
  );

  const runAdopt = useCallback(
    async (job: JobState) => {
      const { origin, settings } = job;
      const begin = unwrap(await beginAdopt({ origin }));
      patch(origin, { status: "running", total: begin.total, done: 0, stepStartedAt: Date.now() });
      let after = 0;
      let done = 0;
      while (done < begin.total) {
        checkCancel(origin);
        const r = unwrap(
          await adoptBatch({ origin, runId: begin.runId, after, size: settings.batchSize }),
        );
        if (r.read === 0) break;
        done += r.read;
        after = r.last;
        addStats(origin, {
          added: r.added,
          changed: r.changed,
          unchanged: r.unchanged,
          failed: r.skipped,
        });
        patch(origin, { done });
      }
      patch(origin, { status: "finishing" });
      const fin = unwrap(
        await finishCapture({ origin, runId: begin.runId, complete: true, fromEntries: true }),
      );
      addStats(origin, { removed: fin.removed });
    },
    [patch, addStats],
  );

  const runBuild = useCallback(
    async (job: JobState) => {
      const { origin, settings } = job;
      const begin = unwrap(await beginBuild({ origin, resume: settings.resume }));
      patch(origin, {
        status: "running",
        total: begin.total,
        done: begin.done,
        stepStartedAt: Date.now(),
      });
      let cursor = begin.cursor;
      let nextIndex = begin.nextIndex;
      let done = begin.done;
      try {
        while (done < begin.total) {
          checkCancel(origin);
          const r = unwrap(
            await buildBatch({ origin, cursor, nextIndex, size: settings.batchSize }),
          );
          if (r.read === 0) break;
          done += r.read;
          cursor = r.cursor;
          nextIndex = r.nextIndex;
          addStats(origin, { written: r.written, failed: r.failed }, r.errors);
          patch(origin, { done });
        }
      } catch (e) {
        // A cancelled build is thrown away; a failed one is kept to resume
        if (e instanceof Cancelled) await discardStaging({ origin }).catch(() => {});
        throw e;
      }
      patch(origin, { status: "finishing" });
      const fin = unwrap(await finishBuild({ origin, keepEdits: settings.keepEdits }));
      addStats(origin, { kept: fin.kept });
    },
    [patch, addStats],
  );

  const runJob = useCallback(
    async (origin: string) => {
      const job = latest.current[origin];
      if (!job) return;
      patch(origin, { status: "running", startedAt: Date.now() });
      try {
        for (let i = 0; i < job.steps.length; i++) {
          checkCancel(origin);
          patch(origin, { step: i, total: 0, done: 0 });
          const current = latest.current[origin];
          const step = job.steps[i];
          if (step === "capture") await runCapture(current);
          else if (step === "adopt") await runAdopt(current);
          else await runBuild(current);
        }
        patch(origin, { status: "done", finishedAt: Date.now() });
      } catch (e) {
        if (e instanceof Cancelled) {
          patch(origin, { status: "cancelled", finishedAt: Date.now() });
        } else {
          patch(origin, {
            status: "failed",
            error: e instanceof Error ? e.message : String(e),
            finishedAt: Date.now(),
          });
        }
      }
      onFinishedRef.current?.(latest.current[origin]);
    },
    [patch, runCapture, runAdopt, runBuild],
  );

  const pump = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      while (queue.current.length > 0) {
        const next = queue.current.shift()!;
        if (cancelled.current.has(next)) continue;
        await runJob(next);
      }
    } finally {
      busy.current = false;
    }
  }, [runJob]);

  const start = useCallback(
    (
      items: { origin: string; dictionary: DictionaryName | null }[],
      steps: StepKind[],
      settings: RunSettings,
    ) => {
      const next = { ...latest.current };
      const added: string[] = [];
      for (const i of items) {
        const cur = next[i.origin];
        if (cur && ["queued", "running", "finishing"].includes(cur.status)) continue;
        cancelled.current.delete(i.origin);
        next[i.origin] = {
          origin: i.origin,
          dictionary: i.dictionary,
          steps,
          step: 0,
          status: "queued",
          total: 0,
          done: 0,
          stats: { ...EMPTY_STATS },
          errors: [],
          settings,
        };
        added.push(i.origin);
      }
      if (added.length === 0) return 0;
      latest.current = next;
      setJobs(next);
      queue.current.push(...added);
      void pump();
      return added.length;
    },
    [pump],
  );

  const cancel = useCallback(
    (origin: string) => {
      cancelled.current.add(origin);
      if (latest.current[origin]?.status === "queued") {
        patch(origin, { status: "cancelled", finishedAt: Date.now() });
      }
    },
    [patch],
  );

  const dismiss = useCallback((origin: string) => {
    const { [origin]: _gone, ...rest } = latest.current;
    latest.current = rest;
    setJobs(rest);
  }, []);

  const active = Object.values(jobs).some((j) =>
    ["queued", "running", "finishing"].includes(j.status),
  );

  // Leaving mid-run would stop the job part-way
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  return { jobs, start, cancel, dismiss, active };
}
