"use server";

import config from "@/config";
import * as cheerio from "cheerio";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import { db } from "../db";
import { Prisma } from "@/app/generated/prisma";
import { transliteratedText } from "@/app/(app)/sanscript/_components/utils";
import Sanscript from "@indic-transliteration/sanscript";
import { readFileSync, writeFileSync } from "fs";

const entityTitle = "raamaayaNam";
const kandamTitles: string[] = [
  "bAla kaandam",
  "ayOdhya kaandam",
  "araNya kaandam",
  "kiShkinda kaandam",
  "sundara kaandam",
  "yuddha kaandam",
  "uttara kaandam",
];
const chapters = [76, 111, 71, 66, 66, 116, 100];
const baseUrl = "https://sacred-texts.com/hin/rys";

const baseStructure = Array(7)
  .fill(0)
  .map((_, idx) => {
    const paddedIdx = String(idx + 1);
    return {
      idx,
      // title: `Parvam ${paddedIdx}`,
      title: kandamTitles[idx],
      page: `rys${paddedIdx}.htm`,
      url: `${baseUrl}/rysi${paddedIdx}.htm`,
      chapters: Array(chapters[idx])
        .fill(0)
        .map((_, cidx) => {
          const paddedChapterIdx = String(cidx + 1).padStart(3, "0");
          return {
            idx: cidx,
            title: `adhyaayam ${paddedChapterIdx}`,
            page: `rys${paddedIdx}${paddedChapterIdx}.htm`,
            url: `${baseUrl}/rysi${paddedIdx}${paddedChapterIdx}.htm`,
          };
        }),
    };
  });

// 3. Create Ramayana Entity DB
export async function createRamayanaEntityDB(parentId: string) {
  // const filePath = path.resolve( `${config.dataFolder}/ramayanam/0_structure.json` );
  // const baseStructure = readFileSync( filePath, "utf-8" );
  // console.log( baseStructure );

  let entity = undefined;

  // check if entity exists
  const entityExists = await db.entity.findFirst({
    where: {
      type: "ITIHASAM",
      text: {
        some: {
          value: entityTitle,
        },
      },
    },
    select: { id: true, childrenRel: { select: { id: true, order: true } } },
  });

  if (!entityExists) {
    const data: Prisma.EntityCreateArgs["data"] = {
      type: "ITIHASAM",
      imageThumbnail: "/default-om_256.png",
      text: transliteratedText([
        {
          language: "ITRANS",
          value: entityTitle,
        },
        {
          language: "SAN",
          value: "$transliterateFrom=ITRANS",
        },
        {
          language: "TEL",
          value: "$transliterateFrom=ITRANS",
        },
        {
          language: "IAST",
          value: "$transliterateFrom=ITRANS",
        },
      ]),
      parentsRel: {
        connect: {
          id: parentId,
        },
      },
      childrenRel: {
        create: kandamTitles.map((kaandam, idx) => ({
          order: idx,
          type: "KAANDAM",
          imageThumbnail: "/default-om_256.png",
          text: transliteratedText([
            {
              language: "ITRANS",
              value: kaandam,
            },
            {
              language: "SAN",
              value: "$transliterateFrom=ITRANS",
            },
            {
              language: "TEL",
              value: "$transliterateFrom=ITRANS",
            },
            {
              language: "IAST",
              value: "$transliterateFrom=ITRANS",
            },
          ]),
        })),
      },
    };
    // console.dir( data, { depth: 6 } );

    // create entity and kaandams
    const newEntity = await db.entity.create({
      data,
      select: { id: true, childrenRel: { select: { id: true, order: true } } },
    });
    // console.log( `Entity created: ${newEntity.id}` );
    entity = newEntity;
  } else {
    entity = entityExists;
  }

  if (!entity) {
    throw new Error("Root Ramayana Entity not created");
  }

  console.log(`Root Entity: ${entity.id}`);

  for (const kaandam of baseStructure) {
    const kaandamEntityId = entity.childrenRel.find(
      (c) => c.order === kaandam.idx,
    )?.id;
    if (!kaandamEntityId) {
      throw new Error(`Kaandam Entity not found: ${kaandam}`);
    }

    for (const chapter of kaandam.chapters) {
      const filePath = path.resolve(
        `${config.dataFolder}/ramayanam/extract_slokas/${chapter.page}.json`,
      );
      const text = await readFile(filePath, "utf-8");
      // console.log( text );
      const json = JSON.parse(text) as any;
      // console.log( json );

      const data: Prisma.EntityCreateArgs["data"] = {
        order: chapter.idx,
        type: "ADHYAAYAM",
        imageThumbnail: "/default-om_256.png",
        text: transliteratedText(json.entities[0].text),
        parentsRel: {
          connect: {
            id: kaandamEntityId,
          },
        },
        childrenRel: {
          create: json.entities[0].children.map((sloka: any) => ({
            ...sloka,
            text: transliteratedText(sloka.text),
          })),
        },
      };

      // console.dir( data, { depth: 5 } );

      // create adhyaayam and slokas
      const newEntity = await db.entity.create({
        data,
        select: { id: true },
      });
      console.log(
        `adhyaayam Entity created:${kaandam.idx}-${chapter.idx} ${chapter.title} ${newEntity.id}`,
      );
      // break;
    }
    // break;
  }
}

