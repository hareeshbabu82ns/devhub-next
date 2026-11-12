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
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  negative?: boolean; // true for inauspicious, false for auspicious
  /** minutes from midnight of the selected date (>= 1440 when next day) */
  startMin?: number;
  endMin?: number;
  startsNextDay?: boolean;
  endsNextDay?: boolean;
}

/**
 * One occurrence of a panchang limb (tithi, nakshatra, yoga, karana).
 * Consecutive entries are in order: entry[i] starts when entry[i-1] ends.
 */
export interface PanchangElement {
  name: string;
  /** raw end text, e.g. "05:47, Nov 13" or "Full Night"; absent for the last */
  end?: string;
  endTime?: string; // "HH:mm"
  endMin?: number; // minutes from selected-date midnight
  endsNextDay?: boolean;
  /** true when it lasts through the night until next sunrise */
  fullNight?: boolean;
}

export interface PanchangElements {
  tithi: PanchangElement[];
  nakshatra: PanchangElement[];
  yoga: PanchangElement[];
  karana: PanchangElement[];
}

/** Named time segment, e.g. Panchaka or Udaya Lagna */
export interface TimedSegment {
  name: string;
  startTime: string;
  endTime: string;
  startMin: number;
  endMin: number;
  good?: boolean;
}

export interface FestivalInfo {
  name: string;
  hint?: string;
}

export interface CalendarInfo {
  vikramSamvat?: string;
  shakaSamvat?: string;
  samvatsara?: string;
  amanta?: string;
  purnimanta?: string;
  drikRitu?: string;
  vedicRitu?: string;
  drikAyana?: string;
  vedicAyana?: string;
}

export interface RashiInfo {
  moonsign?: string;
  sunsign?: string;
  suryaNakshatra?: string;
}

export interface DayLengthInfo {
  dinamana?: string;
  ratrimana?: string;
  madhyahna?: string;
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

  // Extended details (optional for backward compatibility)
  elements?: PanchangElements;
  calendar?: CalendarInfo;
  rashi?: RashiInfo;
  dayLength?: DayLengthInfo;
  dishaShool?: string;
  festivals?: FestivalInfo[];
  panchaka?: TimedSegment[];
  lagna?: TimedSegment[];
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
