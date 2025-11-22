# Quick Start Guide: Dictionary System Enhancements

**Feature**: Dictionary System Enhancements  
**Branch**: `009-dictionary-enhancements`  
**Audience**: Developers integrating with the enhanced dictionary system

## Overview

This guide provides step-by-step instructions for integrating and using the enhanced dictionary features including advanced search, filters, saved searches, view modes, and export functionality.

## Prerequisites

- Next.js 15+ application with App Router
- MongoDB database with existing `dictionary_words` collection
- User authentication system (NextAuth.js recommended)
- TanStack Query v5 for data fetching
- Tailwind CSS for styling

## Installation

### 1. Database Setup

Run Prisma migrations to add new models:

```bash
# Add new models to schema.prisma (SavedSearch, SearchHistory)
pnpm prisma generate
pnpm prisma db push
```

### 2. Environment Variables

Add to `.env.local`:

```bash
# MongoDB connection (should already exist)
DATABASE_URL="mongodb://..."

# Optional: Export storage configuration
EXPORT_STORAGE_PATH="/tmp/dictionary-exports"
EXPORT_URL_EXPIRY=3600  # 1 hour in seconds
```

### 3. Install Dependencies (if needed)

```bash
# Most dependencies should already be installed
# If missing, add:
pnpm add jspdf  # For PDF export
```

## Basic Usage

### 1. Search with Relevance Ranking

```typescript
// app/(app)/dictionary/page.tsx
import { useDictionarySearch } from "@/hooks/use-dictionary-search";

export default function DictionaryPage() {
  const { search, results, isLoading, error } = useDictionarySearch();
  
  const handleSearch = (query: string) => {
    search({
      query,
      filters: { origins: ["mw", "ap90"] },
      sortBy: "relevance"
    });
  };
  
  return (
    <div>
      <input 
        type="text" 
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search dictionary..."
      />
      
      {isLoading && <div>Searching...</div>}
      
      {results && results.map(result => (
        <div key={result.id}>
          <h3 dangerouslySetInnerHTML={{ __html: result.highlightedWord }} />
          <p dangerouslySetInnerHTML={{ __html: result.highlightedDescription }} />
          <span>Relevance: {result.relevanceScore}%</span>
        </div>
      ))}
    </div>
  );
}
```

**Key Points**:
- Use `useDictionarySearch` hook for search state management
- Results include `highlightedWord` and `highlightedDescription` with `<mark>` tags
- Relevance score ranges from 0-100

### 2. Apply Filters

```typescript
import { useDictionaryFilters } from "@/hooks/use-dictionary-filters";

function DictionaryFiltersPanel() {
  const { filters, updateFilter, applyFilters, clearFilters } = useDictionaryFilters();
  
  return (
    <aside className="w-64 border-r p-4">
      <h2>Filters</h2>
      
      {/* Origin filter */}
      <div>
        <label>Dictionaries</label>
        <select 
          multiple 
          value={filters.origins}
          onChange={(e) => updateFilter('origins', Array.from(e.target.selectedOptions, opt => opt.value))}
        >
          <option value="mw">Monier-Williams</option>
          <option value="ap90">Apte</option>
          <option value="eng2te">English-Telugu</option>
        </select>
      </div>
      
      {/* Word length filter */}
      <div>
        <label>Word Length</label>
        <input 
          type="number" 
          placeholder="Min"
          value={filters.wordLengthMin || ''}
          onChange={(e) => updateFilter('wordLengthMin', parseInt(e.target.value))}
        />
        <input 
          type="number" 
          placeholder="Max"
          value={filters.wordLengthMax || ''}
          onChange={(e) => updateFilter('wordLengthMax', parseInt(e.target.value))}
        />
      </div>
      
      {/* Audio filter */}
      <div>
        <label>
          <input 
            type="checkbox"
            checked={filters.hasAudio || false}
            onChange={(e) => updateFilter('hasAudio', e.target.checked)}
          />
          Has Audio
        </label>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button onClick={applyFilters}>Apply Filters</button>
        <button onClick={clearFilters}>Clear All</button>
      </div>
    </aside>
  );
}
```

