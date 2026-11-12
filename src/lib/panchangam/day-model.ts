/**
 * Builds a UI-friendly model of a panchangam day: a single time axis
 * (minutes from local midnight of the selected date) with point events
 * (sunrise, transitions...) and periods (muhurtas, kalams...).
 */
import type {
  PanchangElement,
  PanchangamData,
  TimedSegment,
} from "@/types/panchangam";
import { parseTime } from "./time";

export type TimelineCategory =
  | "auspicious"
  | "inauspicious"
  | "sun"
  | "moon"
  | "transition";

export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  category: TimelineCategory;
  startMin: number;
  /** undefined for point events */
  endMin?: number;
  /** periods spanning most of the day (Ravi Yoga, Ganda Moola...) */
  long?: boolean;
}

export interface DayModel {
  sunrise?: number;
  sunset?: number;
  /** approximate next sunrise, end of the panchang day */
  nextSunrise?: number;
  windowStart: number;
  windowEnd: number;
  items: TimelineItem[];
}

const LONG_PERIOD_MIN = 8 * 60;

const LIMB_LABELS: Record<string, string> = {
  tithi: "Tithi",
  nakshatra: "Nakshatra",
  yoga: "Yoga",
  karana: "Karana",
};

export function buildDayModel(data: PanchangamData): DayModel {
  const items: TimelineItem[] = [];
  const sunrise = parseTime(data.day.sun.start)?.min;
  const sunset = parseTime(data.day.sun.end)?.min;
  const moonrise = parseTime(data.day.moon.start)?.min;
  const moonset = parseTime(data.day.moon.end)?.min;
  const madhyahna = parseTime(data.dayLength?.madhyahna)?.min;

  if (sunrise !== undefined)
    items.push({ id: "sunrise", title: "Sunrise", category: "sun", startMin: sunrise });
  if (madhyahna !== undefined)
    items.push({ id: "madhyahna", title: "Madhyahna", subtitle: "Solar noon", category: "sun", startMin: madhyahna });
  if (sunset !== undefined)
    items.push({ id: "sunset", title: "Sunset", category: "sun", startMin: sunset });
  if (moonrise !== undefined)
    items.push({ id: "moonrise", title: "Moonrise", category: "moon", startMin: moonrise });
  if (moonset !== undefined)
    items.push({ id: "moonset", title: "Moonset", category: "moon", startMin: moonset });

  // Limb transitions: "Nakshatra Mula → Purva Ashadha"
  if (data.elements) {
    for (const [limb, list] of Object.entries(data.elements)) {
      list.forEach((el: PanchangElement, i: number) => {
        if (el.endMin === undefined) return;
        const next = list[i + 1];
        items.push({
          id: `${limb}-${i}`,
          title: `${LIMB_LABELS[limb] ?? limb} ${next ? "changes" : "ends"}`,
          subtitle: next ? `${el.name} → ${next.name}` : el.name,
          category: "transition",
          startMin: el.endMin,
        });
      });
    }
  }

  data.schedules.forEach((s, i) => {
    const startMin = s.startMin ?? toMin(s.startTime);
    let endMin = s.endMin ?? toMin(s.endTime);
    if (endMin < startMin) endMin += 1440;
    items.push({
      id: `sched-${i}`,
      title: s.title,
      category: s.negative ? "inauspicious" : "auspicious",
      startMin,
      endMin,
      long: endMin - startMin >= LONG_PERIOD_MIN,
    });
  });

  items.sort(
    (a, b) =>
      a.startMin - b.startMin ||
      (a.endMin === undefined ? -1 : 0) - (b.endMin === undefined ? -1 : 0),
  );

  const nextSunrise = sunrise !== undefined ? sunrise + 1440 : undefined;
  const starts = items.filter((i) => !i.long).map((i) => i.startMin);
  const rawStart = Math.min(sunrise ?? 360, ...starts);
  const windowStart = Math.max(0, Math.floor(rawStart / 60) * 60);
  const windowEnd = Math.ceil(((nextSunrise ?? 1440 + 360) + 15) / 60) * 60;

  return { sunrise, sunset, nextSunrise, windowStart, windowEnd, items };
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Is `nowMin` inside the period (or at the point, within 1 minute)? */
export function isActive(item: { startMin: number; endMin?: number }, nowMin: number) {
  return item.endMin === undefined
    ? Math.abs(nowMin - item.startMin) < 1
    : nowMin >= item.startMin && nowMin < item.endMin;
}

/** Which element of a limb list is current at `nowMin` (index) */
export function currentElementIndex(list: PanchangElement[], nowMin: number) {
  for (let i = 0; i < list.length; i++) {
    const el = list[i];
    if (el.fullNight || el.endMin === undefined || nowMin < el.endMin) return i;
  }
  return list.length - 1;
}

export function currentSegmentIndex(list: TimedSegment[], nowMin: number) {
  return list.findIndex((s) => nowMin >= s.startMin && nowMin < s.endMin);
}

// ---------------------------------------------------------------------------
// Moon phase from tithi
// ---------------------------------------------------------------------------

const TITHI_PATTERNS: [RegExp, number][] = [
  [/^prat|^prath|^padya/i, 1],
  [/^dwit|^dvit|^vidiy/i, 2],
  [/^trit|^tadiy/i, 3],
  [/^chatur(?!dashi)|^chavit/i, 4],
  [/^panch/i, 5],
  [/^shash|^sasht|^shast/i, 6],
  [/^sapt/i, 7],
  [/^asht/i, 8],
  [/^nav/i, 9],
  [/^dash/i, 10],
  [/^ekad/i, 11],
  [/^dwad|^dvad/i, 12],
  [/^tray|^trayo/i, 13],
  [/^chaturdash/i, 14],
  [/^purnim|^pournam|^purnam/i, 15],
  [/^amav/i, 30],
];

/** Tithi number 1-30 (Shukla 1-15, Krishna 16-30), or undefined */
export function tithiNumber(name: string, paksha: string): number | undefined {
  const match = TITHI_PATTERNS.find(([re]) => re.test(name.trim()));
  if (!match) return undefined;
  const n = match[1];
  if (n >= 15) return n;
  return /krishna/i.test(paksha) ? n + 15 : n;
}

/** 0 = new moon, 0.5 = full moon */
export function moonPhaseFromTithi(tithi: number): number {
  return (tithi % 30) / 30;
}
