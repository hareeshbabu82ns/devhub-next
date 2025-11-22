# Saved Searches API Contract

**Feature**: Dictionary System Enhancements  
**API Type**: Next.js Server Actions  
**Authentication**: Optional (localStorage for anonymous, database for authenticated)

## Overview

This contract defines the API for managing saved searches and search history.

## Server Actions

### 1. createSavedSearch

Save a search configuration for quick access.

**Function Signature**:
```typescript
async function createSavedSearch(
  params: CreateSavedSearchParams
): Promise<SavedSearchResponse>
```

**Request Parameters**:
```typescript
interface CreateSavedSearchParams {
  name: string;              // User-provided name (1-100 chars)
  query: string;             // Search query (1-100 chars)
  filters: UserFilter;       // Filter configuration
  sortBy?: string;           // Sort preference
  sortDirection?: "asc" | "desc";
}
```

**Response**:
```typescript
type SavedSearchResponse = 
  | {
      status: "success";
      data: {
        id: string;
        name: string;
        query: string;
        filters: UserFilter;
        createdAt: Date;
        lastUsedAt: Date;
      };
    }
  | {
      status: "error";
      error: string;
    };
```

**Validation Rules** (FR-010, FR-011):
- `name`: Required, 1-100 characters, unique per user
- `query`: Required, 1-100 characters
- `filters`: Must be valid UserFilter object
- Maximum 50 saved searches per user

**Error Cases**:
- Duplicate name: "A saved search with this name already exists"
- Limit exceeded: "Maximum 50 saved searches allowed. Delete old searches to add new ones."
- Invalid name: "Search name must be 1-100 characters"
- Invalid query: "Search query must be 1-100 characters"

**Authentication Behavior**:
- **Authenticated**: Saves to database, syncs across devices
- **Anonymous**: Saves to localStorage (client-side handling)

**Example Usage**:
```typescript
const response = await createSavedSearch({
  name: "Sanskrit Verbs",
  query: "धातु",
  filters: {
    origins: ["mw"],
    language: "sa",
    hasAttributes: true
  },
  sortBy: "relevance"
});

if (response.status === "success") {
  console.log(`Saved search "${response.data.name}" created`);
}
```

### 2. listSavedSearches

Retrieve all saved searches for the current user.

**Function Signature**:
```typescript
async function listSavedSearches(): Promise<SavedSearchListResponse>
```

**Request Parameters**: None (user identified from session)

**Response**:
```typescript
type SavedSearchListResponse = 
  | {
      status: "success";
      data: {
        searches: SavedSearch[];
        total: number;
      };
    }
  | {
      status: "error";
      error: string;
    };

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: UserFilter;
  createdAt: Date;
  lastUsedAt: Date;
}
```

**Sorting**: Results ordered by `lastUsedAt` DESC (most recently used first)

**Performance Requirements** (SC-005):
- Response time: <500ms
- Returns all searches (no pagination needed for max 50)

**Example Usage**:
```typescript
const response = await listSavedSearches();

if (response.status === "success") {
  console.log(`You have ${response.data.total} saved searches`);
  response.data.searches.forEach(search => {
    console.log(`- ${search.name} (last used: ${search.lastUsedAt})`);
  });
}
```

### 3. getSavedSearchById

Retrieve a specific saved search and update its last used timestamp.

**Function Signature**:
```typescript
async function getSavedSearchById(
  searchId: string
): Promise<SavedSearchResponse>
```

**Request Parameters**:
- `searchId`: MongoDB ObjectId (for database) or localStorage key (for anonymous)

**Response**: Same as `SavedSearchResponse` from createSavedSearch

**Side Effect**: Updates `lastUsedAt` timestamp

**Error Cases**:
- Invalid ID: "Invalid saved search ID"
- Not found: "Saved search not found"
- Unauthorized: "You don't have permission to access this saved search"

**Example Usage**:
```typescript
const response = await getSavedSearchById("507f1f77bcf86cd799439011");

if (response.status === "success") {
  // Execute the saved search
  await searchDictionaryWords({
    query: response.data.query,
    filters: response.data.filters
  });
}
```

### 4. updateSavedSearch

Update a saved search's name or configuration.

**Function Signature**:
```typescript
async function updateSavedSearch(
  searchId: string,
  updates: Partial<CreateSavedSearchParams>
): Promise<SavedSearchResponse>
```

**Request Parameters**:
- `searchId`: Saved search ID
- `updates`: Partial update object (name, query, filters, sortBy)

**Response**: Same as `SavedSearchResponse`

**Validation Rules**:
- Can only update own saved searches
- Name uniqueness still enforced
- At least one field must be updated

**Error Cases**:
- Not found: "Saved search not found"
- Duplicate name: "A saved search with this name already exists"
- No updates: "No changes provided"

**Example Usage**:
```typescript
const response = await updateSavedSearch("507f1f77bcf86cd799439011", {
  name: "Sanskrit Verbs (Updated)"
});

if (response.status === "success") {
  console.log("Saved search updated successfully");
}
```