**Key Points**:
- Filters are not applied until user clicks "Apply" button
- Changes are synced to URL parameters for shareability
- "Clear All" resets filters and updates results immediately

### 3. View Mode Selection

```typescript
import { useViewMode } from "@/hooks/use-view-mode";

function DictionaryResults() {
  const { viewMode, setViewMode } = useViewMode();
  const { results } = useDictionarySearch();
  
  return (
    <div>
      {/* View mode selector */}
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setViewMode('COMPACT')}
          className={viewMode === 'COMPACT' ? 'active' : ''}
        >
          Compact
        </button>
        <button 
          onClick={() => setViewMode('CARD')}
          className={viewMode === 'CARD' ? 'active' : ''}
        >
          Card
        </button>
        <button 
          onClick={() => setViewMode('DETAILED')}
          className={viewMode === 'DETAILED' ? 'active' : ''}
        >
          Detailed
        </button>
      </div>
      
      {/* Render based on view mode */}
      <div className={`results-${viewMode.toLowerCase()}`}>
        {results.map(result => {
          if (viewMode === 'COMPACT') {
            return <CompactResultItem key={result.id} result={result} />;
          } else if (viewMode === 'CARD') {
            return <CardResultItem key={result.id} result={result} />;
          } else {
            return <DetailedResultItem key={result.id} result={result} />;
          }
        })}
      </div>
    </div>
  );
}
```

**Key Points**:
- View mode preference persisted to localStorage
- Each mode shows different levels of detail
- Transitions smoothly with CSS animations

### 4. Saved Searches

```typescript
import { useSavedSearches } from "@/hooks/use-saved-searches";

function SavedSearchManager() {
  const { 
    savedSearches, 
    createSavedSearch, 
    executeSavedSearch, 
    deleteSavedSearch 
  } = useSavedSearches();
  const { currentQuery, currentFilters } = useDictionarySearch();
  
  const handleSave = async () => {
    const name = prompt("Enter a name for this search:");
    if (name) {
      await createSavedSearch({
        name,
        query: currentQuery,
        filters: currentFilters,
        sortBy: "relevance"
      });
    }
  };
  
  return (
    <div>
      <button onClick={handleSave}>Save Current Search</button>
      
      <div className="saved-searches-list">
        <h3>Saved Searches</h3>
        {savedSearches.map(search => (
          <div key={search.id}>
            <button onClick={() => executeSavedSearch(search.id)}>
              {search.name}
            </button>
            <button onClick={() => deleteSavedSearch(search.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Key Points**:
- Authenticated users: Saved to database, syncs across devices
- Anonymous users: Saved to localStorage
- Maximum 50 saved searches per user
- Clicking a saved search executes it immediately

### 5. Export Functionality

```typescript
import { exportDictionaryWords } from "@/app/(app)/dictionary/actions";

function ExportButton() {
  const { currentQuery, currentFilters, results } = useDictionarySearch();
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async (format: "csv" | "json" | "pdf") => {
    setIsExporting(true);
    
    try {
      const response = await exportDictionaryWords({
        format,
        query: currentQuery,
        filters: currentFilters,
        fields: ["word", "phonetic", "description", "origin"],
        maxEntries: 1000
      });
      
      if (response.status === "success") {
        // Trigger download
        window.open(response.data.downloadUrl, '_blank');
        alert(`Export ready: ${response.data.filename}`);
      } else {
        alert(`Export failed: ${response.error}`);
      }
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div>
      <button onClick={() => handleExport("csv")} disabled={isExporting}>
        Export CSV
      </button>
      <button onClick={() => handleExport("json")} disabled={isExporting}>
        Export JSON
      </button>
      <button onClick={() => handleExport("pdf")} disabled={isExporting}>
        Export PDF
      </button>
    </div>
  );
}
```

**Key Points**:
- Requires authentication
- Exports current search results with active filters
- Files auto-deleted after 1 hour
- Supports CSV, JSON, and PDF formats

### 6. Quick Lookup Popup

```typescript
// app/layout.tsx or components/layout/root-layout.tsx
import { QuickLookupPopup } from "@/components/features/dictionary/quick-lookup-popup";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <QuickLookupPopup />
      </body>
    </html>
  );
}
```

**Usage**:
- Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac) from any page
- Type search query in popup
- Results appear inline without page navigation
- Click "Open in full dictionary" to see all results

**Key Points**:
- Global keyboard shortcut works on any page
- Lightweight modal with limited results (top 10)
- Escape key closes popup

### 7. Inline Audio Playback

```typescript
function DictionaryResultWithAudio({ result }) {
  const { play, pause, isPlaying, setSpeed } = useAudioPlayer();
  
  return (
    <div>
      <h3>{result.word[0].value}</h3>
      
      {result.audioUrl && (
        <div className="audio-controls">
          <button onClick={() => isPlaying ? pause() : play(result.audioUrl)}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          <select onChange={(e) => setSpeed(parseFloat(e.target.value))}>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
          </select>
        </div>
      )}
    </div>
  );
}
```

**Key Points**:
- Audio plays inline without page navigation
- Previous audio auto-stops when new audio plays
- Playback speed control (0.5x, 1x, 1.5x)

## Advanced Integration

### Multi-Script Search

```typescript
import sanscript from "@indic-transliteration/sanscript";

