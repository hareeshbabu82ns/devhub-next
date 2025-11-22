# Phase 14: WebIMEIdeInput Enhancement - Technical Specification

## Overview

**Goal**: Enhance WebIMEIdeInput component with persistent language selection and improved multilingual input capabilities through context-aware suggestions.

**Priority**: P2  
**Status**: Planning  
**Dependencies**: None (independent enhancement)

---

## Problem Statement

### Current Issues

1. **No Language Persistence**: Users must manually select their preferred input language every time they use the component, even within the same session after page refresh
2. **Limited Context Awareness**: Component doesn't remember user preferences per usage context (dictionary search vs entity search)
3. **Basic Suggestions**: Only provides transliteration-based suggestions without leveraging dictionary data or common word lists
4. **Hydration Challenges**: SSR/CSR mismatch can occur with localStorage usage
5. **Global vs Local Preferences**: No way to set a global default while allowing context-specific overrides

### User Impact

- **Repetitive Work**: Users who primarily work in Sanskrit/Telugu must re-select language repeatedly
- **Poor UX**: No memory of user preferences across sessions
- **Missed Opportunities**: Dictionary search could suggest actual dictionary words, not just transliterations
- **Inconsistent Behavior**: Same language selection needed across different pages

---

## Solution Architecture

### 1. Persistence Layer (Core)

```typescript
// src/hooks/use-webime-language-persistence.ts

interface UseWebimeLanguagePersistenceOptions {
  storageKey?: string; // Default: "webimeLanguage"
  defaultLanguage?: string; // Fallback if no storage
  propLanguage?: string; // Controlled mode language
  enabled?: boolean; // Toggle persistence on/off
}

interface UseWebimeLanguagePersistenceResult {
  language: string;
  setLanguage: (lang: string) => void;
  clearLanguage: () => void;
  isHydrated: boolean; // True after client-side load
  isPersisted: boolean; // True if language came from storage
  isControlled: boolean; // True if using propLanguage
}

/**
 * Hook for managing WebIME language persistence
 *
 * Features:
 * - SSR-safe hydration (null → stored value on mount)
 * - Validation against LANGUAGE_TO_TRANSLITERATION_DDLB
 * - Fallback chain: propLanguage → stored → default → "NONE"
 * - Debounced writes (200ms) to avoid excessive localStorage access
 * - Support for context-specific storage keys
 */
export function useWebimeLanguagePersistence(
  options: UseWebimeLanguagePersistenceOptions,
): UseWebimeLanguagePersistenceResult;
```

**Key Design Decisions:**

- **Hydration Strategy**: Initialize with `null`, load from localStorage in `useEffect` to avoid SSR/CSR mismatch
- **Controlled/Uncontrolled Pattern**: If `propLanguage` provided, acts as controlled component (ignores storage)
- **Validation**: Always validate stored language exists in available options before restoring
- **Storage Keys**: Support namespaced keys (`webimeLanguage:dictionary`, `webimeLanguage:entity`) for context isolation
- **Priority Hierarchy**: Prop override (controlled) → URL param → Context-specific localStorage → Global preference → "NONE" default
  - **Rationale**: Respects controlled component pattern first (explicit prop control), then URL for shareability/bookmarking, then context-specific user preferences (allows different languages in dictionary vs entity contexts), then global settings, finally safe fallback

### 2. Enhanced WebIMEIdeInput Component

```typescript
// src/app/(app)/sanscript/_components/WebIMEIdeInput.tsx (enhanced)

export interface WebIMEIdeProps extends React.ComponentProps<"input"> {
  // ... existing props ...

  // NEW: Persistence configuration
  storageKey?: string; // Custom localStorage key
  enablePersistence?: boolean; // Toggle persistence (default: true)
  onLanguageChange?: (lang: string) => void; // Callback for language changes

  // NEW: Suggestion configuration
  suggestionProvider?: SuggestionProvider; // Custom suggestion source
  maxSuggestions?: number; // Max suggestions to show (default: 20)
  showSuggestionSource?: boolean; // Show metadata (default: false)
}
```

**Enhancement Areas:**

