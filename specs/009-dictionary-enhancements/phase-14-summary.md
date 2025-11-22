# Phase 14: WebIMEIdeInput Enhancement - Planning Summary

## Overview

**Created**: November 22, 2025  
**Status**: Planning Complete  
**Priority**: P2 (Medium Priority)  
**Task Range**: T200-T250 (51 tasks total)

---

## What Was Planned

### Problem Being Solved

The WebIMEIdeInput component currently:

1. **Doesn't persist language selection** - users must re-select their input language after every page refresh
2. **Lacks context awareness** - same language selection affects all pages (dictionary, entities, sanscript)
3. **Provides only basic suggestions** - only transliteration-based, doesn't leverage dictionary data
4. **No user preference memory** - doesn't learn from or remember user behavior

### Solution Overview

**Three Core Enhancements:**

1. **Persistent Language Selection**
   - Store user's language choice in localStorage with context-specific keys
   - SSR-safe hydration to avoid React mismatches
   - Separate storage for dictionary, entity search, and sanscript pages
   - Global preference system with per-context overrides

2. **Enhanced Suggestion System**
   - Provider-based architecture for pluggable suggestion sources
   - Static word lists (common Sanskrit/Telugu words, deity names, mantras)
   - Dictionary-based suggestions (query actual DictionaryWord entries)
   - Intelligent ranking combining transliteration, static lists, and dictionary
   - Multi-script matching (Devanagari ↔ ITRANS ↔ IAST ↔ Telugu)

3. **Better UX & Developer Experience**
   - Visual indicators for persisted vs default language
   - Controlled/uncontrolled component patterns
   - Custom storage keys for flexibility
   - Backward compatibility with existing usage

---

## Implementation Phases

### Subphase 14.1: Core Persistence Infrastructure (6 tasks)

**T200-T205** - Build the foundation

- Create `use-webime-language-persistence` hook
- Implement storage key namespacing (e.g., `webimeLanguage:dictionary`)
- Add validation and fallback chain
- SSR-safe hydration with useState + useEffect
- Auto-save with debouncing (200ms)

**Key Deliverable**: Reusable hook that safely persists language selection

### Subphase 14.2: Component Refactoring (8 tasks)

**T206-T213** - Integrate persistence into WebIMEIdeInput

- Add new props: `storageKey`, `onLanguageChange`, `enablePersistence`
- Integrate persistence hook
- Implement controlled/uncontrolled patterns
- Add visual feedback (badges/icons for persisted state)
- Add "Reset to Default" option in language selector

**Key Deliverable**: Enhanced WebIMEIdeInput with persistence support

### Subphase 14.3: Enhanced Suggestion System (12 tasks)

**T214-T225** - Build pluggable suggestion architecture

- Create `SuggestionProvider` interface
- Implement `StaticSuggestionProvider` (JSON word lists)
- Implement `DictionarySuggestionProvider` (database queries)
- Implement `CompositeSuggestionProvider` (merge multiple sources)
- Create suggestion word list files (Sanskrit, Telugu, deity names, mantras)
- Add caching (LRU cache, max 100 entries)
- Multi-script normalization using sanscript
- Suggestion ranking algorithm (frequency + length + source)

**Key Deliverable**: Flexible suggestion system with multiple sources

### Subphase 14.4: Integration & Usage Updates (8 tasks)

**T226-T233** - Wire everything together

- Update search-toolbar.tsx (dictionary) with new props
- Update EntitySearchTiles.tsx with context-specific storage
- Create `useDictionarySuggestionProvider` hook
- Create `useStaticSuggestionProvider` hook
- Implement migration logic for old storage key
- Create global preference setting in user settings
- Build `LanguagePreferenceProvider` context

**Key Deliverable**: All usage sites updated with enhanced functionality

### Subphase 14.5: Testing & Documentation (8 tasks)

**T234-T241** - Ensure quality and usability

- Unit tests for persistence hook
- Unit tests for suggestion providers
- Integration tests for component
- Manual testing across contexts
- Performance testing (static <50ms, database <200ms)
- Multi-script suggestion testing
- User documentation (language persistence guide)
- Developer documentation (custom provider guide)

**Key Deliverable**: Comprehensive test coverage and documentation

### Subphase 14.6: Advanced Features (9 tasks - OPTIONAL)