function MultiScriptSearchInput() {
  const [query, setQuery] = useState("");
  const [detectedScript, setDetectedScript] = useState("");
  
  const handleSearch = (inputQuery: string) => {
    const script = sanscript.autodetect(inputQuery);
    setDetectedScript(script);
    
    // Search will automatically match all script variations
    search({ query: inputQuery });
  };
  
  return (
    <div>
      <input 
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
      />
      {detectedScript && (
        <span className="text-sm text-gray-500">
          Detected: {detectedScript}
        </span>
      )}
    </div>
  );
}
```

**Supported Scripts**:
- Devanagari (नमस्ते)
- IAST (namaste)
- ITRANS (namaste)
- Telugu (నమస్తే)
- SLP1 (namaste)

**Behavior**: Searching in any script automatically matches entries in all scripts.

### Repository Pattern Usage (for custom features)

```typescript
import { DictionaryRepository } from "@/lib/dictionary/dictionary-repository";
import { db } from "@/lib/db";

// In a server action or API route
const repository = new DictionaryRepository(db);

// Find words with custom query
const words = await repository.findWords({
  query: "नमस्ते",
  filters: { origins: ["mw"] },
  page: 1,
  pageSize: 20
});

// Count matching words
const count = await repository.countWords({
  origins: ["mw"],
  wordLengthMin: 5
});
```

## Common Scenarios

### Scenario 1: Search for Sanskrit Verbs

```typescript
const { search } = useDictionarySearch();

search({
  query: "धातु", // "verb root" in Sanskrit
  filters: {
    origins: ["mw"],
    language: "sa",
    hasAttributes: true  // Verbs usually have grammar attributes
  },
  sortBy: "relevance"
});
```

### Scenario 2: Find Words with Audio

```typescript
search({
  query: "",  // Empty query = all words
  filters: {
    hasAudio: true,
    origins: ["mw"]
  },
  sortBy: "alphabetical"
});
```

### Scenario 3: Export Large Dataset

```typescript
// For exports >1000 entries, use progress tracking
const exportResponse = await exportDictionaryWords({
  format: "csv",
  query: "",
  filters: { origins: ["mw"] },
  maxEntries: 5000
});