// 2. Scrape the slokas of each chapter and put them in a json file
export async function scrapeRayayanamPagesJSON(
  startKandam = 1,
  endKandam = 0,
): Promise<void> {
  if (endKandam === 0 || endKandam > baseStructure.length) {
    endKandam = baseStructure.length;
  }
  console.log(
    `Scraping Ramayanam pages from Kandam ${startKandam} to ${endKandam}`,
  );
  // const filePath = path.resolve(
  //   `${config.dataFolder}/ramayanam/0_structure.json`,
  // );
  // const bookStructure = JSON.parse(await readFile(filePath, "utf-8"));

  let kandamIdx = 0;
  for (const kandam of baseStructure) {
    if (kandamIdx < startKandam - 1) {
      kandamIdx++;
      continue;
    }
    if (kandamIdx >= endKandam) {
      break;
    }
    console.log(`Scraping: ${kandam.title}`);
    let chapterIdx = 0;
    for (const adhyayam of kandam.chapters) {
      // console.log(`Scraping: ${adhyayam.title}`);
      console.log(
        `Processing: ${kandamIdx} ${kandam.title} - ${chapterIdx} ${adhyayam.title}`,
      );

      // const res = await fetch(adhyayam.url);
      // const text = await res.text();
      // const fileName = adhyayam.url.split("/").pop();
      const filePath = path.resolve(
        `${config.dataFolder}/ramayanam/extract/${adhyayam.page}`,
      );
      // const filePathJSON = path.resolve(
      //   `${config.dataFolder}/ramayanam/extract/${fileName}.json`,
      // );
      const text = readFileSync(filePath, "utf-8");

      const $ = cheerio.load(text);

      const slokasIast: string[] = [];
      let currentSloka: string[] = [];

      $("td:first")
        .text()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length)
        .forEach((line) => {
          // console.log( line );
          const slokaNumber = line.match(/^\d+$/)?.[0];
          if (slokaNumber) {
            // console.log( `Sloka Number: ${slokaNumber}` );
            if (currentSloka.length) {
              slokasIast.push(currentSloka.join("  \n"));
              currentSloka = [];
            }
          } else {
            currentSloka.push(line);
          }
        });
      if (currentSloka.length) {
        slokasIast.push(currentSloka.join("  \n"));
        currentSloka = [];
      }

      const slokasSans: string[] = [];
      currentSloka = [];

      $("td:last")
        .text()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length)
        .forEach((line) => {
          // console.log( line );
          const slokaNumber = line.match(/^\d+$/)?.[0];
          if (slokaNumber) {
            // console.log( `Sloka Number: ${slokaNumber}` );
            if (currentSloka.length) {
              slokasSans.push(currentSloka.join("  \n"));
              currentSloka = [];
            }
          } else {
            currentSloka.push(line);
          }
        });
      if (currentSloka.length) {
        slokasSans.push(currentSloka.join("  \n"));
        currentSloka = [];
      }

      // const finalAdhyayam = {
      //   order: adhyayam.order,
      //   title: adhyayam.title,
      //   slokasIast,
      //   slokasSans,
      // };

      // await writeFile(filePath, text);
      // await writeFile(filePathJSON, JSON.stringify(finalAdhyayam, null, 2));
      // console.log(`${kandam.order}-${adhyayam.order} written to: ${filePath}`);

      const finalJson = {
        version: "current",
        entities: [
          {
            order: chapterIdx,
            type: "ADHYAAYAM",
            text: [
              {
                language: "ITRANS",
                value: adhyayam.title,
              },
              {
                language: "SAN",
                // value: "$transliterateFrom=ITRANS",
                value: Sanscript.t(
                  adhyayam.title,
                  "itrans_dravidian",
                  "devanagari",
                ),
              },
              {
                language: "TEL",
                // value: "$transliterateFrom=ITRANS",
                value: Sanscript.t(
                  adhyayam.title,
                  "itrans_dravidian",
                  "telugu",
                ),
              },
            ],
            imageThumbnail: "/default-om_256.png",
            children: slokasSans.map((sloka, idx) => ({
              order: idx,
              type: "SLOKAM",
              imageThumbnail: "/default-om_256.png",
              text: [
                {
                  language: "SAN",
                  value: sloka,
                },
                {
                  language: "IAST",
                  value: slokasIast[idx],
                },
                {
                  language: "ITRANS",
                  // value: "$transliterateFrom=SAN",
                  value: Sanscript.t(slokasIast[idx], "iast", "itrans"),
                },
                {
                  language: "TEL",
                  // value: "$transliterateFrom=SAN",
                  value: Sanscript.t(slokasIast[idx], "iast", "telugu"),
                },
              ],
            })),
          },
        ],
      };

      const filePathSlokas = path.resolve(
        `${config.dataFolder}/ramayanam/extract_slokas/${adhyayam.page}.json`,
      );
      // console.log(finalJson.entities[0].children.length);
      writeFileSync(filePathSlokas, JSON.stringify(finalJson, null, 2));

      chapterIdx++;
      // console.log( finalAdhyayam, filePath );
      // if ( adhyayam.order >= 2 ) {
      // break;
      // }
    }
    kandamIdx++;
    // break;
  }
}

