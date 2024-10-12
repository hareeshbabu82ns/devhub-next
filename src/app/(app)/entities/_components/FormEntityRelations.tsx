import { ArtTile, TileModel } from "@/components/blocks/image-tiles";
import { FormField } from "@/components/ui/form";
import { Entity, EntityTypeEnum } from "@/lib/types";
import { useState } from "react";
import { Control, useController } from "react-hook-form";
// import { useNavigate, useSearchParams } from "react-router-dom";
import { PlusIcon as AddIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtSlokamTile } from "@/components/blocks/image-tiles-slokam";
import { updateSearchParams } from "@/lib/utils";
// import { QUERY_ENTITY_TILES_BY_IDS } from "./queries";
import { useReadLocalStorage } from "usehooks-ts";
import { LANGUAGE_SELECT_KEY } from "@/components/blocks/language-selector";
import SimpleAlert from "@/components/utils/SimpleAlert";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import { QUERY_RESULT_LIMIT_KEY } from "@/components/blocks/result-limit-selector";
import Loader from "@/components/utils/loader";
import EntitySearchDlgTrigger from "./EntitySearchDlgTrigger";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { useRouter } from "next/navigation";

interface FormEntityRelationsProps {
  name: string;
  label: string;
  forTypes?: EntityTypeEnum[];
  onAddRelationClicked?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

const FormEntityRelations = ( {
  name,
  label,
  control,
  forTypes,
  onAddRelationClicked,
}: FormEntityRelationsProps ) => {
  const router = useRouter();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  // const [ params, setParams ] = useSearchParams();
  const language = useReadLocalStorage( LANGUAGE_SELECT_KEY );
  const limit = parseInt(
    useReadLocalStorage( QUERY_RESULT_LIMIT_KEY ) || "10",
    10
  );
  const offset = parseInt( searchParams.offset || "0", 10 );

  const [ dlgOpen, setDlgOpen ] = useState( false );
  // const navigate = useNavigate();

  const { field } = useController( {
    name,
    control,
  } );

  const relationCount = field.value.length;
  const ids = field.value
    .map( ( rel: Entity ) => rel.id )
    .slice( limit * offset, limit * offset + limit );

  const { data, loading, error } = useQuery<{
    entities: Entity[];
  }>( QUERY_ENTITY_TILES_BY_IDS, {
    variables: { ids, language, limit },
  } );

  if ( loading ) return <Loader />;
  if ( error ) return <SimpleAlert title={error.message} />;

  if ( !data || !data?.entities )
    return <SimpleAlert title={"Error loading Entities Tile Data"} />;

  const paginateOffsetAction = ( offset: number ) => {
    updateSearchParams( { offset: offset.toString() } );
  };

  const onBackAction = () => {
    updateSearchParams( { offset: ( offset - 1 ).toString() } );
  };

  const onFwdAction = () => {
    updateSearchParams( { offset: ( offset + 1 ).toString() } );
  };

  return (
    <FormField
      control={control}
      name={name}
      render={( { field } ) => {
        const tiles: TileModel[] = data!.entities.map( ( rel: Entity ) => ( {
          id: rel.id,
          type: rel.type,
          title: rel.text,
          subTitle: rel.type,
          src: rel.imageThumbnail || "",
        } ) );

        const onEditClicked = ( tile: TileModel ) =>
          router.push( `/entities/${tile.id}/edit` );

        const onDeleteClicked = ( tile: TileModel ) => {
          field.onChange(
            field.value.filter( ( rel: Entity ) => rel.id !== tile.id )
          );
        };
        return (
          <div className="flex flex-1 flex-col gap-4 flex-grow">
            <div className="flex flex-1 items-center justify-between">
              <p>{label}</p>
              <div className="flex gap-2">
                {forTypes && forTypes?.length > 0 && (
                  <>
                    <EntitySearchDlgTrigger
                      open={dlgOpen}
                      forTypes={forTypes}
                      onOpenChange={( open ) => setDlgOpen( open )}
                      onClick={( entity ) => {
                        field.onChange( [ ...field.value, entity ] );
                        setDlgOpen( false );
                      }}
                    />
                    {onAddRelationClicked && (
                      <Button
                        variant="outline"
                        type="button"
                        size="icon"
                        onClick={onAddRelationClicked}
                      >
                        <AddIcon className="w-6 h-6" />
                      </Button>
                    )}
                    <PaginationDDLB
                      totalCount={relationCount}
                      limit={limit}
                      offset={offset}
                      onFwdClick={onFwdAction}
                      onBackClick={onBackAction}
                      onOffsetChange={paginateOffsetAction}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="grid max-w-[26rem] sm:max-w-[52.5rem] grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mx-auto gap-6 lg:gap-y-8 xl:gap-x-8 lg:max-w-7xl mt-4 overflow-y-auto w-full">
              {tiles.map( ( tile: TileModel, i ) => {
                if ( tile.type === "SLOKAM" )
                  return (
                    <ArtSlokamTile
                      key={tile.id}
                      index={limit * offset + i + 1}
                      model={tile}
                      className="col-span-4"
                      onEditClicked={onEditClicked}
                      onDeleteClicked={onDeleteClicked}
                    />
                  );
                else
                  return (
                    <ArtTile
                      key={tile.id}
                      model={tile}
                      onEditClicked={onEditClicked}
                      onDeleteClicked={onDeleteClicked}
                    />
                  );
              } )}
            </div>
          </div>
        );
      }}
    />
  );
};

export default FormEntityRelations;