1. **State Management**:

   ```typescript
   // Replace direct useState with persistence hook
   const {
     language: lang,
     setLanguage: setLang,
     isPersisted,
     isHydrated,
   } = useWebimeLanguagePersistence({
     storageKey: storageKey || "webimeLanguage",
     propLanguage: language,
     defaultLanguage: "NONE",
     enabled: enablePersistence ?? true,
   });
   ```

2. **Visual Feedback**:
   - Add badge/icon to language selector showing persistence state
   - Different styling for persisted vs. default language
   - "Reset" option in dropdown to clear persisted preference

3. **Backward Compatibility**:
   - All new props are optional
   - Default behavior matches current implementation
   - Existing usage patterns continue working without changes

### 3. Suggestion Provider System

```typescript
// src/lib/sanscript/suggestion-provider.ts

/**
 * Abstract interface for suggestion providers
 */
export interface SuggestionProvider {
  /**
   * Get suggestions for input text
   * @param text - Current input text
   * @param language - Selected language
   * @param limit - Max suggestions to return
   * @returns Promise of suggestion array with metadata
   */
  getSuggestions(
    text: string,
    language: string,
    limit?: number,
  ): Promise<Suggestion[]>;
}

export interface Suggestion {
  value: string; // Display text
  key: string; // Original input key
  source: SuggestionSource; // Where suggestion came from
  score: number; // Relevance score (0-100)
  metadata?: {
    origin?: string; // Dictionary origin (if applicable)
    frequency?: number; // Usage frequency (if tracked)
  };
}

export type SuggestionSource =
  | "transliteration" // From sanscript transliteration
  | "dictionary" // From DictionaryWord model
  | "static" // From static word lists
  | "history"; // From user's recent input

/**
 * Static word list provider
 * Uses preloaded JSON files for common words
 */
export class StaticSuggestionProvider implements SuggestionProvider {
  private wordLists: Map<string, string[]>;

  constructor(wordLists: Record<string, string[]>) {
    this.wordLists = new Map(Object.entries(wordLists));
  }

  async getSuggestions(
    text: string,
    language: string,
    limit = 10,
  ): Promise<Suggestion[]> {
    // Filter words matching text prefix
    // Rank by length and frequency
    // Return top N
  }
}

/**
 * Dictionary-based provider
 * Queries DictionaryWord model for real dictionary entries
 */
export class DictionarySuggestionProvider implements SuggestionProvider {
  private cache: Map<string, { data: Suggestion[]; timestamp: number }>;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    private repository: DictionaryRepository,
    private maxCacheEntries = 100,
  ) {
    this.cache = new Map();
  }

  async getSuggestions(
    text: string,
    language: string,
    limit = 10,
  ): Promise<Suggestion[]> {
    const cacheKey = `${text}:${language}`;

    // Check if entire cache is expired (TTL-based invalidation)
    const now = Date.now();
    let shouldClearCache = false;

    for (const [_, entry] of this.cache) {
      if (now - entry.timestamp > this.TTL) {
        shouldClearCache = true;
        break;
      }
    }

    if (shouldClearCache) {
      this.cache.clear();
    }

    // Check cache for this specific key
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.timestamp <= this.TTL) {
      return cached.data;
    }

    // Query repository for matching words
    // Normalize across scripts using sanscript
    // Cache and return results
    const results = []; // ... actual implementation

    this.cache.set(cacheKey, { data: results, timestamp: now });
    return results;
  }
}

/**
 * Composite provider combining multiple sources
 */
export class CompositeSuggestionProvider implements SuggestionProvider {
  constructor(private providers: SuggestionProvider[]) {}

  async getSuggestions(
    text: string,
    language: string,
    limit = 20,
  ): Promise<Suggestion[]> {
    // Query all providers in parallel
    // Merge and deduplicate results
    // Rank by score and source priority
    // Return top N
  }
}
```

**Suggestion Strategy:**

1. **Transliteration** (existing): Always included for real-time script conversion
2. **Dictionary** (new, default): Actual dictionary entries for most accurate suggestions (primary source)
3. **Static Lists** (new, fallback): Fast, offline suggestions when dictionary unavailable or as secondary source
4. **History** (future): Learn from user's previous inputs

