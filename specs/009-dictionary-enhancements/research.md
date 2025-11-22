# Research: Dictionary System Enhancements

**Feature**: Dictionary System Enhancements  
**Branch**: `009-dictionary-enhancements`  
**Date**: 2025-11-15  
**Status**: Complete

## Overview

This document captures technical research and decision-making for enhancing the existing dictionary system with advanced search, filtering, viewing modes, and architecture refactoring.

## Technical Decisions

### 1. Relevance Scoring Algorithm

**Decision**: MongoDB full-text search with $text operator and $meta: "textScore"

**Rationale**:
- Native MongoDB support for full-text indexing on text fields
- Built-in relevance scoring (textScore) provides baseline ranking
- Can combine with custom scoring factors (prefix match bonus, script match bonus)
- Performance: Sub-second search for 100k+ documents with proper indexes
- Already using MongoDB + Prisma, no additional dependencies

**Alternatives Considered**:
- **Elasticsearch**: Rejected - adds operational complexity, separate service to maintain
- **Algolia**: Rejected - external service with cost implications, vendor lock-in
- **Client-side search (Fuse.js)**: Rejected - cannot scale to 100k+ entries, poor mobile performance

**Implementation Approach**:
```typescript
// Composite scoring: textScore (40%) + prefix match (30%) + exact match (30%)
const pipeline = [
  { $match: { $text: { $search: query } } },
  { $addFields: { 
      textScore: { $meta: "textScore" },
      prefixBonus: { $cond: [{ $regexMatch: { input: "$word", regex: `^${query}` } }, 30, 0] },
      exactBonus: { $cond: [{ $eq: ["$word", query] }, 30, 0] }
  }},
  { $addFields: { relevanceScore: { $add: ["$textScore", "$prefixBonus", "$exactBonus"] } }},
  { $sort: { relevanceScore: -1 } }
];
```

### 2. Multi-Script Search Normalization

**Decision**: @indic-transliteration/sanscript library for script conversion

**Rationale**:
- Already in use in the project (confirmed in package.json)
- Supports: Devanagari, Telugu, IAST, ITRANS, SLP1 schemes
- Battle-tested for Sanskrit/Telugu transliteration
- Lightweight, client and server-side compatible
- Preserves diacritic information when needed

**Alternatives Considered**:
- **Aksharamukha API**: Rejected - external service, network latency
- **Custom transliteration tables**: Rejected - reinventing the wheel, maintenance burden

**Implementation Approach**:
```typescript
import sanscript from "@indic-transliteration/sanscript";

function normalizeSearchQuery(query: string): string[] {
  const schemes = ["devanagari", "iast", "itrans", "telugu"];
  const variations = schemes.map(scheme => 
    sanscript.t(query, sanscript.autodetect(query), scheme)
  );
  return [...new Set(variations)]; // Deduplicate
}
```

### 3. Text Highlighting with Word Boundaries

**Decision**: Custom React component with regex-based word boundary detection

**Rationale**:
- Need to respect grapheme clusters (conjuncts, ligatures) in Devanagari/Telugu
- Cannot use simple character-level highlighting
- Unicode word boundary detection via `\b` or custom regex
- React component for performance (memoization, virtual scrolling)

**Alternatives Considered**:
- **mark.js library**: Rejected - doesn't handle Indic scripts properly
- **Browser native find**: Rejected - no styling control, accessibility issues

**Implementation Approach**:
```typescript
// Use Unicode-aware word boundary detection
const wordBoundaryRegex = new RegExp(`(\\b${escapeRegex(searchTerm)}\\b)`, 'gi');
const parts = text.split(wordBoundaryRegex);

return parts.map((part, i) => 
  wordBoundaryRegex.test(part) 
    ? <mark key={i} className="bg-yellow-200">{part}</mark>
    : part
);
```

### 4. Repository Pattern Architecture

**Decision**: Abstract repository layer with Prisma-specific implementation

**Rationale**:
- Separates data access from business logic (testability)
- Enables future database migrations without service layer changes
- Follows project's custom Prisma client path (@/app/generated/prisma)
- Supports dependency injection for testing (mock repositories)

