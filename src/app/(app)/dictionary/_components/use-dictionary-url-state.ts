"use client";

/**
 * Dictionary page state, kept in the URL so every search or browse position
 * can be bookmarked and shared:
 *
 *   ?search=dharma&mode=prefix&origins=MW,AP90&sort=dictionary&order=desc&offset=2&focus=<id>
 *
 * The last dictionary selection is remembered in localStorage and used when
 * the URL does not name any. Legacy params (fts=x, mode=key-prefix,
 * sortBy/sortOrder) are still understood.
 */

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { MatchMode, parseMatchMode } from "@/lib/dictionary/lookup-query";
import type { LookupSort } from "@/lib/dictionary/lookup-service";
import { DICTIONARY_ORIGINS_SELECT_KEY } from "./DictionaryMultiSelectChips";

export interface DictionaryUrlState {
  query: string;
  mode: MatchMode;
  origins: string[];
  /** Explicit sort; null means the default for the current view */
  sortParam: LookupSort | null;
  sort: LookupSort;
  order: "asc" | "desc";
  page: number;
  focus: string | null;
  isBrowse: boolean;
}

function parseSort(value: string | null): LookupSort | null {
  switch (value) {
    case "relevance":
      return "relevance";
    case "dictionary":
    case "wordIndex":
      return "dictionary";
    case "alphabetical":
    case "phonetic":
      return "alphabetical";
    default:
      return null;
  }
}

export function useDictionaryUrlState() {
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const [storedOrigins, setStoredOrigins] = useLocalStorage<string[]>(
    DICTIONARY_ORIGINS_SELECT_KEY,
    [],
    // Read after hydration so server and client render the same markup
    { initializeWithValue: false },
  );

  const state = useMemo<DictionaryUrlState>(() => {
    const query = searchParams.get("search") ?? "";
    const legacyFts = searchParams.get("fts") === "x";
    const mode = legacyFts ? "meaning" : parseMatchMode(searchParams.get("mode"));
    const originsParam = searchParams.get("origins");
    const origins = (
      originsParam !== null ? originsParam.split(",") : (storedOrigins ?? [])
    ).filter((o) => o.trim().length > 0);
    const sortParam = parseSort(
      searchParams.get("sort") ?? searchParams.get("sortBy"),
    );
    const isBrowse = query.trim().length === 0;
    const order =
      (searchParams.get("order") ?? searchParams.get("sortOrder")) === "desc"
        ? "desc"
        : "asc";
    return {
      query,
      mode,
      origins,
      sortParam,
      sort: sortParam ?? (isBrowse ? "dictionary" : "relevance"),
      order,
      page: Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0),
      focus: searchParams.get("focus"),
      isBrowse,
    };
  }, [searchParams, storedOrigins]);

  const update = useCallback(
    (params: Record<string, string | undefined>) => {
      // Drop legacy params whenever we write new state
      updateSearchParams({
        fts: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        ...params,
      });
    },
    [updateSearchParams],
  );

  const setQuery = useCallback(
    (query: string) =>
      update({ search: query || undefined, offset: undefined, focus: undefined }),
    [update],
  );

  const setMode = useCallback(
    (mode: MatchMode) =>
      update({
        mode: mode === "smart" ? undefined : mode,
        offset: undefined,
        focus: undefined,
      }),
    [update],
  );

  const setOrigins = useCallback(
    (origins: string[]) => {
      setStoredOrigins(origins);
      update({
        origins: origins.join(","),
        offset: undefined,
        focus: undefined,
      });
    },
    [update, setStoredOrigins],
  );

  const setSort = useCallback(
    (sort: LookupSort | null, order?: "asc" | "desc") =>
      update({
        sort: sort ?? undefined,
        order: order && order !== "asc" ? order : undefined,
        offset: undefined,
      }),
    [update],
  );

  const setPage = useCallback(
    (page: number) =>
      update({ offset: page > 0 ? String(page) : undefined, focus: undefined }),
    [update],
  );

  /** Browse a dictionary at a given page, highlighting one entry */
  const browseTo = useCallback(
    (origin: string, page: number, focus?: string) => {
      setStoredOrigins([origin]);
      update({
        search: undefined,
        mode: undefined,
        origins: origin,
        sort: undefined,
        order: undefined,
        offset: page > 0 ? String(page) : undefined,
        focus,
      });
    },
    [update, setStoredOrigins],
  );

  /** Replace the whole search at once (saved searches, history) */
  const restore = useCallback(
    (s: {
      query: string;
      mode?: string;
      origins?: string[];
      sort?: string | null;
      order?: string | null;
    }) => {
      if (s.origins) setStoredOrigins(s.origins);
      const mode = parseMatchMode(s.mode);
      const sort = parseSort(s.sort ?? null);
      update({
        search: s.query || undefined,
        mode: mode === "smart" ? undefined : mode,
        origins: s.origins ? s.origins.join(",") : undefined,
        sort: sort ?? undefined,
        order: s.order === "desc" ? "desc" : undefined,
        offset: undefined,
        focus: undefined,
      });
    },
    [update, setStoredOrigins],
  );

  return {
    ...state,
    setQuery,
    setMode,
    setOrigins,
    setSort,
    setPage,
    browseTo,
    restore,
  };
}

export type DictionaryUrlStateApi = ReturnType<typeof useDictionaryUrlState>;
