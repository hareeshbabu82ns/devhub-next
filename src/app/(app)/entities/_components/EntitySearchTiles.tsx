"use client";

import { Search as SearchIcon, RefreshCcw as RefreshIcon } from "lucide-react";
import { Entity, EntityTypeEnum } from "@/lib/types";

import {
  useDebounceCallback,
  useLocalStorage,
  useReadLocalStorage,
} from "usehooks-ts";
import { cn } from "@/lib/utils";
import { ArtTile } from "@/components/blocks/image-tiles";
import {
  LANGUAGE_SELECT_DEFAULT,
  LANGUAGE_SELECT_KEY,
} from "@/components/blocks/language-selector";
import WebIMEIdeInput from "../../sanscript/_components/WebIMEIdeInput";
import { QUERY_RESULT_LIMIT_KEY } from "@/components/blocks/result-limit-selector";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import ScrollToTopButton from "@/components/utils/ScrollToTopButton";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import { Button } from "@/components/ui/button";
import { ArtSlokamTile } from "@/components/blocks/image-tiles-slokam";
import { useQuery } from "@tanstack/react-query";
import { fetchEntities } from "../actions";
import { ColumnFiltersState } from "@tanstack/react-table";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import EntityNavigationView from "./EntityBreadcrumbView";
import { TileModel } from "@/types/entities";
import { mapEntityToTileModel, mapTileModelToEntity } from "../utils";

interface EntitySearchTilesProps extends React.HTMLAttributes<HTMLDivElement> {
  forEntity?: TileModel;
  forTypes?: EntityTypeEnum[];
  onTileClicked?: (entity: Entity) => void;
  onDeleteClicked?: (entity: Entity) => void;
  onEditClicked?: (model: Entity) => void;
  onBookmarkClicked?: (model: Entity) => void;
  mode?: "search" | "browse";
  actionButtons?: React.ReactNode;
  actionPreButtons?: React.ReactNode;
}

const EntitySearchTiles = ({
  forEntity,
  forTypes,
  onTileClicked,
  onEditClicked,
  onDeleteClicked,
  onBookmarkClicked,
  className,
  mode = "search",
  actionButtons,
  actionPreButtons,
}: EntitySearchTilesProps) => {
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const language = useReadLocalStorage<string>(LANGUAGE_SELECT_KEY) || "";

  const searchParam = searchParams.get("search") ?? "";

  const onSearchChange = (value: string) => {
    updateSearchParams({ search: value.trim(), offset: "0" });
  };

  const debouncedSetParams = useDebounceCallback(onSearchChange, 1000);

  return (
    <div
      className={cn(
        "flex flex-1 flex-col min-h-[calc(100vh_-_theme(spacing.20))]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {actionPreButtons && (
          <div className="flex flex-row space-x-2">{actionPreButtons}</div>
        )}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <WebIMEIdeInput
            type="search"
            placeholder="Search Entities..."
            language={language}
            valueAs={language}
            defaultValue={searchParam}
            onTextChange={debouncedSetParams}
            className="w-full appearance-none bg-background shadow-none"
            withLanguageSelector
            showSearchIcon
          />
        </div>
        <div className="ml-auto flex flex-row space-x-2">{actionButtons}</div>
      </div>
      <EntitySearchGrid
        query={mode === "browse" && searchParam === "" ? ".*" : searchParam}
        onClick={onTileClicked}
        onDeleteClicked={onDeleteClicked}
        onEditClicked={onEditClicked}
        onBookmarkClicked={onBookmarkClicked}
        forTypes={forTypes}
        forEntity={forEntity}
      />
    </div>
  );
};

export default EntitySearchTiles;

