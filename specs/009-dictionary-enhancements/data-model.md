# Data Model: Dictionary System Enhancements

**Feature**: Dictionary System Enhancements  
**Branch**: `009-dictionary-enhancements`  
**Date**: 2025-11-15

## Overview

This document defines the data models, entity relationships, and database schema changes required for the dictionary enhancement feature.

## Existing Entities (No Changes)

### DictionaryWord

Existing entity from the current dictionary system. No schema changes required.

```prisma
model DictionaryWord {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  origin      String   // Dictionary source: "mw", "ap90", "eng2te", etc.
  wordIndex   Int      // Sequential index within origin
  word        LanguageValueType[]  // Multilingual word representations
  phonetic    String   // Phonetic transcription (searchable)
  description LanguageValueType[]  // Multilingual descriptions/meanings
  attributes  AttributeValueType[] // Optional metadata (grammar, etymology, etc.)
  sourceData  Json?    // Raw source data for reference
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([wordIndex, origin])
  @@index([origin, wordIndex])
  @@fulltext([phonetic, word])
  @@map("dictionary_words")
}
```

**Fields**:
- `id`: MongoDB ObjectId (primary key)
- `origin`: Dictionary source identifier (e.g., "mw" for Monier-Williams)
- `wordIndex`: Sequential number within dictionary for pagination
- `word`: Array of {language, value} objects (supports Devanagari, IAST, Telugu, etc.)
- `phonetic`: Searchable phonetic representation (used in full-text search)
- `description`: Array of {language, value} for meanings/definitions
- `attributes`: Array of {key, value} for grammar info, part of speech, etc.
- `sourceData`: Raw import data (preserved for debugging)

**Relationships**: None (standalone entity)

**Validation Rules** (FR-002, FR-002a):
- `origin` must be non-empty string
- `wordIndex` must be positive integer
- `word` array must have at least one entry
- `phonetic` must be non-empty string
- `description` array must have at least one entry

**State Transitions**: None (static dictionary data)

**Indexes**:
- Primary: `_id` (ObjectId)
- Unique: `[wordIndex, origin]` - ensures no duplicates within dictionary
- Compound: `[origin, wordIndex]` - pagination queries by dictionary
- Full-text: `[phonetic, word]` - enables full-text search

## New Entities

### SavedSearch

Stores user's saved search queries for quick access.

```prisma
model SavedSearch {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  userId      String?  @db.ObjectId  // Null for anonymous users
  userRel     User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  name        String   // User-provided name for the search
  query       String   // Search query text
  filters     Json     // Serialized filter configuration
  sortOrder   String   // Sort preference (relevance, alphabetical, etc.)
  
  storageType String   @default("database") // "database" or "localStorage"
  
  createdAt   DateTime @default(now())
  lastUsedAt  DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, lastUsedAt])
  @@map("saved_searches")
}
```

**Fields**:
- `id`: MongoDB ObjectId (primary key)
- `userId`: Reference to User (nullable for anonymous searches)
- `name`: Custom name provided by user (e.g., "Sanskrit Verbs", "Common Greetings")
- `query`: The actual search query string (e.g., "नमस्ते")
- `filters`: JSON object containing filter state (origin[], language, wordLength, etc.)
- `sortOrder`: How results should be sorted (relevance, alphabetical)
- `storageType`: Where the search is stored (used for migration tracking)
- `lastUsedAt`: Updated each time search is executed (for MRU sorting)

**Relationships**:
- Many-to-one with User (one user has many saved searches)
- Cascade delete: If user deleted, their saved searches are deleted

**Validation Rules** (FR-010, FR-011):
- `name` must be 1-100 characters
- `query` must be non-empty string
- `filters` must be valid JSON matching FilterSchema
- Maximum 50 saved searches per user (enforced in service layer)
- Anonymous users limited to localStorage (no database records with userId=null)

**State Transitions**:
- Created → Active (when first saved)
- Active → Updated (when renamed or filter modified)
- Active → Deleted (when user removes it)

**Indexes**:
- Compound: `[userId, lastUsedAt]` - efficiently retrieve user's recent searches

### SearchHistory

Tracks recent search queries for auto-suggest and history display.

```prisma
model SearchHistory {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  userId     String?  @db.ObjectId  // Null for anonymous users
  userRel    User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  query      String   // Search query text
  filters    Json     // Filters applied during search
  resultCount Int     // Number of results returned
  
  sessionId  String   // Browser session identifier
  
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@index([sessionId, createdAt])
  @@map("search_history")
}
```

**Fields**:
- `id`: MongoDB ObjectId (primary key)
- `userId`: Reference to User (nullable for anonymous)
- `query`: Search query that was executed
- `filters`: JSON snapshot of active filters during search
- `resultCount`: How many results the search returned (analytics)
- `sessionId`: Browser session ID for anonymous user tracking
- `createdAt`: Timestamp for ordering history

