"use client";

/**
 * Dictionary entry form — same layout and habits as the entity form:
 * dictionary + position always visible, content tabs first, a sticky action
 * bar, Ctrl/⌘+S to save, and the form refreshes in place after saving.
 */

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TimerResetIcon as ResetIcon,
  SaveIcon,
  Trash2Icon as DeleteIcon,
  ChevronLeft as BackIcon,
  RotateCcwIcon as ReprocessIcon,
  CopyPlus as SaveAndNewIcon,
  ChevronsRightIcon as SaveAndNextIcon,
  WandSparklesIcon,
  BracesIcon,
  Loader2Icon,
} from "lucide-react";
import FormLanguageValueList from "@/components/inputs/FormLanguageValueList";
import FormSelect from "@/components/inputs/FormSelect";
import FormInputTextArea from "@/components/inputs/FormInputTextArea";
import FormInputText from "@/components/inputs/FormInputText";
import FormEntityAttributes from "@/components/inputs/FormEntityAttributes";
import FormAssetField from "@/components/inputs/FormAssetField";
import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import { DictItemFormSchema } from "@/lib/validations/dictionary";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { useLanguageAtomValue, useTextSizeAtomValue } from "@/hooks/use-config";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getDictionaryInfo } from "@/lib/dictionary/dictionary-catalog";
import { DICTIONARY_ORIGINS_DDLB } from "../utils";
import { computeDictPhonetic } from "../actions";

export type DictionaryFormValues = z.infer<typeof DictItemFormSchema>;

/** What to do after a successful save */
export type AfterSave = "stay" | "next" | "new";

interface DictionaryItemFormProps {
  itemId?: string;
  data: DictionaryFormValues;
  updating?: boolean;
  onSubmit?: (data: Partial<DictionaryFormValues>, after: AfterSave) => void;
  onDelete?: () => void;
  onReprocess?: () => void;
  reprocessing?: boolean;
  /** There is a following entry to move on to ("Save & next") */
  hasNext?: boolean;
}

const fontFor = (lang: string) =>
  LANGUAGE_FONT_FAMILY[lang as keyof typeof LANGUAGE_FONT_FAMILY];

