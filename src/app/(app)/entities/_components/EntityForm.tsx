import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { useEffect } from "react";
import { ArtTile } from "@/components/blocks/image-tiles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormInputText from "@/components/inputs/FormInputText";
import FormCheckbox from "@/components/inputs/FormCheckbox";
import FormSelect from "@/components/inputs/FormSelect";
import {
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
} from "lucide-react";
import { EntityTypeEnum } from "@/lib/types";
// import { useNavigate, useSearchParams } from "react-router-dom";
import FormInputMDXTextArea from "@/components/inputs/FormInputMDXTextArea";
import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import ImageUploadDlgTrigger from "@/components/blocks/FileUploadDlgTrigger";
import { EntityFormSchema } from "@/lib/validations/entities";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { useRouter } from "next/navigation";
import FormEntityAttributes from "@/components/inputs/FormEntityAttributes";

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
  onSubmit?: ( data: Partial<z.infer<typeof EntityFormSchema>> ) => void;
  onDelete?: ( entityId: string ) => void;
}

export default function EntityForm( {
  entityId,
  data,
  updating = false,
  onSubmit: onFormSubmit,
  onRefresh,
  onDelete,
}: EntityFormProps ) {

  const router = useRouter();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const currentTab = searchParams.tab || "details";

  const form = useForm<z.infer<typeof EntityFormSchema>>( {
    resolver: zodResolver( EntityFormSchema ),
    defaultValues: { ...data },
  } );

  const {
    getValues,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = form;

  const [ imageThumbnailValue, typeValue ] = getValues( [
    "imageThumbnail",
    "type",
  ] );

  useEffect( () => {
    const keys = Object.keys( errors ) as Array<keyof typeof errors>;
    if ( keys.length === 0 ) return;
    console.error( "Form errors:", errors );
    toast( {
      title: "Form errors:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">
            {keys.map( ( key ) => `${key}: ${errors[ key ]?.message}` ).join( "\n" )}
          </code>
        </pre>
      ),
      variant: "destructive",
    } );
  }, [ errors ] );

  function onSubmit( data: z.infer<typeof EntityFormSchema> ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changeData: Partial<z.infer<typeof EntityFormSchema>> = {};

    changeData.type = data.type;
    if ( dirtyFields.imageThumbnail )
      changeData.imageThumbnail = data.imageThumbnail;
    if ( dirtyFields.audio ) changeData.audio = data.audio;
    if ( dirtyFields.bookmarked ) changeData.bookmarked = data.bookmarked;
    if ( dirtyFields.text ) changeData.text = data.text;
    if ( dirtyFields.meaning ) changeData.meaning = data.meaning;
    if ( dirtyFields.attributes ) changeData.attributes = data.attributes;
    if ( dirtyFields.notes ) changeData.notes = data.notes;
    if ( dirtyFields.childIDs ) changeData.childIDs = data.childIDs;
    changeData.parentIDs = data.parentIDs;

    onFormSubmit && onFormSubmit( changeData );
  }

  const detailElements = (
    <div className="flex flex-1 flex-col gap-6">
      {/* Type */}
      <FormSelect
        control={form.control}
        name="type"
        label="Type"
        options={ENTITY_TYPES_DDLB}
      />
      {/* Thumbnail */}
      <div className="flex flex-row gap-2 items-end">
        <FormInputText
          control={form.control}
          name="imageThumbnail"
          label="Thumbnail"
          className="flex-1"
          type="search"
        />
        {/* Upload Image */}
        <ImageUploadDlgTrigger currentPath={imageThumbnailValue} />
      </div>

      {/* Audio */}
      <FormInputText control={form.control} name="audio" label="Audio" />
      {/* Bookmarked */}
      <FormCheckbox
        control={form.control}
        name="bookmarked"
        label="Bookmarked"
      />
    </div>
  );

  const artTile = (
    <div className="max-w-sm mx-auto">
      <ArtTile
        model={{
          id: "",
          type: typeValue as EntityTypeEnum,
          title: typeValue,
          src: imageThumbnailValue || "",
        }}
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
      {entityId && onDelete && (
        <DeleteConfirmDlgTrigger
          onConfirm={() => onDelete( entityId! )}
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

  const onTabValueChanged = ( value: string ) =>
    updateSearchParams( { tab: value, offset: "0" } );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit( onSubmit )}
        className="flex flex-col space-y-4 flex-1"
      >
        <Tabs
          defaultValue={currentTab}
          className="flex flex-col flex-1 space-y-6"
          onValueChange={onTabValueChanged}
        >
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-20 sm:h-10 gap-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="meaning">Meaning</TabsTrigger>
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
            <FormLanguageValueList control={form.control} name="text" />
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
              forTypes={ENTITY_TYPES_PARENTS[ typeValue ] || []}
            />
            {/* <pre>{JSON.stringify(data?.parentIDs, null, 2)}</pre> */}
          </TabsContent>
          <TabsContent
            value="children"
            className="hidden data-[state='active']:flex flex-1 overflow-y-auto items-start"
          >
            <FormEntityRelations
              control={form.control}
              name="childIDs"
              label="Child Relations"
              forTypes={ENTITY_TYPES_CHILDREN[ typeValue ] || []}
              onAddRelationClicked={
                entityId
                  ? () => router.push( `/entities/new?parent=${entityId}` )
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
