"use server";

import config from "@/config";
import * as cheerio from "cheerio";
import { readFile, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import {
  PANCHANGAM_PLACE_IDS_MAP,
  PANCHANGAM_PLACE_TIMEZONES,
} from "../constants";
import { format, subDays } from "date-fns";
import type {
  FestivalInfo,
  GetPanchangamParams,
  PanchangElement,
  PanchangElements,
  PanchangamData,
  PanchangamResponse,
  ScheduleItem,
  TimedSegment,
} from "@/types/panchangam";
import { cleanText, parseTime, parseTimeRange } from "./time";

// Tirupati - https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=1254360&date=20/10/2024
// Calgary - https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=5913490&date=20/10/2024

// const dateFormat = "DD/MM/YYYY";
const dateFormat = "dd/MM/yyyy";
const baseUrl = "https://www.drikpanchang.com/panchang/day-panchang.html";

/**
 * Get the date components in a specific timezone
 * @param date - The date to convert
 * @param timeZone - IANA timezone string (e.g., "Asia/Kolkata", "America/Edmonton")
 * @returns Object with day, month, year in the target timezone
 */
function getDateInTimezone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value || "1";
  const month = parts.find((p) => p.type === "month")?.value || "1";
  const year = parts.find((p) => p.type === "year")?.value || "2025";

  return {
    day: parseInt(day, 10),
    month: parseInt(month, 10),
    year: parseInt(year, 10),
  };
}

