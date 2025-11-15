/**
 * DateNavigation component for navigating between dates in Panchangam
 */

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export interface DateNavigationProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  className?: string;
}

/**
 * Date navigation component with calendar picker and navigation buttons
 */
export function DateNavigation({
  date,
  onDateSelect,
  onPreviousDay,
  onNextDay,
  onToday,
  className,
}: DateNavigationProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          onClick={onPreviousDay}
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title="Previous Day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal min-w-[200px] sm:min-w-60",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateSelect}
              autoFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          onClick={onNextDay}
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title="Next Day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button
        onClick={onToday}
        variant="secondary"
        size="sm"
        className="self-start sm:self-auto"
      >
        Today
      </Button>
    </div>
  );
}
