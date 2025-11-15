"use client";

import React from "react";
import { usePanchangamTimelineViewAtomValue } from "@/hooks/use-config";
import DayOverviewLegacy from "./DayOverviewLegacy";
import DayOverviewAdvanced from "./DayOverviewAdvanced";

export interface ScheduleItem {
  title: string;
  startTime: string;
  endTime: string;
  negative?: boolean;
}

export interface DayOverviewProps {
  schedules: ScheduleItem[];
  place?: string; // Optional place identifier for timezone info
}

const DayOverview: React.FC<DayOverviewProps> = ({ schedules, place }) => {
  const timelineView = usePanchangamTimelineViewAtomValue();

  if (timelineView === "legacy") {
    return <DayOverviewLegacy schedules={schedules} place={place} />;
  }

  return <DayOverviewAdvanced schedules={schedules} place={place} />;
};

export default DayOverview;
