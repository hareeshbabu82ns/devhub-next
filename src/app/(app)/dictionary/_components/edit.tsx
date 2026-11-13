"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Prisma } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import SimpleAlert from "@/components/utils/SimpleAlert";
import Loader from "@/components/utils/loader";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getDictionaryInfo } from "@/lib/dictionary/dictionary-catalog";
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon } from "lucide-react";
import DictionaryItemForm, { AfterSave, DictionaryFormValues } from "./form";
import { DictionaryItem } from "../types";
import {
  createDictItem,
  deleteDictItem,
  readDictItem,
  reprocessSingleDictionaryWord,
  updateDictItem,
} from "../actions";
import { getDictionaryEntry } from "../lookup-actions";
import { DICTIONARY_ORIGINS } from "../utils";

function sourceDataText(sourceData: unknown): string {
  if (!sourceData) return "";
  if (typeof sourceData === "string") {
    try {
      return JSON.stringify(JSON.parse(sourceData), null, 2);
    } catch {
      return sourceData;
    }
  }
  return JSON.stringify(sourceData, null, 2);
}

function toFormValues(item: Partial<DictionaryItem>): DictionaryFormValues {
  const source = (item.sourceData ?? {}) as Record<string, any>;
  return {
    origin: (item.origin || "OTHERS") as DictionaryFormValues["origin"],
    wordIndex: item.wordIndex ?? 0,
    word: (item.wordData ?? []) as DictionaryFormValues["word"],
    description: (item.descriptionData ?? []) as DictionaryFormValues["description"],
    attributes: item.attributes ?? [],
    phonetic: item.phonetic ?? "",
    sourceData: sourceDataText(item.sourceData),
    audio: source.audioUrl || source.audio || "",
  };
}

interface DictionaryItemEditProps {
  isNew?: boolean;
}

const DictionaryItemEdit = ({ isNew }: DictionaryItemEditProps) => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const language = useLanguageAtomValue();
  const dictionaryId = isNew ? undefined : (params.dictionaryId as string);

  const { data: dictItem, isLoading, error } = useQuery({
    queryKey: ["dictItem", dictionaryId, language],
    queryFn: () => readDictItem(dictionaryId!, language),
    enabled: !!dictionaryId,
  });

  // Neighbours for prev / next and "Save & next"
  const { data: context } = useQuery({
    queryKey: ["dictionaryEntry", dictionaryId, language],
    queryFn: () => getDictionaryEntry(dictionaryId!, language),
    enabled: !!dictionaryId,
  });
  const prev = context?.before.at(-1);
  const next = context?.after[0];

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dictItem", dictionaryId] }),
      queryClient.invalidateQueries({ queryKey: ["dictionaryEntry"] }),
      queryClient.invalidateQueries({ queryKey: ["dictionaryEntryRelations"] }),
      queryClient.invalidateQueries({ queryKey: ["dictionaryLookup"] }),
    ]);
  };

  const save = useMutation({
    mutationFn: async ({ data }: { data: Partial<DictionaryFormValues>; after: AfterSave }) => {
      if (dictionaryId) {
        return updateDictItem(dictionaryId, { item: data as Prisma.DictionaryWordUpdateInput });
      }
      return createDictItem({
        item: {
          ...(data as Prisma.DictionaryWordCreateInput),
          origin: data.origin || "OTHERS",
          wordIndex: data.wordIndex || 0, // 0 → next free position
          phonetic: data.phonetic || "",
        },
      });
    },
    onSuccess: async (res, { after, data }) => {
      toast.success(dictionaryId ? "Saved" : "Entry created");
      await invalidate();
      if (after === "next" && next) {
        router.push(`/dictionary/${next.id}/edit`);
      } else if (after === "new") {
        // A fresh `n` gives the form a new key, so it starts empty
        router.replace(
          `/dictionary/new?origin=${data.origin ?? "OTHERS"}&tab=word&n=${Date.now()}`,
        );
      } else if (!dictionaryId && res?.id) {
        router.replace(`/dictionary/${res.id}/edit`);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the entry"),
  });

  const remove = useMutation({
    mutationFn: () => deleteDictItem(dictionaryId!),
    onSuccess: async () => {
      toast.success("Entry deleted");
      await invalidate();
      const goTo = next ?? prev;
      router.replace(
        goTo ? `/dictionary/${goTo.id}` : `/dictionary?origins=${dictItem?.origin ?? ""}`,
      );
    },
    onError: () => toast.error("Could not delete the entry"),
  });

  const reprocess = useMutation({
    mutationFn: () => reprocessSingleDictionaryWord(dictionaryId!),
    onSuccess: async (r) => {
      if (r.status === "success") {
        toast.success("Rebuilt from the source data");
        await invalidate();
      } else {
        toast.error(r.error || "Could not reprocess the entry");
      }
    },
    onError: () => toast.error("Could not reprocess the entry"),
  });

  if (dictionaryId && isLoading) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;
  if (dictionaryId && !dictItem) {
    return <SimpleAlert title="This dictionary entry could not be found" />;
  }

  const requestedOrigin = searchParams.get("origin");
  const newOrigin = (DICTIONARY_ORIGINS as readonly string[]).includes(requestedOrigin ?? "")
    ? requestedOrigin!
    : "OTHERS";
  const values = dictItem
    ? toFormValues(dictItem)
    : toFormValues({ origin: newOrigin, wordIndex: 0 });
  const info = getDictionaryInfo(values.origin);

  return (
    <div className="flex flex-1 flex-col gap-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Breadcrumb" className="min-w-0 flex items-center gap-1.5 text-sm">
          <Link href="/dictionary" className="text-muted-foreground hover:text-foreground">
            Dictionary
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href={`/dictionary?origins=${values.origin}`}
            className="text-muted-foreground hover:text-foreground truncate"
          >
            {info.short}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span
            className={cn(
              "font-semibold truncate",
              LANGUAGE_FONT_FAMILY[language as keyof typeof LANGUAGE_FONT_FAMILY],
            )}
          >
            {dictItem ? dictItem.word : "New entry"}
          </span>
          {context && (
            <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums ml-1">
              #{(context.position + 1).toLocaleString()} of{" "}
              {context.dictionaryTotal.toLocaleString()}
            </span>
          )}
        </nav>
        {dictionaryId && (
          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href={`/dictionary/${dictionaryId}`}>
                <EyeIcon className="size-4 mr-1.5" /> View
              </Link>
            </Button>
            <Button
              asChild={!!prev}
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={!prev}
              aria-label="Edit previous entry"
            >
              {prev ? (
                <Link href={`/dictionary/${prev.id}/edit`}>
                  <ChevronLeftIcon className="size-4" />
                </Link>
              ) : (
                <ChevronLeftIcon className="size-4" />
              )}
            </Button>
            <Button
              asChild={!!next}
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={!next}
              aria-label="Edit next entry"
            >
              {next ? (
                <Link href={`/dictionary/${next.id}/edit`}>
                  <ChevronRightIcon className="size-4" />
                </Link>
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      <DictionaryItemForm
        key={dictionaryId ?? `new-${newOrigin}-${searchParams.get("n") ?? ""}`}
        itemId={dictionaryId}
        data={values}
        hasNext={!!next}
        onSubmit={(data, after) => save.mutate({ data, after })}
        onDelete={dictionaryId ? () => remove.mutate() : undefined}
        onReprocess={dictionaryId ? () => reprocess.mutate() : undefined}
        updating={save.isPending || remove.isPending}
        reprocessing={reprocess.isPending}
      />
    </div>
  );
};

export default DictionaryItemEdit;
