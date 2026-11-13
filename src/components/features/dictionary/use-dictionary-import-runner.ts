"use client";

/**
 * Runs dictionary imports from the browser, one batch per request, so the
 * page shows real progress, can cancel, and survives very large
 * dictionaries. Several dictionaries queue and run one after another.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  beginDictionaryImport,
  cancelDictionaryImport,
  finishDictionaryImport,
  importDictionaryBatch,
} from "@/app/actions/dictionary-transfer-actions";
import { DictionaryName } from "@/lib/dictionary/dictionary-constants";

export type ImportMode = "replace" | "merge";

export interface ImportSettings {
  mode: ImportMode;
  /** Empty = every row */
  limitRows?: number;
  batchSize: number;
  validate: boolean;
}

export type RunStatus = "queued" | "running" | "finishing" | "done" | "failed" | "cancelled";

export interface RunState {
  dictionary: DictionaryName;
  origin: string;
  status: RunStatus;
  total: number;
  done: number;
  written: number;
  skipped: number;
  invalid: number;
  errors: string[];
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  settings: ImportSettings;
}

export function runEta(run: RunState): number | null {
  if (run.status !== "running" || !run.startedAt || run.done === 0) return null;
  const elapsed = Date.now() - run.startedAt;
  return ((run.total - run.done) * elapsed) / run.done;
}

export function useDictionaryImportRunner(onFinished?: (run: RunState) => void) {
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const cancelled = useRef(new Set<string>());
  const queue = useRef<DictionaryName[]>([]);
  const busy = useRef(false);
  const latest = useRef(runs);
  latest.current = runs;
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const patch = useCallback((dict: string, p: Partial<RunState>) => {
    setRuns((prev) => (prev[dict] ? { ...prev, [dict]: { ...prev[dict], ...p } } : prev));
  }, []);

  const runOne = useCallback(
    async (dict: DictionaryName) => {
      const run = latest.current[dict];
      if (!run) return;
      const { settings, origin } = run;
      const fail = (error: string) => {
        patch(dict, { status: "failed", error, finishedAt: Date.now() });
        onFinishedRef.current?.({ ...latest.current[dict], status: "failed", error });
      };

      const begin = await beginDictionaryImport({
        dictionary: dict,
        mode: settings.mode,
        limitRows: settings.limitRows,
      });
      if (begin.status === "error") return fail(begin.error);
      const total = begin.data.total;
      patch(dict, { status: "running", total, startedAt: Date.now() });

      let done = 0;
      let written = 0;
      let skipped = 0;
      let invalid = 0;
      const errors: string[] = [];
      while (done < total) {
        if (cancelled.current.has(dict)) {
          if (settings.mode === "replace") await cancelDictionaryImport({ origin });
          patch(dict, { status: "cancelled", finishedAt: Date.now() });
          onFinishedRef.current?.({ ...latest.current[dict], status: "cancelled" });
          return;
        }
        const size = Math.min(settings.batchSize, total - done);
        const r = await importDictionaryBatch({
          dictionary: dict,
          mode: settings.mode,
          offset: done,
          size,
          validate: settings.validate,
        });
        if (r.status === "error") {
          if (settings.mode === "replace") await cancelDictionaryImport({ origin });
          return fail(r.error);
        }
        if (r.data.rowsRead === 0) break;
        done += r.data.rowsRead;
        written += r.data.written;
        skipped += r.data.skipped;
        invalid += r.data.invalid;
        if (errors.length < 20) errors.push(...r.data.errors.slice(0, 20 - errors.length));
        patch(dict, { done, written, skipped, invalid, errors: [...errors] });
      }

      patch(dict, { status: "finishing" });
      const fin = await finishDictionaryImport({ dictionary: dict, mode: settings.mode });
      if (fin.status === "error") {
        if (settings.mode === "replace") await cancelDictionaryImport({ origin });
        return fail(fin.error);
      }
      patch(dict, { status: "done", finishedAt: Date.now() });
      onFinishedRef.current?.({ ...latest.current[dict], status: "done", done, written });
    },
    [patch],
  );

  const pump = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      while (queue.current.length > 0) {
        const next = queue.current.shift()!;
        if (cancelled.current.has(next)) continue;
        await runOne(next).catch((e) =>
          patch(next, {
            status: "failed",
            error: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    } finally {
      busy.current = false;
    }
  }, [runOne, patch]);

  const start = useCallback(
    (items: { dictionary: DictionaryName; origin: string }[], settings: ImportSettings) => {
      const fresh = items.filter((i) => {
        const r = latest.current[i.dictionary];
        return !r || ["done", "failed", "cancelled"].includes(r.status);
      });
      if (fresh.length === 0) return;
      // Build the next state synchronously: pump() reads it right away
      const next = { ...latest.current };
      for (const i of fresh) {
        cancelled.current.delete(i.dictionary);
        next[i.dictionary] = {
          dictionary: i.dictionary,
          origin: i.origin,
          status: "queued",
          total: 0,
          done: 0,
          written: 0,
          skipped: 0,
          invalid: 0,
          errors: [],
          settings,
        };
      }
      latest.current = next;
      setRuns(next);
      queue.current.push(...fresh.map((i) => i.dictionary));
      void pump();
    },
    [pump],
  );

  const cancel = useCallback(
    (dict: DictionaryName) => {
      cancelled.current.add(dict);
      const r = latest.current[dict];
      if (r?.status === "queued") {
        patch(dict, { status: "cancelled", finishedAt: Date.now() });
      }
    },
    [patch],
  );

  const dismiss = useCallback((dict: DictionaryName) => {
    setRuns((prev) => {
      const { [dict]: _gone, ...rest } = prev;
      return rest;
    });
  }, []);

  const active = Object.values(runs).some((r) =>
    ["queued", "running", "finishing"].includes(r.status),
  );

  // Leaving mid-import would strand a half-written staging copy
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  return { runs, start, cancel, dismiss, active };
}
