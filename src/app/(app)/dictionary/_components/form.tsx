"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Resolver } from "react-hook-form";
import { toast } from "@/components/ui/use-toast";
import { useEffect } from "react";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  TimerResetIcon as ResetIcon,
  SaveIcon,
  Trash2Icon as DeleteIcon,
  ChevronLeft as BackIcon,
  RefreshCcw as RefreshIcon,
  RotateCcwIcon as ReprocessIcon,
} from "lucide-react";
import FormLanguageValueList from "@/components/inputs/FormLanguageValueList";
import FormSelect from "@/components/inputs/FormSelect";
import FormInputTextArea from "@/components/inputs/FormInputTextArea";
import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import { DICTIONARY_ORIGINS_DDLB } from "../utils";
import FormEntityAttributes from "@/components/inputs/FormEntityAttributes";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { useRouter } from "next/navigation";
import { DictItemFormSchema } from "@/lib/validations/dictionary";
import FormInputText from "@/components/inputs/FormInputText";
import { useTextSizeAtomValue } from "@/hooks/use-config";
import { cn } from "@/lib/utils";

interface DictionaryItemFormProps {
  itemId?: string;
  data: z.infer<typeof DictItemFormSchema>;
  updating?: boolean;
  onRefresh?: () => void;
  onSubmit?: (data: Partial<z.infer<typeof DictItemFormSchema>>) => void;
  onDelete?: () => void;
  onReprocess?: () => void;
  reprocessing?: boolean;
}

const DictionaryItemForm = ({
  itemId,
  data,
  updating = false,
  onSubmit: onFormSubmit,
  onRefresh,
  onDelete,
  onReprocess,
  reprocessing = false,
}: DictionaryItemFormProps) => {
  const router = useRouter();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const currentTab = searchParams.get("tab") || "details";
  const textSize = useTextSizeAtomValue();

  // Create a type-safe version of the form values
  type DictionaryFormValues = z.infer<typeof DictItemFormSchema>;

  const form = useForm<DictionaryFormValues>({
    resolver: zodResolver(
      DictItemFormSchema,
    ) as unknown as Resolver<DictionaryFormValues>,
    defaultValues: {
      ...data,
      phonetic: data.phonetic || "", // Ensure phonetic is never undefined
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
    },
  });

  const {
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = form;

  useEffect(() => {
    const keys = Object.keys(errors) as Array<keyof typeof errors>;
    if (keys.length === 0) return;
    console.error("Form errors:", errors);
    toast({
      title: "Form errors:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">
            {keys
              .map((key) => `${key as string}: ${errors[key]?.message}`)
              .join("\n")}
          </code>
        </pre>
      ),
      variant: "destructive",
    });
  }, [errors]);

  function onSubmit(data: z.infer<typeof DictItemFormSchema>) {
    const changeData: Partial<z.infer<typeof DictItemFormSchema>> = {};

    changeData.origin = data.origin;
    if (!itemId || dirtyFields.word) changeData.word = data.word;
    if (!itemId || dirtyFields.wordIndex) changeData.wordIndex = data.wordIndex;
    if (!itemId || dirtyFields.description)
      changeData.description = data.description;
    if (!itemId || dirtyFields.attributes)
      changeData.attributes = data.attributes;
    if (!itemId || dirtyFields.phonetic) changeData.phonetic = data.phonetic;
    if (!itemId || dirtyFields.sourceData) {
      // Convert string back to JSON for saving
      try {
        if (data.sourceData && data.sourceData.trim()) {
          changeData.sourceData = JSON.parse(data.sourceData);
        } else {
          changeData.sourceData = undefined;
        }
      } catch (error) {
        console.error("Invalid JSON in sourceData:", error);
        toast({
          title: "Invalid JSON Format",
          description:
            "The Source Data field contains invalid JSON. Please check the syntax and try again.",
          variant: "destructive",
        });
        return;
      }
    }

    onFormSubmit?.(changeData);
  }

  const detailElements = (
    <div className="flex flex-1 flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Origin */}
        <FormSelect
          control={form.control}
          name="origin"
          label="Origin"
          options={DICTIONARY_ORIGINS_DDLB}
        />
        {/* Word Index */}
        <FormInputText
          control={form.control}
          type="number"
          name="wordIndex"
          label="Word Index"
        />
      </div>
      {/* Source Data */}
      <FormInputTextArea
        control={form.control}
        name="sourceData"
        label="Source Data"
        className={cn("font-mono leading-relaxed", `text-${textSize}`)}
      />
      {/* Phonetic */}
      <FormInputTextArea
        control={form.control}
        name="phonetic"
        label="Phonetic"
        className={cn("font-mono leading-relaxed", `text-${textSize}`)}
      />
    </div>
  );

  const actionButtons = (
    <div className="flex justify-end gap-4">
      <Button
        type="button"
        disabled={isDirty || updating}
        onClick={() => router.back()}
      >
        <BackIcon className="size-4 mr-2" />
        Back
      </Button>
      {onRefresh && (
        <Button
          type="button"
          disabled={updating}
          onClick={onRefresh}
          variant="outline"
        >
          <RefreshIcon className="size-4 mr-2" />
          Refetch
        </Button>
      )}
      {itemId && onReprocess && (
        <Button
          type="button"
          disabled={updating || reprocessing}
          onClick={onReprocess}
          variant="outline"
        >
          <ReprocessIcon className="size-4 mr-2" />
          {reprocessing ? "Reprocessing..." : "Reprocess"}
        </Button>
      )}
      <Button
        variant="secondary"
        type="button"
        disabled={!isDirty}
        onClick={() => reset()}
      >
        <ResetIcon className="size-4 mr-2" />
        Reset
      </Button>
      <Button type="submit" disabled={!isDirty || updating}>
        <SaveIcon className="size-4 mr-2" />
        Save
      </Button>
      {itemId && onDelete && (
        <DeleteConfirmDlgTrigger onConfirm={onDelete}>
          <Button variant="destructive" type="button">
            <DeleteIcon className="size-4 mr-2" />
            Delete
          </Button>
        </DeleteConfirmDlgTrigger>
      )}
    </div>
  );

  const onTabValueChanged = (value: string) =>
    updateSearchParams({ tab: value });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col space-y-4 flex-1"
      >
        <Tabs
          defaultValue={currentTab}
          className="flex flex-col flex-1 space-y-6"
          onValueChange={onTabValueChanged}
        >
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-20 sm:h-10 gap-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="word">Word</TabsTrigger>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
          </TabsList>
          <TabsContent
            value="details"
            className="hidden data-[state='active']:flex flex-1 flex-col md:flex-row gap-4 overflow-y-auto"
          >
            {detailElements}
          </TabsContent>
          <TabsContent
            value="word"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <FormLanguageValueList control={form.control} name="word" />
            {/* <pre>{JSON.stringify(data?.word, null, 2)}</pre> */}
          </TabsContent>
          <TabsContent
            value="description"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <FormLanguageValueList control={form.control} name="description" />
            {/* <pre>{JSON.stringify(data?.description, null, 2)}</pre> */}
          </TabsContent>

          <TabsContent
            value="attributes"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <FormEntityAttributes control={form.control} name="attributes" />
            {/* <pre>{JSON.stringify(data?.attributes, null, 2)}</pre> */}
          </TabsContent>
        </Tabs>
        {actionButtons}
      </form>
    </Form>
  );
};

export default DictionaryItemForm;