**Alternatives Considered**:
- **Active Record pattern**: Rejected - tight coupling between models and database
- **Direct Prisma usage in services**: Rejected - violates separation of concerns

**Implementation Approach**:
```typescript
// Interface for repository (framework-agnostic)
interface IDictionaryRepository {
  findWords(query: SearchQuery): Promise<DictionaryWord[]>;
  countWords(filters: WordFilters): Promise<number>;
  saveSearch(search: SavedSearch): Promise<void>;
}

// Prisma-specific implementation
class PrismaDictionaryRepository implements IDictionaryRepository {
  constructor(private db: PrismaClient) {}
  
  async findWords(query: SearchQuery): Promise<DictionaryWord[]> {
    return this.db.dictionaryWord.findMany({ /* ... */ });
  }
}
```

### 5. Filter State Management

**Decision**: Custom hook (use-dictionary-filters) with URL parameter sync

**Rationale**:
- Shareable filter URLs for collaboration
- Browser back/forward navigation preserves filter state
- useSearchParams from next/navigation for URL manipulation
- Debounced URL updates to prevent excessive browser history entries

**Alternatives Considered**:
- **Redux/Zustand global state**: Rejected - overkill for feature-specific state
- **Context API**: Rejected - causes unnecessary re-renders, URL sync complexity

**Implementation Approach**:
```typescript
function useDictionaryFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const filters = useMemo(() => deserializeFilters(searchParams), [searchParams]);
  
  const updateFilters = useCallback((newFilters: Filters) => {
    const params = serializeFilters(newFilters);
    router.push(`?${params.toString()}`);
  }, [router]);
  
  return { filters, updateFilters };
}
```

### 6. Saved Search Storage Strategy

**Decision**: Dual storage - Database for authenticated, localStorage for anonymous

**Rationale**:
- Logged-in users expect cross-device sync (database required)
- Anonymous users need immediate functionality (localStorage)
- Migration path when anonymous user logs in (prompt to sync)
- localStorage limit: 5MB (~50-100 saved searches feasible)

**Alternatives Considered**:
- **Database only**: Rejected - forces login for basic feature
- **localStorage only**: Rejected - no cross-device sync, lost on cache clear

**Implementation Approach**:
```typescript
// Unified interface with dual backend
class SavedSearchService {
  async save(search: SavedSearch, userId?: string) {
    if (userId) {
      await this.repository.saveToDatabase(search, userId);
    } else {
      this.saveToLocalStorage(search);
    }
  }
  
  async list(userId?: string): Promise<SavedSearch[]> {
    if (userId) {
      return this.repository.listFromDatabase(userId);
    } else {
      return this.listFromLocalStorage();
    }
  }
}
```

### 7. Export File Format Handling

**Decision**: Server-side streaming for large exports with format-specific libraries

**Rationale**:
- CSV: Native generation (fast, no dependencies)
- JSON: Native serialization (standard format)
- PDF: jsPDF library with custom Devanagari/Telugu font embedding
- Streaming prevents memory exhaustion for 1000+ entry exports
- Server-side ensures consistent output regardless of client browser

**Alternatives Considered**:
- **Client-side export**: Rejected - memory issues on mobile, inconsistent results
- **Generic PDF library (PDFKit)**: Rejected - complex setup for Unicode fonts

**Implementation Approach**:
```typescript
// Streaming CSV export
async function* generateCSV(words: DictionaryWord[]) {
  yield "word,phonetic,origin,description\n";
  for (const word of words) {
    yield `"${escape(word.word)}","${escape(word.phonetic)}","${word.origin}","${escape(word.description)}"\n`;
  }
}

// Server action with streaming response
export async function exportWords(format: "csv" | "json" | "pdf") {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generateCSV(words)) {
        controller.enqueue(chunk);
      }
      controller.close();
    }
  });
  return new Response(stream, { headers: { "Content-Type": "text/csv" } });
}
```

### 8. Audio Playback Architecture

**Decision**: HTML5 Audio with single global player instance

