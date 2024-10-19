"use client";
import { Button } from "@/components/ui/button";
import {
  Settings2Icon as ExtraParamsIcon,
  BookPlusIcon as AddIcon,
  SearchIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounceCallback } from "usehooks-ts";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CollapsibleContent } from "@radix-ui/react-collapsible";
import { Label } from "@/components/ui/label";
import DictionariesMultiSelectChips from "./DictionaryMultiSelectChips";
import WebIMEIdeInput from "@/app/(app)/sanscript/_components/WebIMEIdeInput";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { languageAtom } from "@/hooks/use-config";
import { useAtom } from "jotai";

interface SearchToolBarProps {
  asBrowse?: boolean;
}

export const SearchToolBar = ({ asBrowse }: SearchToolBarProps) => {
  const router = useRouter();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();

  const [language] = useAtom(languageAtom);

  const searchParam = searchParams.get("search") ?? "";
  const ftsParam = searchParams.get("fts") ?? "";

  const onSearchChange = (value: string) => {
    updateSearchParams({ search: value, offset: "0" });
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
              onClick={() => router.push("/dictionary/new")}
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
                updateSearchParams({ fts: checked ? "x" : "" });
              }}
            />
            <Label htmlFor="fts">Full Text Search</Label>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
