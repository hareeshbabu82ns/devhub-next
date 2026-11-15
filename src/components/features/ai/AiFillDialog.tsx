"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES_DDLB } from "@/lib/constants";
import {
  FillResult,
  FillTask,
  schoolAnnotation,
  wordsAnnotationTitle,
  wordsToMarkdown,
} from "@/lib/ai/fill-format";
import { useMeaningLanguageAtomValue } from "@/hooks/use-config";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";
import { saveAnnotation } from "@/app/(app)/entities/annotation-actions";
import { updateEntityContent } from "@/app/(app)/entities/actions";
import AiModelPicker from "./AiModelPicker";
import { useAiModels } from "./use-ai-models";

/** Languages a meaning can be written in (not the transliteration schemes). */
export const FILL_LANGUAGES = LANGUAGES_DDLB.filter((l) =>
  ["ENG", "TEL", "TAM", "SAN"].includes(l.value),
);

export const fillLanguage = (preferred: string | undefined) =>
  FILL_LANGUAGES.some((l) => l.value === preferred) ? preferred! : "ENG";

export const TASK_LABEL: Record<FillTask, { title: string; hint: string }> = {
  meaning: {
    title: "Meaning",
    hint: "A translation of the whole verse.",
  },
  words: {
    title: "Word-by-word meaning",
    hint: "Each word of the verse with its meaning, saved under Word-by-word meaning.",
  },
  schools: {
    title: "Explanations from different schools",
    hint: "Searches the web for how Advaita, Viśiṣṭādvaita, Dvaita and other traditions explain it, and saves each as a commentary with its sources. Takes a minute or two.",
  },
};

/** One thing the AI proposed, as the person can edit and accept it. */
type Draft = {
  key: string;
  task: FillTask;
  heading: string;
  use: boolean;
  /** commentator or source line; not used for the meaning */
  title: string;
  text: string;
};

const toDrafts = (result: FillResult): Draft[] => [
  ...(result.meaning
    ? [
        {
          key: "meaning",
          task: "meaning" as const,
          heading: "Meaning",
          use: true,
          title: "",
          text: result.meaning,
        },
      ]
    : []),
  ...(result.words?.length
    ? [
        {
          key: "words",
          task: "words" as const,
          heading: "Word-by-word meaning",
          use: true,
          title: wordsAnnotationTitle(result.model),
          text: wordsToMarkdown(result.words),
        },
      ]
    : []),
  ...(result.schools ?? []).map((school, i) => ({
    key: `school-${i}`,
    task: "schools" as const,
    heading: school.school,
    use: true,
    ...schoolAnnotation(school),
  })),
];

interface AiFillDialogProps {
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** a book or chapter has no meaning of its own: only explanations */
  isVerse?: boolean;
  /** what the dialog is about, e.g. the verse's first words */
  label?: string;
  /** the text as it stands in the editor, when it may not be saved yet */
  currentText?: string;
  /**
   * Inside an editor: receives the accepted meaning to put in its meaning
   * field. Without it the meaning is saved to the entity straight away.
   */
  onApplyMeaning?: (language: string, value: string) => void;
}

/**
 * Asks the chosen model for the meaning, the word-by-word meaning and the
 * explanations of the schools, and lets the person review and edit each
 * before anything is saved.
 */