**Rationale**:
- Auto-stop previous audio when new audio plays (UX requirement)
- Playback speed control via playbackRate API
- Minimal bundle size (no external audio libraries)
- Works across all modern browsers

**Alternatives Considered**:
- **Web Audio API**: Rejected - overkill for simple playback, complex setup
- **Howler.js library**: Rejected - unnecessary dependency for basic needs

**Implementation Approach**:
```typescript
// Global audio player hook
function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const play = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  }, []);
  
  const setSpeed = useCallback((speed: 0.5 | 1 | 1.5) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);
  
  return { play, pause, setSpeed };
}
```

### 9. Quick Lookup Popup Implementation

**Decision**: Radix UI Dialog with keyboard shortcut listener

**Rationale**:
- Radix UI Dialog provides accessible modal out-of-box
- Focus management and Escape key handling built-in
- Keyboard shortcut via useHotkeys or custom useEffect
- Portal rendering ensures popup works on any page

**Alternatives Considered**:
- **Custom modal from scratch**: Rejected - reinventing accessibility features
- **Browser native dialog**: Rejected - styling limitations, browser support

**Implementation Approach**:
```typescript
function QuickLookupPopup() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Content className="max-w-md">
          {/* Search UI */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### 10. Accessibility Strategy (WCAG 2.1 AA)

**Decision**: Shadcn UI + Radix primitives with custom ARIA enhancements

**Rationale**:
- Shadcn UI components built on Radix = accessible by default
- Focus management (focus trap in dialogs, logical tab order)
- ARIA live regions for dynamic content (search results update)
- Keyboard navigation for all interactive elements
- Color contrast verified via Tailwind's default palette (meets 4.5:1 ratio)

**Key Accessibility Requirements**:
- Collapsible filter panel: aria-expanded, role="region"
- Search results: aria-live="polite" for result count updates
- Audio player: aria-label on buttons, keyboard controls
- View mode selector: role="radiogroup", arrow key navigation
- Comparison view: aria-label describing each dictionary column

**Testing Tools**:
- axe DevTools for automated checks
- Manual keyboard navigation testing
- Screen reader testing (NVDA/JAWS)

## Performance Optimizations

### Database Indexes

```prisma
model DictionaryWord {
  @@index([origin, wordIndex]) // Pagination queries
  @@fulltext([phonetic, word]) // Full-text search
  @@index([origin, word]) // Filtered searches
}

model SavedSearch {
  @@index([userId, lastUsedAt]) // User's recent searches
}
```

### React Performance

- React.memo on presentation components (prevent unnecessary re-renders)
- useMemo for expensive computations (relevance scoring, filtering)
- useCallback for event handlers passed to child components
- Virtual scrolling for large result sets (react-window if needed)
- Debounced search input (300ms) to reduce API calls

### Bundle Size

- Dynamic imports for heavy components (PDF export, comparison view)
- Tree-shaking of unused Shadcn UI components
- Code splitting by route (Next.js automatic)

## Security Considerations

- Input sanitization for search queries (prevent NoSQL injection)
- Rate limiting on search endpoints (prevent abuse)
- Export file size limits (max 10k entries per export)
- Saved search count limits (50 per user)
- CSRF protection via Next.js Server Actions
- XSS prevention: React's automatic escaping + DOMPurify for user-generated content

## Migration Strategy (for Refactoring)

1. **Phase 1**: Create repository and service layers (no UI changes)
2. **Phase 2**: Add unit tests for services (establish baseline coverage)
3. **Phase 3**: Refactor one component at a time (DictionaryResults first)
4. **Phase 4**: Update remaining components to use hooks
5. **Phase 5**: Deprecate old patterns, update documentation

**Rollback Plan**: Feature flags for gradual rollout, fallback to old code if issues

## Open Questions

None - all technical decisions resolved.

## References

- MongoDB Full-Text Search: https://www.mongodb.com/docs/manual/text-search/
- @indic-transliteration/sanscript: https://github.com/sanskrit-coders/sanscript.js
- Radix UI Primitives: https://www.radix-ui.com/primitives
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Next.js 15 App Router: https://nextjs.org/docs/app
