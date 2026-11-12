"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import SimpleAlert from "@/components/utils/SimpleAlert";
import {
  DayOverview,
  PanchangamHeader,
  DateNavigation,
  PanchangamDetails,
  DayTimeline,
  NowStatus,
} from "@/components/panchangam";
import { useNow, usePanchangam } from "@/hooks/use-panchangam";
import { getTodayInTimezone } from "@/lib/panchangam/utils";
import { nowInTimezone } from "@/lib/panchangam/time";
import type { ScheduleItem } from "@/types/panchangam";

interface PanchangamInfoProps {
  className?: string;
}

/**
 * Dashboard Panchangam: place + day selectors, day details and timeline.
 * Narrow-first: stacks on phones, two columns on wide containers.
 */
const PanchangamInfo: React.FC<PanchangamInfoProps> = ({ className }) => {
  const {
    data,
    isLoading,
    isFetching,
    isStale,
    isError,
    cityId,
    placeTimezone,
    date,
    isToday,
    setDate,
    handlePreviousDay,
    handleNextDay,
    handleToday,
    refetch,
  } = usePanchangam();

  const now = useNow(30_000);
  const nowMin = isToday
    ? nowInTimezone(placeTimezone, now).minutes
    : undefined;
  const info = data?.consizeInfo;

  const [tab, setTab] = useState("timeline");
  const [focusRequest, setFocusRequest] = useState<{
    id: string;
    seq: number;
  } | null>(null);
  const focusTimelineItem = (id: string) => {
    setTab("timeline");
    setFocusRequest((prev) => ({ id, seq: (prev?.seq ?? 0) + 1 }));
  };

  return (
    <div
      className={cn(
        "@container/panchangam flex flex-col mt-4 gap-4",
        className,
      )}
    >
      <Card className="shadow-sm">
        <CardHeader className="gap-4 px-4 pb-3 sm:px-6">
          <PanchangamHeader
            onRefresh={() => refetch()}
            isFetching={isFetching}
          />
          <DateNavigation
            date={date}
            today={getTodayInTimezone(placeTimezone)}
            onDateSelect={setDate}
            onPreviousDay={handlePreviousDay}
            onNextDay={handleNextDay}
            onToday={handleToday}
          />
        </CardHeader>
        <Separator />

        <CardContent
          className={cn(
            "px-4 pt-4 transition-opacity sm:px-6",
            isStale && "pointer-events-none opacity-50",
          )}
          aria-busy={isFetching}
        >
          {isLoading ? (
            <PanchangamSkeleton />
          ) : isError || !info ? (
            <SimpleAlert
              title={
                isError
                  ? "Error fetching panchangam"
                  : "No panchangam data available"
              }
            />
          ) : (
            <div className="flex flex-col gap-6">
              <NowStatus
                data={info}
                nowMin={nowMin}
                onSelect={focusTimelineItem}
              />

              {/*
                Narrow (phone / iPad portrait): summary → timeline → more.
                Wide: summary + more on the left, timeline on the right.
              */}
              <div className="grid grid-cols-1 items-start gap-6 @4xl/panchangam:grid-cols-5 @4xl/panchangam:grid-rows-[auto_1fr]">
                <PanchangamDetails
                  part="summary"
                  date={date}
                  panchangamData={info}
                  nowMin={nowMin}
                  className="@4xl/panchangam:col-span-2"
                />

                <div className="min-w-0 @4xl/panchangam:col-span-3 @4xl/panchangam:col-start-3 @4xl/panchangam:row-span-2 @4xl/panchangam:row-start-1">
                  <Tabs value={tab} onValueChange={setTab}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">Day timeline</h3>
                      <TabsList className="h-9">
                        <TabsTrigger value="timeline" className="px-3 text-xs">
                          Agenda
                        </TabsTrigger>
                        <TabsTrigger value="grid" className="px-3 text-xs">
                          Grid
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="timeline" className="mt-0">
                      <DayTimeline
                        data={info}
                        nowMin={nowMin}
                        focusRequest={focusRequest}
                      />
                    </TabsContent>
                    <TabsContent value="grid" className="mt-0">
                      <DayOverview
                        schedules={sameDaySchedules(info.schedules)}
                        place={cityId}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                <PanchangamDetails
                  part="more"
                  date={date}
                  panchangamData={info}
                  nowMin={nowMin}
                  className="@4xl/panchangam:col-span-2"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * The grid views place items on a single 00:00–24:00 axis: drop items that
 * start after midnight or span most of the day, and clip ones that cross it.
 */
function sameDaySchedules(schedules: ScheduleItem[]): ScheduleItem[] {
  return schedules
    .filter((s) => !s.startsNextDay)
    .filter(
      (s) =>
        s.startMin === undefined ||
        s.endMin === undefined ||
        s.endMin - s.startMin < 8 * 60,
    )
    .map((s) => (s.endsNextDay ? { ...s, endTime: "23:59", endMin: 1439 } : s));
}

function PanchangamSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 @4xl/panchangam:grid-cols-5">
      <div className="space-y-3 @4xl/panchangam:col-span-2">
        <div className="flex gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-24" />
      </div>
      <div className="space-y-3 @4xl/panchangam:col-span-3">
        <Skeleton className="h-16" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

export default PanchangamInfo;
