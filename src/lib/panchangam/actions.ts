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
  GetPanchangamParams,
  PanchangamResponse,
} from "@/types/panchangam";

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

  const cards = $("div.dpTableCardWrapper").find(">div").toArray();

  const info: any = [];

  for (const card of cards) {
    const infoObj: any = {};

    infoObj.title = $(card).find(".dpTableCardTitle").text();
    const cells = $(card).find(".dpTableCell").toArray();

    const cellkeys: any = [];
    const cellValues: any = [];

    for (const cell of cells) {
      if ($(cell).hasClass("dpTableKey")) {
        cellkeys.push($(cell).text());
      }
      if ($(cell).hasClass("dpTableValue")) {
        cellValues.push($(cell).text());
      }
    }

    const cellInfos: any = [];
    for (let i = 0; i < cellkeys.length; i++) {
      cellInfos.push({ key: cellkeys[i], value: cellValues[i] });
    }
    infoObj.cellInfos = cellInfos;

    info.push(infoObj);
  }

  const consizeInfo: any = {
    date: dateStr,
    place,
    day: {},
    schedules: [],
  };

  // console.dir(info, { depth: 5 });

  info.forEach((element: any) => {
    switch (element.title) {
      case "Sunrise and Moonrise":
        consizeInfo.day.sun = {
          start: element.cellInfos[0].value,
          end: element.cellInfos[1].value,
        };
        consizeInfo.day.moon = {
          start: element.cellInfos[2].value,
          end: element.cellInfos[3].value,
        };
        break;
      case "Panchang":
        consizeInfo.day.panchang = {
          tithiToday: {
            name: element.cellInfos[0].value.split(" upto ")[0],
            start: "00:00",
            end: element.cellInfos[0].value.split(" upto ")[1],
          },
          tithiNext: {
            name: element.cellInfos[2].value,
            start: element.cellInfos[0].value.split(" upto ")[1],
            end: "23:59",
          },
          nakshatraToday: {
            name: element.cellInfos[1].value.split(" upto ")[0],
            start: "00:00",
            end: element.cellInfos[1].value.split(" upto ")[1],
          },
          nakshatraNext: {
            name: element.cellInfos[3].value,
            start: element.cellInfos[1].value.split(" upto ")[1],
            end: "23:59",
          },
          weekday: element.cellInfos.find((i: any) => i.key === "Weekday")
            .value,
          paksha: element.cellInfos.find((i: any) => i.key === "Paksha").value,
        };
        break;
      case "Lunar Month and Samvat":
      case "Lunar Month, Samvat and Brihaspati Samvatsara":
        consizeInfo.year = element.cellInfos.find(
          (i: any) => i.key === "Shaka Samvat",
        ).value;
        consizeInfo.month = element.cellInfos
          .find((i: any) => i.value.includes("- Amanta"))
          .value.split(" - ")[0];
        break;
      case "Ritu and Ayana":
        consizeInfo.ritu = element.cellInfos.find(
          (i: any) => i.key === "Drik Ritu",
        ).value;
        consizeInfo.ayana = element.cellInfos.find(
          (i: any) => i.key === "Drik Ayana",
        ).value;
        break;

      case "Auspicious Timings":
        element.cellInfos.forEach((item: any) => {
          // skip if info.value is not in format 11:45 to 12:33 exactly with regex
          if (!/^\d{2}:\d{2} to \d{2}:\d{2}$/.test(item.value)) {
            return;
          }
          const sc = getFormattedSchedule(item);
          consizeInfo.schedules.push({ ...sc, negative: false });
        });
        break;

      case "Inauspicious Timings":
        element.cellInfos.forEach((item: any) => {
          // skip if info.value is not in format 11:45 to 12:33 exactly with regex
          if (!/^\d{2}:\d{2} to \d{2}:\d{2}$/.test(item.value)) {
            return;
          }
          const sc = getFormattedSchedule(item);
          consizeInfo.schedules.push({ ...sc, negative: true });
        });
        break;
    }
  });

  consizeInfo.schedules.sort((a: any, b: any) => {
    return a.startTime.localeCompare(b.startTime);
  });
  // console.dir(info, { depth: 3 });
  return { info, consizeInfo };
}

function getFormattedSchedule(info: { key: string; value: string }) {
  const [startTime, endTime] = info.value.split(" to ");
  return {
    title: info.key,
    startTime,
    endTime,
  };
}
