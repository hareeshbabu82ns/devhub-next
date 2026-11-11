"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/utils/icons";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { ANNOTATION_KINDS, Annotation } from "@/lib/annotations";
import { LANGUAGES_DDLB } from "@/lib/constants";
import {
  useMeaningLanguageAtomValue,
  useTextSizeAtomValue,
} from "@/hooks/use-config";
import {
  deleteAnnotation,
  listAnnotations,
  saveAnnotation,
} from "@/app/(app)/entities/annotation-actions";

const languageLabel = (code: string) =>
  LANGUAGES_DDLB.find((l) => l.value === code)?.label ?? code;

type Draft = {
  id?: string;
  kind: string;
  language: string;
  title: string;
  text: string;
};

/**
 * Commentaries and personal thoughts on an entity, each in its own language.
 * Any number can be added; a language filter narrows what is shown.
 */
export default function EntityAnnotations({ entityId }: { entityId: string }) {
  const queryClient = useQueryClient();
  const textSize = useTextSizeAtomValue();
  const defaultLanguage = useMeaningLanguageAtomValue() || "ENG";
  const queryKey = ["entityAnnotations", entityId];

  const [draft, setDraft] = useState<Draft | null>(null);
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, error, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await listAnnotations(entityId);
      if (res.status === "error") throw new Error(res.error);
      return res.data;
    },
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (d: Draft) => saveAnnotation({ ...d, entityId }),
    onSuccess: (res) => {
      if (res.status === "error") {
        toast.error(res.error);
        return;
      }
      setDraft(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Could not save"),
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => deleteAnnotation(id),
    onSuccess: (res) => {
      if (res.status === "error") toast.error(res.error);
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Could not delete"),
  });

  if (error) return <SimpleAlert title={error.message} />;

  const all = data ?? [];
  const languages = [...new Set(all.map((a) => a.language))];
  const activeFilter =
    languageFilter && languages.includes(languageFilter)
      ? languageFilter
      : null;

  const editor = draft && (
    <form
      className="flex flex-col gap-3 rounded-md border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        save(draft);
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          save(draft);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="annotation-language">Language</Label>
          <Select
            value={draft.language}
            onValueChange={(language) => setDraft({ ...draft, language })}
          >
            <SelectTrigger id="annotation-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES_DDLB.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="annotation-title">
            {ANNOTATION_KINDS.find((k) => k.code === draft.kind)?.titleLabel}
          </Label>
          <Input
            id="annotation-title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="annotation-text">Text (markdown)</Label>
        <Textarea
          id="annotation-text"
          autoFocus
          className="min-h-36"
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setDraft(null)}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !draft.text.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );

  const renderItem = (a: Annotation) =>
    draft?.id === a.id ? (
      <li key={a.id}>{editor}</li>
    ) : (
      <li key={a.id} className="rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="secondary">{languageLabel(a.language)}</Badge>
            {a.title && <span className="font-medium">{a.title}</span>}
          </div>
          <div className="flex items-center gap-1">
            {confirmDeleteId === a.id ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => remove(a.id)}
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Keep
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit"
                  onClick={() =>
                    setDraft({
                      id: a.id,
                      kind: a.kind,
                      language: a.language,
                      title: a.title,
                      text: a.text,
                    })
                  }
                >
                  <Icons.edit className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete"
                  onClick={() => setConfirmDeleteId(a.id)}
                >
                  <Icons.trash className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div
          className={`subpixel-antialiased text-${textSize} leading-loose markdown-content break-words`}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{a.text}</Markdown>
        </div>
      </li>
    );

  return (
    <div className="flex flex-col gap-4">
      {languages.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Button
            size="sm"
            variant={activeFilter === null ? "default" : "outline"}
            onClick={() => setLanguageFilter(null)}
          >
            All
          </Button>
          {languages.map((l) => (
            <Button
              key={l}
              size="sm"
              variant={activeFilter === l ? "default" : "outline"}
              onClick={() => setLanguageFilter(l)}
            >
              {languageLabel(l)}
            </Button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 @5xl/slokamDetails:grid-cols-2">
        {ANNOTATION_KINDS.map((kind) => {
          const items = all.filter(
            (a) =>
              a.kind === kind.code &&
              (!activeFilter || a.language === activeFilter),
          );
          const adding = draft && !draft.id && draft.kind === kind.code;
          return (
            <section
              key={kind.code}
              className="flex min-w-0 flex-col gap-3 rounded-md border p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-secondary">
                  {kind.plural}
                  {kind.private && (
                    <span className="pl-2 text-xs text-muted-foreground">
                      only you can see these
                    </span>
                  )}
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!draft}
                  onClick={() =>
                    setDraft({
                      kind: kind.code,
                      language: activeFilter ?? defaultLanguage,
                      title: "",
                      text: "",
                    })
                  }
                >
                  <Icons.add className="size-4" />
                  Add
                </Button>
              </div>
              {adding && editor}
              {items.length > 0 ? (
                <ul className="flex flex-col gap-3">{items.map(renderItem)}</ul>
              ) : (
                !adding && (
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? "Loading…" : "Nothing here yet."}
                  </p>
                )
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
