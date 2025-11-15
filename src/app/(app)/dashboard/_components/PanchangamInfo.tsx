"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import {
  DayOverview,
  PanchangamHeader,
  DateNavigation,
  PanchangamDetails,
} from "@/components/panchangam";
import { usePanchangam } from "@/hooks/use-panchangam";

interface PanchangamInfoProps {
  className?: string;
}

/**
 * Main Panchangam component that displays daily Hindu calendar information
 * Composed of smaller components and uses custom hook for state management
 */
const PanchangamInfo: React.FC<PanchangamInfoProps> = ({ className }) => {
  const {
    data,
    isLoading,
    isError,
    cityId,
    date,
    setDate,
    handlePreviousDay,
    handleNextDay,
    handleToday,
    refetch,
  } = usePanchangam();

  // Loading and error states
  if (isLoading) return <Loader />;
  if (isError) return <SimpleAlert title="Error fetching panchangam" />;
  if (!data) return <SimpleAlert title="No panchangam data available" />;

  return (
    <div
      className={cn(
        "@container/panchangam flex flex-col mt-4 gap-4",
        className,
      )}
    >
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            {/* Header with Place Selector and Refresh */}
            <PanchangamHeader onRefresh={() => refetch()} />

            <Separator />

            {/* Date Navigation Controls */}
            <DateNavigation
              date={date}
              onDateSelect={setDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onToday={handleToday}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Day Details Panel */}
              <div className="lg:col-span-2">
                <PanchangamDetails
                  date={date}
                  panchangamData={data.consizeInfo}
                />
              </div>

              {/* Timeline View Panel */}
              <Card className="lg:col-span-3 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardContent className="p-0">
                    <DayOverview
                      schedules={data.consizeInfo.schedules}
                      place={cityId}
                    />
                  </CardContent>
                </CardHeader>
              </Card>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};

export default PanchangamInfo;
