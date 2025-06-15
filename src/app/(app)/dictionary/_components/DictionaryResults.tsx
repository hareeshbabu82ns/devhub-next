"use client";

import { useRouter } from "next/navigation";
import { useReadLocalStorage } from "@/hooks/use-hydration-safe-storage";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { LANGUAGE_FONT_FAMILY, QUERY_STALE_TIME_LONG } from "@/lib/constants";

interface DictionaryResultsProps {
  asBrowse?: boolean;
}

export function DictionaryResults({ asBrowse }: DictionaryResultsProps) {
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const isTouchDevice = useMediaQuery("(pointer: coarse)");

  const localOrigins =
    useReadLocalStorage<string[]>(DICTIONARY_ORIGINS_SELECT_KEY) || [];

  const originParam = (
    searchParams.get("origin")?.split(",") ??
    localOrigins ??
    []
  ).filter((o) => o.trim().length > 0);
  const searchParam = searchParams.get("search") ?? "";
  const ftsParam = searchParams.get("fts") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "wordIndex";
  const sortOrderParam = searchParams.get("sortOrder") ?? "asc";

  const language = useLanguageAtomValue();
  const textSize = useTextSizeAtomValue();
  const limit = parseInt(useQueryLimitAtomValue());
  const page = parseInt(searchParams.get("offset") || "0", 10);
  const currentPage = page + 1;

  const { data, isFetching, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "dictionaryItems",
      originParam,
      searchParam,
      ftsParam,
      sortByParam,
      sortOrderParam,
      language,
      limit,
      page,
    ],
    queryFn: async () => {
      const response = await searchDictionary({
        dictFrom: originParam,
        queryText: searchParam,
        queryOperation: ftsParam === "x" ? "FULL_TEXT_SEARCH" : "REGEX",
        sortBy: sortByParam as any,
        sortOrder: sortOrderParam as any,
        language,
        limit,
        offset: page * limit,
      });
      return response;
    },
    enabled:
      originParam.length > 0 ||
      (originParam.length > 0 && searchParam.length > 0) ||
      (searchParam.length > 0 && ftsParam === "x"),
    staleTime: QUERY_STALE_TIME_LONG,
  });

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
            page={currentPage}
            onFwdClick={paginateFwdAction}
            onBackClick={paginateBackAction}
            onPageChange={paginatePageChangeAction}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 @6xl:grid-cols-2 gap-4">
          {data.results.map((item) => (
            <div
              key={item.id}
              className="group border rounded-sm p-4 flex flex-col transition-colors hover:bg-muted/50"
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
                <MoreActions
                  item={item}
                  asBrowse={asBrowse}
                  className={cn(
                    isTouchDevice
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  )}
                />
              </div>
              <div
                className={cn(
                  LANGUAGE_FONT_FAMILY[
                    language as keyof typeof LANGUAGE_FONT_FAMILY
                  ],
                  `flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest max-h-48 overflow-y-auto no-scrollbar markdown-content`,
                )}
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
            page={currentPage}
            onFwdClick={paginateFwdAction}
            onBackClick={paginateBackAction}
            onPageChange={paginatePageChangeAction}
          />
        </div>
      </CardContent>
    </Card>
  );
}

const MoreActions = ({
  item,
  asBrowse,
  className,
}: {
  item: Partial<DictionaryItem>;
  asBrowse?: boolean;
  className?: string;
}) => {
  const router = useRouter();
  return (
    <div className={cn("flex", className)}>
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
