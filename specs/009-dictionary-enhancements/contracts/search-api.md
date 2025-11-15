# Search API Contract

**Feature**: Dictionary System Enhancements  
**API Type**: Next.js Server Actions  
**Authentication**: Optional (enhanced features for authenticated users)

## Overview

This contract defines the search-related API endpoints for the enhanced dictionary system.

## Server Actions

### 1. searchDictionaryWords

Advanced dictionary search with relevance scoring and multi-script support.

**Function Signature**:
```typescript
async function searchDictionaryWords(
  params: SearchParams
): Promise<SearchResponse>
```

**Request Parameters**:
```typescript
interface SearchParams {
  query: string;              // Search query (required, 1-100 chars)
  page?: number;              // Page number (default: 1, min: 1)
  pageSize?: number;          // Results per page (default: 20, max: 100)
  filters?: {
    origins?: string[];       // Dictionary sources (e.g., ["mw", "ap90"])
    language?: string;        // Target language filter ("sa", "en", "te")
    wordLengthMin?: number;   // Minimum word length (chars)
    wordLengthMax?: number;   // Maximum word length (chars)
    hasAudio?: boolean;       // Filter for audio availability
    hasAttributes?: boolean;  // Filter for attribute presence
  };
  sortBy?: "relevance" | "alphabetical" | "wordLength";
  sortDirection?: "asc" | "desc";
}
```

**Response**:
```typescript
type SearchResponse = 
  | {
      status: "success";
      data: {
        results: SearchResult[];
        totalCount: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
        queryMetadata: {
          executionTime: number;  // milliseconds
          detectedScript: string; // "devanagari", "iast", etc.
        };
      };
    }
  | {
      status: "error";
      error: string;
    };

interface SearchResult {
  id: string;
  origin: string;
  wordIndex: number;
  word: LanguageValue[];
  phonetic: string;
  description: LanguageValue[];
  attributes: AttributeValue[];
  relevanceScore: number;       // 0-100
  matchType: "exact" | "prefix" | "fuzzy" | "phonetic";
  highlightedWord: string;      // HTML with <mark> tags
  highlightedDescription: string;
}
```

**Validation Rules** (FR-001, FR-003, FR-024):
- `query`: Required, non-empty, ≤100 chars, auto-escaped for regex
- `page`: Must be ≥1
- `pageSize`: Must be between 1 and 100
- `filters.origins`: Must be array of valid dictionary codes
- `filters.wordLengthMin` ≤ `filters.wordLengthMax` if both specified

**Error Cases**:
- Invalid query: "Search query must be 1-100 characters"
- Invalid page: "Page must be a positive integer"
- Invalid filters: "Invalid filter configuration: [specific issue]"
- Database error: "Search failed: [error details]"

**Performance Requirements** (SC-001):
- Execution time: <800ms for 100k+ word databases
- Caching: 5-minute TTL for identical queries

**Example Usage**:
```typescript
const response = await searchDictionaryWords({
  query: "नमस्ते",
  page: 1,
  pageSize: 20,
  filters: {
    origins: ["mw", "ap90"],
    language: "sa"
  },
  sortBy: "relevance"
});

if (response.status === "success") {
  console.log(`Found ${response.data.totalCount} results`);
  response.data.results.forEach(result => {
    console.log(`${result.word[0].value} - Score: ${result.relevanceScore}`);
  });
}
```

### 2. getWordById

Retrieve a single dictionary word by ID for detail view.

**Function Signature**:
```typescript
async function getWordById(
  wordId: string
): Promise<WordDetailResponse>
```

**Request Parameters**:
- `wordId`: MongoDB ObjectId string (required)

**Response**:
```typescript
type WordDetailResponse = 
  | {
      status: "success";
      data: DictionaryWord & {
        relatedWords?: RelatedWord[];  // Similar words from same dictionary
        audioUrl?: string;             // Audio file URL if available
      };
    }
  | {
      status: "error";
      error: string;
    };

interface RelatedWord {
  id: string;
  word: LanguageValue[];
  relevanceReason: "similar-phonetic" | "same-root" | "related-meaning";
}
```

**Error Cases**:
- Invalid ID: "Invalid word ID format"
- Not found: "Word not found"
- Database error: "Failed to retrieve word"

**Example Usage**:
```typescript
const response = await getWordById("507f1f77bcf86cd799439011");

if (response.status === "success") {
  console.log(response.data.word[0].value);
  if (response.data.audioUrl) {
    playAudio(response.data.audioUrl);
  }
}
```

### 3. getSearchSuggestions

Auto-suggest search queries based on partial input.

**Function Signature**:
```typescript
async function getSearchSuggestions(
  partialQuery: string,
  limit?: number
): Promise<SuggestionsResponse>
```

**Request Parameters**:
- `partialQuery`: Partial search term (min 2 chars)
- `limit`: Max suggestions to return (default: 10, max: 20)

**Response**:
```typescript
type SuggestionsResponse = 
  | {
      status: "success";
      data: {
        suggestions: Suggestion[];
      };
    }
  | {
      status: "error";
      error: string;
    };

interface Suggestion {
  text: string;              // Suggested query text
  source: "history" | "popular" | "dictionary";
  frequency?: number;        // How often searched (for popular)
  lastUsed?: Date;          // When last searched (for history)
}
```

**Validation Rules**:
- `partialQuery`: Must be ≥2 characters
- `limit`: Must be between 1 and 20

**Performance Requirements**:
- Response time: <200ms
- Debounced client-side to 300ms

**Example Usage**:
```typescript
const response = await getSearchSuggestions("nam", 5);

if (response.status === "success") {
  response.data.suggestions.forEach(s => {
    console.log(`Suggestion: ${s.text} (from ${s.source})`);
  });
}
```

## Rate Limiting

- **Authenticated users**: 100 requests/minute
- **Anonymous users**: 30 requests/minute
- **Exceeded**: Return `{status: "error", error: "Rate limit exceeded. Try again in X seconds"}`

## Caching Strategy

- Search results: 5-minute TTL with query+filters hash as key
- Word details: 1-hour TTL with wordId as key
- Suggestions: No caching (real-time history + popular queries)

## Accessibility

- All responses include `aria-label` suggestions for screen readers
- Search results include result count for announcement: "Found X results for [query]"

## Testing Requirements

### Unit Tests

- Input validation for all parameters
- Relevance scoring algorithm correctness
- Multi-script query normalization
- Error handling for edge cases

### Integration Tests

1. **Basic search**: Query returns expected results
2. **Filtered search**: Origins filter correctly limits results
3. **Pagination**: Correct page boundaries, hasMore flag accuracy
4. **Multi-script**: Devanagari query matches IAST entries
5. **Performance**: Search completes within 800ms for large datasets

### Contract Tests

- Response structure matches TypeScript interface
- All required fields present
- Discriminated union status field correct
- Error messages are descriptive and actionable
