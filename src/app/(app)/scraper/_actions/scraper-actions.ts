"use server";

import { db } from "@/lib/db";
import {
  createMahabharathaEntityDB,
  processSlokas,
} from "@/lib/scrape/mahabharatham";
import {
  scrapeMeaningPages,
  scrapeMeaningPagesJSON,
} from "@/lib/scrape/mahabharatham_meanings";
import {
  createRamayanaEntityDB,
  scrapeRamayanamPages,
  scrapeRayayanamPagesJSON,
} from "@/lib/scrape/ramayanam";
import path from "path";
import fs from "fs/promises";
import * as cheerio from "cheerio";
import { exec } from "child_process";
import { promisify } from "util";
import { Prisma } from "@/app/generated/prisma";
import config from "@/config";
import { getSafePathFromUrl } from "@/lib/utils";

const execAsync = promisify(exec);

// Ramayanam scraper actions
export async function scrapeRamayanam(
  baseUrl: string,
  startKandam?: number,
  endKandam?: number,
) {
  try {
    await scrapeRamayanamPages(startKandam, endKandam);
    // await scrapeRamayanamPages();
    return {
      success: true,
      scrapedCount: (endKandam || 0) - (startKandam || 0) + 1 || "all",
    };
  } catch (error) {
    console.error("Error scraping Ramayanam:", error);
    throw new Error(
      `Failed to scrape Ramayanam: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function processRamayanamToJSON() {
  try {
    await scrapeRayayanamPagesJSON();

    // Count the number of files processed
    const extractDir = path.resolve(`${config.dataFolder}/ramayanam/extract`);
    const files = await fs.readdir(extractDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    return { success: true, processedCount: jsonFiles.length };
  } catch (error) {
    console.error("Error processing Ramayanam to JSON:", error);
    throw new Error(
      `Failed to process Ramayanam to JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function createRamayanamEntities(parentId: string) {
  try {
    await createRamayanaEntityDB(parentId);

    // Get count of entities created (approximate)
    const structurePath = path.resolve(
      `${config.dataFolder}/ramayanam/0_structure.json`,
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
    console.error("Error creating Ramayanam entities:", error);
    throw new Error(
      `Failed to create Ramayanam entities: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Mahabharatam scraper actions
export async function scrapeMahabharatamMeanings(
  baseUrl: string,
  startParva?: string,
  endParva?: string,
) {
  try {
    // await scrapeMeaningPages(baseUrl, startParva, endParva);
    await scrapeMeaningPages();
    return {
      success: true,
      scrapedCount:
        parseInt(endParva || "0") - parseInt(startParva || "0") + 1 || "all",
    };
  } catch (error) {
    console.error("Error scraping Mahabharatam:", error);
    throw new Error(
      `Failed to scrape Mahabharatam: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function processMahabharatamToJSON() {
  try {
    await scrapeMeaningPagesJSON();

    // Count the number of files processed
    const extractDir = path.resolve(
      `${config.dataFolder}/mahabharatham/extract_meanings`,
    );
    const files = await fs.readdir(extractDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    return { success: true, processedCount: jsonFiles.length };
  } catch (error) {
    console.error("Error processing Mahabharatam to JSON:", error);
    throw new Error(
      `Failed to process Mahabharatam to JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function processMahabharatamSlokas() {
  try {
    await processSlokas();

    // Count the number of slokas processed
    const extractDir = path.resolve(
      `${config.dataFolder}/mahabharatham/extract_slokas`,
    );
    const files = await fs.readdir(extractDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    return { success: true, processedCount: jsonFiles.length };
  } catch (error) {
    console.error("Error processing Mahabharatam slokas:", error);
    throw new Error(
      `Failed to process Mahabharatam slokas: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function createMahabharatamEntities(parentId: string) {
  try {
    await createMahabharathaEntityDB(parentId);

    // Get count of entities created (approximate)
    const structurePath = path.resolve(
      `${config.dataFolder}/mahabharatham/0_structure.json`,
    );
    const structureData = await fs.readFile(structurePath, "utf-8");
    const structure = JSON.parse(structureData);

    let totalSlokas = 0;
    for (const parva of structure) {
      for (const adhyaya of parva.adhyayas) {
        totalSlokas += adhyaya.slokas.length;
      }
    }

    return { success: true, createdCount: totalSlokas };
  } catch (error) {
    console.error("Error creating Mahabharatam entities:", error);
    throw new Error(
      `Failed to create Mahabharatam entities: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Custom scraper action
export async function scrapeCustomUrl(
  url: string,
  selectors: string[],
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
    const result: { selector: string; content: string[] }[] = [];

    for (const selector of selectors) {
      const elements = $(selector).toArray();
      const content = elements.map(
        (el) =>
          $(el)
            .text()
            .trim()
            .replace(/[\n\t\r]+/g, " ") || "",
      );
      result.push({ selector, content });
    }

    // Create the output data
    const outputData = {
      url,
      timestamp: new Date().toISOString(),
      folderPath: folderPath,
      htmlFilePath: htmlFilePath,
      selectors,
      results: result,
    };

    // Write the JSON data
    await fs.writeFile(jsonFilePath, JSON.stringify(outputData, null, 2));

    return {
      success: true,
      data: outputData,
      folderPath,
      htmlFilePath,
      jsonFilePath,
    };
  } catch (error) {
    console.error("Error scraping custom URL:", error);
    throw new Error(
      `Failed to scrape URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Function to upload the extracted data to the entity database
export async function uploadToEntityDatabase(
  jsonFilePath: string,
  entityType: string,
  parentId?: string,
) {
  try {
    // Read the JSON file
    const jsonContent = await fs.readFile(jsonFilePath, "utf-8");
    const extractedData = JSON.parse(jsonContent);

    // Extract meaningful content from the results
    const entities = [];

    // Process each selector and its content
    for (const result of extractedData.results) {
      // Skip empty results
      if (!result.content || result.content.length === 0) continue;

      for (let i = 0; i < result.content.length; i++) {
        const content = result.content[i];
        // Skip empty content
        if (!content.trim()) continue;

        // Create entity
        const entity: Prisma.EntityCreateInput = {
          type: entityType,
          text: [{ language: "en", value: content }],
          meaning: [{ language: "en", value: "" }],
          order: entities.length,
          bookmarked: false,
          notes: `Extracted from ${extractedData.url} using selector: ${result.selector}`,
          parentsRel: parentId ? { connect: { id: parentId } } : undefined,
        };

        entities.push(entity);
      }
    }

    // Insert entities into the database
    for (const entity of entities) {
      await db.entity.create({
        data: {
          type: entity.type,
          text: entity.text,
          meaning: entity.meaning,
          order: entity.order,
          bookmarked: entity.bookmarked,
          notes: entity.notes,
          parentsRel: entity.parentsRel,
        },
      });
    }

    return {
      success: true,
      count: entities.length,
      message: `Successfully uploaded ${entities.length} entities to the database`,
    };
  } catch (error) {
    console.error("Error uploading to entity database:", error);
    throw new Error(
      `Failed to upload to entity database: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Function to save edited JSON content
export async function saveEditedJsonContent(
  jsonFilePath: string,
  editedContent: any,
) {
  try {
    // Create backup of original file
    const backupPath = `${jsonFilePath}.backup`;

    // Check if file exists before backup
    if (await fileExists(jsonFilePath)) {
      const originalContent = await fs.readFile(jsonFilePath, "utf-8");
      await fs.writeFile(backupPath, originalContent);
    }

    // Write the edited content to the file
    await fs.writeFile(jsonFilePath, JSON.stringify(editedContent, null, 2));

    return {
      success: true,
      message: `Successfully saved edited content to ${jsonFilePath}`,
      jsonFilePath,
    };
  } catch (error) {
    console.error("Error saving edited JSON content:", error);
    throw new Error(
      `Failed to save edited JSON content: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Function to convert JSON data to entity upload format
export async function convertToEntityFormat(
  jsonFilePath: string,
  entityType: string,
  parentId?: string,
) {
  try {
    // Read the JSON file
    const jsonContent = await fs.readFile(jsonFilePath, "utf-8");
    const extractedData = JSON.parse(jsonContent);

    // Extract meaningful content from the results
    const entities: Array<{
      type: string;
      text: Array<{ language: string; value: string }>;
      meaning: Array<{ language: string; value: string }>;
      order: number;
      bookmarked: boolean;
      notes: string;
      parents: string[];
    }> = [];

    // Process each selector and its content
    for (const result of extractedData.results) {
      // Skip empty results
      if (!result.content || result.content.length === 0) continue;

      for (let i = 0; i < result.content.length; i++) {
        const content = result.content[i];
        // Skip empty content
        if (!content.trim()) continue;

        // Create entity
        const entity = {
          type: entityType,
          text: [{ language: "en", value: content }],
          meaning: [{ language: "en", value: "" }],
          order: entities.length,
          bookmarked: false,
          notes: `Extracted from ${extractedData.url} using selector: ${result.selector}`,
          parents: parentId ? [parentId] : [],
        };

        entities.push(entity);
      }
    }

    // Create entity preview file
    const previewFilePath = jsonFilePath.replace(
      ".json",
      "_entity_preview.json",
    );
    await fs.writeFile(previewFilePath, JSON.stringify(entities, null, 2));

    return {
      success: true,
      entities,
      count: entities.length,
      message: `Successfully converted ${entities.length} items to entity format`,
      previewFilePath,
    };
  } catch (error) {
    console.error("Error converting to entity format:", error);
    throw new Error(
      `Failed to convert to entity format: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
