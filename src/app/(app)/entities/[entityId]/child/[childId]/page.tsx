"use client";

import { useParams, useRouter } from "next/navigation";
import SlokamDetails from "@/components/blocks/SlokamDetails";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchEntitySiblings } from "../../../actions";
import { useCallback, useEffect, useMemo, useState } from "react";
import EntityNavigationView from "@/app/(app)/entities/_components/EntityBreadcrumbView";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { useKeyboardNavigation, KEYS } from "@/hooks";

const Page = () => {
  const params = useParams();
  const { entityId, childId } = params as { entityId: string; childId: string };
  const router = useRouter();

  // Track the current slokam ID locally for client-side navigation
  const [ currentSlokamId, setCurrentSlokamId ] = useState( childId );

  // Fetch siblings only once
  const {
    data: siblingData,
    isFetching,
    isLoading,
    error,
    refetch,
  } = useQuery( {
    queryKey: [ "slokamSiblings", { slokamId: childId } ], // Use childId instead of currentSlokamId to prevent refetching
    queryFn: async () => {
      return await fetchEntitySiblings( childId );
    },
    // staleTime: 1000 * 60 * 5, // Keep fresh for 5 minutes
  } );

  // Compute current sibling navigation information client-side
  const navigationInfo = useMemo( () => {
    if ( !siblingData?.siblings || siblingData.siblings.length === 0 ) {
      return { prev: null, next: null, current: null };
    }

    // Find current index in siblings array
    const siblings = siblingData.siblings;
    const currentIndex = siblings.findIndex( s => s.id === currentSlokamId );

    if ( currentIndex === -1 ) {
      return { prev: null, next: null, current: null };
    }

    // Determine previous and next siblings
    const prev = currentIndex > 0 ? siblings[ currentIndex - 1 ] : null;
    const next = currentIndex < siblings.length - 1 ? siblings[ currentIndex + 1 ] : null;
    const current = siblings[ currentIndex ];

    return { prev, next, current };
  }, [ siblingData?.siblings, currentSlokamId ] );

  // Update URL without reloading the page
  const updateUrl = useCallback( ( newSlokamId: string ) => {
    window.history.pushState(
      {},
      '',
      `/entities/${entityId}/child/${newSlokamId}`
    );
  }, [ entityId ] );

  // Handle navigation
  const handlePrevious = useCallback( () => {
    if ( navigationInfo.prev ) {
      setCurrentSlokamId( navigationInfo.prev.id );
      updateUrl( navigationInfo.prev.id );
    }
  }, [ navigationInfo.prev, updateUrl ] );

  const handleNext = useCallback( () => {
    if ( navigationInfo.next ) {
      setCurrentSlokamId( navigationInfo.next.id );
      updateUrl( navigationInfo.next.id );
    }
  }, [ navigationInfo.next, updateUrl ] );

  const handleSlokamSelect = useCallback( ( slokamId: string ) => {
    setCurrentSlokamId( slokamId );
    updateUrl( slokamId );
  }, [ updateUrl ] );

  // Sync with URL parameters when they change externally
  useEffect( () => {
    setCurrentSlokamId( childId );
  }, [ childId ] );

  // Add keyboard navigation support using the custom hook
  useKeyboardNavigation( {
    keyMap: {
      [ KEYS.ARROW_LEFT ]: () => {
        if ( navigationInfo.prev ) {
          handlePrevious();
          return true;
        }
        return false;
      },
      [ KEYS.ARROW_RIGHT ]: () => {
        if ( navigationInfo.next ) {
          handleNext();
          return true;
        }
        return false;
      }
    },
    enabled: true
  } );

  // Handle popstate (browser back/forward buttons)
  useEffect( () => {
    const handlePopState = () => {
      const pathParts = window.location.pathname.split( '/' );
      const newSlokamId = pathParts[ pathParts.length - 1 ];
      setCurrentSlokamId( newSlokamId );
    };

    window.addEventListener( 'popstate', handlePopState );

    return () => {
      window.removeEventListener( 'popstate', handlePopState );
    };
  }, [] );

  if ( isLoading || isFetching ) return <Loader />;
  if ( error ) return <SimpleAlert title={error.message} />;

  const navigationView = (
    <div className="flex flex-row items-center justify-between pb-4">
      {/* Header Left Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => router.back()}
          type="button"
          variant="outline"
          size="icon"
          title="Back (← Backspace)"
          aria-label="Back (← Backspace)"
        >
          <Icons.chevronLeft className="size-4" />
        </Button>
        <Button
          onClick={() => refetch()}
          type="button"
          variant="outline"
          size="icon"
        >
          <Icons.refresh className="size-4" />
        </Button>
        <EntityNavigationView entityId={currentSlokamId} />
      </div>
      {/* Header Right Actions */}
      <div className="flex items-center gap-2">
        {/* Navigation buttons and dropdown */}
        <Button
          onClick={handlePrevious}
          type="button"
          variant="outline"
          size="icon"
          disabled={!navigationInfo.prev}
          title="Previous slokam (← Left arrow)"
          aria-label="Previous slokam (← Left arrow)"
        >
          <Icons.chevronLeft className="size-4 mr-1" />
        </Button>

        {siblingData?.siblings && siblingData.siblings.length > 0 && (
          <Select
            value={currentSlokamId}
            onValueChange={handleSlokamSelect}
          >
            <SelectTrigger className="w-[120px] truncate">
              <SelectValue placeholder="Select slokam">
                {navigationInfo.current?.order || "1"} / {siblingData.siblings.length}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {siblingData.siblings.map( ( sibling, index ) => (
                <SelectItem key={sibling.id} value={sibling.id}>
                  {( sibling.order || index ) + 1}
                </SelectItem>
              ) )}
            </SelectContent>
          </Select>
        )}

        <Button
          onClick={handleNext}
          type="button"
          variant="outline"
          size="icon"
          disabled={!navigationInfo.next}
          title="Next slokam (→ Right arrow)"
          aria-label="Next slokam (→ Right arrow)"
        >
          <Icons.chevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-1 flex-col min-h-[calc(100vh_-_theme(spacing.20))]">
      {navigationView}
      <SlokamDetails slokamId={currentSlokamId} />
    </div>
  );
};

export default Page;