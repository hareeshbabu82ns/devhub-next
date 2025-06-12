"use client";

import { Search as SearchIcon, RefreshCcw as RefreshIcon } from "lucide-react";
import { Entity, EntityTypeEnum } from "@/lib/types";

import { useDebounceCallback } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { ArtTile } from "@/components/blocks/image-tiles";
import WebIMEIdeInput from "../../sanscript/_components/WebIMEIdeInput";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import ScrollToTopButton from "@/components/utils/ScrollToTopButton";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import { Button } from "@/components/ui/button";
import { ArtSlokamTile } from "@/components/blocks/image-tiles-slokam";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchAudioLinksIncludingChildren, fetchEntities } from "../actions";
import { ColumnFiltersState } from "@tanstack/react-table";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import EntityNavigationView from "./EntityBreadcrumbView";
import { TileModel } from "@/types/entities";
import { mapEntityToTileModel, mapTileModelToEntity } from "../utils";
import {
  useLanguageAtomValue,
  useQueryLimitAtomValue,
} from "@/hooks/use-config";
import { Icons } from "@/components/utils/icons";
import { toast } from "sonner";
import { usePlaylistDispatchAtom } from "@/hooks/use-songs";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";

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
  const language = useLanguageAtomValue();

  const searchParam = searchParams.get("search") ?? "";

  const onSearchChange = (value: string) => {
    updateSearchParams({ search: value.trim(), offset: "0" });
  };

  const debouncedSetParams = useDebounceCallback(onSearchChange, 1000);

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
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
  const dispatch = usePlaylistDispatchAtom();

  const limit = parseInt(useQueryLimitAtomValue());
  const page = parseInt(searchParams.get("offset") || "0", 10);

  const language = useLanguageAtomValue();

  const { mutate: addAudioToPlaylist } = useMutation({
    mutationKey: ["entityAudio", language, forEntity],
    mutationFn: async () => {
      if (forEntity?.audio) {
        dispatch({
          type: "ADD_SONG",
          payload: {
            id: forEntity.id,
            title: forEntity.title,
            album: "",
            artist: "",
            src: forEntity.audio,
            position: 0,
          } as Song,
        });
      }
      const entities = await fetchAudioLinksIncludingChildren({
        id: forEntity?.id || "",
        language,
      });
      return entities.map(
        (e) =>
          ({
            id: e.id,
            title: e.text,
            album: "",
            artist: "",
            src: e.audio,
            position: 0,
          }) as Song,
      );
    },
    onSuccess: (res) => {
      if (res) {
        // console.log(res);
        res.forEach((song) => {
          dispatch({
            type: "ADD_SONG",
            payload: song,
          });
        });
      }
    },
  });

  const { data, isFetching, isLoading, error, refetch } = useQuery({
    queryKey: [
      "entities",
      { forTypes, language, forEntity, offset: page, query, limit },
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
        pagination: { pageIndex: page, pageSize: limit },
        sorting: [{ id: "order", desc: false }],
        filters,
      });
      return entities;
    },
    staleTime: QUERY_STALE_TIME_LONG,
  });

  if (isFetching || isLoading) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;
  if (!data || !data.results) return <SimpleAlert title={"no data found"} />;

  const children = data.results || [];
  const entities: TileModel[] =
    children.map((e) => mapEntityToTileModel(e, language)) || [];

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

  const currentPage = page + 1;

  const paginatePageChangeAction = (page: number) => {
    const newPage = page - 1;
    updateSearchParams({ offset: newPage.toString() });
  };

  const paginateFwdAction = () => {
    const newPage = page + 1;
    updateSearchParams({ offset: newPage.toString() });
  };

  const paginateBackAction = () => {
    const newPage = Math.max(0, page - 1);
    updateSearchParams({ offset: newPage.toString() });
  };

  return (
    <div className="flex-1 flex flex-col mt-4 gap-4">
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
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              addAudioToPlaylist(undefined, {
                onSuccess: (res) => {
                  if (res.length > 0 || forEntity?.audio)
                    toast.success("Audio added to playlist");
                  else toast.error("No audio found");
                },
              })
            }
            type="button"
            variant="outline"
            size="icon"
          >
            <Icons.play className="size-5" />
          </Button>
          <PaginationDDLB
            totalCount={entitiesCount}
            limit={limit}
            page={currentPage}
            onFwdClick={paginateFwdAction}
            onBackClick={paginateBackAction}
            onPageChange={paginatePageChangeAction}
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-y-8 xl:gap-x-8">
          {entities.map((entity, i) => {
            if (entity.type === "SLOKAM")
              return (
                <ArtSlokamTile
                  key={entity.id}
                  index={limit * page + i + 1}
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
      </div>
      <div className="flex justify-end mt-4">
        <ScrollToTopButton />
        <PaginationDDLB
          totalCount={entitiesCount}
          limit={limit}
          page={currentPage}
          onFwdClick={paginateFwdAction}
          onBackClick={paginateBackAction}
          onPageChange={paginatePageChangeAction}
        />
      </div>
    </div>
  );
}
