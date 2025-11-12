"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { writeFile, unlink, stat, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import JSZip from "jszip";
import config from "@/config";

// Define response types using discriminated unions
export type DownloadActionResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// Define validation schema for download parameters
const DownloadDictionarySchema = z.object({
  dictFrom: z
    .array(z.string())
    .min(1, "Select at least one Dictionary")
    .default([]),
  queryText: z.string().optional().default(""),
  queryOperation: z
    .enum(["FULL_TEXT_SEARCH", "REGEX"])
    .optional()
    .default("REGEX"),
  sortBy: z
    .enum(["wordIndex", "phonetic", "createdAt", "updatedAt", "relevance"])
    .optional()
    .default("wordIndex"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
  language: z.string().default("en"),
  format: z.enum(["txt", "csv", "json", "all"]).optional().default("all"),
});

type DownloadDictionaryParams = z.infer<typeof DownloadDictionarySchema>;

interface DictionaryExportItem {
  // id: string;
  origin: string;
  wordIndex: number;
  // phonetic: string;
  wordStr: string;
  word: { language: string; value: string }[];
  descriptionStr: string;
  description: { language: string; value: string }[];
  attributesStr: string;
  attributes: { key: string; value: string }[];
}

export async function downloadDictionary(
  params: DownloadDictionaryParams,
): Promise<DownloadActionResponse<{ filename: string; filepath: string }>> {
  const delimiter = "|=|";
  const lineDelimiter = "|-=-|\n";
  const attrDelimiter = "|a=a|";
  const attrLineDelimiter = "|-a=a-|";

  try {
    const session = await auth();

    if (!session) {
      return { status: "error", error: "Unauthorized" };
    }

    // Validate input
    const validated = DownloadDictionarySchema.parse(params);
    const {
      dictFrom,
      queryText,
      queryOperation,
      sortBy,
      sortOrder,
      language,
      format,
    } = validated;

    console.log("downloadDictionary params:", validated);

    // Build query conditions
    const where: any = {};

    if (dictFrom.length > 0) {
      where.origin = { in: dictFrom };
    }

    if (queryText.length > 0) {
      if (queryOperation === "FULL_TEXT_SEARCH") {
        // Full text search not implemented in regular find, use aggregation instead
        where.OR = [
          {
            word: {
              some: { value: { contains: queryText, mode: "insensitive" } },
            },
          },
          {
            description: {
              some: { value: { contains: queryText, mode: "insensitive" } },
            },
          },
          {
            phonetic: { contains: queryText, mode: "insensitive" },
          },
        ];
      } else {
        // REGEX search
        where.OR = [
          {
            word: {
              some: { value: { contains: queryText, mode: "insensitive" } },
            },
          },
          {
            description: {
              some: { value: { contains: queryText, mode: "insensitive" } },
            },
          },
          {
            phonetic: { contains: queryText, mode: "insensitive" },
          },
        ];
      }
    }

    // Build sort configuration
    const getSortConfig = () => {
      const sortField =
        sortBy === "wordIndex"
          ? "wordIndex"
          : sortBy === "phonetic"
            ? "phonetic"
            : sortBy === "createdAt"
              ? "createdAt"
              : sortBy === "updatedAt"
                ? "updatedAt"
                : "wordIndex";

      return { [sortField]: sortOrder };
    };

    const orderBy = getSortConfig();

    // Fetch records using cursor-based pagination with 10,000 records at a time
    const exportItems: DictionaryExportItem[] = [];
    let cursor: string | undefined = undefined;
    const BATCH_SIZE = 10000;
    let totalProcessed = 0;

    console.log("Starting cursor-based fetch...");

    do {
      const batchQuery: any = {
        where,
        orderBy,
        take: BATCH_SIZE,
      };

      if (cursor) {
        batchQuery.cursor = { id: cursor };
        batchQuery.skip = 1; // Skip the cursor record itself
      }

      const records = await db.dictionaryWord.findMany(batchQuery);

      if (records.length === 0) {
        break;
      }

      // Transform batch records to export format
      const batchItems: DictionaryExportItem[] = records.map((record: any) => {
        const wordOriginal = record.attributes.find(
          (w: any) => w.key === "wordOriginal",
        )?.value;
        const descriptionOriginal = record.attributes.find(
          (w: any) => w.key === "descOriginal",
        )?.value;
        const word = wordOriginal
          ? [{ language: language, value: wordOriginal }]
          : record.word.filter((w: any) => w.language === language) || [];
        const description = descriptionOriginal
          ? { language: language, value: descriptionOriginal }
          : record.description.filter((w: any) => w.language === language) ||
            [];
        const attributes =
          record.attributes.filter((attr: any) =>
            ["wordOriginal", "descOriginal"].includes(attr.key),
          ) || [];
        return {
          origin: record.origin,
          wordIndex: record.wordIndex,
          word,
          wordStr:
            word
              ?.map((w: any) => `${w.language}${attrDelimiter}${w.value}`)
              .join(attrLineDelimiter) || "",
          description,
          descriptionStr:
            description
              ?.map((w: any) => `${w.language}${attrDelimiter}${w.value}`)
              .join(attrLineDelimiter) || "",
          attributes,
          attributesStr:
            attributes
              ?.map(
                (attr: any) => `${attr.language}${attrDelimiter}${attr.value}`,
              )
              .join(attrLineDelimiter) || "",
        };
      });

      exportItems.push(...batchItems);
      totalProcessed += records.length;

      // Set cursor to the last record's ID for next batch
      cursor = records[records.length - 1].id;

      console.log(
        `Processed batch: ${records.length} records, Total: ${totalProcessed}`,
      );

      // Break if we got fewer records than batch size (last batch)
      if (records.length < BATCH_SIZE) {
        break;
      }
    } while (true);

    console.log(
      `Completed cursor-based fetch. Total records: ${exportItems.length}`,
    );

    if (exportItems.length === 0) {
      return {
        status: "error",
        error: "No dictionary items found matching the criteria",
      };
    }

    // Create ZIP file with selected formats
    const zip = new JSZip();

    // Generate different formats based on the format parameter
    const allFormats = {
      txt: ["all", "txt"].includes(format)
        ? generateTextFormat(exportItems, delimiter, lineDelimiter)
        : "",
      csv: ["all", "csv"].includes(format)
        ? generateCSVFormat(exportItems, delimiter, lineDelimiter)
        : "",
      json: ["all", "json"].includes(format)
        ? generateJSONFormat(exportItems)
        : "",
    };

    const filenamePrefix = `dictionary_export_${language}_${dictFrom.join("_")}_${Date.now()}`;

    // Add files to ZIP based on format selection
    if (format === "all") {
      // Include all formats
      Object.entries(allFormats).forEach(([formatKey, content]) => {
        const filename = `${filenamePrefix}.${formatKey}`;
        zip.file(filename, content);
      });
    } else {
      // Include only the selected format
      const content = allFormats[format as keyof typeof allFormats];
      const filename = `${filenamePrefix}.${format}`;
      zip.file(filename, content);
    }

    // Generate README
    const readme = generateReadme(
      validated,
      exportItems.length,
      delimiter,
      lineDelimiter,
      format,
    );
    zip.file("README.md", readme);

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Generate unique filename and temporary file path
    const filename = `${filenamePrefix}_${randomUUID()}.zip`;
    const tempDir = join(config.dataFolder, "temp");
    const filepath = join(tempDir, filename);
    // check and create temp directory if it doesn't exist

    try {
      await stat(tempDir);
    } catch {
      await mkdir(tempDir, { recursive: true });
    }

    // Write ZIP file to temporary location
    await writeFile(filepath, zipBuffer);

    return {
      status: "success",
      data: { filename, filepath },
    };
  } catch (error) {
    console.error("Download dictionary failed:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }

    return { status: "error", error: "Failed to export dictionary data" };
  }
}

export async function cleanupDownloadFile(filepath: string): Promise<void> {
  try {
    await unlink(filepath);
  } catch (error) {
    console.error("Failed to cleanup download file:", error);
  }
}

function generateTextFormat(
  items: DictionaryExportItem[],
  delimiter: string,
  lineDelimiter: string,
): string {
  const header = `Origin${delimiter}WordIndex${delimiter}Word${delimiter}Description${delimiter}Attributes${lineDelimiter}`;
  const rows = items
    .map(
      (item) =>
        `${item.origin}${delimiter}${item.wordIndex}${delimiter}${item.wordStr}${delimiter}${item.descriptionStr}${delimiter}${item.attributesStr}`,
    )
    .join(lineDelimiter);

  return header + rows;
}

function generateCSVFormat(
  items: DictionaryExportItem[],
  delimiter: string,
  lineDelimiter: string,
): string {
  // For CSV, we'll use the custom delimiter but in a more structured way
  const header = `"Origin"${delimiter}"WordIndex"${delimiter}"Phonetic"${delimiter}"Word"${delimiter}"Description"${delimiter}"Attributes"${lineDelimiter}`;
  const rows = items
    .map(
      (item) =>
        `"${escapeForCSV(item.origin)}"${delimiter}"${item.wordIndex}"${delimiter}"${escapeForCSV(item.wordStr)}"${delimiter}"${escapeForCSV(item.descriptionStr)}"${delimiter}"${escapeForCSV(item.attributesStr)}"`,
    )
    .join(lineDelimiter);

  return header + rows;
}

function generateJSONFormat(items: DictionaryExportItem[]): string {
  const strippedItems = items.map(
    ({ wordStr, descriptionStr, attributesStr, ...rest }) => ({
      ...rest,
    }),
  );
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      totalItems: items.length,
      items: strippedItems,
    },
    null,
    2,
  );
}

