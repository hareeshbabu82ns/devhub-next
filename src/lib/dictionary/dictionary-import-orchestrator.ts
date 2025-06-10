/**
 * Dictionary Import Orchestrator for DevHub
 *
 * This module orchestrates the complete process of importing dictionary data
 * from SQLite databases to MongoDB/Prisma, with separation of concerns for
 * better testability and maintainability.
 */

import {
  DictionaryName,
  LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP,
  LEXICON_ALL_TABLE_WORD_FIELD_MAP,
} from "./dictionary-constants";
import {
  SqliteRowData,
  TableMetadata,
  ProcessingOptions,
  processDictionaryWordRows,
  validateRowData,
} from "./dictionary-processor";
import {
  DictionaryWordDatabase,
  BulkProcessingOptions,
  saveDictionaryWordsBulk,
  ProgressCallback,
} from "./dictionary-database";

/**
 * SQLite database interface for reading dictionary data
 */
export interface SqliteDatabase {
  /**
   * Execute a query and return results
   */
  query(sql: string): Promise<any[]>;

  /**
   * Get table metadata
   */
  getTableInfo(tableName: string): Promise<{ name: string; type: string }[]>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;
}

/**
 * Import options for dictionary processing
 */
export interface ImportOptions
  extends ProcessingOptions,
    BulkProcessingOptions {
  limitRows?: number;
  validateData?: boolean;
}

/**
 * Import result statistics
 */
export interface ImportResult {
  dictionary: DictionaryName;
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
  duration: number;
}

/**
 * Extract table metadata from SQLite database
 */
export async function extractTableMetadata(
  sqliteDb: SqliteDatabase,
  dictName: DictionaryName,
): Promise<TableMetadata> {
  const tableName = LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP[dictName];
  if (!tableName) {
    throw new Error(`No table mapping found for dictionary: ${dictName}`);
  }

  // Get table structure
  const tableInfo = await sqliteDb.getTableInfo(tableName);
  const columns = tableInfo.map((col) => col.name);
  const columnPositions = Object.fromEntries(
    columns.map((col, index) => [col, index]),
  );

  // Determine field names
  const wordFieldName = LEXICON_ALL_TABLE_WORD_FIELD_MAP[dictName];
  const lnumFieldName = columns.includes("lnum") ? "lnum" : null;
  const orderFieldName = lnumFieldName || wordFieldName;

  return {
    tableName,
    columns,
    columnPositions,
    wordFieldName,
    descFieldName: "", // Will be set by processor
    orderFieldName,
  };
}

/**
 * Read all rows from SQLite table with optional ordering and limiting
 */
export async function readSqliteRows(
  sqliteDb: SqliteDatabase,
  tableMetadata: TableMetadata,
  options: { limitRows?: number } = {},
): Promise<{ rows: SqliteRowData[]; totalCount: number }> {
  const { tableName, orderFieldName } = tableMetadata;
  const { limitRows } = options;

  // Get total count
  const countResult = await sqliteDb.query(
    `SELECT COUNT(*) as count FROM ${tableName}`,
  );
  const totalCount = countResult[0]?.count || 0;

  // Build query with optional limit
  let query = `SELECT * FROM ${tableName}`;
  if (orderFieldName) {
    query += ` ORDER BY ${orderFieldName}`;
  }
  if (limitRows && limitRows > 0) {
    query += ` LIMIT ${limitRows}`;
  }

  // Execute query
  const queryResults = await sqliteDb.query(query);
  // console.log(tableMetadata, queryResults);

  // Convert to row data objects
  const rows: SqliteRowData[] = queryResults.map((row: any) => {
    const rowData: SqliteRowData = {};
    tableMetadata.columns.forEach((col) => {
      rowData[col] = row[col] !== undefined ? row[col] : null;
    });
    return rowData;
  });

  return { rows, totalCount };
}

/**
 * Import dictionary data from SQLite to target database
 */
