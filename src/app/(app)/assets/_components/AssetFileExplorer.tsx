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
import { ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
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

const AssetFileExplorer = ( { path }: { path: string } ) => {
  const router = useRouter();
  const pathname = usePathname();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const currentPath = searchParams?.get( "path" ) || "/";

  // Search state
  const [ searchQuery, setSearchQuery ] = useState( "" );
  const debouncedSearchQuery = useDebounce( searchQuery, 300 );
  const [ useRegex, setUseRegex ] = useState( false );
  const [ regexError, setRegexError ] = useState<string | null>( null );

  // Pagination state
  const [ currentPage, setCurrentPage ] = useState( 1 );
  const [ itemsPerPage, setItemsPerPage ] = useState( 12 );

  // Fullscreen image viewer state
  const [ isImageViewerOpen, setIsImageViewerOpen ] = useState( false );
  const [ activeImageIndex, setActiveImageIndex ] = useState<number>( -1 );

  // Responsive grid adjustments
  const isMobile = useMediaQuery( "(max-width: 640px)" );
  const isTablet = useMediaQuery( "(min-width: 641px) and (max-width: 1024px)" );

  // Adjust items per page based on screen size
  useEffect( () => {
    if ( isMobile ) setItemsPerPage( 6 );
    else if ( isTablet ) setItemsPerPage( 12 );
    else setItemsPerPage( 24 );
  }, [ isMobile, isTablet ] );

  const { data, error, isFetching, isPending, refetch } = useQuery( {
    queryKey: [ "assetFileExplorer", path ],
    queryFn: async () => {
      const data = await exploreAssets( path );
      return data;
    },
  } );

  const onDeleteFile = async ( name: string ) => {
    await deleteAsset( `${path}/${name}` );
    refetch();
  };

  const onClick = ( file: FileAttributes ) => {
    if ( file.isDirectory ) {
      const newPath = `${pathname}/${file.name}`;
      router.push( `${newPath}` );
    }
  };

  // Reset to first page when path changes or search query changes
  useEffect( () => {
    setCurrentPage( 1 );
  }, [ path, debouncedSearchQuery, useRegex ] );

  // Filter assets based on search query using either regular string or regex matching
  const filteredAssets = useMemo( () => {
    if ( !data || !data.assets ) return [];

    if ( !debouncedSearchQuery ) return data.assets;

    // Clear previous regex errors
    setRegexError( null );

    if ( useRegex ) {
      try {
        // Create a regex object from the search query
        // We'll make it case-insensitive by default for better UX
        const regex = new RegExp( debouncedSearchQuery, 'i' );
        return data.assets.filter( file => regex.test( file.name ) );
      } catch ( err ) {
        // Handle invalid regex pattern
        setRegexError( ( err as Error ).message );
        // Fallback to normal search when regex is invalid
        const query = debouncedSearchQuery.toLowerCase();
        return data.assets.filter( file =>
          file.name.toLowerCase().includes( query )
        );
      }
    } else {
      // Normal string matching (case-insensitive)
      const query = debouncedSearchQuery.toLowerCase();
      return data.assets.filter( file =>
        file.name.toLowerCase().includes( query )
      );
    }
  }, [ data, debouncedSearchQuery, useRegex ] );

  // Filter only images for the image viewer
  const imageAssets = useMemo( () => {
    if ( !filteredAssets ) return [];
    return filteredAssets.filter( file =>
      !file.isDirectory &&
      [ 'jpg', 'jpeg', 'png', 'svg', 'webp', 'gif' ].includes( file.ext.toLowerCase() )
    );
  }, [ filteredAssets ] );

  // Image viewer handlers
  const openImageViewer = ( fileIndex: number ) => {
    // Find the actual index in the imageAssets array
    const imageIndex = imageAssets.findIndex( img =>
      img.name === filteredAssets[ fileIndex ].name
    );

    if ( imageIndex !== -1 ) {
      setActiveImageIndex( imageIndex );
      setIsImageViewerOpen( true );
    }
  };

  const handlePreviousImage = () => {
    if ( activeImageIndex > 0 ) {
      setActiveImageIndex( activeImageIndex - 1 );
    }
  };

  const handleNextImage = () => {
    if ( activeImageIndex < imageAssets.length - 1 ) {
      setActiveImageIndex( activeImageIndex + 1 );
    }
  };

  const handleCloseImageViewer = () => {
    setIsImageViewerOpen( false );
  };

  if ( isFetching || isPending ) return <Loader />;
  if ( error ) return <SimpleAlert title={error.message} />;

  if ( !data || !data.assets )
    return <SimpleAlert title={`Could not fetch assets at path ${path}`} />;

  // Calculate pagination values
  const totalItems = filteredAssets.length;
  const totalPages = Math.ceil( totalItems / itemsPerPage );
  const startIndex = ( currentPage - 1 ) * itemsPerPage;
  const endIndex = Math.min( startIndex + itemsPerPage, totalItems );

  // Get current page items
  const currentItems = filteredAssets.slice( startIndex, endIndex );

  const handlePageChange = ( page: number ) => {
    if ( page < 1 || page > totalPages ) return;
    setCurrentPage( page );
    // Scroll to top of the component
    window.scrollTo( { top: 0, behavior: 'smooth' } );
  };

  // Handle jump to page selection
  const handleJumpToPage = ( value: string ) => {
    const page = parseInt( value, 10 );
    handlePageChange( page );
  };

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery( "" );
    setRegexError( null );
  };

  // Generate page options for dropdown
  const pageOptions = Array.from( { length: totalPages }, ( _, i ) => i + 1 );

  // Determine active image information for the fullscreen viewer
  const activeImage = activeImageIndex >= 0 && activeImageIndex < imageAssets.length
    ? imageAssets[ activeImageIndex ]
    : null;

  return (
    <div className="space-y-6">
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

      {totalItems === 0 && !debouncedSearchQuery ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground text-center">No assets found</p>
        </div>
      ) : totalItems > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-3 md:gap-4">
          {currentItems.map( ( file, index ) => (
            <AssetFileTile
              key={file.name}
              file={file}
              path={currentPath}
              onDeleteFile={onDeleteFile}
              onClick={onClick}
              onOpenFullscreen={() => openImageViewer( startIndex + index )}
            />
          ) )}
        </div>
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

      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-6 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange( currentPage - 1 )}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-1">
            {[ ...Array( totalPages ) ].map( ( _, index ) => {
              const pageNumber = index + 1;
              // Show first page, last page, current page, and one before/after current
              const shouldShow =
                pageNumber === 1 ||
                pageNumber === totalPages ||
                Math.abs( pageNumber - currentPage ) <= 1;

              if ( !shouldShow ) {
                // Show ellipsis if there's a gap (only once per gap)
                if ( ( pageNumber === 2 && currentPage > 3 ) ||
                  ( pageNumber === totalPages - 1 && currentPage < totalPages - 2 ) ) {
                  return <span key={pageNumber} className="mx-1">...</span>;
                }
                return null;
              }

              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  className="size-8 md:size-9"
                  onClick={() => handlePageChange( pageNumber )}
                >
                  {pageNumber}
                </Button>
              );
            } )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange( currentPage + 1 )}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>

          {totalPages > 5 && (
            <div className="flex items-center gap-2 ml-1 sm:ml-4">
              <Select
                value={currentPage.toString()}
                onValueChange={handleJumpToPage}
              >
                <SelectTrigger
                  className="h-8 w-[70px] sm:w-[110px] flex-shrink-0"
                  aria-label="Jump to page"
                >
                  <SelectValue placeholder="Page" />
                </SelectTrigger>
                <SelectContent>
                  {pageOptions.map( ( pageNum ) => (
                    <SelectItem key={pageNum} value={pageNum.toString()}>
                      Page {pageNum}
                    </SelectItem>
                  ) )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {totalItems > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {startIndex + 1}-{endIndex} of {totalItems} items
        </div>
      )}
    </div>
  );
};

export default AssetFileExplorer;
