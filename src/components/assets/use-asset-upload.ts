"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AssetItem } from "@/lib/assets/shared";

export interface UploadTask {
  id: string;
  name: string;
  size: number;
  folder: string;
  /** 0–100 */
  progress: number;
  status: "queued" | "uploading" | "done" | "error" | "cancelled";
  error?: string;
  item?: AssetItem;
}

export interface UploadOptions {
  /** replace a file of the same name instead of numbering the new one */
  overwrite?: boolean;
}

/** Uploads one file with progress; resolves with the stored asset. */
export function uploadAsset(
  file: File,
  folder: string,
  options: UploadOptions & {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<AssetItem> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("path", folder);
    if (options.overwrite) formData.append("overwrite", "true");
    formData.append("media", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.responseType = "text";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        options.onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // not JSON: a proxy error page or a sign-in redirect
      }
      const item: AssetItem | undefined = body?.data?.items?.[0];
      if (xhr.status >= 200 && xhr.status < 300 && item) resolve(item);
      else if (xhr.status === 413) reject(new Error("File is too large"));
      else reject(new Error(body?.error || `Upload failed (${xhr.status})`));
    };
    options.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(formData);
  });
}

let taskCounter = 0;

/**
 * Upload queue: files go up one at a time, each with its own progress and
 * error, and asset listings refresh as files land.
 */
export function useAssetUpload() {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const cancelled = useRef(new Set<string>());
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  const patch = useCallback((id: string, changes: Partial<UploadTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t)),
    );
  }, []);

  /** Resolves with the files that were stored (failures are left in `tasks`). */
  const upload = useCallback(
    (files: File[], folder: string, options: UploadOptions = {}) => {
      const batch = files.map((file) => ({
        file,
        task: {
          id: `upload-${++taskCounter}`,
          name: file.name,
          size: file.size,
          folder,
          progress: 0,
          status: "queued",
        } as UploadTask,
      }));
      setTasks((prev) => [...prev, ...batch.map((b) => b.task)]);

      const run = async () => {
        const stored: AssetItem[] = [];
        for (const { file, task } of batch) {
          if (cancelled.current.delete(task.id)) {
            patch(task.id, { status: "cancelled" });
            continue;
          }
          const controller = new AbortController();
          controllers.current.set(task.id, controller);
          patch(task.id, { status: "uploading" });
          try {
            const item = await uploadAsset(file, folder, {
              ...options,
              signal: controller.signal,
              onProgress: (progress) => patch(task.id, { progress }),
            });
            stored.push(item);
            patch(task.id, { status: "done", progress: 100, item });
          } catch (e: any) {
            patch(
              task.id,
              e?.name === "AbortError"
                ? { status: "cancelled" }
                : { status: "error", error: e?.message || "Upload failed" },
            );
          } finally {
            controllers.current.delete(task.id);
          }
        }
        if (stored.length) {
          await queryClient.invalidateQueries({ queryKey: ["assets"] });
        }
        return stored;
      };

      const result = chain.current.then(run, run);
      chain.current = result.catch(() => {});
      return result;
    },
    [patch, queryClient],
  );

  const cancel = useCallback((id: string) => {
    const controller = controllers.current.get(id);
    if (controller) controller.abort();
    else cancelled.current.add(id); // still waiting its turn
  }, []);

  /** Removes finished, failed and cancelled entries from the list. */
  const clearFinished = useCallback(() => {
    setTasks((prev) =>
      prev.filter((t) => t.status === "queued" || t.status === "uploading"),
    );
  }, []);

  const active = tasks.some(
    (t) => t.status === "queued" || t.status === "uploading",
  );

  return { tasks, upload, cancel, clearFinished, active };
}