**Relationships**:
- Many-to-one with User
- Cascade delete: If user deleted, their history is deleted

**Validation Rules** (FR-012, FR-025):
- `query` must be non-empty string
- `resultCount` must be non-negative integer
- Auto-pruning: Keep only last 100 entries per user (service layer)
- Anonymous history expires after 30 days

**State Transitions**:
- Created → Active (when search executed)
- Active → Deleted (when auto-pruned or user clears history)

**Indexes**:
- Compound: `[userId, createdAt]` - retrieve user's recent searches chronologically
- Compound: `[sessionId, createdAt]` - retrieve anonymous user's history

### UserPreferences

Extended user preferences for dictionary viewing options.

**Note**: This extends the existing User model rather than creating a new entity.

```prisma
model User {
  // ... existing fields ...
  
  dictionaryViewMode  String?  @default("CARD")  // "COMPACT" | "CARD" | "DETAILED"
  dictionaryPageSize  Int?     @default(20)      // Results per page
  
  savedSearches       SavedSearch[]
  searchHistory       SearchHistory[]
}
```

**New Fields**:
- `dictionaryViewMode`: User's preferred view layout
- `dictionaryPageSize`: How many results to show per page

**Validation Rules** (FR-026):
- `dictionaryViewMode` must be one of: COMPACT, CARD, DETAILED
- `dictionaryPageSize` must be 10, 20, 50, or 100

## Virtual Entities (Client-Side Only)

### SearchResult

Extended DictionaryWord with computed fields for display.

```typescript
interface SearchResult extends DictionaryWord {
  relevanceScore: number;        // 0-100, computed by search algorithm
  matchType: "exact" | "prefix" | "fuzzy" | "phonetic";
  highlightedWord: string;       // Word with <mark> tags for highlighting
  highlightedDescription: string; // Description with <mark> tags
  searchMetadata: {
    queryLanguage: string;       // Detected script of search query
    matchedLanguage: string;     // Which word[] entry matched
    scoreBreakdown: {            // Transparency for relevance
      textScore: number;         // MongoDB textScore
      prefixBonus: number;       // Prefix match bonus
      exactBonus: number;        // Exact match bonus
    };
  };
}
```

**Not Stored**: This is a runtime transformation of DictionaryWord for display purposes.

**Derivation** (FR-001, FR-027):
- `relevanceScore` = textScore (40%) + prefixBonus (30%) + exactBonus (30%)
- `matchType` determined by string comparison logic
- Highlighting applied in client-side React component

### UserFilter

Filter configuration object (not persisted as separate entity).

```typescript
interface UserFilter {
  origins: string[];           // ["mw", "ap90", "eng2te"]
  language: string | null;     // "sa", "en", "te", or null for all
  wordLengthMin: number | null; // Minimum character count
  wordLengthMax: number | null; // Maximum character count
  hasAudio: boolean | null;    // Filter for entries with audio files
  hasAttributes: boolean | null; // Filter for entries with attributes
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  sortBy: "relevance" | "alphabetical" | "wordLength";
  sortDirection: "asc" | "desc";
}
```

**Storage**:
- Serialized to JSON in SavedSearch.filters
- Serialized to URL query parameters for shareability
- Not a separate database entity

**Validation Rules** (FR-004, FR-005, FR-023):
- `origins` must be array of valid dictionary codes
- `wordLengthMin` must be ≤ `wordLengthMax` if both specified
- Date range `start` must be ≤ `end` if both specified
- Contradictory filters auto-resolved (e.g., multiple origins use OR logic)

### ExportConfiguration

Export operation parameters (not persisted).

```typescript
interface ExportConfiguration {
  format: "csv" | "json" | "pdf";
  fields: string[];            // Selected fields to include
  filters: UserFilter;         // Active filters at time of export
  totalEntryCount: number;     // Total entries matching filters
  filename: string;            // Generated filename with timestamp
  includeMetadata: boolean;    // Include sourceData in export
}
```

**Not Stored**: Created on-demand during export operation.

**Filename Generation** (FR-013a, FR-013b):
```typescript
function generateExportFilename(config: ExportConfiguration): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filterCodes = config.filters.origins.join('-');
  const lengthFilter = config.filters.wordLengthMin 
    ? `-len${config.filters.wordLengthMin}-${config.filters.wordLengthMax}`
    : '';
  
  let filename = `dictionary-export-${timestamp}-${filterCodes}${lengthFilter}`;
  
  // Truncate to 200 chars max (leaving room for extension)
  if (filename.length > 200) {
    filename = filename.substring(0, 197) + '...';
  }
  
  return `${filename}.${config.format}`;
}
```

## Entity Relationship Diagram

