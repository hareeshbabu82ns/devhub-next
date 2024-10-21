"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import React, { useState } from "react";
import { getTodayPanchangam } from "@/lib/panchangam/actions";
import { useQuery } from "@tanstack/react-query";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { usePanchangamPlaceAtomValue } from "@/hooks/use-config";

const PanchangamInfo = () => {
  const cityId = usePanchangamPlaceAtomValue();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["panchangam", cityId],
    queryFn: async ({ queryKey: [, cityId] }) => {
      const response = await getTodayPanchangam({ place: cityId });
      return response;
    },
  });

  if (isPending) return <Loader />;
  if (isError) return <SimpleAlert title="Error fetching panchangam" />;

  return (
    <div className="flex flex-1 flex-col mt-4 gap-4 border rounded-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between border-b p-2">
        <div className="flex items-center gap-2">{`Panchnagam ${cityId}`}</div>
        <div className="flex items-center gap-2">
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
      <div className="flex flex-col gap-4 p-2">
        {/* <pre>{JSON.stringify(data.consizeInfo, null, 2)}</pre> */}
        <div className="flex flex-col gap-4">
          <div className="font-semibold">Date: {data.consizeInfo.date}</div>
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
            {data.consizeInfo.day.panchang.tithiToday.name} -{" "}
            {data.consizeInfo.day.panchang.tithiToday.end} (_
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
    </div>
  );
};

export default PanchangamInfo;
