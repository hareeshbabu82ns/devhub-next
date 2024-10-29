"use client";

import React, { useEffect, useRef } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent, CardHeader } from "../ui/card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

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

const calculatePosition = (time: string, fromHour: number = 0) => {
  const [hour, minute] = time.split(":").map(Number);
  return (hour - fromHour) * 60 + minute + 8; // Returns total minutes from 00:00
};

const checkOverlap = (
  a: ScheduleItem,
  b: ScheduleItem,
  fromHour: number = 0,
) => {
  const startA = calculatePosition(a.startTime, fromHour);
  const endA = calculatePosition(a.endTime, fromHour);
  const startB = calculatePosition(b.startTime, fromHour);
  const endB = calculatePosition(b.endTime, fromHour);
  return startA < endB && startB < endA; // True if schedules overlap
};

const calculateHeight = (
  startTime: string,
  endTime: string,
  fromHour: number = 0,
) => {
  const startMinutes = calculatePosition(startTime, fromHour);
  const endMinutes = calculatePosition(endTime, fromHour);
  return endMinutes - startMinutes; // Duration in minutes
};

// Get the current time and calculate its position on the timeline
const getCurrentTimePosition = (fromHour: number = 0) => {
  const now = new Date();
  const currentMinutes = (now.getHours() - fromHour) * 60 + now.getMinutes();
  return currentMinutes + 8;
};

const findMinimumHour = (schedules: ScheduleItem[]) => {
  let minHour = 24;
  for (const schedule of schedules) {
    const [hour] = schedule.startTime.split(":").map(Number);
    minHour = Math.min(minHour, hour);
  }
  return minHour;
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
  }, []);

  const minHour = findMinimumHour(schedules); // Minimum hour for the timeline
  const currentTimePosition = getCurrentTimePosition(minHour); // Current time for the dotted line

  return (
    <div className="w-full min-w-[500px] mx-auto py-2 px-4 overflow-x-auto no-scrollbar">
      <ScrollArea className="h-96 w-full overflow-y-auto relative ">
        {/* Hours bar - 1440px for 24 hours x 60 minutes */}
        <div className={cn("relative  pt-2", `h-[${(24 - minHour) * 60}px]`)}>
          {hours.map((hour, index) => {
            if (index < minHour) return null;
            return (
              <div key={hour} className="relative h-[60px]">
                {/* Hour marker */}
                <div className="flex items-start">
                  <div className="w-16 text-muted-foreground -mt-3">{hour}</div>
                  <div className="flex-1 border-b border-dotted border-muted-foreground/50"></div>
                </div>
              </div>
            );
          })}

          {/* Dotted line for current time */}
          <div
            ref={scrollRef}
            className="absolute w-full h-1 bg-warning"
            style={{ top: `${currentTimePosition}px` }}
          ></div>

          {/* Render schedule cards */}
          {schedules.map((schedule, index) => {
            const topPosition = calculatePosition(schedule.startTime, minHour);
            const height = calculateHeight(
              schedule.startTime,
              schedule.endTime,
              minHour,
            );
            // Check if this schedule overlaps with previous schedules
            let overlapLevel = 0;
            for (let i = 0; i < index; i++) {
              if (checkOverlap(schedules[i], schedule, minHour)) {
                overlapLevel += 1; // Increment overlap level if there's an overlap
              }
            }
            const maxIndent = 5; // Maximum indent level to avoid excessive indentation
            const indentLevel = Math.min(overlapLevel, maxIndent);

            return (
              <Dialog key={schedule.title}>
                <DialogContent
                  className={cn(
                    schedule.negative ? "border-warning" : "border-success",
                  )}
                >
                  <DialogHeader>
                    <DialogTitle>{schedule.title}</DialogTitle>
                    <DialogDescription>
                      {schedule.startTime} - {schedule.endTime}
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
                <DialogTrigger>
                  <div
                    key={schedule.title}
                    className={cn(
                      "absolute w-[150px] p-2 overflow-y-auto no-scrollbar border flex flex-col justify-center bg-card",
                      schedule.negative
                        ? "border-warning/50"
                        : "border-success/50",
                    )}
                    style={{
                      top: `${topPosition}px`, // Top position in minutes from midnight
                      height: `${height}px`, // Height in minutes
                      left: `${80 + indentLevel * 130}px`, // Indent based on overlap level (each level adds 30px)
                    }}
                  >
                    <div
                      className={cn("text-sm font-medium p-0", {
                        "text-warning": schedule.negative,
                        "text-success": !schedule.negative,
                      })}
                    >
                      {schedule.title}
                    </div>
                    <div className="text-xs text-muted-foreground p-0">
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                  </div>
                </DialogTrigger>
              </Dialog>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DayOverview;
