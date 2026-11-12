/**
 * PanchangamHeader: title, refresh button and place switcher
 */

import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/utils/icons";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceSwitcher } from "./PlaceSwitcher";

export interface PanchangamHeaderProps {
  onRefresh: () => void;
  isFetching?: boolean;
  className?: string;
}

export function PanchangamHeader({
  onRefresh,
  isFetching,
  className,
}: PanchangamHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <CalendarIcon className="size-5 text-primary" />
          Panchangam
        </CardTitle>
        <Button
          onClick={onRefresh}
          type="button"
          variant="ghost"
          size="icon"
          className="size-10"
          title="Refresh"
          aria-label="Refresh panchangam"
          disabled={isFetching}
        >
          <Icons.refresh
            className={cn("size-4", isFetching && "animate-spin")}
          />
        </Button>
      </div>
      <PlaceSwitcher />
    </div>
  );
}
