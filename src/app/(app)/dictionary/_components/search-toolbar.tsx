"use client";
import { Button } from "@/components/ui/button";
import {
  Settings2Icon as ExtraParamsIcon,
  BookPlusIcon as AddIcon,
  SearchIcon,
  ArrowDownAZIcon,
  ArrowDownUpIcon,
  DownloadIcon,
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
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useReadLocalStorageHydrationSafe } from "@/hooks/use-hydration-safe-storage";
import { DICTIONARY_ORIGINS_SELECT_KEY } from "./DictionaryMultiSelectChips";
import { useMutation } from "@tanstack/react-query";
import { downloadDictionary } from "../download-actions";
import { toast } from "sonner";
import {
  DICTIONARY_SORT_OPTIONS,
  DICTIONARY_SORT_ORDER_OPTIONS,
} from "../utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SearchToolBarProps {
  asBrowse?: boolean;
}

export const SearchToolBar = ({ asBrowse }: SearchToolBarProps) => {
  const router = useRouter();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();

  const language = useLanguageAtomValue();

  const localOrigins =
    useReadLocalStorageHydrationSafe<string[]>(DICTIONARY_ORIGINS_SELECT_KEY) ||
    [];

  const originParam = (
    searchParams.get("origin")?.split(",") ??
    localOrigins ??
    []
  ).filter((o) => o.trim().length > 0);

  const searchParam = searchParams.get("search") ?? "";
  const ftsParam = searchParams.get("fts") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "wordIndex";
  const sortOrderParam = searchParams.get("sortOrder") ?? "asc";

  const onSearchChange = (value: string) => {
    updateSearchParams({ search: value, offset: "0" });
  };

  const debouncedSetParams = useDebounceCallback(onSearchChange, 1000);

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: downloadDictionary,
    onSuccess: (data) => {
      if (data.status === "success") {
        // Create download URL and trigger download
        const downloadUrl = `/api/dictionary/download?filepath=${encodeURIComponent(data.data.filepath)}&filename=${encodeURIComponent(data.data.filename)}`;

        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = data.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Dictionary export downloaded successfully!");
      } else {
        toast.error(data.error);
      }
    },
    onError: (error: Error) => {
      console.error("Download error:", error);
      toast.error("Failed to download dictionary export");
    },
  });

  const handleDownload = (format: "txt" | "csv" | "json" | "all" = "all") => {
    downloadMutation.mutate({
      dictFrom: originParam,
      queryText: searchParam,
      queryOperation: ftsParam === "x" ? "FULL_TEXT_SEARCH" : "REGEX",
      sortBy: sortByParam as any,
      sortOrder: sortOrderParam as any,
      language,
      format,
    });
  };

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

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={downloadMutation.isPending}
                variant="outline"
                size="icon"
                title="Download dictionary export"
              >
                <DownloadIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleDownload("all")}
                disabled={downloadMutation.isPending}
              >
                All Formats (ZIP)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("txt")}
                disabled={downloadMutation.isPending}
              >
                Text Format
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("csv")}
                disabled={downloadMutation.isPending}
              >
                CSV Format
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("json")}
                disabled={downloadMutation.isPending}
              >
                JSON Format
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
        <div className="border p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <DictionariesMultiSelectChips />

          <div className="flex items-center space-x-2">
            <Switch
              id="fts"
              checked={ftsParam === "x"}
              onCheckedChange={(checked) => {
                updateSearchParams({ fts: checked ? "x" : "", offset: "0" });
              }}
            />
            <Label htmlFor="fts">Full Text Search</Label>
          </div>

          <div className="flex flex-row gap-2 items-center">
            <Label htmlFor="sortBy">
              <ArrowDownAZIcon className="inline size-5" />
            </Label>
            <Select
              value={sortByParam}
              onValueChange={(value: string) => {
                updateSearchParams({ sortBy: value, offset: "0" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sort field..." />
              </SelectTrigger>
              <SelectContent>
                {DICTIONARY_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-row gap-2 items-center">
            <Label htmlFor="sortOrder">
              <ArrowDownUpIcon className="inline size-5" />
            </Label>
            <Select
              value={sortOrderParam}
              onValueChange={(value: string) => {
                updateSearchParams({ sortOrder: value, offset: "0" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sort order..." />
              </SelectTrigger>
              <SelectContent>
                {DICTIONARY_SORT_ORDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
