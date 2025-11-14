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
}

const DayOverview: React.FC<DayOverviewProps> = ({ schedules }) => {
  const timelineView = usePanchangamTimelineViewAtomValue();

  if (timelineView === "legacy") {
    return <DayOverviewLegacy schedules={schedules} />;
  }

  return <DayOverviewAdvanced schedules={schedules} />;
};

export default DayOverview;