**T242-T250** - Future enhancements

- Language usage analytics
- Smart language detection (auto-switch on mismatch)
- Suggestion learning (boost frequently selected)
- Suggestion history (recent inputs)
- Export/import suggestion lists
- Multi-language quick-switch (Ctrl+Shift+L)
- Fuzzy matching (typo tolerance)
- Contextual suggestions (based on previous words)
- Admin UI for managing word lists

**Key Deliverable**: Advanced features for power users

---

## Technical Architecture

### 1. Storage Strategy

```
Fallback Chain (highest to lowest priority):
1. Component prop (language) - controlled mode
2. Context storage (webimeLanguage:dictionary)
3. Global storage (webimeLanguage:global)
4. Default prop (defaultLanguage)
5. Hard-coded default ("NONE")
```

**Storage Keys:**

- `webimeLanguage:dictionary` - Dictionary page
- `webimeLanguage:entity` - Entity search page
- `webimeLanguage:sanscript` - Sanscript playground
- `webimeLanguage:global` - User's global preference

### 2. Suggestion Provider Architecture

```typescript
interface SuggestionProvider {
  getSuggestions(text: string, language: string, limit?: number): Promise<Suggestion[]>;
}

// Three implementations:
1. StaticSuggestionProvider - Fast, offline word lists
2. DictionarySuggestionProvider - Database queries with caching
3. CompositeSuggestionProvider - Combines multiple sources
```

**Suggestion Sources (ranked):**

1. Transliteration (existing) - Always included
2. Dictionary entries - High priority, accurate
3. Static word lists - Fast, common words
4. History (future) - User's recent inputs

### 3. Component API

```typescript
<WebIMEIdeInput
  // Existing props (unchanged)
  language="SAN"
  valueAs="itrans_dravidian"
  onTextChange={handleChange}

  // NEW: Persistence
  storageKey="webimeLanguage:dictionary"
  enablePersistence={true}
  onLanguageChange={(lang) => console.log(lang)}

  // NEW: Suggestions
  suggestionProvider={customProvider}
  maxSuggestions={20}
  showSuggestionSource={false}
/>
```

---

## Success Criteria

### Functional

- ✅ Language persists across page refreshes
- ✅ Context-specific storage works independently
- ✅ SSR hydration without errors
- ✅ Backward compatibility maintained
- ✅ Suggestions render in <50ms (static) / <200ms (database)

### Quality

- ✅ 90%+ test coverage on new code
- ✅ Zero hydration warnings
- ✅ No performance regression
- ✅ Accessibility maintained (WCAG 2.1 AA)
- ✅ Mobile-friendly (touch targets 44x44px)

### User Experience

- ✅ Users save 5+ clicks per session (no re-selecting language)
- ✅ More relevant suggestions (dictionary words, not just transliteration)
- ✅ Clear visual feedback (persistence indicators)
- ✅ Smooth, no loading delays

---

## Files Created/Modified

### New Files (Created by Implementation)

**Hooks:**

- `src/hooks/use-webime-language-persistence.ts` - Language persistence hook
- `src/hooks/useDictionarySuggestionProvider.ts` - Dictionary suggestion hook
- `src/hooks/useStaticSuggestionProvider.ts` - Static suggestion hook

**Libraries:**

- `src/lib/sanscript/suggestion-provider.ts` - Suggestion provider interfaces and implementations
- `src/lib/sanscript/lru-cache.ts` - LRU cache for suggestion caching

**Data Files:**

- `data/sanscript/suggestions/common-sanskrit.json` - Top 500 Sanskrit words
- `data/sanscript/suggestions/common-telugu.json` - Top 500 Telugu words
- `data/sanscript/suggestions/deity-names.json` - Hindu deity names
- `data/sanscript/suggestions/mantra-beginnings.json` - Common mantra starts
- `data/sanscript/suggestions/grammar-terms.json` - Sanskrit grammar terms
- `data/sanscript/suggestions/README.md` - Documentation

**Contexts:**

- `src/contexts/LanguagePreferenceContext.tsx` - Global language preference provider

**Tests:**

- `tests/hooks/use-webime-language-persistence.test.ts` - Hook tests
- `tests/lib/sanscript/suggestion-provider.test.ts` - Provider tests
- `tests/components/WebIMEIdeInput.integration.test.ts` - Integration tests