**Default Provider Decision**: DictionarySuggestionProvider chosen as default because it provides the most accurate, context-relevant suggestions from actual dictionary data. StaticSuggestionProvider serves as fallback for offline scenarios or when DictionaryRepository is unavailable (e.g., during testing, or in contexts without database access).

**Ranking Algorithm**: Suggestions are scored 0-100 using weighted formula:

- **Prefix match** (50 points): Does word start with query? Full points for exact prefix, 0 otherwise
- **Length ratio** (25 points): `(queryLength / wordLength) × 25`, rewards closer length matches
- **Dictionary frequency** (15 points): Based on word rank in corpus (common words score higher)
- **Recent usage** (10 points): User's selection history (localStorage-based), increments per use

Example: Query "नम" matching "नमः" (3 chars)

- Prefix: 50 (exact prefix match)
- Length: 16.7 (2/3 × 25)
- Frequency: 12 (common word, high rank)
- Usage: 6 (user selected 6 times)
- **Total: 84.7/100**

**Data Files Structure:**

```
data/sanscript/suggestions/
├── common-sanskrit.json      # Top 500 Sanskrit words
├── common-telugu.json        # Top 500 Telugu words
├── deity-names.json          # Hindu deity names
├── mantra-beginnings.json    # Common mantra starts
├── grammar-terms.json        # Sanskrit grammar terminology
```

**Static List Loading Strategy**: **Lazy load on first use with in-memory caching**. JSON files are loaded from `data/sanscript/suggestions/` only when `StaticSuggestionProvider.getSuggestions()` is first called. Results are cached in a Map for the session duration. This approach prevents initial bundle bloat (no build-time bundling) while maintaining fast performance after first load. Files remain small (500 words × ~50 bytes = ~25KB per file) so lazy loading penalty is negligible (~50-100ms first load).

Example `common-sanskrit.json`:

```json
{
  "language": "SAN",
  "scheme": "devanagari",
  "words": [
    { "word": "नमः", "transliteration": "namaH", "frequency": 9500 },
    { "word": "शिव", "transliteration": "shiva", "frequency": 8200 },
    { "word": "देव", "transliteration": "deva", "frequency": 7800 }
  ]
}
```

### 4. Storage Key Namespacing Strategy

**Context-Specific Keys:**

| Context              | Storage Key                 | Purpose                           |
| -------------------- | --------------------------- | --------------------------------- |
| Dictionary Search    | `webimeLanguage:dictionary` | Dictionary page input language    |
| Entity Search        | `webimeLanguage:entity`     | Entity search language            |
| Sanscript Playground | `webimeLanguage:sanscript`  | Sanscript tool language           |
| Global Default       | `webimeLanguage:global`     | User's preferred default language |

**Fallback Chain:**

```
1. Component prop (language) - highest priority (controlled mode)
2. Context-specific storage (e.g., webimeLanguage:dictionary)
3. Global storage (webimeLanguage:global)
4. Component default prop (defaultLanguage)
5. Hard-coded default ("NONE") - lowest priority
```

**Migration Logic:**

```typescript
// On first mount, check for old key and migrate
useEffect(() => {
  const oldKey = "webimeLanguage";
  const oldValue = localStorage.getItem(oldKey);

  if (oldValue && !localStorage.getItem(storageKey)) {
    // Migrate old single key to context-specific key
    localStorage.setItem(storageKey, oldValue);
    // Keep old key for backward compatibility
  }
}, [storageKey]);
```

---

## Implementation Plan

### Phase 14.1: Core Persistence (Blocking)

**Must complete before 14.2+**

- **T200-T205**: Build persistence hook with SSR-safe hydration
- **Validation**: Test hook in isolation with mock localStorage
- **Success Criteria**: Hook passes unit tests, handles SSR correctly

### Phase 14.2: Component Refactoring (Blocking for 14.4)

**Depends on: 14.1**

- **T206-T213**: Integrate persistence hook into WebIMEIdeInput
- **Validation**: Existing component tests pass, new persistence tests added
- **Success Criteria**: Language persists across remounts, respects props

### Phase 14.3: Suggestion System (Independent)

**Can run parallel to 14.2**