### 5. deleteSavedSearch

Delete a saved search.

**Function Signature**:
```typescript
async function deleteSavedSearch(
  searchId: string
): Promise<DeleteResponse>
```

**Request Parameters**:
- `searchId`: Saved search ID to delete

**Response**:
```typescript
type DeleteResponse = 
  | {
      status: "success";
      data: { deleted: true };
    }
  | {
      status: "error";
      error: string;
    };
```

**Error Cases**:
- Not found: "Saved search not found"
- Unauthorized: "You don't have permission to delete this saved search"

**Example Usage**:
```typescript
const response = await deleteSavedSearch("507f1f77bcf86cd799439011");

if (response.status === "success") {
  console.log("Saved search deleted successfully");
}
```

### 6. getSearchHistory

Retrieve recent search history.

**Function Signature**:
```typescript
async function getSearchHistory(
  limit?: number
): Promise<SearchHistoryResponse>
```

**Request Parameters**:
- `limit`: Number of history entries to return (default: 20, max: 100)

**Response**:
```typescript
type SearchHistoryResponse = 
  | {
      status: "success";
      data: {
        history: SearchHistoryEntry[];
        total: number;
      };
    }
  | {
      status: "error";
      error: string;
    };

interface SearchHistoryEntry {
  id: string;
  query: string;
  filters: UserFilter;
  resultCount: number;
  createdAt: Date;
}
```

**Sorting**: Results ordered by `createdAt` DESC (most recent first)

**Auto-Pruning** (FR-025):
- Keeps last 100 entries per user
- Older entries automatically deleted

**Example Usage**:
```typescript
const response = await getSearchHistory(10);

if (response.status === "success") {
  console.log("Recent searches:");
  response.data.history.forEach(entry => {
    console.log(`- ${entry.query} (${entry.resultCount} results)`);
  });
}
```

### 7. clearSearchHistory

Delete all search history for the current user.

**Function Signature**:
```typescript
async function clearSearchHistory(): Promise<DeleteResponse>
```

**Request Parameters**: None

**Response**: Same as `DeleteResponse`

**Side Effect**: Deletes all SearchHistory records for the user

**Example Usage**:
```typescript
const response = await clearSearchHistory();

if (response.status === "success") {
  console.log("Search history cleared");
}
```

### 8. migrateSavedSearches

Migrate anonymous localStorage saved searches to user account on login.

**Function Signature**:
```typescript
async function migrateSavedSearches(
  localSearches: SavedSearch[]
): Promise<MigrationResponse>
```

**Request Parameters**:
- `localSearches`: Array of saved searches from localStorage

**Response**:
```typescript
type MigrationResponse = 
  | {
      status: "success";
      data: {
        migrated: number;
        skipped: number;
        errors: string[];
      };
    }
  | {
      status: "error";
      error: string;
    };
```

**Behavior** (FR-011b):
- Merges localStorage searches with existing account searches
- Skips duplicates (by name)
- Respects 50-search limit (oldest localStorage searches dropped)
- Preserves `createdAt` and `lastUsedAt` from localStorage

**Error Cases**:
- Authentication required: "You must be logged in to migrate searches"
- Limit exceeded: "Cannot migrate all searches - account limit reached"

**Example Usage**:
```typescript
// On login, client sends localStorage searches
const localSearches = JSON.parse(localStorage.getItem('savedSearches') || '[]');

const response = await migrateSavedSearches(localSearches);

if (response.status === "success") {
  console.log(`Migrated ${response.data.migrated} searches`);
  if (response.data.skipped > 0) {
    console.log(`Skipped ${response.data.skipped} duplicates`);
  }
  // Clear localStorage after successful migration
  localStorage.removeItem('savedSearches');
}
```

## Authentication & Authorization

- **Anonymous users**: Can create/read/update/delete in localStorage only
- **Authenticated users**: Full CRUD access to own saved searches in database
- **Cross-device sync**: Automatic for authenticated users via database storage

## Rate Limiting

- **Create/Update/Delete**: 30 requests/minute per user
- **List/Get**: 100 requests/minute per user
- **Migration**: 5 requests/hour (prevents abuse)

## Data Privacy

- Saved searches are private to each user
- No sharing or public saved searches (future enhancement)
- Search history is not shared with other users

## Testing Requirements

### Unit Tests

- Validation: Name length, query length, filter structure
- Limit enforcement: 50 saved searches maximum
- Migration logic: Duplicate detection, oldest-first dropping

### Integration Tests

1. **CRUD flow**: Create, list, update, delete saved search
2. **Authentication boundary**: Anonymous vs authenticated behavior
3. **Migration**: localStorage to database transition on login
4. **Auto-pruning**: History limited to 100 entries
5. **Cross-device sync**: Saved search appears on second device after login

### Contract Tests

- Response structure matches TypeScript interface
- Discriminated union status field correct
- All error cases return descriptive messages
- Timestamps are valid ISO 8601 dates