if (exportResponse.status === "success" && exportResponse.data.exportId) {
  // Poll for progress
  const interval = setInterval(async () => {
    const progress = await getExportProgress(exportResponse.data.exportId);
    
    if (progress.data.state === "completed") {
      clearInterval(interval);
      window.open(progress.data.downloadUrl, '_blank');
    } else {
      console.log(`Progress: ${progress.data.progress}%`);
    }
  }, 2000);
}
```

## Troubleshooting

### Search returns no results

**Issue**: Search query not matching expected words

**Solution**:
1. Check if full-text index exists: Run `db.dictionary_words.getIndexes()` in MongoDB
2. Verify `phonetic` field is populated for all words
3. Try different script variations (Devanagari, IAST, ITRANS)
4. Clear filters and search again to isolate issue

### Saved searches not syncing across devices

**Issue**: Authenticated user's saved searches don't appear on other devices

**Solution**:
1. Verify user is logged in (`await auth()` returns user)
2. Check `userId` field in `saved_searches` collection
3. Ensure database connection is working (not falling back to localStorage)

### Export fails with "Too many entries" error

**Issue**: Export exceeds 10,000 entry limit

**Solution**:
1. Refine search filters to reduce result count
2. Use multiple exports with different filter combinations
3. Consider paginated exports (export pages 1-10, 11-20, etc.)

### Audio playback not working

**Issue**: Audio play button doesn't start playback

**Solution**:
1. Check browser console for CORS errors
2. Verify `audioUrl` field exists and is accessible
3. Test audio URL directly in browser
4. Ensure audio file format is supported (MP3, OGG, WAV)

### View mode not persisting

**Issue**: View mode resets to CARD on page reload

**Solution**:
1. Check localStorage for `dictionaryViewMode` key
2. Verify `useViewMode` hook is properly initialized
3. Clear browser cache and try again

## Performance Tips

### 1. Debounce Search Input

```typescript
import { useDebouncedCallback } from "@/hooks/use-debounce-callback";

const debouncedSearch = useDebouncedCallback((query: string) => {
  search({ query });
}, 300); // 300ms delay

<input onChange={(e) => debouncedSearch(e.target.value)} />
```

### 2. Virtual Scrolling for Large Results

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualizedResults({ results }) {
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.index} style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`
          }}>
            <ResultItem result={results[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Optimize Re-renders

```typescript
import { memo } from "react";

const ResultItem = memo(({ result }) => {
  return <div>{result.word[0].value}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison: Only re-render if result ID changes
  return prevProps.result.id === nextProps.result.id;
});
```

## Testing

### Unit Test Example

```typescript
import { calculateRelevanceScore } from "@/lib/dictionary/relevance-scoring";

describe("Relevance Scoring", () => {
  it("should give exact match highest score", () => {
    const score = calculateRelevanceScore({
      word: "namaste",
      query: "namaste",
      matchType: "exact"
    });
    
    expect(score).toBeGreaterThan(90);
  });
  
  it("should prioritize prefix match over fuzzy", () => {
    const prefixScore = calculateRelevanceScore({
      word: "namaste",
      query: "nama",
      matchType: "prefix"
    });
    
    const fuzzyScore = calculateRelevanceScore({
      word: "pranama",
      query: "nama",
      matchType: "fuzzy"
    });
    
    expect(prefixScore).toBeGreaterThan(fuzzyScore);
  });
});
```

### Integration Test Example

```typescript
import { searchDictionaryWords } from "@/app/(app)/dictionary/actions";

describe("Dictionary Search Integration", () => {
  it("should return results for valid query", async () => {
    const response = await searchDictionaryWords({
      query: "test",
      page: 1,
      pageSize: 10
    });
    
    expect(response.status).toBe("success");
    expect(response.data.results).toBeDefined();
    expect(response.data.totalCount).toBeGreaterThan(0);
  });
  
  it("should respect origin filter", async () => {
    const response = await searchDictionaryWords({
      query: "test",
      filters: { origins: ["mw"] }
    });
    
    if (response.status === "success") {
      response.data.results.forEach(result => {
        expect(result.origin).toBe("mw");
      });
    }
  });
});
```

## Support & Resources

- **API Reference**: See `contracts/` directory for detailed API specifications
- **Data Models**: See `data-model.md` for entity definitions
- **Technical Decisions**: See `research.md` for architecture rationale
- **Project Conventions**: See root `COPILOT.md` for coding standards

## Migration from Old System

If upgrading from the basic dictionary system:

1. **Data migration**: No changes to `dictionary_words` schema required
2. **Code migration**: Replace direct TanStack Query usage with custom hooks
3. **Component refactoring**: Split container/presentation components
4. **URL parameters**: Update links to include filter parameters
5. **Testing**: Add tests for new service layer functions

## Next Steps

1. Review API contracts in `/contracts` directory
2. Explore data models in `data-model.md`
3. Read technical decisions in `research.md`
4. Run `/speckit.tasks` to generate implementation tasks
5. Start with P0 refactoring (User Story 9) before adding new features
