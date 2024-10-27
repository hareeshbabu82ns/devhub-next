"use client";

import React, { useEffect, useRef } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent, CardHeader } from "../ui/card";
import { cn } from "@/lib/utils";

interface ScheduleItem {
  title: string;
  startTime: string;
  endTime: string;
  negative?: boolean;
}

interface DayOverviewProps {
  schedules: ScheduleItem[];
}

const hours = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`,
);

const calculatePosition = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute + 8; // Returns total minutes from 00:00
};

const checkOverlap = (a: ScheduleItem, b: ScheduleItem) => {
  const startA = calculatePosition(a.startTime);
  const endA = calculatePosition(a.endTime);
  const startB = calculatePosition(b.startTime);
  const endB = calculatePosition(b.endTime);
  return startA < endB && startB < endA; // True if schedules overlap
};

const calculateHeight = (startTime: string, endTime: string) => {
  const startMinutes = calculatePosition(startTime);
  const endMinutes = calculatePosition(endTime);
  return endMinutes - startMinutes; // Duration in minutes
};

// Get the current time and calculate its position on the timeline
const getCurrentTimePosition = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes + 8;
};

const DayOverview: React.FC<DayOverviewProps> = ({ schedules }) => {
  const scrollRef = useRef<HTMLDivElement>(null); // Ref to handle scrolling

  // Scroll to the current time position on load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [scrollRef]);

  const currentTimePosition = getCurrentTimePosition(); // Current time for the dotted line

  return (
    <div className="w-full mx-auto py-2 px-4">
      <ScrollArea className="h-96 w-full overflow-y-auto relative">
        {/* Hours bar - 1440px for 24 hours x 60 minutes */}
        <div className="relative h-[1440px] pt-2">
          {hours.map((hour, index) => (
            <div key={hour} className="relative h-[60px]">
              {/* Hour marker */}
              <div className="flex items-start">
                <div className="w-16 text-muted-foreground -mt-3">{hour}</div>
                <div className="flex-1 border-b border-dotted border-muted-foreground/50"></div>
              </div>
            </div>
          ))}

          {/* Dotted line for current time */}
          <div
            ref={scrollRef}
            className="absolute w-full h-1 bg-warning"
            style={{ top: `${currentTimePosition}px` }}
          ></div>

          {/* Render schedule cards */}
          {schedules.map((schedule, index) => {
            const topPosition = calculatePosition(schedule.startTime);
            const height = calculateHeight(
              schedule.startTime,
              schedule.endTime,
            );
            // Check if this schedule overlaps with previous schedules
            let overlapLevel = 0;
            for (let i = 0; i < index; i++) {
              if (checkOverlap(schedules[i], schedule)) {
                overlapLevel += 1; // Increment overlap level if there's an overlap
              }
            }
            const maxIndent = 5; // Maximum indent level to avoid excessive indentation
            const indentLevel = Math.min(overlapLevel, maxIndent);

            return (
              <Card
                key={schedule.title}
                className={cn(
                  "absolute w-[calc(100%-80px)] p-2 overflow-y-auto no-scrollbar rounded-none",
                  schedule.negative ? "border-warning/50" : "border-success/50",
                )}
                style={{
                  top: `${topPosition}px`, // Top position in minutes from midnight
                  height: `${height}px`, // Height in minutes
                  left: `${80 + indentLevel * 100}px`, // Indent based on overlap level (each level adds 30px)
                }}
              >
                <CardHeader
                  className={cn("text-sm font-medium p-0", {
                    "text-warning": schedule.negative,
                    "text-success": !schedule.negative,
                  })}
                >
                  {schedule.title}
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground p-0">
                  {schedule.startTime} - {schedule.endTime}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DayOverview;