```
┌─────────────┐
│    User     │
├─────────────┤
│ id          │──┐
│ email       │  │
│ role        │  │
│ ...         │  │
│ viewMode    │  │ (1)
│ pageSize    │  │
└─────────────┘  │
                 │
                 │ has many
                 │
       ┌─────────┴──────────┐
       │                    │
       ▼                    ▼
┌──────────────┐    ┌──────────────┐
│ SavedSearch  │    │SearchHistory │
├──────────────┤    ├──────────────┤
│ id           │    │ id           │
│ userId       │    │ userId       │
│ name         │    │ query        │
│ query        │    │ filters      │
│ filters      │    │ resultCount  │
│ lastUsedAt   │    │ sessionId    │
└──────────────┘    │ createdAt    │
                    └──────────────┘

┌──────────────────┐
│ DictionaryWord   │ (standalone, no FK relationships)
├──────────────────┤
│ id               │
│ origin           │
│ wordIndex        │
│ word[]           │
│ phonetic         │
│ description[]    │
│ attributes[]     │
│ sourceData       │
└──────────────────┘
```

## Database Migration

### Step 1: Add SavedSearch Model

```sql
-- MongoDB equivalent (Prisma handles via migration)
db.createCollection("saved_searches")
db.saved_searches.createIndex({ userId: 1, lastUsedAt: -1 })
```

### Step 2: Add SearchHistory Model

```sql
db.createCollection("search_history")
db.search_history.createIndex({ userId: 1, createdAt: -1 })
db.search_history.createIndex({ sessionId: 1, createdAt: -1 })
```

### Step 3: Extend User Model

```sql
-- MongoDB: No explicit migration needed, fields added dynamically
-- Prisma will handle schema update
```

### Step 4: Add Full-Text Index (if not exists)

```sql
db.dictionary_words.createIndex(
  { phonetic: "text", word: "text" },
  { name: "dictionary_fulltext_index" }
)
```

## Validation Rules Reference

### FR-001: Relevance Scoring
- SearchResult.relevanceScore: 0-100 (float)
- Computed from: textScore + prefixBonus + exactBonus

### FR-004: Filter Options
- UserFilter.origins: Array of valid dictionary codes
- UserFilter.wordLengthMin/Max: Positive integers, min ≤ max

### FR-010, FR-011: Saved Searches
- SavedSearch.name: 1-100 characters
- Maximum 50 per user (service layer enforcement)
- Database storage for authenticated, localStorage for anonymous

### FR-012, FR-025: Search History
- Last 100 entries per user (auto-pruning)
- Anonymous history: 30-day expiration

### FR-013a, FR-013b: Export Filenames
- Pattern: dictionary-export-{YYYYMMDD-HHMMSS}-{filter-codes}.{ext}
- Max 255 characters total, truncate filter codes if needed

## Performance Considerations

### Query Optimization

**Filtered Search with Pagination**:
```typescript
// Efficient compound query
db.dictionaryWord.findMany({
  where: {
    AND: [
      { origin: { in: ["mw", "ap90"] } },
      { $text: { $search: query } }
    ]
  },
  orderBy: { _relevance: { fields: ["word", "phonetic"], search: query, sort: "desc" } },
  skip: page * pageSize,
  take: pageSize
});
```

**Saved Searches Retrieval**:
```typescript
// Index-optimized user searches
db.savedSearch.findMany({
  where: { userId },
  orderBy: { lastUsedAt: "desc" },
  take: 50
});
```

### Caching Strategy

- **DictionaryWord**: Cache full-text search results (5-minute TTL)
- **SavedSearch**: No caching (real-time updates needed)
- **SearchHistory**: Cache user's last 20 searches (client-side, session storage)

## Data Integrity

### Constraints

- **SavedSearch**: ON DELETE CASCADE with User (user deleted → searches deleted)
- **SearchHistory**: ON DELETE CASCADE with User
- **Unique constraint**: SavedSearch [userId, name] to prevent duplicate names per user

### Backup Requirements

- **DictionaryWord**: Critical data, daily backups
- **SavedSearch**: Important for UX, daily backups
- **SearchHistory**: Analytics only, 7-day retention, weekly backups

## Testing Considerations

### Unit Test Scenarios

1. **SavedSearch validation**: Test max limit enforcement, name length validation
2. **Filter serialization**: JSON round-trip, URL encoding/decoding
3. **Relevance scoring**: Verify score calculation algorithm
4. **Export filename**: Test truncation, special character handling

### Integration Test Scenarios

1. **Search with filters**: Multi-origin search with word length filter
2. **Saved search CRUD**: Create, list, update, delete flow
3. **Anonymous to authenticated**: localStorage migration on login
4. **History pruning**: Verify auto-deletion of old entries

## References

- Prisma Schema: `/prisma/schema.prisma`
- Existing DictionaryWord implementation: `/src/lib/dictionary/`
- Multilingual types: `/src/lib/types.ts`