export async function getDayPanchangam({
  place = "calgary",
  date,
  localDateString,
}: GetPanchangamParams): Promise<PanchangamResponse> {
  const placeId = PANCHANGAM_PLACE_IDS_MAP[place];
  if (!placeId) {
    throw new Error(`Invalid place: ${place}`);
  }

  // Get the timezone for the selected place
  const placeTimezone = PANCHANGAM_PLACE_TIMEZONES[place] || "UTC";

  // Use localDateString if provided (from client), otherwise fall back to date
  let dateStr: string;
  let actualDate: Date;

  if (localDateString) {
    // Client already provided the date string in the correct format
    // No need to convert - just use it directly
    dateStr = localDateString;
    // Parse the date string to create a Date object for file path calculations
    const [day, month, year] = localDateString.split("/").map(Number);
    actualDate = new Date(year, month - 1, day);
  } else {
    // Fallback: use current date in place's timezone
    const currentDate = date || new Date();
    const placeDate = getDateInTimezone(currentDate, placeTimezone);
    dateStr = `${placeDate.day}/${placeDate.month}/${placeDate.year}`;
    actualDate = new Date(placeDate.year, placeDate.month - 1, placeDate.day);
  }

  // check and delete previous day file
  const dateYesterdayStr = format(subDays(actualDate, 1), dateFormat);
  const filePrevPath = path.resolve(
    `${config.dataFolder}/0_panchangam_${placeId}_${dateYesterdayStr.replaceAll("/", "_")}.html`,
  );

  if (existsSync(filePrevPath)) {
    console.log("Deleting previous day file:", filePrevPath);
    await unlink(filePrevPath);
  }

  const url = `${baseUrl}?geoname-id=${placeId}&time-format=24hour&date=${dateStr}`;
  const filePath = path.resolve(
    `${config.dataFolder}/0_panchangam_${placeId}_${dateStr.replaceAll("/", "_")}.html`,
  );

  let html = "";

  if (existsSync(filePath)) {
    console.log("Reading from file:", filePath);
    html = await readFile(filePath, "utf-8");
  } else {
    console.log("Fetching:", url);
    const res = await fetch(url);
    html = await res.text();
    await writeFile(filePath, html);
  }

  const $ = cheerio.load(html);
  const cards = parseCards($);
  const consizeInfo = buildConciseInfo($, cards, dateStr, place);

  return { info: cards, consizeInfo };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

type CardEntry = { key: string; values: string[] };
type ParsedCard = { title: string; entries: CardEntry[] };

/**
 * Parse all "dpTableCard" cards. Each `.dpTableRow` holds two key/value
 * columns; a value with an empty key continues the key above it in the same
 * column (e.g. the second Varjyam, or the next Nakshatra).
 */
function parseCards($: cheerio.CheerioAPI): ParsedCard[] {
  const result: ParsedCard[] = [];

  $("div.dpTableCardWrapper")
    .find(">div")
    .each((_, card) => {
      const title = cleanText($(card).find(".dpTableCardTitle").first().text());
      const entries: CardEntry[] = [];
      const lastByColumn: CardEntry[] = [];

      const rows = $(card).find(".dpTableRow").toArray();
      const rowEls = rows.length ? rows : [card];

      for (const row of rowEls) {
        let column = 0;
        let pendingKey: string | null = null;
        for (const cell of $(row).find(".dpTableCell").toArray()) {
          const $cell = $(cell);
          if ($cell.hasClass("dpTableKey")) {
            pendingKey = cleanText($cell.text());
            continue;
          }
          if (!$cell.hasClass("dpTableValue")) continue;

          const value = cleanText($cell.text());
          const key = pendingKey ?? "";
          pendingKey = null;
          const col = rows.length ? column++ % 2 : 0;

          if (!value) continue;
          if (key) {
            const entry = { key, values: [value] };
            entries.push(entry);
            lastByColumn[col] = entry;
          } else if (lastByColumn[col]) {
            lastByColumn[col].values.push(value);
          } else {
            const entry = { key: "", values: [value] };
            entries.push(entry);
            lastByColumn[col] = entry;
          }
        }
      }

      result.push({ title, entries });
    });

  return result;
}

const findCard = (cards: ParsedCard[], ...titles: string[]) =>
  cards.find((c) => titles.some((t) => c.title.startsWith(t)));

const entryValues = (card: ParsedCard | undefined, key: string) =>
  card?.entries.find((e) => e.key === key)?.values ?? [];

const firstValue = (card: ParsedCard | undefined, key: string) =>
  entryValues(card, key)[0];

/** "Mula upto 05:47, Nov 13" -> element; "Purva Ashadha" -> name only */
function parseElement(value: string): PanchangElement {
  const [namePart, endPart] = cleanText(value).split(/\s+upto\s+/);
  const element: PanchangElement = { name: namePart.trim() };
  if (endPart) {
    element.end = endPart.trim();
    if (/full night/i.test(endPart)) {
      element.fullNight = true;
    } else {
      const t = parseTime(endPart);
      if (t) {
        element.endTime = t.time;
        element.endMin = t.min;
        element.endsNextDay = t.nextDay;
      }
    }
  }
  return element;
}

function parseSchedules(
  card: ParsedCard | undefined,
  negative: boolean,
): ScheduleItem[] {
  if (!card) return [];
  const items: ScheduleItem[] = [];
  for (const entry of card.entries) {
    if (!entry.key) continue;
    for (const value of entry.values) {
      const range = parseTimeRange(value);
      if (!range) continue; // e.g. "Baana: Roga from 08:58 to Full Night"
      items.push({
        title: entry.key,
        startTime: range.start.time,
        endTime: range.end.time,
        startMin: range.start.min,
        endMin: range.end.min,
        startsNextDay: range.start.nextDay,
        endsNextDay: range.end.nextDay,
        negative,
      });
    }
  }
  return items;
}

/** Panchaka Rahita & Udaya Lagna come as "Name - HH:mm to HH:mm" cells */
function parseMuhurtaSegments(
  $: cheerio.CheerioAPI,
): { panchaka: TimedSegment[]; lagna: TimedSegment[] } {
  const panchaka: TimedSegment[] = [];
  const lagna: TimedSegment[] = [];

  $(".dpPanchangMuhurtaCard .dpTableValue").each((_, valueCell) => {
    const heading = cleanText($(valueCell).find(".dpTitle").text());
    const target = /lagna/i.test(heading) ? lagna : panchaka;
    $(valueCell)
      .find(".dpPanchangMuhurtaCell")
      .each((__, cell) => {
        const text = cleanText($(cell).text());
        const idx = text.indexOf(" - ");
        if (idx < 0) return;
        const name = text.slice(0, idx).trim();
        const range = parseTimeRange(text.slice(idx + 3));
        if (!range) return;
        target.push({
          name,
          startTime: range.start.time,
          endTime: range.end.time,
          startMin: range.start.min,
          endMin: range.end.min,
          good: /good/i.test(name),
        });
      });
  });

  return { panchaka, lagna };
}

function parseFestivals($: cheerio.CheerioAPI): FestivalInfo[] {
  const heading = $(".dpTableCardTitle")
    .filter((_, el) => /festivals and events/i.test($(el).text()))
    .first();
  if (!heading.length) return [];

  const festivals: FestivalInfo[] = [];
  heading
    .parent()
    .find(".dpEventName")
    .each((_, el) => {
      const hint = cleanText($(el).find(".dpEventNameHint").text());
      const $clone = $(el).clone();
      $clone.find(".dpEventNameHint").remove();
      const name = cleanText($clone.text());
      if (name && !festivals.some((f) => f.name === name)) {
        festivals.push(
          hint
            ? { name, hint: hint.replace(/^\p{Extended_Pictographic}+/u, "").trim() }
            : { name },
        );
      }
    });
  return festivals;
}

function buildConciseInfo(
  $: cheerio.CheerioAPI,
  cards: ParsedCard[],
  dateStr: string,
  place: string,
): PanchangamData {
  const sunMoon = findCard(cards, "Sunrise and Moonrise");
  const panchangCard = cards.find((c) => c.title === "Panchang");
  const lunar = findCard(cards, "Lunar Month");
  const rituCard = findCard(cards, "Ritu and Ayana");
  const rashiCard = findCard(cards, "Rashi and Nakshatra");
  const nivas = findCard(cards, "Nivas and Shool");

  const elements: PanchangElements = {
    tithi: entryValues(panchangCard, "Tithi").map(parseElement),
    nakshatra: entryValues(panchangCard, "Nakshatra").map(parseElement),
    yoga: entryValues(panchangCard, "Yoga").map(parseElement),
    karana: entryValues(panchangCard, "Karana").map(parseElement),
  };

  // Legacy today/next shape, derived from the element lists
  const legacy = (list: PanchangElement[]) => {
    const today = list[0] ?? { name: "" };
    const next = list[1];
    return {
      today: { name: today.name, start: "00:00", end: today.end ?? "" },
      next: next
        ? { name: next.name, start: today.end ?? "", end: next.end ?? "23:59" }
        : undefined,
    };
  };
  const tithi = legacy(elements.tithi);
  const nakshatra = legacy(elements.nakshatra);

  const amanta = entryValues(lunar, "Chandramasa")
    .concat(entryValues(lunar, "Pravishte/Gate"))
    .find((v) => v.includes("Amanta"));
  const purnimanta = entryValues(lunar, "Chandramasa")
    .concat(entryValues(lunar, "Pravishte/Gate"))
    .find((v) => v.includes("Purnimanta"));
  const shakaSamvat = firstValue(lunar, "Shaka Samvat") ?? "";

  const schedules = [
    ...parseSchedules(findCard(cards, "Auspicious Timings"), false),
    ...parseSchedules(findCard(cards, "Inauspicious Timings"), true),
  ].sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));

  const { panchaka, lagna } = parseMuhurtaSegments($);

  return {
    date: dateStr,
    place,
    day: {
      sun: {
        start: firstValue(sunMoon, "Sunrise") ?? "",
        end: firstValue(sunMoon, "Sunset") ?? "",
      },
      moon: {
        start: firstValue(sunMoon, "Moonrise") ?? "",
        end: firstValue(sunMoon, "Moonset") ?? "",
      },
      panchang: {
        tithiToday: tithi.today,
        tithiNext: tithi.next,
        nakshatraToday: nakshatra.today,
        nakshatraNext: nakshatra.next,
        weekday: firstValue(panchangCard, "Weekday") ?? "",
        paksha: firstValue(panchangCard, "Paksha") ?? "",
      },
    },
    month: amanta?.split(" - ")[0] ?? "",
    year: shakaSamvat,
    ayana: firstValue(rituCard, "Drik Ayana") ?? "",
    ritu: firstValue(rituCard, "Drik Ritu") ?? "",
    schedules,
    elements,
    calendar: {
      vikramSamvat: firstValue(lunar, "Vikram Samvat"),
      shakaSamvat,
      samvatsara: firstValue(lunar, "Samvatsara")?.split(/\s+upto\s+/)[0],
      amanta: amanta?.split(" - ")[0],
      purnimanta: purnimanta?.split(" - ")[0],
      drikRitu: firstValue(rituCard, "Drik Ritu"),
      vedicRitu: firstValue(rituCard, "Vedic Ritu"),
      drikAyana: firstValue(rituCard, "Drik Ayana"),
      vedicAyana: firstValue(rituCard, "Vedic Ayana"),
    },
    rashi: {
      moonsign: firstValue(rashiCard, "Moonsign"),
      sunsign: firstValue(rashiCard, "Sunsign"),
      suryaNakshatra: firstValue(rashiCard, "Surya Nakshatra"),
    },
    dayLength: {
      dinamana: firstValue(rituCard, "Dinamana"),
      ratrimana: firstValue(rituCard, "Ratrimana"),
      madhyahna: firstValue(rituCard, "Madhyahna"),
    },
    dishaShool: firstValue(nivas, "Disha Shool"),
    festivals: parseFestivals($),
    panchaka,
    lagna,
  };
}
