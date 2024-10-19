import { ArtTile } from "@/components/blocks/image-tiles";
import { FormField } from "@/components/ui/form";
import { Entity, EntityTypeEnum } from "@/lib/types";
import { useState } from "react";
import { Control, useController } from "react-hook-form";
import { PlusIcon as AddIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtSlokamTile } from "@/components/blocks/image-tiles-slokam";
import SimpleAlert from "@/components/utils/SimpleAlert";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import Loader from "@/components/utils/loader";
import EntitySearchDlgTrigger from "./EntitySearchDlgTrigger";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { findEntities } from "../actions";
import { mapEntityToTileModel } from "../utils";
import { TileModel } from "@/types/entities";
import { languageAtom, queryLimitAtom } from "@/hooks/use-config";
import { useAtom } from "jotai";

interface FormEntityRelationsProps {
  name: string;
  label: string;
  forTypes?: EntityTypeEnum[];
  onAddRelationClicked?: () => void;
  control: Control<any>;
}

const FormEntityRelations = ({
  name,
  label,
  control,
  forTypes,
  onAddRelationClicked,
}: FormEntityRelationsProps) => {
  const router = useRouter();
  const { searchParamsObject: searchParams, updateSearchParams } =
    useSearchParamsUpdater();
  const [language] = useAtom(languageAtom);
  const limit = parseInt(useAtom(queryLimitAtom)[0]);
  const offset = parseInt(searchParams.offset || "0", 10);

  const [dlgOpen, setDlgOpen] = useState(false);
  // const navigate = useNavigate();

  const { field } = useController({
    name,
    control,
  });

  const relationCount = field.value?.length || 0;
  const ids =
    field.value
      ?.map((rel: Entity) => rel.id)
      .slice(limit * offset, limit * offset + limit) || [];

  const { data, isFetching, isLoading, error } = useQuery({
    queryKey: ["queryEntitiesByIDs", ids, language, limit],
    queryFn: async () => {
      const entities = await findEntities({
        where: {
          id: {
            in: ids,
          },
        },
        language: language!,
      });
      return {
        entities,
      };
    },
  });

  if (isLoading || isFetching) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;

  if (!data || !data?.entities)
    return <SimpleAlert title={"Error loading Entities Tile Data"} />;

  const paginateOffsetAction = (offset: number) => {
    updateSearchParams({ offset: offset.toString() });
  };

  const onBackAction = () => {
    updateSearchParams({ offset: (offset - 1).toString() });
  };

  const onFwdAction = () => {
    updateSearchParams({ offset: (offset + 1).toString() });
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const tiles: TileModel[] =
          data!.entities.results.map(mapEntityToTileModel);

        const onEditClicked = (tile: TileModel) =>
          router.push(`/entities/${tile.id}/edit`);

        const onDeleteClicked = (tile: TileModel) => {
          field.onChange(
            field.value.filter((rel: Entity) => rel.id !== tile.id),
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
                      onOpenChange={(open) => setDlgOpen(open)}
                      onClick={(entity) => {
                        field.onChange([...(field?.value || []), entity]);
                        setDlgOpen(false);
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
              {tiles.map((tile: TileModel, i) => {
                if (tile.type === "SLOKAM")
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
              })}
            </div>
          </div>
        );
      }}
    />
  );
};

export default FormEntityRelations;