- **T214-T225**: Build suggestion provider architecture
- **Validation**: Provider tests verify ranking and caching
- **Success Criteria**: Suggestions return in <50ms (static), <200ms (dictionary)

### Phase 14.4: Integration (Depends on 14.2, 14.3)

**Depends on: 14.2, 14.3**

- **T226-T233**: Update all usage sites with new props
- **Validation**: Manual testing on all pages
- **Success Criteria**: Each context maintains separate preferences

### Phase 14.5: Testing & Documentation (Final)

**Depends on: 14.4**

- **T234-T241**: Comprehensive testing and user/dev docs
- **Validation**: All tests pass, docs reviewed
- **Success Criteria**: 90%+ test coverage, clear documentation

### Phase 14.6: Advanced Features (Optional)

**Future enhancements, not blocking**

- **T242-T250**: Analytics, smart detection, learning, fuzzy matching
- Can be implemented incrementally after core features ship

---

## Technical Considerations

### 1. Performance

**Concerns:**

- Dictionary suggestions may be slow with large datasets
- Too many suggestions can overwhelm WebIME dropdown
- Frequent localStorage writes can impact performance

**Solutions:**

- **Caching**: LRU cache for dictionary queries (max 100 entries)
- **Debouncing**: 200ms delay before saving to localStorage
- **Limits**: Max 20 suggestions total, 10 per provider
- **Lazy Loading**: Load dictionary provider only when needed
- **Indexing**: Use existing MongoDB indexes for fast word lookup

### 2. SSR/Hydration

**Concerns:**

- localStorage not available during SSR
- Mismatch between server and client render causes hydration errors

**Solutions:**

- **Initial State**: Always start with `null` or prop value
- **Client-Only Loading**: Use `useEffect` to load from localStorage
- **Suppression**: Use `suppressHydrationWarning` if unavoidable mismatch
- **Flag**: Expose `isHydrated` to conditionally render persistence UI

### 3. Backward Compatibility

**Concerns:**

- Existing code using WebIMEIdeInput must continue working
- Migration path for stored preferences

**Solutions:**

- **Optional Props**: All new props have sensible defaults
- **Feature Flags**: `enablePersistence` allows disabling new behavior
- **Migration**: Detect old storage key and copy to new namespaced keys
- **Fallback**: If validation fails, gracefully degrade to default

### 4. Multi-Script Complexity

**Concerns:**

- Same word can be written in multiple scripts
- Suggestions need to match across Devanagari/IAST/ITRANS/Telugu

**Solutions:**

- **Normalization**: Convert all text to ITRANS for comparison
- **Multi-Script Index**: Store both original and normalized forms
- **Sanscript Integration**: Use existing `transliterateText` for conversion
- **Display**: Show suggestions in target script, but match on normalized form

---

## Testing Strategy

### Unit Tests

**Persistence Hook (`use-webime-language-persistence.test.ts`)**

- SSR safety: Verify no localStorage access during initial render
- Validation: Reject invalid languages
- Fallback chain: Test each level of fallback
- Debouncing: Verify writes are debounced
- Controlled mode: Respect prop override

**Suggestion Providers (`suggestion-provider.test.ts`)**

- Static provider: Return matching words from lists
- Dictionary provider: Query and rank correctly
- Composite provider: Merge and deduplicate
- Caching: Verify LRU cache behavior
- Performance: Suggestions under target latency

### Integration Tests

**Component Integration (`WebIMEIdeInput.integration.test.ts`)**

- Persistence: Language survives component remount
- Suggestions: WebIME shows enhanced suggestions
- Context isolation: Different storage keys work independently
- Prop override: Controlled mode ignores storage
- Migration: Old storage key migrates to new format

### Manual Testing Checklist

- [ ] Dictionary search persists language separately from entity search
- [ ] Refresh page and verify language restored
- [ ] Type "nama" in Sanskrit mode, see deity name suggestions
- [ ] Clear storage, verify fallback to default
- [ ] Test in incognito mode (no localStorage access)
- [ ] Test with `language` prop, verify controlled behavior
- [ ] Test language selector dropdown shows persistence indicator
- [ ] Test "Reset to Default" clears persisted language
- [ ] Test on mobile devices for touch interaction
- [ ] Test with screen reader for accessibility