export async function importDictionaryFromSqlite(
  sqliteDb: SqliteDatabase,
  targetDb: DictionaryWordDatabase,
  dictName: DictionaryName,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const startTime = Date.now();
  const {
    limitRows,
    validateData = false,
    progressCallback,
    ...processingOptions
  } = options;

  let processedRows = 0;
  let validRows = 0;
  let invalidRows = 0;
  const errors: string[] = [];

  try {
    console.log(`Starting import for dictionary: ${dictName}`);

    // Extract table metadata
    const tableMetadata = await extractTableMetadata(sqliteDb, dictName);
    console.log(`Table structure for ${dictName}:`, {
      table: tableMetadata.tableName,
      columns: tableMetadata.columns.length,
      orderField: tableMetadata.orderFieldName,
    });

    // Read all rows from SQLite
    const { rows, totalCount } = await readSqliteRows(sqliteDb, tableMetadata, {
      limitRows,
    });
    console.log(
      `Read ${rows.length} rows from ${dictName} (total: ${totalCount})`,
    );

    // Validate rows if requested
    if (validateData) {
      for (const row of rows) {
        const validation = validateRowData(row, dictName, tableMetadata);
        if (!validation.isValid) {
          errors.push(...validation.errors);
          invalidRows++;
        } else {
          validRows++;
        }
      }
      console.log(
        `Validation complete: ${validRows} valid, ${invalidRows} invalid rows`,
      );
    } else {
      validRows = rows.length;
    }

    // Process rows into dictionary word documents
    const processedWords = processDictionaryWordRows(
      rows,
      dictName,
      tableMetadata,
      processingOptions,
    );

    // Save to target database
    await saveDictionaryWordsBulk(processedWords, targetDb, dictName, {
      ...options,
      progressCallback: progressCallback
        ? (progress) => {
            progressCallback({
              ...progress,
              dictionary: dictName,
            });
          }
        : undefined,
    });

    processedRows = processedWords.length;

    const duration = Date.now() - startTime;
    console.log(
      `Import completed for ${dictName}: ${processedRows} words in ${duration}ms`,
    );

    return {
      dictionary: dictName,
      totalRows: totalCount,
      processedRows,
      validRows,
      invalidRows,
      errors,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Import failed: ${errorMessage}`);

    console.error(`Import failed for ${dictName}:`, error);

    return {
      dictionary: dictName,
      totalRows: 0,
      processedRows,
      validRows,
      invalidRows,
      errors,
      duration,
    };
  }
}

/**
 * Import multiple dictionaries with progress tracking
 */
export async function importMultipleDictionaries(
  dictionaryPaths: Record<DictionaryName, string>,
  targetDb: DictionaryWordDatabase,
  sqliteFactory: (path: string) => Promise<SqliteDatabase>,
  options: ImportOptions = {},
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  const dictionaries = Object.keys(dictionaryPaths) as DictionaryName[];

  let completedDictionaries = 0;
  const totalDictionaries = dictionaries.length;

  for (const dictName of dictionaries) {
    const sqlitePath = dictionaryPaths[dictName];
    let sqliteDb: SqliteDatabase | null = null;

    try {
      console.log(`\n=== Processing dictionary: ${dictName} ===`);

      // Open SQLite database
      sqliteDb = await sqliteFactory(sqlitePath);

      // Import dictionary
      const result = await importDictionaryFromSqlite(
        sqliteDb,
        targetDb,
        dictName,
        {
          ...options,
          progressCallback: options.progressCallback
            ? (progress) => {
                // Enhance progress with overall progress
                const overallProgress = {
                  ...progress,
                  dictionariesCompleted: completedDictionaries,
                  totalDictionaries,
                  overallPercentage: Math.round(
                    ((completedDictionaries + progress.percentage / 100) /
                      totalDictionaries) *
                      100,
                  ),
                };
                options.progressCallback!(overallProgress);
              }
            : undefined,
        },
      );

      results.push(result);
      completedDictionaries++;
    } catch (error) {
      console.error(`Failed to process dictionary ${dictName}:`, error);
      results.push({
        dictionary: dictName,
        totalRows: 0,
        processedRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        duration: 0,
      });
    } finally {
      // Always close SQLite connection
      if (sqliteDb) {
        try {
          await sqliteDb.close();
        } catch (closeError) {
          console.warn(
            `Failed to close SQLite database for ${dictName}:`,
            closeError,
          );
        }
      }
    }
  }

  // Print summary
  console.log("\n=== Import Summary ===");
  let totalProcessed = 0;
  let totalErrors = 0;

  for (const result of results) {
    console.log(
      `${result.dictionary}: ${result.processedRows} words (${result.errors.length} errors)`,
    );
    totalProcessed += result.processedRows;
    totalErrors += result.errors.length;
  }

  console.log(
    `Total: ${totalProcessed} words processed, ${totalErrors} errors`,
  );

  return results;
}
