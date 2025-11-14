"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import React from "react";
import { getDayPanchangam } from "@/lib/panchangam/actions";
import { useQuery } from "@tanstack/react-query";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { usePanchangamPlaceAtomValue } from "@/hooks/use-config";
import DayOverview from "@/components/panchangam/DayOverview";
import PanchangamPlaceSelector from "@/components/blocks/panchangam-place-selector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  MapPin,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";

// const schedules = [
//   { title: "Team Meeting", startTime: "09:00", endTime: "10:30" },
//   { title: "Client Call", startTime: "11:15", endTime: "12:00" },
//   { title: "Lunch Break", startTime: "13:00", endTime: "14:00" },
//   { title: "Project Discussion", startTime: "15:45", endTime: "16:30" },
// ];

interface PanchangamInfoProps {
  className?: string;
}

const PanchangamInfo: React.FC<PanchangamInfoProps> = ({ className }) => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  const cityId = usePanchangamPlaceAtomValue();

  const { data, isFetching, isPending, isError, refetch } = useQuery({
    queryKey: ["panchangam", cityId, date],
    queryFn: async () => {
      const response = await getDayPanchangam({ place: cityId, date });
      return response;
    },
    staleTime: QUERY_STALE_TIME_LONG,
  });

  const handlePreviousDay = () => {
    setDate((prev) => (prev ? subDays(prev, 1) : new Date()));
  };

  const handleNextDay = () => {
    setDate((prev) => (prev ? addDays(prev, 1) : new Date()));
  };

  const handleToday = () => {
    setDate(new Date());
  };

  if (isFetching || isPending) return <Loader />;
  if (isError) return <SimpleAlert title="Error fetching panchangam" />;

  return (
    <div
      className={cn(
        "@container/panchangam flex flex-col mt-4 gap-4",
        className,
      )}
    >
      {/* Header with Date Navigation and Place Selection */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            {/* Title and Place Selector Row */}
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
                  onClick={() => refetch()}
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

            <Separator />

            {/* Date Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePreviousDay}
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
                      onSelect={setDate}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  onClick={handleNextDay}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={handleToday}
                variant="secondary"
                size="sm"
                className="self-start sm:self-auto"
              >
                Today
              </Button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Panchangam Details */}
              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">
                    Day Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date Info */}
                  <div className="space-y-2 flex flex-row gap-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Date:
                    </div>
                    <div className="text-base font-semibold">
                      {date ? format(date, "EEEE, MMMM d, yyyy") : ""}
                    </div>
                  </div>

                  <Separator />

                  {/* Panchang Info */}
                  <div className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div className="flex flex-row gap-2">
                        <span className="text-muted-foreground">Varam:</span>{" "}
                        <span className="font-medium">
                          {data.consizeInfo.day.panchang.weekday}
                        </span>
                      </div>
                      <div className="flex flex-row gap-2">
                        <span className="text-muted-foreground">Paksham:</span>{" "}
                        <span className="font-medium">
                          {data.consizeInfo.day.panchang.paksha}
                        </span>
                      </div>
                      <div className="flex flex-row gap-2">
                        <span className="text-muted-foreground">Masam:</span>{" "}
                        <span className="font-medium">
                          {data.consizeInfo.month}
                        </span>
                      </div>
                      <div className="flex flex-row gap-2">
                        <span className="text-muted-foreground">Ayana:</span>{" "}
                        <span className="font-medium">
                          {data.consizeInfo.ayana}
                        </span>
                      </div>
                      <div className="flex flex-row gap-2">
                        <span className="text-muted-foreground">Ritu:</span>{" "}
                        <span className="font-medium">
                          {data.consizeInfo.ritu}
                        </span>
                      </div>
                      <div className="flex flex-row gap-2">
                        <span className="text-muted-foreground">
                          Samvatsaram:
                        </span>{" "}
                        <span className="font-medium">
                          {data.consizeInfo.year}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Tithi */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Tithi
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Badge className="text-xs">
                        {data.consizeInfo.day.panchang.tithiToday.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        until {data.consizeInfo.day.panchang.tithiToday.end}
                      </span>
                    </div>
                    {data.consizeInfo.day.panchang.tithiNext && (
                      <div className="text-xs text-muted-foreground">
                        Then: {data.consizeInfo.day.panchang.tithiNext.name}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Nakshatra */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Nakshatra
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {data.consizeInfo.day.panchang.nakshatraToday.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        until {data.consizeInfo.day.panchang.nakshatraToday.end}
                      </span>
                    </div>
                    {data.consizeInfo.day.panchang.nakshatraNext && (
                      <div className="text-xs text-muted-foreground">
                        Then: {data.consizeInfo.day.panchang.nakshatraNext.name}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Celestial Times */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Sun className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-medium">Surya (Sun)</div>
                        <div className="text-xs text-muted-foreground">
                          Rise: {data.consizeInfo.day.sun.start} • Set:{" "}
                          {data.consizeInfo.day.sun.end}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Moon className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-medium">
                          Chandra (Moon)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Rise: {data.consizeInfo.day.moon.start} • Set:{" "}
                          {data.consizeInfo.day.moon.end}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline View */}
              <Card className="lg:col-span-3 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">
                    Day Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DayOverview schedules={data.consizeInfo.schedules} />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};

export default PanchangamInfo;
