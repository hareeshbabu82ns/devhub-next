/**
 * PanchangamHeader component for displaying title, place selector, and refresh button
 */

import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/utils/icons";
import PanchangamPlaceSelector from "@/components/blocks/panchangam-place-selector";
import { CalendarIcon, MapPin } from "lucide-react";

export interface PanchangamHeaderProps {
  onRefresh: () => void;
  className?: string;
}

/**
 * Header component for Panchangam with title, place selector, and refresh button
 */
export function PanchangamHeader({
  onRefresh,
  className,
}: PanchangamHeaderProps) {
  return (
    <div className="flex flex-row sm:items-center justify-between gap-3">
      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
        <CalendarIcon className="h-5 w-5 text-primary" />
        Panchangam
      </CardTitle>

      <div className="flex items-center gap-1 sm:gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <div className="w-32 sm:w-40">
          <PanchangamPlaceSelector />
        </div>
        <Button
          onClick={onRefresh}
          type="button"
          variant="ghost"
          size="icon"
          className="size-4"
          title="Refresh"
        >
          <Icons.refresh className="size-4" />
        </Button>
      </div>
    </div>
  );
}