function escapeForCSV(value: string): string {
  return value.replace(/"/g, '""');
}

function generateReadme(
  params: DownloadDictionaryParams,
  totalItems: number,
  delimiter: string,
  lineDelimiter: string,
  format: string,
): string {
  return `# Dictionary Export

## Export Details
- **Generated At**: ${new Date().toISOString()}
- **Total Items**: ${totalItems}
- **Language**: ${params.language}
- **Format**: ${format === "all" ? "All formats (txt, csv, json)" : format.toUpperCase()}
- **Delimiter**: ${delimiter}
- **Line Delimiter**: ${lineDelimiter}

## Query Parameters
- **Origins**: ${params.dictFrom?.length ? params.dictFrom.join(", ") : "All"}
- **Search Query**: ${params.queryText || "None"}
- **Query Type**: ${params.queryOperation}
- **Sort By**: ${params.sortBy}
- **Sort Order**: ${params.sortOrder}

## File Formats

${
  format === "all" || format === "txt"
    ? `### dictionary_export_*.txt
Plain text format with custom delimiter (${delimiter})

`
    : ""
}${
    format === "all" || format === "csv"
      ? `### dictionary_export_*.csv
CSV format with custom delimiter (${delimiter}) and quoted fields

`
      : ""
  }${
    format === "all" || format === "json"
      ? `### dictionary_export_*.json
JSON format with structured data including metadata

`
      : ""
  }

## Field Descriptions
- **Origin**: Source dictionary (e.g., MW, SKD, etc.)
- **WordIndex**: Numerical index for ordering
- **Word**: The dictionary word/term
- **Description**: Definition or meaning
- **Attributes**: Additional metadata in key:value format

## Usage Notes
- The custom delimiter "${delimiter}" is used to separate fields
- All text fields are properly escaped
- JSON format includes export metadata
- Files are sorted according to the specified criteria
`;
}
