"use client";

import { FileAttributes } from "../utils";
import Loader from "@/components/utils/loader";
import { deleteAsset, exploreAssets } from "../actions";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import AssetFileTile from "./AssetFileTile";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsRight, SearchCode } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import AssetSearchInput from "./AssetSearchInput";
import FullscreenImageViewer from "./FullscreenImageViewer";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";
import { Separator } from "@/components/ui/separator";

const AssetFileExplorer = ({ path }: { path: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const currentPath = searchParams?.get("path") || "/";

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [useRegex, setUseRegex] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Fullscreen image viewer state
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(-1);

  // Responsive grid adjustments
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)");

  // Adjust items per page based on screen size
  useEffect(() => {
    if (isMobile) setItemsPerPage(6);
    else if (isTablet) setItemsPerPage(12);
    else setItemsPerPage(24);
  }, [isMobile, isTablet]);

  const { data, error, isFetching, isPending, refetch } = useQuery({
    queryKey: ["assetFileExplorer", path],
    queryFn: async () => {
      const data = await exploreAssets(path);
      return data;
    },
    staleTime: QUERY_STALE_TIME_LONG,
  });

  const onDeleteFile = async (name: string) => {
    await deleteAsset(`${path}/${name}`);
    refetch();
  };

  const onClick = (file: FileAttributes) => {
    if (file.isDirectory) {
      const newPath = `${pathname}/${file.name}`;
      router.push(`${newPath}`);
    }
  };

  // Reset to first page when path changes or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [path, debouncedSearchQuery, useRegex]);

  // Filter assets based on search query using either regular string or regex matching
  const filteredAssets = useMemo(() => {
    if (!data || !data.assets) return [];

    if (!debouncedSearchQuery) return data.assets;

    // Clear previous regex errors
    setRegexError(null);

    if (useRegex) {
      try {
        // Create a regex object from the search query
        // We'll make it case-insensitive by default for better UX
        const regex = new RegExp(debouncedSearchQuery, "i");
        return data.assets.filter((file) => regex.test(file.name));
      } catch (err) {
        // Handle invalid regex pattern
        setRegexError((err as Error).message);
        // Fallback to normal search when regex is invalid
        const query = debouncedSearchQuery.toLowerCase();
        return data.assets.filter((file) =>
          file.name.toLowerCase().includes(query),
        );
      }
    } else {
      // Normal string matching (case-insensitive)
      const query = debouncedSearchQuery.toLowerCase();
      return data.assets.filter((file) =>
        file.name.toLowerCase().includes(query),
      );
    }
  }, [data, debouncedSearchQuery, useRegex]);

  // Filter only images for the image viewer
  const imageAssets = useMemo(() => {
    if (!filteredAssets) return [];
    return filteredAssets.filter(
      (file) =>
        !file.isDirectory &&
        ["jpg", "jpeg", "png", "svg", "webp", "gif"].includes(
          file.ext.toLowerCase(),
        ),
    );
  }, [filteredAssets]);

  // Image viewer handlers
  const openImageViewer = (fileIndex: number) => {
    // Find the actual index in the imageAssets array
    const imageIndex = imageAssets.findIndex(
      (img) => img.name === filteredAssets[fileIndex].name,
    );

    if (imageIndex !== -1) {
      setActiveImageIndex(imageIndex);
      setIsImageViewerOpen(true);
    }
  };

  const handlePreviousImage = () => {
    if (activeImageIndex > 0) {
      setActiveImageIndex(activeImageIndex - 1);
    }
  };

  const handleNextImage = () => {
    if (activeImageIndex < imageAssets.length - 1) {
      setActiveImageIndex(activeImageIndex + 1);
    }
  };

  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false);
  };

  if (isFetching || isPending) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
      <Loader />
      <p className="mt-4 text-muted-foreground animate-pulse">Loading assets...</p>
    </div>
  );

  if (error) return <SimpleAlert title="Error Loading Assets" extraMessages={[error.message]} variant="destructive" />;

  if (!data || !data.assets)
    return <SimpleAlert title={`Could not fetch assets at path ${path}`} extraMessages={[]} variant="destructive" />;

  // Calculate pagination values
  const totalItems = filteredAssets.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Get current page items
  const currentItems = filteredAssets.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    // Scroll to top of the component
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle jump to page selection
  const handleJumpToPage = (value: string) => {
    const page = parseInt(value, 10);
    handlePageChange(page);
  };

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery("");
    setRegexError(null);
  };

  // Generate page options for dropdown
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Determine active image information for the fullscreen viewer
  const activeImage =
    activeImageIndex >= 0 && activeImageIndex < imageAssets.length
      ? imageAssets[activeImageIndex]
      : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Search component */}
      <AssetSearchInput
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        useRegex={useRegex}
        setUseRegex={setUseRegex}
        regexError={regexError}
        setRegexError={setRegexError}
        totalItems={totalItems}
        debouncedSearchQuery={debouncedSearchQuery}
        handleClearSearch={handleClearSearch}
      />

      <Separator />

      {totalItems === 0 && !debouncedSearchQuery ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-muted/30">
          <FolderIcon className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <p className="text-xl font-medium text-foreground">No assets found</p>
          <p className="text-muted-foreground text-sm mt-1">This folder is empty</p>
        </div>
      ) : (
        totalItems > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {currentItems.map((file, index) => (
              <AssetFileTile
                key={file.name}
                file={file}
                path={currentPath}
                onDeleteFile={onDeleteFile}
                onClick={onClick}
                onOpenFullscreen={() => openImageViewer(startIndex + index)}
              />
            ))}
          </div>
        )
      )}

      {/* Fullscreen Image Viewer */}
      {activeImage && (
        <FullscreenImageViewer
          imageUrl={activeImage.downloadURL}
          alt={activeImage.name}
          isOpen={isImageViewerOpen}
          onClose={handleCloseImageViewer}
          onNext={handleNextImage}
          onPrevious={handlePreviousImage}
          hasNext={activeImageIndex < imageAssets.length - 1}
          hasPrevious={activeImageIndex > 0}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
          <div className="bg-background/80 backdrop-blur-md border shadow-lg rounded-full px-4 py-2 flex items-center gap-2 pointer-events-auto transition-all hover:scale-105">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-1 mx-2">
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>

            {totalPages > 5 && (
              <>
                <div className="h-4 w-px bg-border mx-1" />
                <Select
                  value={currentPage.toString()}
                  onValueChange={handleJumpToPage}
                >
                  <SelectTrigger
                    className="h-7 w-[70px] border-none shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 px-1"
                    aria-label="Jump to page"
                  >
                    <SelectValue placeholder="Page" />
                  </SelectTrigger>
                  <SelectContent align="center">
                    {pageOptions.map((pageNum) => (
                      <SelectItem key={pageNum} value={pageNum.toString()}>
                        Page {pageNum}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for empty state
function FolderIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export default AssetFileExplorer;