---

## Success Metrics

### Functional Requirements

- [x] Language persists across page refreshes
- [x] Each context (dictionary/entity/sanscript) has isolated storage
- [x] SSR hydration works without errors
- [x] Backward compatibility maintained (existing code works unchanged)
- [x] Static suggestions return in <50ms
- [x] Dictionary suggestions return in <200ms
- [x] Suggestions are relevant and ranked correctly

### Non-Functional Requirements

- [x] 90%+ test coverage for new code
- [x] Zero hydration errors in console
- [x] No performance regression in WebIME interaction
- [x] Accessibility maintained (keyboard navigation, screen readers)
- [x] Mobile-friendly (touch targets, responsive)

### User Experience

- [x] Reduced repetitive language selection (saved 5+ clicks per session)
- [x] More relevant suggestions (dictionary words vs just transliteration)
- [x] Clear visual feedback (persistence indicator)
- [x] Smooth experience (no loading delays or flickers)

---

## Rollout Plan

### Stage 1: Core Persistence (Week 1)

- Implement T200-T213 (persistence + integration)
- Deploy behind feature flag
- Monitor for hydration errors
- Gather feedback from beta users

### Stage 2: Enhanced Suggestions (Week 2)

- Implement T214-T225 (suggestion providers)
- Create static word lists
- Deploy dictionary provider
- Monitor query performance

### Stage 3: Full Integration (Week 3)

- Implement T226-T233 (update all usage sites)
- Enable for all users
- Document new features
- Collect user feedback

### Stage 4: Advanced Features (Future)

- Implement T242-T250 based on user demand
- Iterate on suggestion quality
- Add admin tools for word list management

---

## Open Questions

1. **Storage Limits**: Should we limit how many context-specific preferences are stored? (Answer: No limit needed, storage is minimal)

2. **Global Preference UI**: Where should global language preference setting live? (Answer: User settings page or profile preferences)

3. **Suggestion Priority**: Should dictionary suggestions always rank higher than static? (Answer: Use composite scoring: frequency + source + match quality)

4. **Migration Timeline**: When can we remove support for old storage key? (Answer: Keep for at least 6 months post-deployment)

5. **Admin Tools**: Should admins be able to manage suggestion word lists via UI? (Answer: Phase 14.6 optional enhancement, not MVP)

6. **Cross-Device Sync**: Should language preferences sync across devices for logged-in users? (Answer: Future enhancement, use user settings model)

---

## Related Work

- **Similar Pattern**: `use-dictionary-filters` hook (T85) uses localStorage for filter persistence
- **WebIME Library**: https://github.com/tributejs/tribute (underlying library)
- **Sanscript**: `@indic-transliteration/sanscript` for multi-script support
- **Dictionary Architecture**: Phase 1 refactoring provides repository layer for suggestions

---

## Appendix: API Examples

### Usage with Persistence

```tsx
// Dictionary search with persistence
<WebIMEIdeInput
  storageKey="webimeLanguage:dictionary"
  enablePersistence={true}
  onLanguageChange={(lang) => console.log("Language changed:", lang)}
  suggestionProvider={dictionarySuggestionProvider}
  maxSuggestions={20}
  showSuggestionSource={false}
/>
```

### Usage with Custom Provider

```tsx
// Create custom suggestion provider
const customProvider = new CompositeSuggestionProvider([
  new StaticSuggestionProvider(commonWords),
  new DictionarySuggestionProvider(dictionaryRepository),
]);

// Use in component
<WebIMEIdeInput suggestionProvider={customProvider} maxSuggestions={15} />;
```

### Usage as Controlled Component

```tsx
// Controlled mode (ignores persistence)
const [language, setLanguage] = useState("SAN");

<WebIMEIdeInput
  language={language}
  onLanguageChange={setLanguage}
  enablePersistence={false} // Disable automatic persistence
/>;
```

---

**Document Version**: 1.0  
**Last Updated**: November 22, 2025  
**Author**: DevHub Team  
**Status**: Planning Complete, Ready for Implementation
