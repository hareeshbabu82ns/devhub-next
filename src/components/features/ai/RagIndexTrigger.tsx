"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatabaseZap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { RagBuildInfo, RagStatus } from "@/lib/ai/rag/types";

export const ragStatusKey = (scopeId: string | null) => [
  "ragStatus",
  scopeId ?? "library",
];

const STAGE_LABEL: Record<string, string> = {
  embed: "Reading for meaning",
  graph: "Finding characters and concepts",
  concepts: "Finishing",
};

const post = async (body: object) => {
  const response = await fetch("/api/ai/rag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error ?? "Request failed");
  return json;
};

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;

const outcome = (build: RagBuildInfo) => {
  const when = new Date(build.finishedAt ?? build.startedAt).toLocaleString();
  if (build.status === "done") {
    return `Last build finished ${when}${build.failed > 0 ? ` — ${build.failed} verses could not be analysed and will be retried next time` : ""}.`;
  }
  if (build.status === "cancelled") {
    return `Last build was stopped ${when}. Build again to continue where it stopped.`;
  }
  return `Last build failed ${when}: ${build.error ?? "unknown error"}`;
};

interface RagIndexPanelProps {
  /** Book, chapter or verse to index; null for the whole library. */
  scopeId: string | null;
  scopeLabel?: string;
  /** Called when a build of this scope finishes. */
  onChanged?: () => void;
}

/**
 * Shows how much of a scope is in the knowledge index and builds it: the
 * embeddings behind semantic search, and the knowledge graph behind the
 * Universe view. Progress is polled, so the dialog can be closed while a
 * build runs.
 */
export function RagIndexPanel({
  scopeId,
  scopeLabel,
  onChanged,
}: RagIndexPanelProps) {
  const queryClient = useQueryClient();
  const [embeddings, setEmbeddings] = useState(true);
  const [graph, setGraph] = useState(true);
  const [force, setForce] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const wasRunning = useRef(false);

  const { data: status, error } = useQuery({
    queryKey: ragStatusKey(scopeId),
    queryFn: async () => {
      const response = await fetch(
        `/api/ai/rag${scopeId ? `?scopeId=${scopeId}` : ""}`,
      );
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Request failed");
      return json as RagStatus;
    },
    // follow a running build closely, otherwise stay quiet
    refetchInterval: (query) => (query.state.data?.running ? 2000 : false),
  });

  const running = status?.running ?? null;
  const isRunning = !!running;
  // tell the page when a build that we watched has ended
  useEffect(() => {
    if (wasRunning.current && !isRunning) {
      queryClient.invalidateQueries({ queryKey: ["universe"] });
      onChanged?.();
    }
    wasRunning.current = isRunning;
  }, [isRunning, onChanged, queryClient]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ragStatusKey(scopeId) });

  const start = useMutation({
    mutationFn: () =>
      post({ action: "start", scopeId, embeddings, graph, force }),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: (buildId: string) => post({ action: "cancel", buildId }),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => post({ action: "remove", scopeId }),
    onSuccess: () => {
      toast.success("Index removed");
      refresh();
      queryClient.invalidateQueries({ queryKey: ["universe"] });
      onChanged?.();
    },
    onError: (e) => toast.error(e.message),
  });

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error.message}
      </p>
    );
  }
  if (!status) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking the index…
      </p>
    );
  }

  const { coverage, can, last } = status;
  const here = running && running.scopeId === scopeId;
  const hasIndex =
    coverage.embedded + coverage.staleEmbedded + coverage.extracted > 0;
  const canStart = (embeddings && can.embeddings) || (graph && can.graph);
  const scopeName =
    scopeLabel ?? (scopeId ? "this content" : "the entire library");

  return (
    <div className="flex flex-col gap-4 text-sm">
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Items in {scopeName}</dt>
        <dd className="text-right tabular-nums">
          {coverage.items.toLocaleString()}
        </dd>
        <dt className="text-muted-foreground">Searchable by meaning</dt>
        <dd className="text-right tabular-nums">
          {coverage.embedded.toLocaleString()} (
          {percent(coverage.embedded, coverage.items)}%)
        </dd>
        <dt className="text-muted-foreground">In the knowledge graph</dt>
        <dd className="text-right tabular-nums">
          {coverage.extracted.toLocaleString()} (
          {percent(coverage.extracted, coverage.items)}%)
        </dd>
      </dl>
      {coverage.staleEmbedded > 0 && (
        <p className="rounded-md border p-2 text-muted-foreground">
          {coverage.staleEmbedded.toLocaleString()} items were indexed with a
          different embedding model and are ignored by search until rebuilt.
        </p>
      )}

      {running ? (
        <div
          className="flex flex-col gap-2 rounded-md border p-3"
          aria-live="polite"
        >
          <p className="font-medium">
            {here ? "Building" : `Building “${running.scopeTitle}”`} —{" "}
            {STAGE_LABEL[running.stage] ?? "Starting"}
          </p>
          <Progress value={percent(running.done, running.total)} />
          <p className="break-words text-muted-foreground">
            {running.done.toLocaleString()} of {running.total.toLocaleString()}{" "}
            steps
            {running.message ? ` · ${running.message}` : ""}
          </p>
          {!here && (
            <p className="text-muted-foreground">
              One build runs at a time. This one has to finish or be stopped
              before another can start.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-11 self-start"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(running.id)}
          >
            Stop
          </Button>
        </div>
      ) : (
        <>
          {last && <p className="text-muted-foreground">{outcome(last)}</p>}
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3">
              <Checkbox
                className="mt-0.5"
                checked={embeddings && can.embeddings}
                disabled={!can.embeddings}
                onCheckedChange={(v) => setEmbeddings(v === true)}
              />
              <span>
                <span className="font-medium">Semantic search</span>
                <span className="block text-muted-foreground">
                  {can.embeddings
                    ? "Lets Ask AI find verses by meaning, in any language. Fast."
                    : "Needs an embedding model: set AI_EMBED_MODEL on the server."}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <Checkbox
                className="mt-0.5"
                checked={graph && can.graph}
                disabled={!can.graph}
                onCheckedChange={(v) => setGraph(v === true)}
              />
              <span>
                <span className="font-medium">Knowledge graph</span>
                <span className="block text-muted-foreground">
                  {can.graph
                    ? "The AI reads every verse and records the characters, concepts, places and states of mind in it. Powers the Universe view and connected answers. Slow: a long book can take hours, so build chapter by chapter where it matters."
                    : "Needs a chat model: set AI_BASE_URL and AI_MODEL on the server."}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <Checkbox
                className="mt-0.5"
                checked={force}
                onCheckedChange={(v) => setForce(v === true)}
              />
              <span>
                <span className="font-medium">Rebuild from scratch</span>
                <span className="block text-muted-foreground">
                  Otherwise only new and changed items are processed.
                </span>
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-11"
              disabled={!canStart || start.isPending}
              onClick={() => start.mutate()}
            >
              {start.isPending && <Loader2 className="size-4 animate-spin" />}
              {hasIndex ? "Update index" : "Build index"}
            </Button>
            {hasIndex && (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={remove.isPending}
                onClick={() => setConfirmRemove(true)}
              >
                Remove index
              </Button>
            )}
          </div>
        </>
      )}

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove the index of {scopeName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The verses themselves are not touched. Ask AI goes back to keyword
              search here and the Universe view shows structure only, until the
              index is built again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RagIndexTriggerProps extends RagIndexPanelProps {
  /** Show a text label next to the icon. */
  label?: string;
}

/** Button that opens the knowledge-index dialog for a book, chapter or verse. */
export default function RagIndexTrigger({
  label,
  ...panel
}: RagIndexTriggerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={label ? "default" : "icon"}
          variant="outline"
          title="AI knowledge index"
          aria-label="AI knowledge index"
        >
          <DatabaseZap className="size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI knowledge index</DialogTitle>
          <DialogDescription>
            What Ask AI and the Universe view know about{" "}
            {panel.scopeLabel ??
              (panel.scopeId ? "this content" : "the entire library")}
            .
          </DialogDescription>
        </DialogHeader>
        <RagIndexPanel {...panel} />
      </DialogContent>
    </Dialog>
  );
}
