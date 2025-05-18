"use client";

import { useParams, useRouter } from "next/navigation";
import { useLanguageAtomValue } from "@/hooks/use-config";
import SlokamDetails from "@/components/blocks/SlokamDetails";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchEntitySiblings } from "../../../actions";
import { useCallback, useEffect } from "react";
import EntityNavigationView from "@/app/(app)/entities/_components/EntityBreadcrumbView";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";

const Page = () => {
  const params = useParams();
  const { entityId, childId } = params as { entityId: string; childId: string };
  const router = useRouter();
  const language = useLanguageAtomValue();

  // Fetch siblings for navigation
  const {
    data: siblingData,
    isFetching,
    isLoading,
    error,
    refetch,
  } = useQuery( {
    queryKey: [ "slokamSiblings", { slokamId: childId } ],
    queryFn: async () => {
      return await fetchEntitySiblings( childId );
    },
  } );

  // Handle navigation
  const handlePrevious = useCallback( () => {
    if ( siblingData?.prev ) {
      router.replace( `/entities/${entityId}/child/${siblingData.prev.id}`, { scroll: false } );
    }
  }, [ siblingData?.prev, router ] );

  const handleNext = useCallback( () => {
    if ( siblingData?.next ) {
      router.replace( `/entities/${entityId}/child/${siblingData.next.id}`, { scroll: false } );
    }
  }, [ siblingData?.next, router ] );

  const handleSlokamSelect = useCallback( ( slokamId: string ) => {
    router.replace( `/entities/${entityId}/child/${slokamId}`, { scroll: false } );
  }, [ router ] );

  // Add keyboard navigation support
  useEffect( () => {
    const handleKeyDown = ( e: KeyboardEvent ) => {
      // Only respond to keyboard events when not typing in an input field
      if ( e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement ) {
        return;
      }

      if ( e.key === 'ArrowLeft' && siblingData?.prev ) {
        handlePrevious();
      } else if ( e.key === 'ArrowRight' && siblingData?.next ) {
        handleNext();
      }
    };

    window.addEventListener( 'keydown', handleKeyDown );

    return () => {
      window.removeEventListener( 'keydown', handleKeyDown );
    };
  }, [ handlePrevious, handleNext, siblingData ] );


  if ( isLoading || isFetching ) return <Loader />;
  if ( error ) return <SimpleAlert title={error.message} />;

  return (
    <div className="flex flex-1 flex-col min-h-[calc(100vh_-_theme(spacing.20))]">
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
          <EntityNavigationView entityId={childId} />
        </div>
        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Navigation buttons and dropdown */}
          <Button
            onClick={handlePrevious}
            type="button"
            variant="outline"
            size="icon"
            disabled={!siblingData?.prev}
            title="Previous slokam (← Left arrow)"
            aria-label="Previous slokam (← Left arrow)"
          >
            <Icons.chevronLeft className="size-4 mr-1" />
          </Button>

          {siblingData?.siblings && siblingData.siblings.length > 0 && (
            <Select
              value={childId}
              onValueChange={handleSlokamSelect}
            >
              <SelectTrigger className="w-[120px] truncate">
                <SelectValue placeholder="Select slokam">
                  {siblingData.siblings.find( s => s.id === childId )?.order || "1"} / {siblingData.siblings.length}
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
            disabled={!siblingData?.next}
            title="Next slokam (→ Right arrow)"
            aria-label="Next slokam (→ Right arrow)"
          >
            <Icons.chevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>
      <SlokamDetails slokamId={childId} />
    </div>
  );
};

export default Page;