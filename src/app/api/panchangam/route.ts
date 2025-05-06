import { getDayPanchangam } from "@/lib/panchangam/actions";
import { addHours, format, parse } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

// http://localhost:3000/api/panchangam?date=202410271030&place=calgary|tirupati&format=json|md&type=overview|muhurtham

// http://localhost:3000/api/panchangam?date=202410271140&format=md&place=tirupati&type=overview
// http://localhost:3000/api/panchangam?date=202410271140&format=md&place=tirupati&type=muhurtham

export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const dateStr = reqUrl.searchParams.get("date");
  // 2024-10-28T21:29:23.436-06:00
  const date = dateStr
    ? parse(dateStr, "yyyyMMddHHmm", new Date()) // yyyy-MM-dd'T'HH:mm:ss.SSSxxx
    : new Date();
  // console.log("date", { dateStr, date });

  const place = reqUrl.searchParams.get("place") || "calgary";
  const responseFormat = reqUrl.searchParams.get("format") || "json";
  const type = reqUrl.searchParams.get("type") || "overview";

  const panchangam = await getDayPanchangam({ place, date });
  // console.log("panchangam", panchangam);

  const textContent =
    type === "overview"
      ? getOverviewMD(panchangam.consizeInfo, date)
      : getCurrentMuhurthams(
          panchangam.consizeInfo,
          date,
          responseFormat as "json" | "md",
        );

  const jsonContent =
    type === "overview"
      ? panchangam.consizeInfo
      : getCurrentMuhurthams(
          panchangam.consizeInfo,
          date,
          responseFormat as "json" | "md",
        );

  const finalResult =
    responseFormat === "json" ? JSON.stringify(jsonContent) : textContent;

  const contentType =
    responseFormat === "json" ? "application/json" : "text/plain";

  try {
    return new NextResponse(finalResult, {
      headers: {
        "Content-Type": contentType,
      },
      status: 200,
    });
  } catch (e: any) {
    return new NextResponse(`Panchangam Failed: ${e.message}`, {
      status: 500,
    });
  }
}

const getCurrentMuhurthams = (
  info: any,
  date: Date,
  respnoseFormat: "json" | "md",
) => {
  // fetch hour:min from date and get the nearest muhurthams
  const timeStr = format(date, "HH:mm");
  const timePlus1HrStr = format(addHours(date, 1), "HH:mm");
  const nearestMuhurthams = info.schedules.filter(
    (item: any) =>
      (item.startTime < timeStr || item.startTime < timePlus1HrStr) &&
      item.endTime > timeStr,
  );

  if (respnoseFormat === "json") {
    return nearestMuhurthams;
  } else {
    if (nearestMuhurthams.length === 0) {
      return "";
    }
    const content: string[] = [];
    content.push(`\n  \n# Nearby Muhurthams - ${info.place.toUpperCase()}\n  `);
    nearestMuhurthams.forEach((item: any) => {
      content.push(
        `| ${item.title}:\t | ${item.startTime} | ${item.endTime} |`,
      );
    });
    return content.join("\n");
  }
};

const getOverviewMD = (info: any, date: Date) => {
  const content: string[] = [];

  content.push(`# Panchangam Day Overview \n  `);
  const panchang = info.day.panchang;

  content.push(
    `| Date | ${format(date, "PPP HH:mm")} - ${panchang.weekday} | Place -  ${info.place.toUpperCase()} |`,
  );
  content.push(
    `| Info | ${panchang.paksha} - ${info.month} |  ${info.ayana} - ${info.year} |`,
  );
  content.push(`| Sun | ${info.day.sun.start} | ${info.day.sun.end} |`);
  content.push(`| Moon | ${info.day.moon.start} | ${info.day.moon.end} |`);

  content.push(
    `| Tithi:\t ${panchang.tithiToday.name} | ${panchang.tithiToday.start} | ${panchang.tithiToday.end} |`,
  );
  content.push(
    `| Tithi (next):\t ${panchang.tithiNext.name} | ${panchang.tithiNext.start} | ${panchang.tithiNext.end} |`,
  );
  content.push(
    `| Nakshatra:\t ${panchang.nakshatraToday.name} | ${panchang.nakshatraToday.start} | ${panchang.nakshatraToday.end} |`,
  );
  content.push(
    `| Nakshatra (next):\t ${panchang.nakshatraNext.name} | ${panchang.nakshatraNext.start} | ${panchang.nakshatraNext.end} |`,
  );

  content.push(`\n  \n# Muhurthams\n  `);

  info.schedules.forEach((item: any) => {
    content.push(`| ${item.title}:\t | ${item.startTime} | ${item.endTime} |`);
  });

  return content.join("\n");
};
