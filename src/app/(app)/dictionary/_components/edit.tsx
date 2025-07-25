"use client";
import DictionaryItemForm from "./form";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { DictItemFormSchema } from "@/lib/validations/dictionary";
import { DictionaryItem } from "../types";
import SimpleAlert from "@/components/utils/SimpleAlert";
import Loader from "@/components/utils/loader";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createDictItem,
  deleteDictItem,
  readDictItem,
  updateDictItem,
  reprocessSingleDictionaryWord,
} from "../actions";
import { Prisma } from "@/app/generated/prisma";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";

const defaultValues: z.infer<typeof DictItemFormSchema> = {
  origin: "OTHERS",
  wordIndex: 0,
  word: [],
  description: [],
  attributes: [],
  phonetic: "",
  sourceData: "{}",
};

const mergeWithDefaultValues = (data: Partial<DictionaryItem>) => {
  return {
    origin: data.origin || defaultValues.origin,
    wordIndex: data.wordIndex || defaultValues.wordIndex,
    word: data.wordData || defaultValues.word,
    description: data.descriptionData || defaultValues.description,
    attributes: data.attributes || defaultValues.attributes,
    phonetic: data.phonetic || defaultValues.phonetic,
    sourceData: (() => {
      // Handle sourceData conversion properly to avoid double JSON stringification
      if (!data.sourceData) return "";
      if (typeof data.sourceData === "string") {
        // If it's already a string, try to parse and reformat it, or use as-is if invalid JSON
        try {
          const parsed = JSON.parse(data.sourceData);
          return JSON.stringify(parsed, null, 2);
        } catch {
          // If parsing fails, it's likely already a formatted string, use as-is
          return data.sourceData;
        }
      } else {
        // If it's an object, stringify it
        return JSON.stringify(data.sourceData, null, 2);
      }
    })(),
  } as z.infer<typeof DictItemFormSchema>;
};

interface DictionaryItemEditProps {
  isNew?: boolean;
}

const DictionaryItemEdit = ({ isNew }: DictionaryItemEditProps) => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [refreshCount, setRefreshCount] = useState(0);
  const language = useLanguageAtomValue();

  const dictionaryId = params.dictionaryId as string;

  const {
    data: dictItem,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["dictItem", dictionaryId, language],
    queryFn: () => readDictItem(dictionaryId, language),
    enabled: !!dictionaryId,
    staleTime: QUERY_STALE_TIME_LONG,
  });

  const {
    mutateAsync: createDictItemFn,
    isPending: createLoading,
    error: createDictItemError,
  } = useMutation({
    mutationKey: ["createDictItem"],
    mutationFn: async ({
      data,
    }: {
      data: Prisma.DictionaryWordCreateInput;
    }) => {
      const res = await createDictItem({ item: data });
      return res;
    },
  });

  const {
    mutateAsync: updateDictItemFn,
    isPending: updateLoading,
    error: updateDictItemError,
  } = useMutation({
    mutationKey: ["updateDictItem", dictionaryId],
    mutationFn: async ({
      data,
    }: {
      data: Prisma.DictionaryWordUpdateInput;
    }) => {
      const res = await updateDictItem(dictionaryId!, { item: data });
      return res;
    },
  });

  // const [deleteDictItem] = useMutation(MUTATION_DELETE_DICT_ITEM);
  const {
    mutateAsync: deleteDictItemFn,
    isPending: deleteLoading,
    error: deleteDictItemError,
  } = useMutation({
    mutationKey: ["deleteDictItem", dictionaryId],
    mutationFn: async () => {
      const res = await deleteDictItem(dictionaryId);
      return res;
    },
  });

  const {
    mutateAsync: reprocessDictItemFn,
    isPending: reprocessLoading,
    error: reprocessDictItemError,
  } = useMutation({
    mutationKey: ["reprocessDictItem", dictionaryId],
    mutationFn: async () => {
      if (!dictionaryId) throw new Error("No dictionary ID provided");
      const res = await reprocessSingleDictionaryWord(dictionaryId);
      return res;
    },
  });

  const onDelete = useMemo(
    () => async () => {
      if (!dictionaryId) return;
      await deleteDictItemFn(undefined, {
        onSuccess: () => {
          toast.success("DictItem Deleted Successfully");
          router.back();
        },
        onError: (error) => {
          toast.error("Error deleting dictionary");
        },
      });
    },
    [dictionaryId],
  );

  const onReprocess = useMemo(
    () => async () => {
      if (!dictionaryId) return;
      await reprocessDictItemFn(undefined, {
        onSuccess: (data) => {
          if (data.status === "success") {
            toast.success("Dictionary word reprocessed successfully");
            refetch();
          } else {
            toast.error(data.error || "Error reprocessing dictionary word");
          }
        },
        onError: (error) => {
          toast.error("Error reprocessing dictionary word");
        },
      });
    },
    [dictionaryId, refetch],
  );

  const onSubmit = useMemo(
    () => async (data: Partial<z.infer<typeof DictItemFormSchema>>) => {
      if (dictionaryId) {
        const dataFinal: Prisma.DictionaryWordUpdateInput = {
          ...data,
        };
        await updateDictItemFn(
          { data: dataFinal },
          {
            onSuccess: (data) => {
              toast.success("DictItem updated successfully");
              refetch();
            },
            onError: (error) => {
              toast.error("Error updating dictionary");
            },
          },
        );
      } else {
        if (!data.phonetic || !data.word || !data.description) {
          toast.error("Please fill all required fields");
          return;
        }
        const dataFinal: Prisma.DictionaryWordCreateInput = {
          ...data,
          wordIndex: data.wordIndex || 0,
          origin: data.origin || "OTHERS",
          phonetic: data.phonetic || "",
        };
        const res = await createDictItemFn(
          { data: dataFinal },
          {
            onSuccess: (data) => {
              toast.success("DictItem created successfully");
              if (data?.id) router.replace(`/dictionary/${data.id}/edit`);
            },
            onError: (error) => {
              toast.error("Error creating dictionary");
            },
          },
        );
      }
    },
    [dictionaryId],
  );

  if (isLoading || isFetching) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;

  if (!isNew && !dictItem)
    return (
      <SimpleAlert
        title={`Dictionary Item not found with id: ${dictionaryId}`}
      />
    );

  const item = isNew ? { ...defaultValues } : mergeWithDefaultValues(dictItem!);

  return (
    <div className="space-y-2 flex flex-col flex-1">
      <DictionaryItemForm
        key={`dict-form-${dictionaryId}-${refreshCount}`}
        itemId={dictionaryId}
        data={item}
        onSubmit={onSubmit}
        onDelete={isNew ? undefined : onDelete}
        onReprocess={isNew ? undefined : onReprocess}
        // onRefresh={() => {
        //   refetch();
        //   setRefreshCount((refreshCount) => refreshCount + 1);
        // }}
        updating={createLoading || updateLoading}
        reprocessing={reprocessLoading}
      />
    </div>
  );
};

export default DictionaryItemEdit;
