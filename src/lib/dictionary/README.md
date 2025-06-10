# Dictionary Processing System

This module provides a modular, testable system for importing dictionary data from SQLite databases to MongoDB or Prisma. It separates concerns to enable easy testing without requiring database connections.

## Architecture

The system is divided into several modules:

### Core Modules

1. **`dictionary-constants.ts`** - Constants and mappings for dictionary processing
2. **`dictionary-processor.ts`** - Core processing logic for converting SQLite rows to dictionary documents
3. **`dictionary-database.ts`** - Database abstraction layer with multiple implementations
4. **`dictionary-import-orchestrator.ts`** - High-level orchestration of the import process
5. **`sqlite-database.ts`** - SQLite database implementation

### Key Features

- **Testable**: Core processing logic is separated from database operations
- **Modular**: Each component has a specific responsibility
- **Multiple Database Support**: MongoDB, Prisma, and in-memory implementations
- **Progress Tracking**: Real-time progress reporting during imports
- **Error Handling**: Comprehensive error handling and validation
- **Transliteration**: Automatic Sanskrit/Telugu transliteration support
- **Chunked Processing**: Memory-efficient bulk operations

## Installation

Add the required dependency for SQLite support:

```bash
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3
```

## Usage Examples

### Basic Single Dictionary Import

```typescript
import { importDictionaryFromSqlite } from "./dictionary-import-orchestrator";
import { createSqliteDatabase } from "./sqlite-database";
import { InMemoryDictionaryWordDatabase } from "./dictionary-database";

// Create target database (use PrismaDictionaryWordDatabase in production)
const targetDb = new InMemoryDictionaryWordDatabase();

// Import dictionary
const sqliteDb = await createSqliteDatabase("./tmp/mw.sqlite");
const result = await importDictionaryFromSqlite(sqliteDb, targetDb, "mw", {
  chunkSize: 1000,
  progressCallback: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  },
});

await sqliteDb.close();
```

### Multiple Dictionaries Import

```typescript
import { importMultipleDictionaries } from "./dictionary-import-orchestrator";

const dictionaryPaths = {
  mw: "./tmp/mw.sqlite",
  ap90: "./tmp/ap90.sqlite",
  eng2te: "./tmp/eng2te.sqlite",
};

const results = await importMultipleDictionaries(
  dictionaryPaths,
  targetDb,
  createSqliteDatabase,
  {
    chunkSize: 1000,
    progressCallback: (progress) => {
      console.log(`${progress.dictionary}: ${progress.percentage}%`);
    },
  },
);
```

### Production Usage with Prisma

```typescript
import { PrismaDictionaryWordDatabase } from "./dictionary-database";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const targetDb = new PrismaDictionaryWordDatabase(prisma);

const result = await importDictionaryFromSqlite(sqliteDb, targetDb, "mw", {
  deleteExisting: true,
  chunkSize: 5000,
  includeHtmlProcessing: true,
});
```

## Testing

The modular design enables comprehensive testing without database dependencies:

```typescript
import { processDictionaryWordRow } from "./dictionary-processor";
import { InMemoryDictionaryWordDatabase } from "./dictionary-database";

// Test processing logic
const mockRowData = {
  key: "test_word",
  data: "test description",
  lnum: 1,
};

const result = processDictionaryWordRow(
  mockRowData,
  "mw",
  1,
  mockTableMetadata,
);

expect(result.word).toHaveLength(5); // 5 language variants
expect(result.origin).toBe("MW");
```

Run tests:

```bash
pnpm test src/lib/dictionary/__tests__/
```

## Supported Dictionaries

The system supports all dictionaries from the original Python implementation:

### Sanskrit Dictionaries

- Monier-Williams (MW)
- Apte (AP90)
- Goldstücker (GST)
- Benfey (BEN)
- And many more...

### English-Telugu Dictionaries

- ENG2TEL

### Sanskrit-Sanskrit Dictionaries

- Dhatu Pata

## Configuration

Dictionary processing behavior is controlled through constants in `dictionary-constants.ts`:

```typescript
// Add new dictionary support
export const LEXICON_ALL_DICT = [
  // ... existing dictionaries
  "new_dict",
] as const;

// Configure field mappings
export const LEXICON_ALL_TABLE_WORD_FIELD_MAP = {
  // ... existing mappings
  new_dict: "word_field_name",
};
```

## Performance Considerations

- **Chunked Processing**: Large datasets are processed in configurable chunks
- **Memory Management**: Avoids loading entire databases into memory
- **Progress Tracking**: Real-time feedback for long-running operations
- **Connection Pooling**: SQLite connections are properly managed

## Error Handling

The system provides comprehensive error handling:

- **Validation**: Row data validation before processing
- **Connection Errors**: Graceful handling of database connection issues
- **Processing Errors**: Detailed error reporting with context
- **Partial Failures**: Continue processing other dictionaries if one fails

## API Reference

### Core Functions

#### `processDictionaryWordRow(rowData, dictName, wordIndex, tableMetadata, options?)`

Process a single SQLite row into a dictionary word document.

#### `importDictionaryFromSqlite(sqliteDb, targetDb, dictName, options?)`

Import a complete dictionary from SQLite to target database.

#### `importMultipleDictionaries(dictionaryPaths, targetDb, sqliteFactory, options?)`

Import multiple dictionaries with progress tracking.

### Database Implementations

#### `InMemoryDictionaryWordDatabase`

In-memory implementation for testing.

#### `PrismaDictionaryWordDatabase`

Prisma implementation for production use with existing schema.

#### `MongoDictionaryWordDatabase`

MongoDB implementation for direct MongoDB usage.

### Options

```typescript
interface ImportOptions {
  chunkSize?: number; // Bulk insert chunk size (default: 5000)
  limitRows?: number; // Limit rows for testing
  validateData?: boolean; // Enable row validation
  deleteExisting?: boolean; // Delete existing data before import
  includeHtmlProcessing?: boolean; // Enable HTML to markdown conversion
  progressCallback?: (progress) => void; // Progress tracking
}
```

## Migration from Python

The JavaScript implementation maintains compatibility with the Python version while providing improved:

- **Type Safety**: Full TypeScript support
- **Testability**: Modular design enables unit testing
- **Performance**: Optimized chunked processing
- **Flexibility**: Multiple database backend support
- **Error Handling**: Better error reporting and recovery

## Contributing

When adding new dictionary support:

1. Update `dictionary-constants.ts` with new mappings
2. Add tests in `__tests__/dictionary-processor.test.ts`
3. Update this README with new dictionary information
4. Ensure transliteration rules are correct for the dictionary type
