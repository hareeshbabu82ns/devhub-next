/**
 * SearchToolBar - search box, match-mode chips and dictionary chips.
 * Laid out for phones first: the input gets the full width, chips scroll
 * sideways, and the action buttons sit beside the input from `sm` up.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounceCallback } from "usehooks-ts";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  BookPlusIcon as AddIcon,
  BookmarkPlusIcon,
  FileDownIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import WebIMEIdeInput from "@/app/(app)/sanscript/_components/WebIMEIdeInput";
import SavedSearchesDropdown from "./SavedSearchesDropdown";
import {
  DictionaryScopeChips,
  MATCH_MODE_INFO,
  MatchModeChips,
  SearchTips,
} from "./DictionarySearchControls";
import { DictionaryUrlStateApi } from "./use-dictionary-url-state";

interface SearchToolBarProps {
  state: DictionaryUrlStateApi;
  asBrowse?: boolean;
  onOpenOptions: () => void;
  onSaveSearch?: () => void;
  onSelectSearch?: (search: {
    queryText: string;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: string;
  }) => void;
  onExport?: () => void;
}

export const SearchToolBar = ({
  state,
  asBrowse,
  onOpenOptions,
  onSaveSearch,
  onSelectSearch,
  onExport,
}: SearchToolBarProps) => {
  const router = useRouter();
  const { data: session } = useSession();

  // The input is uncontrolled (the IME owns it). Remount it when the query
  // changes from outside — saved search, related-word link, back button.
  const typedRef = useRef(state.query);
  const [inputKey, setInputKey] = useState(0);
  useEffect(() => {
    if (state.query !== typedRef.current) {
      typedRef.current = state.query;
      setInputKey((k) => k + 1);
    }
  }, [state.query]);

  const debouncedSetQuery = useDebounceCallback((value: string) => {
    const next = value.trim();
    typedRef.current = next;
    state.setQuery(next);
  }, 450);

  const placeholder =
    state.mode === "meaning"
      ? "Search meanings — e.g. fire, “supreme spirit”"
      : "Search a word in any script — धर्म, dharma, krishna, *pati";

  const actionButtons = (
    <>
      {session?.user && onSaveSearch && (
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={onSaveSearch}
          title="Save current search"
          aria-label="Save current search"
        >
          <BookmarkPlusIcon className="size-4" />
        </Button>
      )}
      {session?.user && onSelectSearch && (
        <SavedSearchesDropdown onSelectSearch={onSelectSearch} />
      )}
      {onExport && (
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={onExport}
          title="Export results"
          aria-label="Export results"
        >
          <FileDownIcon className="size-4" />
        </Button>
      )}
      {!asBrowse && session?.user && (
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() =>
            router.push(
              state.origins.length === 1
                ? `/dictionary/new?origin=${state.origins[0]}`
                : "/dictionary/new",
            )
          }
          title="Add a dictionary entry"
          aria-label="Add a dictionary entry"
        >
          <AddIcon className="size-4" />
        </Button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <WebIMEIdeInput
            key={inputKey}
            type="search"
            placeholder={placeholder}
            defaultValue={state.query}
            onTextChange={debouncedSetQuery}
            className="w-full appearance-none bg-background shadow-none h-11"
            withLanguageSelector
            showSearchIcon
            storageKey="webimeLanguage:dictionary"
            aria-label="Search the dictionary"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={onOpenOptions}
          title="Search options"
          aria-label="Search options"
        >
          <SlidersHorizontalIcon className="size-4" />
        </Button>
        <div className="hidden sm:flex items-center gap-2">{actionButtons}</div>
      </div>

      <div className="flex items-center gap-1 min-w-0">
        <div className="flex-1 min-w-0">
          <MatchModeChips value={state.mode} onChange={state.setMode} />
        </div>
        <SearchTips />
      </div>

      <DictionaryScopeChips
        origins={state.origins}
        onChange={state.setOrigins}
        onCustomize={onOpenOptions}
      />

      {state.query && state.mode !== "smart" && (
        <p className="text-xs text-muted-foreground -mt-1">
          {MATCH_MODE_INFO[state.mode].hint}
        </p>
      )}

      <div className="flex sm:hidden items-center gap-2 justify-end empty:hidden">
        {actionButtons}
      </div>
    </div>
  );
};
