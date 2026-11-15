"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FillTask } from "@/lib/ai/fill-format";
import type { FillJobInfo, FillJobStatus } from "@/lib/ai/fill-job";
import { useMeaningLanguageAtomValue } from "@/hooks/use-config";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";
import AiFillDialog, {
  FILL_LANGUAGES,
  fillLanguage,
  TASK_LABEL,
} from "./AiFillDialog";
import AiModelPicker from "./AiModelPicker";
import { useAiModels } from "./use-ai-models";

const fillStatusKey = (scopeId: string) => ["aiFillStatus", scopeId];

const post = async (body: object) => {
  const response = await fetch("/api/ai/fill", {
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

const outcome = (job: FillJobInfo) => {
  const when = new Date(job.finishedAt ?? job.startedAt).toLocaleString();
  const counts = `${job.filled.toLocaleString()} verses filled, ${job.skipped.toLocaleString()} already had everything${job.failed > 0 ? `, ${job.failed.toLocaleString()} had a problem and will be retried next time` : ""}`;
  if (job.status === "done") return `Last fill finished ${when}: ${counts}.`;
  if (job.status === "cancelled") {
    return `Last fill was stopped ${when} (${counts}). Start again to continue where it stopped.`;
  }
  return `Last fill failed ${when}: ${job.error ?? "unknown error"} (${counts}.)`;
};

interface AiFillJobPanelProps {
  /** the book or chapter whose verses are filled */
  scopeId: string;
  scopeLabel?: string;
}

/**
 * Fills the verses of a book or chapter with AI, in the background: their
 * meaning, word-by-word meaning and the explanations of the schools.
 * Progress is polled, so the dialog can be closed while it runs.
 */
export function AiFillJobPanel({ scopeId, scopeLabel }: AiFillJobPanelProps) {
  const queryClient = useQueryClient();
  const invalidateEntities = useInvalidateEntities();
  const ai = useAiModels();
  const [tasks, setTasks] = useState<FillTask[]>(["meaning", "words"]);
  const [overwrite, setOverwrite] = useState(false);
  const [language, setLanguage] = useState(
    fillLanguage(useMeaningLanguageAtomValue()),
  );
  const [aboutScope, setAboutScope] = useState(false);
  const wasRunning = useRef(false);

  const { data: status, error } = useQuery({
    queryKey: fillStatusKey(scopeId),
    queryFn: async () => {
      const response = await fetch(`/api/ai/fill?scopeId=${scopeId}`);
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Request failed");
      return json as FillJobStatus;
    },
    refetchInterval: (query) => (query.state.data?.running ? 2000 : false),
  });

  const running = status?.running ?? null;
  const isRunning = !!running;
  // show the new meanings once a fill that we watched has ended
  useEffect(() => {
    if (wasRunning.current && !isRunning) {
      invalidateEntities();
      queryClient.invalidateQueries({ queryKey: ["entityAnnotations"] });
    }
    wasRunning.current = isRunning;
  }, [isRunning, invalidateEntities, queryClient]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: fillStatusKey(scopeId) });

  const start = useMutation({
    mutationFn: () =>
      post({
        action: "start",
        scopeId,
        meaning: tasks.includes("meaning"),
        words: tasks.includes("words"),
        schools: tasks.includes("schools"),
        overwrite,
        language,
        model: ai.selection,
      }),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: (jobId: string) => post({ action: "cancel", jobId }),
    onSuccess: refresh,
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
        <Loader2 className="size-4 animate-spin" /> Checking…
      </p>
    );
  }

  const here = running?.scopeId === scopeId;
  const scopeName = scopeLabel ?? "this content";

  return (
    <div className="flex flex-col gap-4 text-sm">
      {running ? (
        <div
          className="flex flex-col gap-2 rounded-md border p-3"
          aria-live="polite"
        >
          <p className="font-medium">
            {here ? "Filling" : `Filling “${running.scopeTitle}”`} with{" "}
            {running.model}
          </p>
          <Progress value={percent(running.done, running.total)} />
          <p className="break-words text-muted-foreground">
            {running.done.toLocaleString()} of {running.total.toLocaleString()}{" "}
            verses
            {running.failed > 0
              ? ` · ${running.failed.toLocaleString()} with a problem`
              : ""}
            {running.message ? ` · ${running.message}` : ""}
          </p>
          {!here && (
            <p className="text-muted-foreground">
              One fill runs at a time. This one has to finish or be stopped
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
          <p className="text-muted-foreground">
            {status.verses.toLocaleString()} verses in {scopeName}.
          </p>
          {status.last && (
            <p className="text-muted-foreground">{outcome(status.last)}</p>
          )}
          <div className="flex flex-col gap-3">
            {(["meaning", "words", "schools"] as const).map((task) => (
              <label key={task} className="flex items-start gap-3">
                <Checkbox
                  className="mt-0.5"
                  checked={tasks.includes(task)}
                  onCheckedChange={(v) =>
                    setTasks((all) =>
                      v === true ? [...all, task] : all.filter((t) => t !== task),
                    )
                  }
                />
                <span>
                  <span className="font-medium">{TASK_LABEL[task].title}</span>
                  <span className="block text-muted-foreground">
                    {task === "schools"
                      ? "Searches the web for every verse and saves what each school says as commentaries with their sources. Slow, and each verse costs several searches — best for a chapter at a time."
                      : TASK_LABEL[task].hint}
                  </span>
                </span>
              </label>
            ))}
            <label className="flex items-start gap-3">
              <Checkbox
                className="mt-0.5"
                checked={overwrite}
                onCheckedChange={(v) => setOverwrite(v === true)}
              />
              <span>
                <span className="font-medium">Replace what is there</span>
                <span className="block text-muted-foreground">
                  Otherwise only verses that lack it are filled. Replacing
                  overwrites existing meanings in this language, including
                  ones you wrote; commentaries and word lists written by
                  people are always kept.
                </span>
              </span>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-fill-job-language">Write in</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="ai-fill-job-language" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILL_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="ai-fill-job-model">Model</Label>
              <AiModelPicker id="ai-fill-job-model" />
            </div>
          </div>
          <p className="rounded-md border p-3 text-muted-foreground">
            This writes to every verse without you reviewing each one. Filled
            meanings are marked with an <code>ai-meaning</code> attribute on
            the verse, and AI-written notes carry “AI” in their title, so they
            can be found and checked later.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-11"
              disabled={
                tasks.length === 0 ||
                status.verses === 0 ||
                ai.configured === false ||
                start.isPending
              }
              onClick={() => start.mutate()}
            >
              {start.isPending && <Loader2 className="size-4 animate-spin" />}
              Fill {status.verses.toLocaleString()} verses
            </Button>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        <p className="font-medium">About {scopeName} as a whole</p>
        <p className="text-muted-foreground">
          Search the web for how the different schools read this text overall.
          You review the result before it is saved as commentaries, which show
          under Commentaries when editing it.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-11 self-start"
          onClick={() => setAboutScope(true)}
        >
          Find explanations…
        </Button>
      </div>
      {aboutScope && (
        <AiFillDialog
          entityId={scopeId}
          isVerse={false}
          label={scopeLabel}
          open
          onOpenChange={setAboutScope}
        />
      )}
    </div>
  );
}

/** Button that opens Fill with AI for a book or chapter. */
export default function AiFillJobTrigger(props: AiFillJobPanelProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          title="Fill with AI"
          aria-label="Fill with AI"
        >
          <WandSparkles className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fill with AI</DialogTitle>
          <DialogDescription>
            Meanings and explanations for {props.scopeLabel ?? "this content"}.
          </DialogDescription>
        </DialogHeader>
        <AiFillJobPanel {...props} />
      </DialogContent>
    </Dialog>
  );
}