const DictionaryItemForm = ({
  itemId,
  data,
  updating = false,
  onSubmit: onFormSubmit,
  onDelete,
  onReprocess,
  reprocessing = false,
  hasNext = false,
}: DictionaryItemFormProps) => {
  const router = useRouter();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const currentTab = searchParams.get("tab") || "word";
  const textSize = useTextSizeAtomValue();
  const language = useLanguageAtomValue();
  const formRef = useRef<HTMLFormElement>(null);
  const afterRef = useRef<AfterSave>("stay");
  const [regenerating, setRegenerating] = useState(false);
  const [previewLang, setPreviewLang] = useState<string | null>(null);

  const form = useForm<DictionaryFormValues>({
    resolver: zodResolver(DictItemFormSchema) as unknown as Resolver<DictionaryFormValues>,
    defaultValues: { ...data },
  });
  const {
    reset,
    setValue,
    formState: { errors, isDirty, dirtyFields },
  } = form;

  // Saving refetches the entry; show it without remounting (keeps the tab)
  const dataKey = JSON.stringify(data);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    reset({ ...data });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, reset]);

  // Ctrl/⌘ + S saves from anywhere in the form
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        afterRef.current = "stay";
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Don't lose edits by closing the tab
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  useEffect(() => {
    const keys = Object.keys(errors) as Array<keyof typeof errors>;
    if (keys.length === 0) return;
    toast.error("Please fix the highlighted fields", {
      description: keys
        .map((k) => `${String(k)}: ${errors[k]?.message ?? "invalid"}`)
        .join(" · "),
    });
  }, [errors]);

  const [origin, word, description, sourceData] = form.watch([
    "origin",
    "word",
    "description",
    "sourceData",
  ]);

  const sourceDataError = (() => {
    if (!sourceData || !sourceData.trim()) return null;
    try {
      JSON.parse(sourceData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid JSON";
    }
  })();

  const regeneratePhonetic = async () => {
    setRegenerating(true);
    try {
      const value = await computeDictPhonetic(word ?? [], description ?? []);
      setValue("phonetic", value, { shouldDirty: true });
      toast.success("Search text regenerated");
    } catch {
      toast.error("Could not regenerate the search text");
    } finally {
      setRegenerating(false);
    }
  };

  async function onSubmit(values: DictionaryFormValues) {
    const change: Partial<DictionaryFormValues> = {};
    change.origin = values.origin;
    if (!itemId || dirtyFields.word) change.word = values.word;
    if (!itemId || dirtyFields.wordIndex) change.wordIndex = values.wordIndex;
    if (!itemId || dirtyFields.description) change.description = values.description;
    if (!itemId || dirtyFields.attributes) change.attributes = values.attributes;
    if (!itemId || dirtyFields.phonetic) change.phonetic = values.phonetic;

    // Keep search working: rebuild the search text when the word or meaning
    // changed and it wasn't edited by hand
    if ((dirtyFields.word || dirtyFields.description) && !dirtyFields.phonetic) {
      try {
        change.phonetic = await computeDictPhonetic(values.word, values.description);
      } catch {
        // keep the old search text
      }
    }

    if (!itemId || dirtyFields.sourceData || dirtyFields.audio) {
      let source: Record<string, unknown> = {};
      if (values.sourceData && values.sourceData.trim()) {
        source = JSON.parse(values.sourceData);
      }
      if (dirtyFields.audio || !itemId) {
        if (values.audio) source.audioUrl = values.audio;
        else delete source.audioUrl;
      }
      change.sourceData = source as any;
    }

    const after = afterRef.current;
    afterRef.current = "stay";
    onFormSubmit?.(change, after);
  }

  // Always visible, whichever tab is open
  const header = (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] sm:grid-cols-[minmax(0,22rem)_9rem] gap-3">
      <FormSelect
        control={form.control}
        name="origin"
        label="Dictionary"
        options={DICTIONARY_ORIGINS_DDLB}
      />
      <FormInputText
        control={form.control}
        name="wordIndex"
        label="Position"
        type="number"
        placeholder={itemId ? "0" : "auto"}
      />
    </div>
  );

  const descLangs: string[] = (description ?? []).map((d) => d.language);
  const activePreviewLang =
    previewLang && descLangs.includes(previewLang)
      ? previewLang
      : descLangs.includes(language)
        ? language
        : descLangs[0];
  const previewWord =
    (word ?? []).find((w) => w.language === language)?.value ??
    (word ?? [])[0]?.value ??
    "";
  const previewMeaning =
    (description ?? []).find((d) => d.language === activePreviewLang)?.value ?? "";

  const preview = (
    <div className="rounded-xl border bg-background/60 p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{getDictionaryInfo(origin).short}</Badge>
        {(word ?? []).map((w, i) => (
          <span
            key={`${w.language}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-xs"
          >
            <span className="text-muted-foreground">{w.language}</span>
            <span className={fontFor(w.language)}>{w.value}</span>
          </span>
        ))}
      </div>
      <h2 className={cn("text-3xl font-bold break-words", fontFor(language))}>
        {previewWord || <span className="text-muted-foreground">No headword yet</span>}
      </h2>
      {descLangs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {descLangs.map((l, i) => (
            <Button
              key={`${l}-${i}`}
              type="button"
              size="sm"
              variant={l === activePreviewLang ? "secondary" : "ghost"}
              className="h-8 shrink-0"
              onClick={() => setPreviewLang(l)}
            >
              {l}
            </Button>
          ))}
        </div>
      )}
      <div
        className={cn(
          "prose dark:prose-invert max-w-none",
          textSize === "sm" ? "prose-sm" : textSize === "lg" ? "prose-lg" : "prose-base",
          fontFor(activePreviewLang ?? ""),
        )}
      >
        {previewMeaning ? (
          <Markdown remarkPlugins={[remarkGfm]}>{previewMeaning}</Markdown>
        ) : (
          <p className="text-muted-foreground">No meaning yet</p>
        )}
      </div>
    </div>
  );

  const details = (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6 min-w-0">
        <FormAssetField
          control={form.control}
          name="audio"
          label="Pronunciation audio"
          kind="audio"
          uploadFolder="dictionary/audio"
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Search text</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={regenerating}
              onClick={regeneratePhonetic}
            >
              {regenerating ? (
                <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <WandSparklesIcon className="size-3.5 mr-1.5" />
              )}
              Regenerate
            </Button>
          </div>
          <FormInputTextArea
            control={form.control}
            name="phonetic"
            label=""
            className={cn("font-mono leading-relaxed min-h-32", `text-${textSize}`)}
          />
          <p className="text-xs text-muted-foreground">
            Words used by full-text search. Rebuilt automatically when you change the word or
            meaning, unless you edit it here.
          </p>
        </div>
      </div>
      <div className="space-y-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Source data (JSON)</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={!!sourceDataError || !sourceData?.trim()}
            onClick={() =>
              setValue("sourceData", JSON.stringify(JSON.parse(sourceData), null, 2), {
                shouldDirty: true,
              })
            }
          >
            <BracesIcon className="size-3.5 mr-1.5" />
            Format
          </Button>
        </div>
        <FormInputTextArea
          control={form.control}
          name="sourceData"
          label=""
          className={cn(
            "font-mono leading-relaxed min-h-64",
            `text-${textSize}`,
            sourceDataError && "border-destructive focus-visible:ring-destructive",
          )}
        />
        <p className={cn("text-xs", sourceDataError ? "text-destructive" : "text-muted-foreground")}>
          {sourceDataError
            ? `Invalid JSON: ${sourceDataError}`
            : "The original imported row. Used by “Reprocess”."}
        </p>
      </div>
    </div>
  );

  const actionButtons = (
    <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap justify-end gap-2 border-t bg-background px-1 py-3">
      <Button type="button" variant="ghost" disabled={updating} onClick={() => router.back()}>
        <BackIcon className="size-4 mr-2" />
        Back
      </Button>
      {itemId && onReprocess && (
        <Button
          type="button"
          variant="outline"
          disabled={updating || reprocessing || isDirty}
          onClick={onReprocess}
          title={isDirty ? "Save or reset your changes first" : "Rebuild from the source data"}
        >
          <ReprocessIcon className="size-4 mr-2" />
          {reprocessing ? "Reprocessing…" : "Reprocess"}
        </Button>
      )}
      <Button variant="secondary" type="button" disabled={!isDirty} onClick={() => reset()}>
        <ResetIcon className="size-4 mr-2" />
        Reset
      </Button>
      {!itemId && (
        <Button
          type="submit"
          variant="outline"
          disabled={!isDirty || updating}
          onClick={() => (afterRef.current = "new")}
        >
          <SaveAndNewIcon className="size-4 mr-2" />
          Save &amp; add another
        </Button>
      )}
      {itemId && hasNext && (
        <Button
          type="submit"
          variant="outline"
          disabled={!isDirty || updating}
          onClick={() => (afterRef.current = "next")}
          title="Save, then edit the next entry"
        >
          <SaveAndNextIcon className="size-4 mr-2" />
          Save &amp; next
        </Button>
      )}
      <Button
        type="submit"
        disabled={!isDirty || updating}
        title="Ctrl/⌘ + S"
        onClick={() => (afterRef.current = "stay")}
      >
        <SaveIcon className="size-4 mr-2" />
        {updating ? "Saving…" : "Save"}
      </Button>
      {itemId && onDelete && (
        <DeleteConfirmDlgTrigger
          onConfirm={onDelete}
          title="Delete entry"
          description="Delete this dictionary entry? This cannot be undone."
        >
          <Button variant="destructive" type="button">
            <DeleteIcon className="size-4 mr-2" />
            Delete
          </Button>
        </DeleteConfirmDlgTrigger>
      )}
    </div>
  );

  const tabCount = (list?: unknown[]) =>
    list && list.length > 0 ? (
      <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{list.length}</span>
    ) : null;

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col space-y-4 flex-1 min-w-0"
      >
        {header}
        <Tabs
          defaultValue={currentTab}
          className="flex flex-col flex-1 space-y-6"
          onValueChange={(value) => updateSearchParams({ tab: value })}
        >
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 h-20 sm:h-10 gap-2">
            <TabsTrigger value="word">Word{tabCount(word)}</TabsTrigger>
            <TabsTrigger value="meaning">Meaning{tabCount(description)}</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">
              Details
              {sourceDataError && <span className="ml-1.5 size-1.5 rounded-full bg-destructive" />}
            </TabsTrigger>
            <TabsTrigger value="attributes">Attributes{tabCount(form.watch("attributes"))}</TabsTrigger>
          </TabsList>
          <TabsContent
            value="word"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <p className="text-xs text-muted-foreground">
              The headword in each script. Use sync to fill the other scripts from one.
            </p>
            <FormLanguageValueList control={form.control} name="word" syncScripts />
          </TabsContent>
          <TabsContent
            value="meaning"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <p className="text-xs text-muted-foreground">
              Markdown is supported. Check the result on the Preview tab.
            </p>
            <FormLanguageValueList control={form.control} name="description" syncScripts />
          </TabsContent>
          <TabsContent
            value="preview"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            {preview}
          </TabsContent>
          <TabsContent
            value="details"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            {details}
          </TabsContent>
          <TabsContent
            value="attributes"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <FormEntityAttributes control={form.control} name="attributes" />
          </TabsContent>
        </Tabs>
        {actionButtons}
      </form>
    </Form>
  );
};

export default DictionaryItemForm;
