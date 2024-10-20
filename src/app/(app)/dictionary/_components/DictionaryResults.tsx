"use client";

import { useRouter } from "next/navigation";
import { useReadLocalStorage } from "usehooks-ts";
import { DICTIONARY_ORIGINS_SELECT_KEY } from "./DictionaryMultiSelectChips";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DictionaryItem } from "../types";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import { useQuery } from "@tanstack/react-query";
import { searchDictionary } from "../actions";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import ScrollToTopButton from "@/components/utils/ScrollToTopButton";
import {
  useLanguageAtomValue,
  useQueryLimitAtomValue,
  useTextSizeAtomValue,
} from "@/hooks/use-config";

interface DictionaryResultsProps {
  asBrowse?: boolean;
}

export function DictionaryResults({ asBrowse }: DictionaryResultsProps) {
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();

  const localOrigins =
    useReadLocalStorage<string[]>(DICTIONARY_ORIGINS_SELECT_KEY) || [];

  const originParam = (
    searchParams.get("origin")?.split(",") ??
    localOrigins ??
    []
  ).filter((o) => o.trim().length > 0);
  const searchParam = searchParams.get("search") ?? "";
  const ftsParam = searchParams.get("fts") ?? "";

  const language = useLanguageAtomValue();
  const textSize = useTextSizeAtomValue();

  const limit = parseInt(useQueryLimitAtomValue());
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const paginateOffsetAction = (offset: number) => {
    updateSearchParams({ offset: offset.toString() });
  };

  const paginateFwdAction = () => {
    updateSearchParams({ offset: (offset + 1).toString() });
  };

  const paginateBackAction = () => {
    updateSearchParams({ offset: (offset - 1).toString() });
  };

  const { data, isFetching, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "dictionaryItems",
      originParam,
      searchParam,
      ftsParam,
      language,
      limit,
      offset,
    ],
    queryFn: async () => {
      const response = await searchDictionary({
        dictFrom: originParam,
        queryText: searchParam,
        queryOperation: ftsParam === "x" ? "FULL_TEXT_SEARCH" : "REGEX",
        language,
        limit,
        offset,
      });
      return response;
    },
    enabled:
      originParam.length > 0 ||
      (originParam.length > 0 && searchParam.length > 0) ||
      (searchParam.length > 0 && ftsParam === "x"),
  });

  if (isLoading || isFetching) return <Loader />;
  if (isError) return <SimpleAlert title={error.message} />;
  if (!data?.results || data.total === 0)
    return (
      <SimpleAlert title={`No data found in Dictionary: ${originParam}`} />
    );

  return (
    <Card className="w-full bg-transparent @container">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <CardDescription>Results</CardDescription>
        <div className="flex flex-row items-center gap-2 ">
          <Button
            onClick={() => refetch()}
            type="button"
            variant="outline"
            size="icon"
          >
            <Icons.refresh className="size-4" />
          </Button>
          <PaginationDDLB
            totalCount={data.total}
            limit={limit}
            offset={offset}
            onFwdClick={paginateFwdAction}
            onBackClick={paginateBackAction}
            onOffsetChange={paginateOffsetAction}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 @6xl:grid-cols-2 gap-4">
          {data.results.map((item) => (
            <div
              key={item.id}
              className="border rounded-sm p-4 flex flex-col transition-colors hover:bg-muted/50"
            >
              <div className={`pb-4 h-12 flex justify-between items-center`}>
                <div
                  className={`font-medium subpixel-antialiased text-${textSize} leading-loose tracking-widest`}
                >
                  <h3>{item.word}</h3>
                  <h4 className="text-muted-foreground text-sm">
                    {item.origin}
                  </h4>
                </div>
                <MoreActions item={item} asBrowse={asBrowse} />
              </div>
              <div
                className={`flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest max-h-48 overflow-y-auto no-scrollbar`}
              >
                <Markdown remarkPlugins={[remarkGfm]}>
                  {item.description}
                </Markdown>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-1 justify-end mt-4">
          <ScrollToTopButton />
          <PaginationDDLB
            totalCount={data.total}
            limit={limit}
            offset={offset}
            onFwdClick={paginateFwdAction}
            onBackClick={paginateBackAction}
            onOffsetChange={paginateOffsetAction}
          />
        </div>
      </CardContent>
    </Card>
  );
}

const MoreActions = ({
  item,
  asBrowse,
}: {
  item: Partial<DictionaryItem>;
  asBrowse?: boolean;
}) => {
  const router = useRouter();
  return (
    <div className="flex">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="p-0"
        onClick={() => navigator.clipboard.writeText(item.description ?? "")}
      >
        <Icons.clipboard className="size-4" />
      </Button>
      {!asBrowse && (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="p-0"
          onClick={() => router.push(`/dictionary/${item.id}/edit`)}
        >
          <Icons.edit className="size-4" />
        </Button>
      )}
    </div>
  );
};

export default DictionaryResults;
