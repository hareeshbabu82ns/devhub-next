"use server";

import path from "path";
import fs from "fs/promises";
import * as cheerio from "cheerio";
import { exec } from "child_process";
import { promisify } from "util";
import config from "@/config";
import { fileExists, scrapeCustomUrl } from "./scraper-actions";
import { getSafePathFromUrl } from "@/lib/utils";
import { Prisma } from "@/app/generated/prisma";
import { LanguageValueInput } from "@/lib/types";

const execAsync = promisify(exec);

const pageLanguages = [
  {
    pageLanguage: "తెలుగు",
    language: "TEL",
  },
  {
    pageLanguage: "देवनागरी",
    language: "SAN",
  },
  {
    pageLanguage: "English (IAST)",
    language: "IAST",
  },
];

export async function scrapeSthotranidhi(
  url: string,
  selectors: string[],
  refetch: boolean = false,
  linesToSkip: string[],
) {
  try {
    const languagePageUrls = await fetchLanguagePageUrls(url, refetch);
    if (!languagePageUrls || languagePageUrls.length === 0) {
      throw new Error("No language page URLs found");
    }
    // console.log("Fetched language page URLs:", languagePageUrls);

    // Call the original scraper function
    const results = [];
    for (const { url, language } of languagePageUrls) {
      if (!url) {
        continue;
      }
      console.log(`Scraping URL: ${url}`);
      const res = await scrapeCustomUrl(url, selectors, refetch);
      if (res.success) {
        // Filter out unwanted lines from the content
        const filteredResults = res.data.results.map((item) => {
          if (item.selector === ".entry-title") {
            item.content = item.content
              .map((line) => line.trim().split(" – ").pop() || "")
              .filter((line) => line && line.trim().length);
          } else {
            item.content = item.content
              .filter((line) => {
                return (
                  // !filterLines.some((filterLine) =>
                  //   line.includes(filterLine),
                  // ) &&
                  !linesToSkip.some((regex) => new RegExp(regex).test(line)) &&
                  line.trim().length
                );
              })
              .map((line) =>
                line
                  .replace(" | ", " | \n\n  ")
                  .replace(" । ", " । \n\n  ")
                  .replace(" || ", " || \n\n  ")
                  .trim(),
              );
          }
          return item;
        });
        res.data.results = filteredResults;
        results.push({
          ...res.data,
          jsonFilePath: res.jsonFilePath,
          language,
        });
      } else {
        console.error(`Failed to scrape ${url}:`);
      }
    }
    return {
      success: true,
      data: results,
      timestamp: results[0]?.timestamp,
      folderPath: results[0]?.folderPath,
      htmlFilePath: results[0]?.htmlFilePath,
      jsonFilePath: results[0]?.jsonFilePath,
      // jsonFilePath: results[0]?.jsonFilePath,
    };
  } catch (error) {
    console.error("Error scraping SthotraNidhi:", error);
    throw new Error(
      `Failed to scrape SthotraNidhi: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function convertSthotranidhiToEntityFormat(
  jsonFilePath: string,
  entityType: string,
  parentId?: string,
) {
  try {
    // Read the JSON file
    const jsonContent = await fs.readFile(jsonFilePath, "utf-8");
    const extractedData = JSON.parse(jsonContent);

    // Extract meaningful content from the results
    const entities: Array<Prisma.EntityCreateArgs["data"]> = [];
    const entitiesText: LanguageValueInput[][] = [];
    const mainEntityText: LanguageValueInput[] = [];

    // Process each selector and its content
    for (const data of extractedData) {
      for (const result of data.results) {
        // Skip empty results
        if (!result.content || result.content.length === 0) continue;

        if (result.selector === ".entry-title") {
          mainEntityText.push({
            language: data.language || "ENGLISH",
            value: result.content[0].trim(),
          });
          continue;
        }

        for (let i = 0; i < result.content.length; i++) {
          const content = result.content[i];
          // Skip empty content
          if (!content.trim()) continue;

          if (entitiesText.length > i) {
            entitiesText[i].push({
              language: data.language || "ENGLISH",
              value: content,
            });
          } else {
            entitiesText.push([
              {
                language: data.language || "ENGLISH",
                value: content,
              },
            ]);
          }
        }
      }
    }

    entitiesText.forEach((text, index) => {
      // Create entity
      const entity = {
        text: text,
        order: index,
        type: "SLOKAM",
        imageThumbnail: "/default-om_256.png",
        bookmarked: false,
      };

      entities.push(entity);
    });

    const mainEntity: Prisma.EntityCreateArgs["data"] = {
      type: entityType,
      text: mainEntityText,
      childrenRel: {
        create: entities,
      },
    };
    if (parentId) {
      mainEntity.parentsRel = {
        connect: {
          id: parentId,
        },
      };
    }

    // Create entity preview file
    const previewFilePath = jsonFilePath.replace(
      ".json",
      "_entity_preview.json",
    );
    await fs.writeFile(previewFilePath, JSON.stringify(mainEntity, null, 2));

    return {
      success: true,
      entities: [mainEntity],
      count: entities.length,
      message: `Successfully converted ${entities.length} items to entity format`,
      previewFilePath,
    };
  } catch (error) {
    console.error("Error converting to entity format:", error);
    throw new Error(
      `Failed to convert to entity format: \n Try Saving first. \n ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function createSthotranidhiEntities(parentId: string) {
  try {
    // Get count of entities created (approximate)
    const structurePath = path.resolve(
      `${config.dataFolder}/sthotranidhi/0_structure.json`,
    );
    const structureData = await fs.readFile(structurePath, "utf-8");
    const structure = JSON.parse(structureData);

    let totalSlokas = 0;
    for (const kanda of structure) {
      for (const sarga of kanda.sargas) {
        totalSlokas += sarga.slokas.length;
      }
    }

    return { success: true, createdCount: totalSlokas };
  } catch (error) {
    console.error("Error creating SthotraNidhi entities:", error);
    throw new Error(
      `Failed to create SthotraNidhi entities: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function fetchLanguagePageUrls(
  url: string,
  refetch: boolean = false,
) {
  try {
    const {
      folderPath: folderPathStr,
      htmlFilePath,
      jsonFilePath,
    } = getSafePathFromUrl(url);
    const folderPath = path.resolve(folderPathStr);
    await fs.mkdir(folderPath, { recursive: true });

    // Fetch and save HTML content
    let htmlContent;

    if (refetch || !(await fileExists(htmlFilePath))) {
      // Use curl to fetch the webpage content
      const { stdout } = await execAsync(`curl -s "${url}"`);
      htmlContent = stdout;

      // Save HTML content to file
      await fs.writeFile(htmlFilePath, htmlContent);
      console.log(`HTML content saved to ${htmlFilePath}`);
    } else {
      // Read from existing HTML file
      htmlContent = await fs.readFile(htmlFilePath, "utf-8");
      console.log(`Using existing HTML content from ${htmlFilePath}`);
    }

    // Process HTML with cheerio
    const $ = cheerio.load(htmlContent);

    // Extract content based on selectors
    if (!$(".sn_language_links a").length) {
      // throw new Error("No language links found in the HTML content");
      return [
        {
          url,
          pageLanguage: "Telugu",
          language: "TEL",
        },
      ];
    }
    const elements = $(".sn_language_links a").toArray();
    console.log(`Found ${elements.length} language links`);
    const pageUrls = elements.map((el) => {
      const url = $(el).attr("href") || "";
      if (!url) {
        console.warn("No href found for element, skipping:", $(el).text());
        return { url: "", content: "" };
      }
      const pageLanguage =
        $(el)
          .text()
          .trim()
          .replace(/[\n\t\r]+/g, " ") || "";
      const currentPageLanguage = pageLanguages.find(
        (suffix) => suffix.pageLanguage === pageLanguage,
      );
      if (!currentPageLanguage) {
        return { url: null, pageLanguage: null, language: null };
      }
      return {
        url,
        pageLanguage,
        language: currentPageLanguage.language,
      };
    });
    return pageUrls;
  } catch (error) {
    console.error("Error scraping custom URL:", error);
    throw new Error(
      `Failed to scrape URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