function EntitySearchGrid({
  query,
  forEntity,
  forTypes,
  onClick,
  onDeleteClicked,
  onEditClicked,
  onBookmarkClicked,
}: {
  query: string;
  forEntity?: TileModel;
  forTypes?: EntityTypeEnum[];
  onClick?: (entity: Entity) => void;
  onDeleteClicked?: (entity: Entity) => void;
  onEditClicked?: (model: Entity) => void;
  onBookmarkClicked?: (model: Entity) => void;
}) {
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();

  const limit = parseInt(
    useReadLocalStorage(QUERY_RESULT_LIMIT_KEY) || "10",
    10,
  );
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const [language] = useLocalStorage(
    LANGUAGE_SELECT_KEY,
    LANGUAGE_SELECT_DEFAULT,
  );

  const { data, isFetching, isLoading, error, refetch } = useQuery({
    queryKey: [
      "entities",
      { forTypes, language, forEntity, offset, query, limit },
    ],
    queryFn: async () => {
      const filters: ColumnFiltersState = [];

      if (forTypes)
        filters.push({
          id: "type",
          value: forTypes.map((t) => t.toString()),
        });
      if (forEntity) filters.push({ id: "parents", value: forEntity.id });

      const entities = await fetchEntities({
        query,
        language,
        pagination: { pageIndex: offset, pageSize: limit },
        sorting: [{ id: "order", desc: false }],
        filters,
      });
      return entities;
    },
  });

  if (isFetching || isLoading) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;
  if (!data || !data.results) return <SimpleAlert title={"no data found"} />;

  const children = data.results || [];
  const entities: TileModel[] = children.map(mapEntityToTileModel) || [];

  const entitiesCount = data.total;

  const onTileClicked = onClick
    ? (tile: TileModel) => onClick(mapTileModelToEntity(tile))
    : undefined;

  const onEditClickedAction = onEditClicked
    ? (tile: TileModel) => onEditClicked(mapTileModelToEntity(tile))
    : undefined;

  const onDeleteClickedAction = onDeleteClicked
    ? (tile: TileModel) => onDeleteClicked(mapTileModelToEntity(tile))
    : undefined;

  const onBookmarkClickedAction = onBookmarkClicked
    ? (tile: TileModel) => onBookmarkClicked(mapTileModelToEntity(tile))
    : undefined;

  const paginateOffsetAction = (offset: number) => {
    updateSearchParams({ offset: offset.toString() });
  };

  const paginateFwdAction = () => {
    updateSearchParams({ offset: (offset + 1).toString() });
  };

  const paginateBackAction = () => {
    updateSearchParams({ offset: (offset - 1).toString() });
  };

  return (
    <div className="flex flex-1 flex-col mt-4 gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            type="button"
            variant="outline"
            size="icon"
          >
            <RefreshIcon className="size-4" />
          </Button>
          {forEntity?.title && (
            <EntityNavigationView entityId={forEntity?.id} />
          )}
        </div>
        <PaginationDDLB
          totalCount={entitiesCount}
          limit={limit}
          offset={offset}
          onFwdClick={paginateFwdAction}
          onBackClick={paginateBackAction}
          onOffsetChange={paginateOffsetAction}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-y-8 xl:gap-x-8">
        {entities.map((entity, i) => {
          if (entity.type === "SLOKAM")
            return (
              <ArtSlokamTile
                key={entity.id}
                index={limit * offset + i + 1}
                model={entity}
                className="col-span-4"
                onTileClicked={onTileClicked}
                onEditClicked={onEditClickedAction}
                onDeleteClicked={onDeleteClickedAction}
                onBookmarkClicked={onBookmarkClickedAction}
              />
            );
          else
            return (
              <ArtTile
                key={entity.id}
                model={entity}
                onTileClicked={onTileClicked}
                onEditClicked={onEditClickedAction}
                onDeleteClicked={onDeleteClickedAction}
              />
            );
        })}
      </div>
      <div className="flex flex-1 justify-end">
        <ScrollToTopButton />
        <PaginationDDLB
          totalCount={entitiesCount}
          limit={limit}
          offset={offset}
          onFwdClick={paginateFwdAction}
          onBackClick={paginateBackAction}
          onOffsetChange={paginateOffsetAction}
        />
      </div>
    </div>
  );
}
