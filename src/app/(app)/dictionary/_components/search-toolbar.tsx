"use client";
import { Button } from "@/components/ui/button";
import {
  Settings2Icon as ExtraParamsIcon,
  BookPlusIcon as AddIcon,
  SearchIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounceCallback, useReadLocalStorage } from "usehooks-ts";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CollapsibleContent } from "@radix-ui/react-collapsible";
import { Label } from "@/components/ui/label";
import { LANGUAGE_SELECT_KEY } from "@/components/blocks/language-selector";
import DictionariesMultiSelectChips from "./DictionaryMultiSelectChips";
import { useCallback } from "react";
import WebIMEIdeInput from "@/app/(app)/sanscript/_components/WebIMEIdeInput";

interface SearchToolBarProps {
  asBrowse?: boolean;
}

export const SearchToolBar = ({ asBrowse }: SearchToolBarProps) => {
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

  const language = useReadLocalStorage<string>(LANGUAGE_SELECT_KEY) || "";
  // const localOrigins = useReadLocalStorage<string>(DICTIONARY_ORIGINS_SELECT_KEY) || [];

  // const originParam = (params.get("origin")??"").split(",") ??localOrigins?? [];
  const searchParam = searchParams.get("search") ?? "";
  const ftsParam = searchParams.get("fts") ?? "";

  const onSearchChange = (value: string) => {
    const newSearchString = createQueryString({ search: value, offset: "0" });
    router.replace(`${pathname}?${newSearchString}`);
  };

  const debouncedSetParams = useDebounceCallback(onSearchChange, 1000);

  return (
    <Collapsible className="flex flex-col">
      <div className="flex flex-1 items-center pb-4 space-x-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <WebIMEIdeInput
            type="search"
            placeholder="Search Dictionary..."
            language={language}
            defaultValue={searchParam}
            onTextChange={debouncedSetParams}
            className="w-full appearance-none bg-background shadow-none"
            withLanguageSelector
            showSearchIcon
          />
        </div>

        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon">
            <ExtraParamsIcon className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>

        <div>
          {!asBrowse && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("new")}
            >
              <AddIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <CollapsibleContent>
        <div className="border p-4 grid grid-cols-2 gap-2">
          <DictionariesMultiSelectChips />
          <div className="flex items-center space-x-2">
            <Switch
              id="fts"
              checked={ftsParam === "x"}
              onCheckedChange={(checked) => {
                const newSearchString = createQueryString({
                  fts: checked ? "x" : "",
                });
                router.push(`${pathname}?${newSearchString}`);
              }}
            />
            <Label htmlFor="fts">Full Text Search</Label>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