**Documentation:**

- `docs/webime-persistence.md` - User guide
- `docs/webime-customization.md` - Developer guide

### Modified Files

**Components:**

- `src/app/(app)/sanscript/_components/WebIMEIdeInput.tsx` - Add persistence and suggestion features

**Usage Sites:**

- `src/app/(app)/dictionary/_components/search-toolbar.tsx` - Add storageKey prop
- `src/app/(app)/entities/_components/EntitySearchTiles.tsx` - Add storageKey prop

---

## Dependencies

**No blocking dependencies** - This is an independent enhancement that doesn't require other phases to complete first.

**Libraries Used:**

- `@indic-transliteration/sanscript` (existing) - Multi-script transliteration
- `webime` (existing) - Input method library
- React hooks (useState, useEffect, useCallback, useMemo)
- localStorage API (browser)

**Data Dependencies:**

- DictionaryRepository from Phase 1 refactoring (for dictionary suggestions)
- Existing Prisma models (no schema changes needed)

---

## Rollout Strategy

### Week 1: Foundation

- Implement core persistence (T200-T213)
- Deploy behind feature flag
- Beta testing with select users
- Monitor for hydration errors

### Week 2: Suggestions

- Build suggestion system (T214-T225)
- Create static word lists
- Performance testing
- Gather feedback on suggestion quality

### Week 3: Integration

- Update all usage sites (T226-T233)
- Enable for all users
- Documentation and training
- Collect usage metrics

### Future: Advanced Features

- Implement T242-T250 based on demand
- Iterate on suggestion quality
- Add admin tools

---

## Risk Assessment

| Risk                    | Impact | Likelihood | Mitigation                                                  |
| ----------------------- | ------ | ---------- | ----------------------------------------------------------- |
| SSR hydration errors    | High   | Medium     | Thorough testing, SSR-safe patterns, feature flag           |
| Performance degradation | Medium | Low        | Caching, debouncing, performance testing, limits            |
| Storage limit issues    | Low    | Low        | Validate storage availability, handle QuotaExceededError    |
| Suggestion quality poor | Medium | Medium     | User feedback, iterative improvement, multiple sources      |
| Breaking existing code  | High   | Low        | Backward compatibility, optional props, comprehensive tests |
| Mobile UX issues        | Medium | Low        | Touch-friendly design, responsive testing                   |

**Overall Risk Level**: **LOW** - Well-scoped enhancement with clear patterns and mitigation strategies

---

## Next Steps

1. **Review Planning** ✅ Complete
   - Technical spec created
   - Tasks defined (T200-T250)
   - Architecture documented

2. **Approval & Prioritization**
   - Review with team
   - Confirm P2 priority
   - Schedule for sprint

3. **Implementation**
   - Follow subphases in order (14.1 → 14.2 → 14.3 → 14.4 → 14.5)
   - 14.6 is optional, can be deferred

4. **Testing & Deployment**
   - Feature flag rollout
   - Beta testing
   - Gradual rollout to all users

---

## Questions for Team Review

1. **Priority Confirmation**: Is P2 appropriate, or should this be P1/P3?
2. **Suggestion Sources**: Should we include any other sources (e.g., user's saved searches)?
3. **Global Preference Location**: Where in UI should global language setting live?
4. **Migration Timeline**: How long to support old `webimeLanguage` key before removal?
5. **Advanced Features**: Which from T242-T250 are highest priority if any?
6. **Performance Targets**: Are <50ms static / <200ms database acceptable?

---

## Related Documentation

- **Tasks File**: `/specs/009-dictionary-enhancements/tasks.md` (Phase 14 section)
- **Technical Spec**: `/specs/009-dictionary-enhancements/phase-14-webime-enhancement.md`
- **Original Component**: `src/app/(app)/sanscript/_components/WebIMEIdeInput.tsx`
- **Phase 1 Refactoring**: Tasks T001-T106 (provides repository layer for suggestions)

---

**Status**: ✅ Planning Complete - Ready for Implementation  
**Task Count**: 51 tasks (42 core + 9 optional)  
**Estimated Effort**: 2-3 weeks (excluding Phase 14.6)  
**Team Review**: Pending
