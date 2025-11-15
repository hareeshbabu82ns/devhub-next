/**
 * Custom hook for managing Panchangam data fetching and state
 */

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { addDays, subDays } from "date-fns";
import { getDayPanchangam } from "@/lib/panchangam/actions";
import {
  usePanchangamPlaceAtomValue,
  usePanchangamTimelineViewAtomValue,
} from "@/hooks/use-config";
import {
  getTodayInTimezone,
  getPlaceTimezone,
  formatDateInTimezone,
} from "@/lib/panchangam/utils";
import {
  QUERY_STALE_TIME_LONG,
  PANCHANGAM_PLACE_TIMEZONES,
} from "@/lib/constants";

export interface UsePanchangamOptions {
  initialDate?: Date;
}

/**
 * Hook to manage Panchangam data fetching, date navigation, and place selection
 * Handles timezone conversions and data caching
 */
export function usePanchangam(options: UsePanchangamOptions = {}) {
  const cityId = usePanchangamPlaceAtomValue();
  const timelineView = usePanchangamTimelineViewAtomValue();

  // Get the timezone for the selected place
  const placeTimezone = getPlaceTimezone(cityId, PANCHANGAM_PLACE_TIMEZONES);

  // Initialize with today's date in the place's timezone
  const [date, setDate] = useState<Date | undefined>(() =>
    options.initialDate
      ? options.initialDate
      : getTodayInTimezone(placeTimezone),
  );

  // Update date when place changes to reflect the new timezone's "today"
  useEffect(() => {
    // Only update to today if the current date is actually today
    const currentToday = getTodayInTimezone(placeTimezone);
    const browserToday = new Date();
    browserToday.setHours(0, 0, 0, 0);

    if (date) {
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      // If the selected date matches browser's today, update to place's today
      if (dateOnly.getTime() === browserToday.getTime()) {
        setDate(currentToday);
      }
    }
  }, [cityId, placeTimezone]);

  // Fetch panchangam data
  const { data, isFetching, isPending, isError, error, refetch } = useQuery({
    queryKey: ["panchangam", cityId, date],
    queryFn: async () => {
      // Format date in place's timezone as DD/MM/YYYY
      const localDateString = date
        ? formatDateInTimezone(date, placeTimezone)
        : undefined;

      const response = await getDayPanchangam({
        place: cityId,
        date,
        localDateString,
      });
      return response;
    },
    staleTime: QUERY_STALE_TIME_LONG,
  });

  // Date navigation handlers
  const handlePreviousDay = () => {
    setDate((prev) =>
      prev ? subDays(prev, 1) : getTodayInTimezone(placeTimezone),
    );
  };

  const handleNextDay = () => {
    setDate((prev) =>
      prev ? addDays(prev, 1) : getTodayInTimezone(placeTimezone),
    );
  };

  const handleToday = () => {
    setDate(getTodayInTimezone(placeTimezone));
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
  };

  return {
    // Data
    data,
    isLoading: isFetching || isPending,
    isError,
    error,

    // Place and timezone info
    cityId,
    placeTimezone,
    timelineView,

    // Date state
    date,
    setDate: handleDateSelect,

    // Navigation
    handlePreviousDay,
    handleNextDay,
    handleToday,

    // Actions
    refetch,
  };
}