// 1. Scrape the structure of the book with links to each chapter
export async function scrapeRamayanamPages(
  startKandam = 1,
  endKandam = 0,
): Promise<void> {
  const bookStructure: any = [];
  if (endKandam === 0 || endKandam > baseStructure.length) {
    endKandam = baseStructure.length;
  }
  console.log(
    `Scraping Ramayanam pages from Kandam ${startKandam} to ${endKandam}`,
  );

  for (let kandamIdx = startKandam - 1; kandamIdx < endKandam; kandamIdx++) {
    // for (let kandamIdx = 0; kandamIdx < 7; kandamIdx++) {
    const paddedIdx = String(kandamIdx + 1).padStart(2, "0");
    const kandamUrl = `${baseUrl}/rysi${paddedIdx}.htm`;
    const res = await fetch(kandamUrl);
    const text = await res.text();

    const $ = cheerio.load(text);

    const kandamTitle = $("h4")
      .first()
      .text()
      .trim()
      .replace(/[\n\t]/g, "");

    const links = $("a")
      .toArray()
      .map((a) => {
        const href = $(a).attr("href");
        const title = $(a)
          .text()
          .trim()
          .replace(/[\n\t]/g, "");
        if (href && href.startsWith(`rys${kandamIdx + 1}`)) {
          return {
            order: parseInt(href.slice(-7, -4)),
            url: `${baseUrl}/${href}`,
            title,
          };
        }
      })
      .filter((a) => a);

    const kandam = {
      order: kandamIdx,
      url: kandamUrl,
      title: kandamTitle,
      adhyayams: links,
    };

    bookStructure.push(kandam);
    // break;
  }

  // console.dir( bookStructure, { depth: 3 } );

  const filePath = path.resolve(
    `${config.dataFolder}/ramayanam/0_structure.json`,
  );
  await writeFile(filePath, JSON.stringify(bookStructure, null, 2));
  console.log(`Ramayanam book structure written to: ${filePath}`);
}
