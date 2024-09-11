"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useReadLocalStorage } from "usehooks-ts";
import { DICTIONARY_ORIGINS_SELECT_KEY } from "./DictionaryMultiSelectChips";
import { LANGUAGE_SELECT_KEY } from "@/components/blocks/language-selector";
import { TEXT_SIZE_SELECT_KEY } from "@/components/blocks/text-size-selector";
import { QUERY_RESULT_LIMIT_KEY } from "@/components/blocks/result-limit-selector";
import { useCallback } from "react";
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

interface DictionaryResultsProps {
  asBrowse?: boolean;
}

export function DictionaryResults({ asBrowse }: DictionaryResultsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (newParams: Record<string, string>, replace: boolean = false) => {
      const params = new URLSearchParams(
        replace ? "" : searchParams.toString(),
      );
      for (const [key, value] of Object.entries(newParams)) {
        params.set(key, value);
      }
      return params.toString();
    },
    [searchParams],
  );

  const localOrigins =
    useReadLocalStorage<string[]>(DICTIONARY_ORIGINS_SELECT_KEY) || [];

  const originParam = (
    searchParams.get("origin")?.split(",") ??
    localOrigins ??
    []
  ).filter((o) => o.trim().length > 0);
  const searchParam = searchParams.get("search") ?? "";
  const ftsParam = searchParams.get("fts") ?? "";

  const language = useReadLocalStorage(LANGUAGE_SELECT_KEY) as string;
  const textSize = useReadLocalStorage(TEXT_SIZE_SELECT_KEY);

  const limit = parseInt(
    useReadLocalStorage(QUERY_RESULT_LIMIT_KEY) || "10",
    10,
  );
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const paginateOffsetAction = (offset: number) => {
    const newSearchString = createQueryString({
      offset: offset.toString(),
    });
    router.replace(`${pathname}?${newSearchString}`);
  };

  const paginateFwdAction = () => {
    const newSearchString = createQueryString({
      offset: (offset + 1).toString(),
    });
    router.replace(`${pathname}?${newSearchString}`);
  };

  const paginateBackAction = () => {
    const newSearchString = createQueryString({
      offset: (offset - 1).toString(),
    });
    router.replace(`${pathname}?${newSearchString}`);
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
  // const { data, loading, error, refetch } =
  //   useQuery<DictionaryItemQueryResults>(
  //     searchParam
  //       ? SEARCH_DICTIONARY_ITEMS_WITHIN_DICT
  //       : BROWSE_DICTIONARY_ITEMS,
  //     {
  //       variables: searchParam
  //         ? {
  //             dictFrom: originParam,
  //             queryText: searchParam,
  //             queryOperation: ftsParam === "x" ? "FULL_TEXT_SEARCH" : "REGEX",
  //             language,
  //             limit,
  //             offset,
  //           }
  //         : { dictFrom: originParam[0], language, limit, offset },
  //       skip: !originParam || originParam.length === 0,
  //     },
  //   );

  if (isLoading || isFetching) return <Loader />;
  if (isError) return <SimpleAlert title={error.message} />;
  if (!data?.results || data.total === 0)
    return (
      <SimpleAlert title={`No data found in Dictionary: ${originParam}`} />
    );

  return (
    <Card className="w-full bg-transparent @container">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <CardDescription>Dictionary Results</CardDescription>
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
                <div className={`font-medium text-${textSize} tracking-wider`}>
                  <h3>{item.word}</h3>
                  <h4 className="text-muted-foreground text-sm">
                    {item.origin}
                  </h4>
                </div>
                <MoreActions item={item} asBrowse={asBrowse} />
              </div>
              <div
                className={`flex-1 antialiased text-${textSize} leading-8 tracking-wider max-h-48 overflow-y-auto no-scrollbar`}
              >
                <Markdown remarkPlugins={[remarkGfm]}>
                  {item.description}
                </Markdown>
              </div>
            </div>
          ))}
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
          onClick={() => router.push(`${item.id}/edit`)}
        >
          <Icons.edit className="size-4" />
        </Button>
      )}
    </div>
  );
};

export default DictionaryResults;