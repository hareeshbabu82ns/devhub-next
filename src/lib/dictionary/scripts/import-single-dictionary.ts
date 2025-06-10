#!/usr/bin/env tsx
/**
 * Single Dictionary Import CLI Script
 *
 * This script provides a simple interface for importing a single dictionary
 * with detailed progress tracking and validation.
 *
 * Usage:
 *   pnpm dict:import:single <dictionary> [options]
 *
 * Examples:
 *   pnpm dict:import:single mw
 *   pnpm dict:import:single eng2te --limit=500 --validate
 */

import { existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@/app/generated/prisma";
import { importDictionaryFromSqlite } from "../dictionary-import-orchestrator";
import { createSqliteDatabase } from "../sqlite-database";
import { PrismaDictionaryWordDatabase } from "../dictionary-database";
import { DictionaryName, LEXICON_ALL_DICT } from "../dictionary-constants";

// Configuration
const SQLITE_DIR = resolve(process.cwd(), "tmp");
const DEFAULT_CHUNK_SIZE = 5000;

interface CliOptions {
  dictionary: DictionaryName;
  limit?: number;
  chunkSize: number;
  validate: boolean;
  deleteExisting: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    throw new Error("Dictionary name is required");
  }

  const dictionary = args[0];
  if (!LEXICON_ALL_DICT.includes(dictionary as DictionaryName)) {
    throw new Error(
      `Unknown dictionary '${dictionary}'. Available: ${LEXICON_ALL_DICT.join(", ")}`,
    );
  }

  const options: CliOptions = {
    dictionary: dictionary as DictionaryName,
    chunkSize: DEFAULT_CHUNK_SIZE,
    validate: false,
    deleteExisting: false,
    verbose: false,
    help: false,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--validate") {
      options.validate = true;
    } else if (arg === "--delete-existing") {
      options.deleteExisting = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--chunk-size=")) {
      options.chunkSize = parseInt(arg.split("=")[1], 10);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Single Dictionary Import CLI

Usage: pnpm dict:import:single <dictionary> [options]

Arguments:
  dictionary          Dictionary name to import
                     Available: ${LEXICON_ALL_DICT.join(", ")}

Options:
  --limit=N           Limit number of rows to import (for testing)
  --chunk-size=N      Set bulk insert chunk size (default: ${DEFAULT_CHUNK_SIZE})
  --validate          Enable row data validation
  --delete-existing   Delete existing dictionary data before import
  --verbose, -v       Enable verbose logging
  --help, -h          Show this help message

Examples:
  pnpm dict:import:single mw
  pnpm dict:import:single eng2te --limit=500 --validate
  pnpm dict:import:single ap90 --delete-existing --chunk-size=2000

Environment:
  SQLITE_DIR          Directory containing SQLite files (default: ./tmp)
  DATABASE_URL        Prisma database connection string
`);
}

async function createDetailedProgressTracker(dictionaryName: string) {
  let startTime = Date.now();
  let lastUpdate = 0;

  return (progress: any) => {
    const { processed, total, percentage } = progress;
    const currentTime = Date.now();

    // Update every 2% or every 5 seconds
    if (percentage >= lastUpdate + 2 || currentTime - startTime > 5000) {
      const elapsed = currentTime - startTime;
      const rate = processed / (elapsed / 1000);
      const eta = total > processed ? (total - processed) / rate : 0;

      // Create progress bar
      const barLength = 50;
      const filled = Math.floor((percentage / 100) * barLength);
      const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

      // Format time
      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      };

      console.log(`
${dictionaryName.toUpperCase()} Import Progress:
[${bar}] ${percentage.toFixed(1)}%
Processed: ${processed.toLocaleString()} / ${total.toLocaleString()} words
Rate: ${rate.toFixed(1)} words/sec
Elapsed: ${formatTime(elapsed / 1000)}
ETA: ${eta > 0 ? formatTime(eta) : "Complete"}
`);

      lastUpdate = percentage;
      startTime = currentTime; // Reset for rate calculation
    }
  };
}

async function main() {
  try {
    const options = parseArgs();

    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const sqlitePath = resolve(SQLITE_DIR, `${options.dictionary}.sqlite`);

    if (!existsSync(sqlitePath)) {
      console.error(`Error: SQLite file not found: ${sqlitePath}`);
      process.exit(1);
    }

    if (options.verbose) {
      console.log("Configuration:", {
        dictionary: options.dictionary,
        sqlitePath,
        chunkSize: options.chunkSize,
        limit: options.limit,
        validate: options.validate,
        deleteExisting: options.deleteExisting,
      });
    }

    // Initialize database
    console.log("Initializing database connection...");
    const prisma = new PrismaClient();
    const targetDb = new PrismaDictionaryWordDatabase(prisma);

    try {
      // Check database connection
      const isConnected = await targetDb.isConnected();
      if (!isConnected) {
        console.error("Error: Database connection failed");
        process.exit(1);
      }

      console.log(
        `\nStarting import for dictionary: ${options.dictionary.toUpperCase()}`,
      );
      console.log(`SQLite file: ${sqlitePath}`);

      if (options.limit) {
        console.log(`Row limit: ${options.limit.toLocaleString()}`);
      }

      const startTime = Date.now();
      const progressCallback = await createDetailedProgressTracker(
        options.dictionary,
      );

      // Open SQLite database
      const sqliteDb = await createSqliteDatabase(sqlitePath);

      try {
        // Import dictionary
        const result = await importDictionaryFromSqlite(
          sqliteDb,
          targetDb,
          options.dictionary,
          {
            limitRows: options.limit,
            chunkSize: options.chunkSize,
            validateData: options.validate,
            deleteExisting: options.deleteExisting,
            progressCallback,
            includeHtmlProcessing: true,
          },
        );

        const duration = Date.now() - startTime;

        // Print detailed results
        console.log("\n" + "=".repeat(60));
        console.log(`IMPORT COMPLETE: ${options.dictionary.toUpperCase()}`);
        console.log("=".repeat(60));
        console.log(
          `Total rows in source: ${result.totalRows.toLocaleString()}`,
        );
        console.log(`Processed rows: ${result.processedRows.toLocaleString()}`);
        console.log(`Valid rows: ${result.validRows.toLocaleString()}`);
        console.log(`Invalid rows: ${result.invalidRows.toLocaleString()}`);
        console.log(`Processing time: ${duration.toLocaleString()}ms`);
        console.log(
          `Average rate: ${(result.processedRows / (duration / 1000)).toFixed(1)} words/sec`,
        );

        if (result.errors.length > 0) {
          console.log(`\nErrors (${result.errors.length}):`);
          result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
          });
          console.log("\n⚠️  Import completed with errors.");
          process.exit(1);
        } else {
          console.log("\n🎉 Import completed successfully!");
        }
      } finally {
        await sqliteDb.close();
      }
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    console.error(
      '\nRun "pnpm dict:import:single --help" for usage information.',
    );
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nImport cancelled by user");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
