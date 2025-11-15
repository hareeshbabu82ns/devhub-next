"use client";

import React, { useEffect, useRef, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Clock } from "lucide-react";
import type { DayOverviewProps, ScheduleItem } from "./DayOverview";
import { PANCHANGAM_PLACE_TIMEZONES } from "@/lib/constants";

const hours = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`,
);

const calculatePosition = (time: string, fromHour: number = 0) => {
  const [hour, minute] = time.split(":").map(Number);
  return (hour - fromHour) * 60 + minute;
};

const calculateHeight = (
  startTime: string,
  endTime: string,
  fromHour: number = 0,
) => {
  const startMinutes = calculatePosition(startTime, fromHour);
  const endMinutes = calculatePosition(endTime, fromHour);
  return endMinutes - startMinutes;
};

/**
 * Get current time components (hours, minutes) in a specific timezone
 */
const getTimeInTimezone = (timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value || "0",
    10,
  );

  return { hour, minute };
};

const getCurrentTimePosition = (fromHour: number = 0, timeZone?: string) => {
  let hour: number, minute: number;

  if (timeZone) {
    // Get time in the specified timezone
    const timeComponents = getTimeInTimezone(timeZone);
    hour = timeComponents.hour;
    minute = timeComponents.minute;
  } else {
    // Fall back to browser's local time
    const now = new Date();
    hour = now.getHours();
    minute = now.getMinutes();
  }

  const currentMinutes = (hour - fromHour) * 60 + minute;
  return currentMinutes;
};

const findMinimumHour = (schedules: ScheduleItem[]) => {
  let minHour = 24;
  for (const schedule of schedules) {
    const [hour] = schedule.startTime.split(":").map(Number);
    minHour = Math.min(minHour, hour);
  }
  return minHour === 24 ? 0 : minHour;
};

const formatDuration = (startTime: string, endTime: string) => {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const durationMinutes =
    (endHour - startHour) * 60 + (endMinute - startMinute);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

// Organize overlapping schedules into columns
const organizeSchedulesIntoColumns = (
  schedules: ScheduleItem[],
  fromHour: number,
) => {
  const columns: Array<Array<{ schedule: ScheduleItem; index: number }>> = [];

  schedules.forEach((schedule, index) => {
    const startPos = calculatePosition(schedule.startTime, fromHour);
    const endPos = calculatePosition(schedule.endTime, fromHour);

    // Find first available column where this schedule doesn't overlap
    let placedInColumn = false;
    for (const column of columns) {
      const hasOverlap = column.some((item) => {
        const itemStart = calculatePosition(item.schedule.startTime, fromHour);
        const itemEnd = calculatePosition(item.schedule.endTime, fromHour);
        return startPos < itemEnd && itemStart < endPos;
      });

      if (!hasOverlap) {
        column.push({ schedule, index });
        placedInColumn = true;
        break;
      }
    }

    // If no available column found, create a new one
    if (!placedInColumn) {
      columns.push([{ schedule, index }]);
    }
  });

  return columns;
};

const DayOverviewAdvanced: React.FC<DayOverviewProps> = ({
  schedules,
  place,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get the timezone for the place
  const placeTimezone =
    place && PANCHANGAM_PLACE_TIMEZONES[place]
      ? PANCHANGAM_PLACE_TIMEZONES[place]
      : Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Update current time every minute for live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Scroll to current time on load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  const minHour = findMinimumHour(schedules);
  const currentTimePosition = React.useMemo(
    () => getCurrentTimePosition(minHour, placeTimezone),
    [currentTime, minHour, placeTimezone],
  );
  const columns = organizeSchedulesIntoColumns(schedules, minHour);
  const totalColumns = columns.length;

  // Calculate responsive card width
  const timeColumnWidth = 64; // Width for time labels
  const availableWidth = containerWidth - timeColumnWidth - 32; // Subtract padding
  const minCardWidth = containerWidth < 640 ? 100 : 130; // Smaller minimum on mobile
  const maxCardWidth = containerWidth < 640 ? 150 : 220; // Adaptive max width
  const cardWidth = Math.max(
    minCardWidth,
    Math.min(maxCardWidth, availableWidth / Math.max(1, totalColumns)),
  );

  return (
    <div className="w-full mx-auto py-2 px-2 sm:px-4" ref={containerRef}>
      {/* Timezone info banner */}
      <div className="mb-2 px-2 py-1.5 bg-muted/50 rounded-md flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>
          Timeline for{" "}
          {place ? place.charAt(0).toUpperCase() + place.slice(1) : "location"}{" "}
          time ({placeTimezone})
        </span>
      </div>
      <ScrollArea className="h-[500px] sm:h-[600px] md:h-[700px] w-full relative">
        <div
          className="relative"
          style={{
            minWidth: `${timeColumnWidth + cardWidth * totalColumns + 32}px`,
          }}
        >
          {/* Timeline grid */}
          {hours.map((hour, index) => {
            if (index < minHour) return null;
            const position = (index - minHour) * 60;
            return (
              <React.Fragment key={hour}>
                {/* Hour line */}
                <div
                  className="absolute w-full flex items-start"
                  style={{ top: `${position}px` }}
                >
                  {/* Time label */}
                  <div className="sticky left-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
                    <div className="w-16 text-xs sm:text-sm font-medium text-muted-foreground pr-2 text-right">
                      {hour}
                    </div>
                  </div>
                  {/* Hour line */}
                  <div className="flex-1 border-t border-dashed border-muted-foreground/20 ml-2" />
                </div>
                {/* Half-hour marker (lighter) */}
                <div
                  className="absolute w-full flex items-start"
                  style={{ top: `${position + 30}px` }}
                >
                  <div className="w-16" />
                  <div className="flex-1 border-t border-dotted border-muted-foreground/10 ml-2" />
                </div>
              </React.Fragment>
            );
          })}

          {/* Current time indicator */}
          <div
            ref={scrollRef}
            className="absolute z-20 flex items-center pointer-events-none"
            style={{
              top: `${currentTimePosition}px`,
              left: 0,
              right: 0,
            }}
          >
            <div className="w-16 flex items-center justify-end pr-2">
              <div className="flex items-center gap-1 bg-warning/90 text-warning-foreground px-1.5 py-0.5 rounded-md text-xs font-semibold">
                <Clock className="h-3 w-3" />
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: placeTimezone,
                })}
              </div>
            </div>
            <div className="flex-1 h-0.5 bg-warning shadow-lg" />
          </div>

          {/* Schedule cards organized in columns */}
          <div
            className="absolute top-0"
            style={{
              left: `${timeColumnWidth}px`,
              right: 0,
              height: `${(24 - minHour) * 60}px`,
            }}
          >
            {columns.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${columnIndex * cardWidth + 8}px`,
                  width: `${cardWidth - 4}px`,
                }}
              >
                {column.map(({ schedule, index }) => {
                  const topPosition = calculatePosition(
                    schedule.startTime,
                    minHour,
                  );
                  const height = calculateHeight(
                    schedule.startTime,
                    schedule.endTime,
                    minHour,
                  );
                  const duration = formatDuration(
                    schedule.startTime,
                    schedule.endTime,
                  );
                  const isShortSlot = height < 50;

                  return (
                    <TooltipProvider
                      key={`tooltip-provider-${index}`}
                      delayDuration={300}
                    >
                      <Dialog>
                        <DialogContent
                          className={cn(
                            "max-w-md",
                            schedule.negative
                              ? "border-destructive"
                              : "border-primary",
                          )}
                        >
                          <DialogHeader>
                            <DialogTitle className="text-lg">
                              {schedule.title}
                            </DialogTitle>
                            <DialogDescription className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {schedule.startTime} - {schedule.endTime}
                                </span>
                                <Badge variant="outline">{duration}</Badge>
                              </div>
                              <Badge
                                variant={
                                  schedule.negative ? "destructive" : "default"
                                }
                                className="mt-2"
                              >
                                {schedule.negative
                                  ? "Inauspicious"
                                  : "Auspicious"}
                              </Badge>
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                              <Card
                                className={cn(
                                  "absolute cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg",
                                  "border-l-4 overflow-visible",
                                  schedule.negative
                                    ? "border-l-destructive hover:bg-destructive/5"
                                    : "border-l-primary hover:bg-primary/5",
                                )}
                                style={{
                                  top: `${topPosition}px`,
                                  height: `${Math.max(height, 24)}px`,
                                  width: "100%",
                                }}
                              >
                                <CardContent
                                  className={cn(
                                    "h-full flex gap-1",
                                    height < 35
                                      ? "p-1 flex-row items-center"
                                      : "p-2 flex-col justify-center gap-0.5",
                                  )}
                                >
                                  {/* For very short slots, use horizontal compact layout */}
                                  {height < 35 ? (
                                    <>
                                      <div
                                        className={cn(
                                          "font-medium leading-tight text-[10px] sm:text-xs truncate flex-1",
                                          schedule.negative
                                            ? "text-destructive"
                                            : "text-primary",
                                        )}
                                        title={`${schedule.title} (${schedule.startTime} - ${schedule.endTime})`}
                                      >
                                        {schedule.title}
                                      </div>
                                      <div
                                        className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap shrink-0"
                                        title={`${schedule.startTime} - ${schedule.endTime}`}
                                      >
                                        {schedule.startTime.slice(0, 5)}
                                      </div>
                                    </>
                                  ) : (
                                    /* Regular vertical layout for taller slots */
                                    <>
                                      <div
                                        className={cn(
                                          "font-medium leading-tight",
                                          height < 50
                                            ? "text-xs line-clamp-1"
                                            : "text-sm line-clamp-2",
                                          schedule.negative
                                            ? "text-destructive"
                                            : "text-primary",
                                        )}
                                        title={schedule.title}
                                      >
                                        {schedule.title}
                                      </div>
                                      {height >= 45 && (
                                        <div className="text-xs text-muted-foreground leading-tight truncate">
                                          {schedule.startTime}
                                        </div>
                                      )}
                                      {height >= 65 && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] h-4 px-1 w-fit"
                                        >
                                          {duration}
                                        </Badge>
                                      )}
                                    </>
                                  )}
                                </CardContent>
                              </Card>
                            </DialogTrigger>
                          </TooltipTrigger>
                          {isShortSlot && (
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1">
                                <div className="font-semibold">
                                  {schedule.title}
                                </div>
                                <div className="text-xs flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {schedule.startTime} - {schedule.endTime}
                                  <span className="text-muted-foreground">
                                    ({duration})
                                  </span>
                                </div>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </Dialog>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default DayOverviewAdvanced;