export default function AiFillDialog({
  entityId,
  open,
  onOpenChange,
  isVerse = true,
  label,
  currentText,
  onApplyMeaning,
}: AiFillDialogProps) {
  const queryClient = useQueryClient();
  const invalidateEntities = useInvalidateEntities();
  const ai = useAiModels();
  const available: FillTask[] = isVerse
    ? ["meaning", "words", "schools"]
    : ["schools"];
  const [tasks, setTasks] = useState<FillTask[]>(
    isVerse ? ["meaning", "words"] : ["schools"],
  );
  const [language, setLanguage] = useState(
    fillLanguage(useMeaningLanguageAtomValue()),
  );
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<FillResult | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // closing the dialog stops a request that is still running
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setFailure(null);
    setResult(null);
    setDrafts([]);
    try {
      const response = await fetch("/api/ai/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest",
          entityId,
          tasks,
          language,
          text: currentText?.trim() || undefined,
          model: ai.selection,
        }),
        signal: controller.signal,
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Request failed");
      const filled = json as FillResult;
      setResult(filled);
      setDrafts(toDrafts(filled));
    } catch (error) {
      if (!controller.signal.aborted) {
        setFailure(error instanceof Error ? error.message : "Request failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const patch = (key: string, change: Partial<Draft>) =>
    setDrafts((all) =>
      all.map((d) => (d.key === key ? { ...d, ...change } : d)),
    );

  const accepted = drafts.filter((d) => d.use && d.text.trim());

  const apply = async () => {
    setSaving(true);
    try {
      for (const draft of accepted) {
        if (draft.task === "meaning") {
          if (onApplyMeaning) {
            onApplyMeaning(language, draft.text.trim());
            continue;
          }
          const saved = await updateEntityContent(entityId, {
            meaning: { language, value: draft.text.trim() },
          });
          if (saved.status === "error") throw new Error(saved.error);
        } else {
          const saved = await saveAnnotation({
            entityId,
            kind: draft.task === "words" ? "WORD_MEANING" : "COMMENTARY",
            language,
            title: draft.title,
            text: draft.text,
          });
          if (saved.status === "error") throw new Error(saved.error);
        }
      }
      const inEditor =
        !!onApplyMeaning && accepted.some((d) => d.task === "meaning");
      toast.success(
        inEditor
          ? "Meaning added to the editor — save to keep it"
          : "Saved",
      );
      onOpenChange(false);
      setResult(null);
      setDrafts([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
      queryClient.invalidateQueries({
        queryKey: ["entityAnnotations", entityId],
      });
      if (!onApplyMeaning) await invalidateEntities();
    }
  };

  const errors = Object.entries(result?.errors ?? {}) as [FillTask, string][];
  const nothingFound =
    !!result &&
    drafts.length === 0 &&
    errors.length === 0 &&
    tasks.includes("schools");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fill with AI</DialogTitle>
          <DialogDescription>
            {label ? `For ${label}. ` : ""}
            Nothing is saved until you have looked it over.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          {available.length > 1 && (
            <div className="flex flex-col gap-3">
              {available.map((task) => (
                <label key={task} className="flex items-start gap-3">
                  <Checkbox
                    className="mt-0.5"
                    checked={tasks.includes(task)}
                    disabled={busy}
                    onCheckedChange={(v) =>
                      setTasks((all) =>
                        v === true
                          ? [...all, task]
                          : all.filter((t) => t !== task),
                      )
                    }
                  />
                  <span>
                    <span className="font-medium">
                      {TASK_LABEL[task].title}
                    </span>
                    <span className="block text-muted-foreground">
                      {TASK_LABEL[task].hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {available.length === 1 && (
            <p className="text-muted-foreground">{TASK_LABEL.schools.hint}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-fill-language">Write in</Label>
              <Select
                value={language}
                onValueChange={setLanguage}
                disabled={busy}
              >
                <SelectTrigger id="ai-fill-language" className="h-10">
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
              <Label htmlFor="ai-fill-model">Model</Label>
              <AiModelPicker id="ai-fill-model" disabled={busy} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {busy ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => abortRef.current?.abort()}
              >
                <Loader2 className="size-4 animate-spin" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11"
                variant={result ? "outline" : "default"}
                disabled={tasks.length === 0 || ai.configured === false}
                onClick={generate}
              >
                <WandSparkles className="size-4" />
                {result ? "Generate again" : "Generate"}
              </Button>
            )}
            {busy && (
              <span className="text-muted-foreground" aria-live="polite">
                {tasks.includes("schools")
                  ? "Searching the web and reading…"
                  : "Reading the verse…"}
              </span>
            )}
          </div>

          {failure && (
            <p className="text-destructive" role="alert">
              {failure}
            </p>
          )}
          {errors.map(([task, error]) => (
            <p key={task} className="text-destructive" role="alert">
              {TASK_LABEL[task].title}: {error}
            </p>
          ))}
          {nothingFound && (
            <p className="rounded-md border p-3 text-muted-foreground">
              The search found no explanation that could be traced to a
              source for this text, so nothing is proposed.
            </p>
          )}

          {drafts.length > 0 && (
            <ul className="flex flex-col gap-3">
              {drafts.map((draft) => (
                <li
                  key={draft.key}
                  className="flex flex-col gap-2 rounded-md border p-3"
                >
                  <label className="flex items-center gap-3 font-medium">
                    <Checkbox
                      checked={draft.use}
                      onCheckedChange={(v) =>
                        patch(draft.key, { use: v === true })
                      }
                    />
                    {draft.heading}
                  </label>
                  {draft.task !== "meaning" && (
                    <Input
                      className="h-10"
                      aria-label={`${draft.heading}: title`}
                      value={draft.title}
                      disabled={!draft.use}
                      onChange={(e) =>
                        patch(draft.key, { title: e.target.value })
                      }
                    />
                  )}
                  <Textarea
                    className="min-h-32 text-base md:text-sm"
                    aria-label={`${draft.heading}: text`}
                    value={draft.text}
                    disabled={!draft.use}
                    onChange={(e) => patch(draft.key, { text: e.target.value })}
                  />
                </li>
              ))}
            </ul>
          )}

          {result && drafts.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                Written by {result.model}. AI translations and summaries can
                be wrong — check them against the verse and the linked
                sources before keeping them.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-11"
                  disabled={accepted.length === 0 || saving}
                  onClick={apply}
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {onApplyMeaning &&
                  accepted.every((d) => d.task === "meaning")
                    ? "Use in editor"
                    : `Save ${accepted.length} selected`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Button that opens the Fill with AI dialog for one entity. */
export function AiFillTrigger({
  size = "sm",
  ...dialog
}: Omit<AiFillDialogProps, "open" | "onOpenChange"> & {
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size={size}
        variant="outline"
        className={size === "sm" ? "h-9" : "h-10"}
        onClick={() => setOpen(true)}
      >
        <WandSparkles className="size-4" />
        Fill with AI
      </Button>
      {open && <AiFillDialog {...dialog} open onOpenChange={setOpen} />}
    </>
  );
}
