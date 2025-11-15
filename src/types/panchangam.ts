/**
 * Type definitions for Panchangam data structures
 */

/**
 * Time range with start and end times
 */
export interface TimeRange {
  start: string;
  end: string;
}

/**
 * Tithi (lunar day) information
 */
export interface TithiInfo {
  name: string;
  start: string;
  end: string;
}

/**
 * Nakshatra (lunar mansion) information
 */
export interface NakshatraInfo {
  name: string;
  start: string;
  end: string;
}

/**
 * Panchang (five limbs) information
 */
export interface PanchangInfo {
  tithiToday: TithiInfo;
  tithiNext?: TithiInfo;
  nakshatraToday: NakshatraInfo;
  nakshatraNext?: NakshatraInfo;
  weekday: string;
  paksha: string;
}

/**
 * Celestial body time information
 */
export interface CelestialTime {
  start: string; // Rise time
  end: string; // Set time
}

/**
 * Day information including panchang and celestial times
 */
export interface DayInfo {
  panchang: PanchangInfo;
  sun: CelestialTime;
  moon: CelestialTime;
}

/**
 * Schedule item for auspicious or inauspicious timings
 */
export interface ScheduleItem {
  title: string;
  startTime: string;
  endTime: string;
  negative?: boolean; // true for inauspicious, false for auspicious
}

/**
 * Concise panchangam information for a specific day
 */
export interface PanchangamData {
  date: string;
  place: string;
  day: DayInfo;
  month: string;
  year: string;
  ayana: string;
  ritu: string;
  schedules: ScheduleItem[];
}

/**
 * Full panchangam response including raw info
 */
export interface PanchangamResponse {
  info: any[]; // Raw scraped data
  consizeInfo: PanchangamData;
}

/**
 * Parameters for fetching panchangam data
 */
export interface GetPanchangamParams {
  place?: string;
  date?: Date;
  localDateString?: string;
}
