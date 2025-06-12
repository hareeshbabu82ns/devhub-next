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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
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

  if (isFetching || isPending) return <Loader />;
  if (isError) return <SimpleAlert title="Error fetching panchangam" />;

  const datePicker = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[180px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div
      className={cn(
        "@container/panchangam flex flex-col mt-4 gap-4 border rounded-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between border-b p-2">
        <div className="flex items-center gap-2">
          Panchnagam:{" "}
          <span className="text-warning">{cityId.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          {datePicker}
          <Button
            onClick={() => refetch()}
            type="button"
            variant="outline"
            size="icon"
          >
            <Icons.refresh className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-1 @3xl/panchangam:grid-cols-2 gap-2">
        <div className="flex flex-col gap-4 p-2">
          {/* <pre>{JSON.stringify(data.consizeInfo, null, 2)}</pre> */}
          <div className="flex flex-col gap-4">
            <div className="font-semibold">
              Date:{" "}
              <span className="text-warning">
                {date ? format(date, "PPPP") : ""}
              </span>
            </div>
            {/* <div className="font-semibold">Date: {data.consizeInfo.date}</div> */}
            <div className="font-semibold">
              {data.consizeInfo.day.panchang.weekday}
              {" , "}
              {data.consizeInfo.day.panchang.paksha}
              {" , "}
              {data.consizeInfo.month} Masam
              {" , "}
              {data.consizeInfo.ayana}
              {" , "}
              {data.consizeInfo.year} Samvatsaram
            </div>
            <div className="font-semibold">
              <span className="text-warning">
                {data.consizeInfo.day.panchang.tithiToday.name}
              </span>{" "}
              - {data.consizeInfo.day.panchang.tithiToday.end} (_
              {data.consizeInfo.day.panchang.tithiNext.name}_)
            </div>
            <div className="font-semibold">
              {data.consizeInfo.day.panchang.nakshatraToday.name} -{" "}
              {data.consizeInfo.day.panchang.nakshatraToday.end} (_
              {data.consizeInfo.day.panchang.nakshatraNext.name}_)
            </div>

            <div>
              Surya - {data.consizeInfo.day.sun.start} -{" "}
              {data.consizeInfo.day.sun.end}
            </div>
            <div>
              Chandra - {data.consizeInfo.day.moon.start} -{" "}
              {data.consizeInfo.day.moon.end}
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-y-auto">
          <DayOverview schedules={data.consizeInfo.schedules} />
        </div>
      </div>
    </div>
  );
};

export default PanchangamInfo;
