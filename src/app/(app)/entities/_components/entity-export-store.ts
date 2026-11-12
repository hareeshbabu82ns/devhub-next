"use client";

import { create } from "zustand";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import type { ExportJobInfo } from "@/lib/entity-archive/export-jobs";

/**
 * Downloads of an entity with everything under it. The server prepares the
 * ZIP as a background job; this store polls it and saves the file when it is
 * ready. It lives outside React, so a download keeps going while the user
 * moves around the app.
 */

export type EntityExportPhase =
  | "starting"
  | "preparing"
  | "downloading"
  | "done"
  | "failed"
  | "cancelled";

export interface EntityExportState {
  entityId: string;
  label: string;
  jobId?: string;
  phase: EntityExportPhase;
  /** 0-100; null when it cannot be estimated */
  percent: number | null;
  message: string;
  warnings: string[];
  error?: string;
}

interface EntityExportStore {
  exports: Record<string, EntityExportState>;
}

export const useEntityExportStore = create<EntityExportStore>(() => ({
  exports: {},
}));

const POLL_MS = 1000;
const CLEAR_AFTER_MS = 8000;
const pollers = new Set<string>();

export const isExportActive = (state?: EntityExportState) =>
  !!state &&
  (state.phase === "starting" ||
    state.phase === "preparing" ||
    state.phase === "downloading");

const read = (entityId: string) =>
  useEntityExportStore.getState().exports[entityId];

const patch = (entityId: string, update: Partial<EntityExportState>) =>
  useEntityExportStore.setState((s) => {
    const current = s.exports[entityId];
    if (!current) return s;
    return { exports: { ...s.exports, [entityId]: { ...current, ...update } } };
  });

const remove = (entityId: string) =>
  useEntityExportStore.setState((s) => {
    const { [entityId]: _removed, ...rest } = s.exports;
    return { exports: rest };
  });

const clearLater = (entityId: string, jobId?: string) =>
  setTimeout(() => {
    const state = read(entityId);
    if (state && state.jobId === jobId && !isExportActive(state)) {
      remove(entityId);
    }
  }, CLEAR_AFTER_MS);

const fromJob = (
  job: ExportJobInfo,
): Pick<EntityExportState, "percent" | "message" | "warnings"> => ({
  percent: job.percent,
  message: job.message,
  warnings: job.warnings,
});

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `HTTP ${response.status}`);
  }
  return body as T;
}

function fail(entityId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Download failed";
  const state = read(entityId);
  patch(entityId, { phase: "failed", error: message, message: "Failed" });
  toast.error(`Download of ${state?.label ?? "content"} failed`, {
    description: message,
  });
}

/** Fetches the finished ZIP, reporting how much of it has arrived. */
async function fetchFile(entityId: string, jobId: string) {
  patch(entityId, {
    phase: "downloading",
    percent: 0,
    message: "Saving to your device",
  });
  const response = await fetch(`/api/entities/export/${jobId}/file`);
  if (!response.ok) await json(response);

  const filename =
    response.headers
      .get("Content-Disposition")
      ?.match(/filename="([^"]+)"/)?.[1] ?? "entity_hierarchy.zip";
  const total = Number(response.headers.get("Content-Length")) || 0;

  let blob: Blob;
  if (response.body && total > 0) {
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let received = 0;
    let lastPercent = -1;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const current = read(entityId);
      if (current?.jobId !== jobId || current.phase !== "downloading") {
        await reader.cancel();
        return null;
      }
      parts.push(value);
      received += value.length;
      const percent = Math.min(100, Math.floor((received / total) * 100));
      if (percent !== lastPercent) {
        lastPercent = percent;
        patch(entityId, {
          percent,
          message: `Saving to your device (${percent}%)`,
        });
      }
    }
    blob = new Blob(parts as BlobPart[], { type: "application/zip" });
  } else {
    blob = await response.blob();
  }
  const current = read(entityId);
  if (current?.jobId !== jobId || current.phase !== "downloading") return null;
  saveAs(blob, filename);
  return filename;
}

async function poll(entityId: string) {
  if (pollers.has(entityId)) return;
  pollers.add(entityId);
  try {
    for (;;) {
      const state = read(entityId);
      if (!state?.jobId || state.phase !== "preparing") return;
      const { job } = await json<{ job: ExportJobInfo }>(
        await fetch(`/api/entities/export/${state.jobId}`, {
          cache: "no-store",
        }),
      );
      // the user may have cancelled or restarted meanwhile
      if (read(entityId)?.jobId !== job.id) return;

      if (job.status === "running") {
        patch(entityId, fromJob(job));
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }
      if (job.status === "cancelled") {
        patch(entityId, { phase: "cancelled", message: "Cancelled" });
        clearLater(entityId, job.id);
        return;
      }
      if (job.status === "failed") {
        throw new Error(job.error || "Download failed");
      }

      patch(entityId, fromJob(job));
      const filename = await fetchFile(entityId, job.id);
      if (!filename) return; // cancelled while it was arriving
      patch(entityId, {
        phase: "done",
        percent: 100,
        message: `Downloaded ${job.totalEntities?.toLocaleString() ?? ""} entities`,
      });
      toast.success(`Downloaded ${filename}`, {
        description: job.warnings.length
          ? `Notes: ${job.warnings.join("; ")}`
          : `${job.totalEntities?.toLocaleString()} entities`,
      });
      // free the copy kept on the server
      void fetch(`/api/entities/export/${job.id}`, { method: "DELETE" });
      clearLater(entityId, job.id);
      return;
    }
  } catch (error) {
    fail(entityId, error);
  } finally {
    pollers.delete(entityId);
  }
}

/** Starts preparing a download in the background. */
export async function startEntityExport(entityId: string, label: string) {
  if (isExportActive(read(entityId))) return;
  useEntityExportStore.setState((s) => ({
    exports: {
      ...s.exports,
      [entityId]: {
        entityId,
        label,
        phase: "starting",
        percent: null,
        message: "Starting",
        warnings: [],
      },
    },
  }));
  try {
    const { job } = await json<{ job: ExportJobInfo }>(
      await fetch("/api/entities/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      }),
    );
    patch(entityId, { jobId: job.id, phase: "preparing", ...fromJob(job) });
    toast.info(`Preparing download of ${label}`, {
      description: "It continues in the background; you can keep browsing.",
    });
    void poll(entityId);
  } catch (error) {
    fail(entityId, error);
  }
}

/**
 * Picks up a download the server is still preparing (or has ready) after a
 * page reload, so its status shows again.
 */
export async function resumeEntityExport(entityId: string, label: string) {
  if (read(entityId)) return;
  try {
    const { job } = await json<{ job: ExportJobInfo | null }>(
      await fetch(
        `/api/entities/export?entityId=${encodeURIComponent(entityId)}`,
        { cache: "no-store" },
      ),
    );
    if (!job || read(entityId)) return;
    useEntityExportStore.setState((s) => ({
      exports: {
        ...s.exports,
        [entityId]: {
          entityId,
          label,
          jobId: job.id,
          phase: "preparing",
          ...fromJob(job),
        },
      },
    }));
    void poll(entityId);
  } catch {
    // status is a convenience; a failed check just shows nothing
  }
}

export async function cancelEntityExport(entityId: string) {
  const state = read(entityId);
  if (!state) return;
  if (!isExportActive(state)) {
    remove(entityId);
    return;
  }
  const jobId = state.jobId;
  patch(entityId, { phase: "cancelled", message: "Cancelled" });
  if (jobId) {
    void fetch(`/api/entities/export/${jobId}`, { method: "DELETE" });
  }
  clearLater(entityId, jobId);
}
