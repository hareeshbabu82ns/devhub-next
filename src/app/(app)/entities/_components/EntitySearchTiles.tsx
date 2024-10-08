"use client";

import { Search as SearchIcon, RefreshCcw as RefreshIcon } from "lucide-react";
import { Entity, EntityTypeEnum } from "@/lib/types";

import {
  useDebounceCallback,
  useLocalStorage,
  useReadLocalStorage,
} from "usehooks-ts";
import { cn, updateSearchParams } from "@/lib/utils";
import { ArtTile, TileModel } from "@/components/blocks/image-tiles";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

interface EntitySearchTilesProps extends React.HTMLAttributes<HTMLDivElement> {
  forEntity?: TileModel;
  forTypes?: EntityTypeEnum[];
  onTileClicked?: (entity: Entity) => void;
  onDeleteClicked?: (entity: Entity) => void;
  onEditClicked?: (model: Entity) => void;
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
  className,
  mode = "search",
  actionButtons,
  actionPreButtons,
}: EntitySearchTilesProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const language = useReadLocalStorage<string>(LANGUAGE_SELECT_KEY) || "";

  const searchParam = searchParams.get("search") ?? "";

  const onSearchChange = (value: string) => {
    const newSearchString = updateSearchParams(searchParams, {
      search: value.trim(),
      offset: "0",
    });
    router.replace(`${pathname}?${newSearchString}`);
  };

  const debouncedSetParams = useDebounceCallback(onSearchChange, 1000);

  return (
    <div
      className={cn(
        "flex flex-1 flex-col min-h-[calc(100vh_-_theme(spacing.16))]",
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
}: {
  query: string;
  forEntity?: TileModel;
  forTypes?: EntityTypeEnum[];
  onClick?: (entity: Entity) => void;
  onDeleteClicked?: (entity: Entity) => void;
  onEditClicked?: (model: Entity) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const entities: TileModel[] =
    children.map((g) => ({
      id: g.id,
      title: g.text,
      type: g.type,
      subTitle: g.type,
      src: g.imageThumbnail || "",
      childrenCount: g.childrenCount || 0,
      audio: g.audio,
    })) || [];

  const entitiesCount = data.total;

  const onTileClicked = onClick
    ? (tile: TileModel) =>
        onClick({
          id: tile.id,
          imageThumbnail: tile.src,
          text: tile.title,
          type: (tile.subTitle as EntityTypeEnum) || "",
        })
    : undefined;

  const onEditClickedAction = onEditClicked
    ? (tile: TileModel) =>
        onEditClicked({
          id: tile.id,
          imageThumbnail: tile.src,
          text: tile.title,
          type: (tile.subTitle as EntityTypeEnum) || "",
        })
    : undefined;

  const onDeleteClickedAction = onDeleteClicked
    ? (tile: TileModel) =>
        onDeleteClicked({
          id: tile.id,
          imageThumbnail: tile.src,
          text: tile.title,
          type: (tile.subTitle as EntityTypeEnum) || "",
        })
    : undefined;

  const paginateOffsetAction = (offset: number) => {
    const newSearchString = updateSearchParams(searchParams, {
      offset: offset.toString(),
    });
    router.replace(`${pathname}?${newSearchString}`);
  };

  const paginateFwdAction = () => {
    const newSearchString = updateSearchParams(searchParams, {
      offset: (offset + 1).toString(),
    });
    router.replace(`${pathname}?${newSearchString}`);
  };

  const paginateBackAction = () => {
    const newSearchString = updateSearchParams(searchParams, {
      offset: (offset - 1).toString(),
    });
    router.replace(`${pathname}?${newSearchString}`);
  };

  return (
    <div className="flex flex-1 flex-col mt-4 gap-4">
      <div className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            type="button"
            variant="outline"
            size="icon"
          >
            <RefreshIcon className="size-4" />
          </Button>
          {forEntity?.title && <h3 className="text-md">{forEntity?.title}</h3>}
          {/* {forEntity?.subTitle && (
            <h3 className="text-xs">{forEntity?.subTitle}</h3>
          )} */}
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
      </div>
    </div>
  );
}
