import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useRef, useState } from "react";
import { ArtTile } from "@/components/blocks/image-tiles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormInputText from "@/components/inputs/FormInputText";
import FormCheckbox from "@/components/inputs/FormCheckbox";
import FormSelect from "@/components/inputs/FormSelect";
import {
  ENTITY_DEFAULT_IMAGE_THUMBNAIL,
  ENTITY_TYPES_CHILDREN,
  ENTITY_TYPES_DDLB,
  ENTITY_TYPES_PARENTS,
} from "@/lib/constants";
import FormLanguageValueList from "@/components/inputs/FormLanguageValueList";
import FormEntityRelations from "./FormEntityRelations";
import {
  TimerResetIcon as ResetIcon,
  SaveIcon,
  Trash2 as DeleteIcon,
  ChevronLeft as BackIcon,
  RefreshCcw as RefreshIcon,
  CopyPlus as SaveAndNewIcon,
} from "lucide-react";
import { EntityTypeEnum } from "@/lib/types";
import FormInputMDXTextArea from "@/components/inputs/FormInputMDXTextArea";
import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import { EntityFormSchema } from "@/lib/validations/entities";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { useRouter } from "next/navigation";
import FormEntityAttributes from "@/components/inputs/FormEntityAttributes";
import FormAssetField from "@/components/inputs/FormAssetField";
import { useLanguageAtomValue } from "@/hooks/use-config";

export interface EntityExtraProps {
  childrenCount: number;
  parentCount: number;
}
interface EntityFormProps {
  entityId?: string;
  data: z.infer<typeof EntityFormSchema>;
  entityExtras?: EntityExtraProps;
  updating?: boolean;
  onRefresh?: () => void;
  onSubmit?: (
    data: Partial<z.infer<typeof EntityFormSchema>>,
    options?: { addAnother?: boolean },
  ) => void;
  onDelete?: (entityId: string) => void;
  /** Show "Save & add another" (creating several siblings in a row). */
  allowAddAnother?: boolean;
}

