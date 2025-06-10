#!/usr/bin/env tsx
/**
 * Dictionary Import CLI Script
 *
 * This script provides a command-line interface for importing dictionary data
 * from SQLite databases to MongoDB/Prisma with progress tracking and error handling.
 *
 * Usage:
 *   pnpm dict:import [dictionaries...] [options]
 *
 * Examples:
 *   pnpm dict:import mw ap90 eng2te
 *   pnpm dict:import --all --limit=1000
 *   pnpm dict:import mw --validate --chunk-size=2000
 */

import { existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@/app/generated/prisma";
import {
  importDictionaryFromSqlite,
  importMultipleDictionaries,
} from "../dictionary-import-orchestrator";
import { createSqliteDatabase } from "../sqlite-database";
import { PrismaDictionaryWordDatabase } from "../dictionary-database";
import { DictionaryName, LEXICON_ALL_DICT } from "../dictionary-constants";

// Configuration
const SQLITE_DIR = resolve(process.cwd(), "data", "dict");
const DEFAULT_CHUNK_SIZE = 5000;

// CLI argument parsing
interface CliOptions {
  dictionaries: DictionaryName[];
  all: boolean;
  limit?: number;
  chunkSize: number;
  validate: boolean;
  deleteExisting: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    dictionaries: [],
    all: false,
    chunkSize: DEFAULT_CHUNK_SIZE,
    validate: false,
    deleteExisting: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--all") {
      options.all = true;
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
    } else if (!arg.startsWith("--")) {
      // Treat as dictionary name
      if (LEXICON_ALL_DICT.includes(arg as DictionaryName)) {
        options.dictionaries.push(arg as DictionaryName);
      } else {
        console.warn(`Warning: Unknown dictionary '${arg}'. Skipping.`);
      }
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Dictionary Import CLI

Usage: pnpm dict:import [dictionaries...] [options]

Arguments:
  dictionaries        Space-separated list of dictionary names to import
                     Available: ${LEXICON_ALL_DICT.join(", ")}

Options:
  --all               Import all available dictionaries
  --limit=N           Limit number of rows to import (for testing)
  --chunk-size=N      Set bulk insert chunk size (default: ${DEFAULT_CHUNK_SIZE})
  --validate          Enable row data validation
  --delete-existing   Delete existing dictionary data before import
  --verbose, -v       Enable verbose logging
  --help, -h          Show this help message

Examples:
  pnpm dict:import mw ap90              # Import specific dictionaries
  pnpm dict:import --all --limit=1000   # Import all with row limit
  pnpm dict:import mw --validate        # Import with validation
  pnpm dict:import eng2te --chunk-size=2000  # Custom chunk size

Environment:
  SQLITE_DIR          Directory containing SQLite files (default: ./tmp)
  DATABASE_URL        Prisma database connection string
`);
}

function validateSqliteFiles(dictionaries: DictionaryName[]): string[] {
  const missing: string[] = [];

  for (const dict of dictionaries) {
    const sqlitePath = resolve(SQLITE_DIR, `${dict}.sqlite`);
    if (!existsSync(sqlitePath)) {
      missing.push(`${dict}.sqlite`);
    }
  }

  return missing;
}

async function createProgressBar() {
  let lastProgress = 0;

  return (progress: any) => {
    const { dictionary, processed, total, percentage } = progress;

    // Only update every 5% to reduce console spam
    if (percentage >= lastProgress + 5 || percentage === 100) {
      const bar = "█".repeat(Math.floor(percentage / 2));
      const empty = "░".repeat(50 - Math.floor(percentage / 2));

      process.stdout.write(
        `\r${dictionary}: [${bar}${empty}] ${percentage.toFixed(1)}% (${processed}/${total})`,
      );

      if (percentage === 100) {
        console.log(""); // New line after completion
      }

      lastProgress = percentage;
    }
  };
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Determine which dictionaries to import
  let targetDictionaries: DictionaryName[];
  if (options.all) {
    targetDictionaries = [...LEXICON_ALL_DICT];
  } else if (options.dictionaries.length > 0) {
    targetDictionaries = options.dictionaries;
  } else {
    console.error(
      "Error: No dictionaries specified. Use --all or specify dictionary names.",
    );
    console.error('Run "pnpm dict:import --help" for usage information.');
    process.exit(1);
  }

  if (options.verbose) {
    console.log("Configuration:", {
      dictionaries: targetDictionaries,
      chunkSize: options.chunkSize,
      limit: options.limit,
      validate: options.validate,
      deleteExisting: options.deleteExisting,
      sqliteDir: SQLITE_DIR,
    });
  }

  // Validate SQLite files exist
  const missingFiles = validateSqliteFiles(targetDictionaries);
  if (missingFiles.length > 0) {
    console.error("Error: Missing SQLite files:");
    missingFiles.forEach((file) => console.error(`  - ${SQLITE_DIR}/${file}`));
    process.exit(1);
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
      `Starting import for ${targetDictionaries.length} dictionaries...`,
    );

    const startTime = Date.now();
    const progressCallback = await createProgressBar();

    // Build dictionary paths
    const dictionaryPaths = Object.fromEntries(
      targetDictionaries.map((dict) => [
        dict,
        resolve(SQLITE_DIR, `${dict}.sqlite`),
      ]),
    ) as Record<DictionaryName, string>;

    // Import dictionaries
    const results = await importMultipleDictionaries(
      dictionaryPaths,
      targetDb,
      createSqliteDatabase,
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

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("IMPORT SUMMARY");
    console.log("=".repeat(60));

    let totalProcessed = 0;
    let totalErrors = 0;

    results.forEach((result) => {
      const status = result.errors.length > 0 ? "❌" : "✅";
      console.log(
        `${status} ${result.dictionary.padEnd(12)} | ` +
          `${result.processedRows.toString().padStart(8)} words | ` +
          `${result.duration.toString().padStart(6)}ms | ` +
          `${result.errors.length} errors`,
      );

      if (result.errors.length > 0 && options.verbose) {
        result.errors.forEach((error) => {
          console.log(`   Error: ${error}`);
        });
      }

      totalProcessed += result.processedRows;
      totalErrors += result.errors.length;
    });

    console.log("=".repeat(60));
    console.log(`Total: ${totalProcessed} words processed in ${duration}ms`);
    console.log(`Errors: ${totalErrors}`);

    if (totalErrors === 0) {
      console.log("🎉 All dictionaries imported successfully!");
    } else {
      console.log("⚠️  Import completed with errors. Check logs above.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal error during import:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
