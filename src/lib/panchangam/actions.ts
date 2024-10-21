"use server";

import config from "@/config";
import * as cheerio from "cheerio";
import { readFile, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { PANCHANGAM_PLACE_IDS_MAP } from "../constants";
import { format, previousDay, subDays } from "date-fns";

// Tirupati - https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=1254360&date=20/10/2024
// Calgary - https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=5913490&date=20/10/2024

// const dateFormat = "DD/MM/YYYY";
const dateFormat = "dd/MM/yyyy";
const baseUrl = "https://www.drikpanchang.com/panchang/day-panchang.html";

export async function getTodayPanchangam({
  place = "calgary",
}: {
  place?: string;
}) {
  const placeId = PANCHANGAM_PLACE_IDS_MAP[place];
  if (!placeId) {
    throw new Error(`Invalid place: ${place}`);
  }
  const date = new Date();

  // check and delete previous day file
  const dateYesterdayStr = format(subDays(date, 1), dateFormat);
  const filePrevPath = path.resolve(
    `${config.dataFolder}/0_panchangam_${placeId}_${dateYesterdayStr.replaceAll("/", "_")}.html`,
  );

  if (existsSync(filePrevPath)) {
    console.log("Deleting previous day file:", filePrevPath);
    await unlink(filePrevPath);
  }

  const dateStr = `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;

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
    day: {},
  };

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
        consizeInfo.year = element.cellInfos.find(
          (i: any) => i.key === "Shaka Samvat",
        ).value;
        consizeInfo.month = element.cellInfos
          .find((i: any) => i.value.endsWith("Amanta"))
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

      // case "Panchang":
      //   consizeInfo.rahuKalam = element.cellInfos[0].value;
      //   break;
    }
  });

  // console.dir(info, { depth: 3 });
  return { info, consizeInfo };
}
