"use client";

import { useEffect } from "react";
import { CheckCircle2, Loader2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Icons } from "@/components/utils/icons";
import { cn } from "@/lib/utils";
import {
  cancelEntityExport,
  isExportActive,
  resumeEntityExport,
  startEntityExport,
  useEntityExportStore,
} from "./entity-export-store";

const useEntityExport = (entityId: string) =>
  useEntityExportStore((s) => s.exports[entityId]);

/** Download button that turns into a spinner with progress while it works. */
export function EntityExportButton({
  entityId,
  label,
}: {
  entityId: string;
  label: string;
}) {
  const state = useEntityExport(entityId);
  const active = isExportActive(state);
  const percent = state?.percent;

  return (
    <Button
      type="button"
      variant="outline"
      size={active ? "default" : "icon"}
      className={cn(active && "gap-1.5 px-2.5 tabular-nums")}
      disabled={active}
      aria-busy={active}
      title={
        active ? state?.message : "Download with everything under it (ZIP)"
      }
      aria-label={
        active
          ? `Preparing download${percent != null ? `, ${percent}%` : ""}`
          : "Download with children"
      }
      onClick={() => void startEntityExport(entityId, label)}
    >
      {active ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span className="text-xs">
            {percent != null ? `${percent}%` : "…"}
          </span>
        </>
      ) : (
        <Icons.download className="size-4" />
      )}
    </Button>
  );
}

/**
 * Status of this entity's download: a progress strip while it is prepared
 * and saved, and the outcome for a few seconds after.
 */
export function EntityExportStatus({
  entityId,
  label,
}: {
  entityId: string;
  label: string;
}) {
  const state = useEntityExport(entityId);

  useEffect(() => {
    void resumeEntityExport(entityId, label);
  }, [entityId, label]);

  if (!state) return null;
  const active = isExportActive(state);
  const failed = state.phase === "failed";
  const done = state.phase === "done";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mt-2 flex items-start gap-3 rounded-md border bg-card px-3 py-2 text-sm",
        failed && "border-destructive/50",
      )}
    >
      <span className="mt-0.5 shrink-0">
        {active ? (
          <Loader2 className="size-4 animate-spin text-primary" />
        ) : failed ? (
          <TriangleAlert className="size-4 text-destructive" />
        ) : done ? (
          <CheckCircle2 className="size-4 text-primary" />
        ) : (
          <X className="size-4 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-medium">
            {failed
              ? "Download failed"
              : done
                ? "Download complete"
                : state.phase === "cancelled"
                  ? "Download cancelled"
                  : "Preparing download"}
          </span>
          {active && state.percent != null && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {state.percent}%
            </span>
          )}
        </div>
        <p className="break-words text-xs text-muted-foreground">
          {failed ? state.error : state.message}
          {active && " · you can keep browsing"}
        </p>
        {active && (
          <Progress
            value={state.percent ?? undefined}
            className={cn("h-1.5", state.percent == null && "animate-pulse")}
          />
        )}
        {done && state.warnings.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Notes: {state.warnings.join("; ")}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 shrink-0 px-2"
        onClick={() => void cancelEntityExport(entityId)}
      >
        {active ? "Cancel" : "Dismiss"}
      </Button>
    </div>
  );
}
