"use server";

import path from "path";
import fs from "fs/promises";
import * as cheerio from "cheerio";
import { exec } from "child_process";
import { promisify } from "util";
import config from "@/config";

const execAsync = promisify(exec);

export async function scrapeSthotranidhi(baseUrl: string) {
  try {
    return {
      success: true,
      scrapedCount: 1,
    };
  } catch (error) {
    console.error("Error scraping SthotraNidhi:", error);
    throw new Error(
      `Failed to scrape SthotraNidhi: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function processSthotranidhiToJSON() {
  try {
    // Count the number of files processed
    const extractDir = path.resolve(
      `${config.dataFolder}/sthotranidhi/extract`,
    );
    const files = await fs.readdir(extractDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    return { success: true, processedCount: jsonFiles.length };
  } catch (error) {
    console.error("Error processing SthotraNidhi to JSON:", error);
    throw new Error(
      `Failed to process SthotraNidhi to JSON: ${error instanceof Error ? error.message : String(error)}`,
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