export default function EntityForm({
  entityId,
  data,
  updating = false,
  onSubmit: onFormSubmit,
  onRefresh,
  onDelete,
  allowAddAnother = false,
}: EntityFormProps) {
  const router = useRouter();
  const language = useLanguageAtomValue();

  const { searchParamsObject: searchParams, updateSearchParams } =
    useSearchParamsUpdater();
  // content first: text is what gets entered and corrected most often
  const currentTab = searchParams.tab || "text";
  const formRef = useRef<HTMLFormElement>(null);
  const addAnotherRef = useRef(false);

  const form = useForm<z.infer<typeof EntityFormSchema>>({
    resolver: zodResolver(EntityFormSchema),
    defaultValues: { ...data },
  });

  const {
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = form;

  const [imageThumbnailValue, typeValue, text] = form.watch([
    "imageThumbnail",
    "type",
    "text",
  ]);

  // Saving refetches the entity; show the saved state without remounting the
  // form (which would lose the open tab and scroll position).
  const dataKey = JSON.stringify(data);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    reset({ ...data });
    // compare by content: callers build `data` afresh on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, reset]);

  // Ctrl/⌘ + S saves from anywhere in the form
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const keys = Object.keys(errors) as Array<keyof typeof errors>;
    if (keys.length === 0) return;
    console.error("Form errors:", errors);
    toast({
      title: "Form errors:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">
            {keys.map((key) => `${key}: ${errors[key]?.message}`).join("\n")}
          </code>
        </pre>
      ),
      variant: "destructive",
    });
  }, [errors]);

  function onSubmit(data: z.infer<typeof EntityFormSchema>) {
    const changeData: Partial<z.infer<typeof EntityFormSchema>> = {};

    changeData.type = data.type;
    // if (!entityId || dirtyFields.imageThumbnail)
    changeData.imageThumbnail = data.imageThumbnail;
    // if (!entityId || dirtyFields.audio)
    changeData.audio = data.audio;
    // a new entity without an explicit order is appended after its siblings
    if (dirtyFields.order) changeData.order = data.order;
    if (!entityId || dirtyFields.bookmarked)
      changeData.bookmarked = data.bookmarked;
    if (!entityId || dirtyFields.text) changeData.text = data.text;
    if (!entityId || dirtyFields.meaning) changeData.meaning = data.meaning;
    if (!entityId || dirtyFields.attributes)
      changeData.attributes = data.attributes;
    if (!entityId || dirtyFields.notes) changeData.notes = data.notes;
    if (!entityId || dirtyFields.childIDs) changeData.childIDs = data.childIDs;
    changeData.parentIDs = data.parentIDs;
    if (!entityId || dirtyFields.notes) changeData.notes = data.notes;

    const addAnother = addAnotherRef.current;
    addAnotherRef.current = false;
    onFormSubmit?.(changeData, { addAnother });
  }

  // always visible, whichever tab is open
  const typeAndOrder = (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] sm:grid-cols-[minmax(0,20rem)_8rem] gap-3">
      <FormSelect
        control={form.control}
        name="type"
        label="Type"
        options={ENTITY_TYPES_DDLB}
      />
      <FormInputText
        control={form.control}
        name="order"
        label="Order"
        type="number"
        placeholder={entityId ? "0" : "auto"}
      />
    </div>
  );

  const detailElements = (
    <div className="flex md:flex-2 lg:flex-3 flex-col gap-6">

      {/* Thumbnail */}
      <FormAssetField
        control={form.control}
        name="imageThumbnail"
        label="Thumbnail"
        kind="image"
        uploadFolder="entities/images"
        emptyValue={ENTITY_DEFAULT_IMAGE_THUMBNAIL}
      />

      {/* Audio */}
      <FormAssetField
        control={form.control}
        name="audio"
        label="Audio"
        kind="audio"
        uploadFolder="entities/audio"
      />
      {/* Bookmarked */}
      <FormCheckbox
        control={form.control}
        name="bookmarked"
        label="Bookmarked"
      />
    </div>
  );

  const artTile = (
    <div className="md:flex-1 max-w-80 md:max-w-none p-1">
      <ArtTile
        model={{
          id: "",
          type: typeValue as EntityTypeEnum,
          title:
            text && text[0]
              ? text.find((t) => t.language === language)
                ? text.find((t) => t.language === language)!.value
                : text[0].value
              : "",
          subTitle: typeValue,
          src: imageThumbnailValue || "",
        }}
      />
    </div>
  );

  const actionButtons = (
    <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap justify-end gap-2 border-t bg-background px-1 py-3">
      <Button type="button" disabled={updating} onClick={() => router.back()}>
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
      <Button
        variant="secondary"
        type="button"
        disabled={!isDirty}
        onClick={() => reset()}
      >
        <ResetIcon className="size-4 mr-2" />
        Reset
      </Button>
      {allowAddAnother && !entityId && (
        <Button
          type="submit"
          variant="outline"
          disabled={!isDirty || updating}
          onClick={() => (addAnotherRef.current = true)}
        >
          <SaveAndNewIcon className="size-4 mr-2" />
          Save &amp; add another
        </Button>
      )}
      <Button
        type="submit"
        disabled={!isDirty || updating}
        title="Ctrl/⌘ + S"
        onClick={() => (addAnotherRef.current = false)}
      >
        <SaveIcon className="size-4 mr-2" />
        {updating ? "Saving…" : "Save"}
      </Button>
      {entityId && onDelete && (
        <DeleteConfirmDlgTrigger
          onConfirm={() => onDelete(entityId!)}
          title="Delete Entity"
          description="Are you sure you want to delete this entity?"
        >
          <Button variant="destructive">
            <DeleteIcon className="size-4 mr-2" />
            Delete
          </Button>
        </DeleteConfirmDlgTrigger>
      )}
    </div>
  );

  const extrasTabContent = (
    <Tabs defaultValue="notes" className="flex flex-col flex-1 space-y-6">
      <TabsList className="grid grid-cols-2 gap-2">
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="attributes">Attributes</TabsTrigger>
      </TabsList>
      <TabsContent
        value="notes"
        className="hidden data-[state='active']:flex flex-1 flex-col md:flex-row gap-4 overflow-y-auto"
      >
        <div className="p-1 flex-1 flex">
          <FormInputMDXTextArea
            className="flex-1 flex-grow h-full"
            control={form.control}
            name="notes"
          />
          {/* <pre>{JSON.stringify(data?.notes, null, 2)}</pre> */}
        </div>
      </TabsContent>
      <TabsContent
        value="attributes"
        className="hidden data-[state='active']:flex flex-1 flex-col md:flex-row gap-4 overflow-y-auto"
      >
        <FormEntityAttributes control={form.control} name="attributes" />
        {/* <pre>{JSON.stringify(data?.attributes, null, 2)}</pre> */}
      </TabsContent>
    </Tabs>
  );

  const onTabValueChanged = (value: string) =>
    updateSearchParams({ tab: value, offset: "0" });

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col space-y-4 flex-1 min-w-0"
      >
        {typeAndOrder}
        <Tabs
          defaultValue={currentTab}
          className="flex flex-col flex-1 space-y-6"
          onValueChange={onTabValueChanged}
        >
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-20 sm:h-10 gap-2">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="meaning">Meaning</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="parents">Parents</TabsTrigger>
            <TabsTrigger value="children">Children</TabsTrigger>
            <TabsTrigger value="extras">Extras</TabsTrigger>
          </TabsList>
          <TabsContent
            value="details"
            className="hidden data-[state='active']:flex flex-1 flex-col md:flex-row gap-4 overflow-y-auto"
          >
            {artTile}
            {detailElements}
          </TabsContent>
          <TabsContent
            value="text"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <FormLanguageValueList
              control={form.control}
              name="text"
              syncScripts
            />
            {/* <pre>{JSON.stringify(data?.text, null, 2)}</pre> */}
          </TabsContent>
          <TabsContent
            value="meaning"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <FormLanguageValueList control={form.control} name="meaning" />
            {/* <pre>{JSON.stringify(data?.meaning, null, 2)}</pre> */}
          </TabsContent>
          <TabsContent
            value="parents"
            className="hidden data-[state='active']:flex flex-1 overflow-y-auto items-start"
          >
            <FormEntityRelations
              control={form.control}
              name="parentIDs"
              label="Parent Relations"
              forTypes={ENTITY_TYPES_PARENTS[typeValue] || []}
            />
            {/* <pre>{JSON.stringify( data?.parentIDs, null, 2 )}</pre> */}
          </TabsContent>
          <TabsContent
            value="children"
            className="hidden data-[state='active']:flex flex-1 overflow-y-auto items-start"
          >
            <FormEntityRelations
              control={form.control}
              name="childIDs"
              label="Child Relations"
              forTypes={ENTITY_TYPES_CHILDREN[typeValue] || []}
              onAddRelationClicked={
                entityId
                  ? () => router.push(`/entities/new?parent=${entityId}`)
                  : undefined
              }
            />
            {/* <pre>{JSON.stringify(data?.childIDs, null, 2)}</pre> */}
          </TabsContent>
          <TabsContent
            value="extras"
            className="hidden data-[state='active']:flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            {extrasTabContent}
          </TabsContent>
        </Tabs>
        {actionButtons}
      </form>
    </Form>
  );
}
