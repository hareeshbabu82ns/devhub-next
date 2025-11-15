# Feature Specification: Dictionary System Enhancements

**Feature Branch**: `009-dictionary-enhancements`  
**Created**: 2025-11-15  
**Status**: Draft  
**Input**: User description: "based on the implemented dictionary system, enhance the functionality for ease of use and better viewing dictionaries and full text search capabilities"

## Clarifications

### Session 2025-11-15

- Q: How should the filter panel behave when users open/close it and interact with filters? → A: Collapsible sidebar panel (persistent) with explicit "Apply" button
- Q: What level of accessibility support should the enhanced dictionary features provide? → A: WCAG 2.1 AA compliance (full keyboard nav, screen readers, ARIA labels)
- Q: What granularity should text highlighting use for search matches (character, word, phrase, or sentence level)? → A: Word-level highlighting respecting word boundaries
- Q: Where should saved searches be stored - user account database, localStorage, or both? → A: User account (database) for logged-in, localStorage for anonymous users
- Q: How should exported files be named to help users identify and organize their downloads? → A: dictionary-export-{timestamp}-{filters}.{ext} with filter codes
- Q: How should the repository pattern handle database transactions and concurrent operations? → A: Repository uses PrismaClient transaction API with explicit transaction methods
- Q: How should services handle errors from the repository layer? → A: Services catch repository errors, log them, and return ServiceResponse with descriptive error messages
- Q: How should presentation components prevent unnecessary re-renders when container state changes? → A: React.memo with shallow comparison
- Q: How should test coverage be prioritized during refactoring? → A: Test repository layer first, then services, finally integration tests
- Q: How should component state updates be handled when multiple filters change simultaneously? → A: Batch updates with single state setter call using reducer pattern or combined state object

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enhanced Full-Text Search with Relevance Ranking (Priority: P1)

Users want to search for dictionary words and receive results ranked by relevance, with highlighted search terms and better matching algorithms that understand Sanskrit/Telugu linguistic patterns.

**Why this priority**: Core search functionality improvements directly impact every user interaction. Current REGEX search lacks intelligent ranking and linguistic awareness.

**Independent Test**: Can be fully tested by searching for common Sanskrit terms and verifying results show most relevant matches first with visible highlighting of matching text.

**Acceptance Scenarios**:

1. **Given** user searches "namah", **When** results are displayed, **Then** words starting with "namah" appear before words containing "namah" in middle
2. **Given** search results displayed, **When** user views them, **Then** matching words are visually highlighted at word boundaries in both word and description fields without breaking ligatures or conjuncts
3. **Given** user searches partial word "nam", **When** results return, **Then** relevance score prioritizes exact prefix matches over fuzzy matches
4. **Given** user searches in any script (Devanagari, IAST, ITRANS), **When** system processes search, **Then** results include matches from all script variations
5. **Given** user searches with diacritical marks, **When** searching, **Then** system matches both with and without diacritics showing more relevant first
6. **Given** search with multiple results, **When** displayed, **Then** relevance score (0-100) is shown for each result
7. **Given** user navigating with keyboard only, **When** pressing Tab through search results, **Then** focus indicators are clearly visible and screen reader announces word, phonetic, and relevance score

---

### User Story 2 - Advanced Filter Options (Priority: P1)

Users want to filter dictionary results by multiple criteria simultaneously including word length, language, attributes, and date ranges for targeted exploration.

**Why this priority**: Essential for research and learning scenarios. Users frequently need to narrow down large result sets to find specific word types or categories.

**Independent Test**: Can be tested by applying multiple filters (e.g., origin + word length + has-audio) and verifying only matching results appear.

**Acceptance Scenarios**:

1. **Given** user on dictionary page, **When** they click filter toggle button, **Then** collapsible sidebar panel opens showing filter options: origin, language, word length range, has-audio, has-attributes, date range
2. **Given** filter panel open, **When** user adjusts filter values, **Then** changes are visible in panel but results do not update until "Apply" button is clicked
3. **Given** user selects multiple dictionaries, **When** clicking "Apply", **Then** results show combined entries from all selected origins with origin badges
4. **Given** user sets word length filter (5-10 characters), **When** "Apply" is clicked, **Then** only words within that character range appear
5. **Given** user filters by "has audio", **When** "Apply" is clicked, **Then** only dictionary entries with audio files are displayed
6. **Given** user applies attribute filter (e.g., "grammar=noun"), **When** "Apply" is clicked, **Then** only entries with matching attribute key-value pairs appear
7. **Given** filter panel open with changes pending, **When** user collapses panel without clicking "Apply", **Then** panel closes and pending changes are discarded
8. **Given** multiple filters active, **When** user clicks "Clear All" button in filter panel, **Then** all filters reset to defaults and results update immediately
9. **Given** user applies filters, **When** navigating away and returning, **Then** filter preferences are preserved via URL parameters and sidebar reopens showing active filters

---

### User Story 3 - Rich Content Viewing Modes (Priority: P2)

Users want to view dictionary entries in different layouts (compact list, card view, detailed view) with collapsible sections and better typography for Sanskrit text.

**Why this priority**: Improves readability and user experience significantly, but basic functionality works with current layout.

**Independent Test**: Can be tested by switching between view modes and verifying layout changes appropriately while maintaining all content visibility.

**Acceptance Scenarios**:

1. **Given** user viewing dictionary results, **When** they select "Compact" view mode, **Then** entries display as single-line items with word and brief meaning
2. **Given** user selects "Card" view mode, **When** applied, **Then** entries display as cards with word, phonetic, description, and origin badge
3. **Given** user selects "Detailed" view mode, **When** applied, **Then** entries show all fields including attributes, source data, and timestamps
4. **Given** entry with long description, **When** displayed in compact/card mode, **Then** description is truncated with "Read more" expansion option
5. **Given** Sanskrit/Telugu text, **When** displayed, **Then** system uses appropriate font families (Devanagari, Telugu Unicode) with proper line-height and letter-spacing
6. **Given** user adjusts text size, **When** viewing entries, **Then** all text scales proportionally maintaining readability
7. **Given** user on mobile device, **When** viewing dictionary, **Then** layout automatically adjusts to single-column responsive design
8. **Given** user navigating with keyboard, **When** switching view modes, **Then** focus remains on view mode selector and screen reader announces selected mode

---

### User Story 4 - Saved Searches and Query History (Priority: P2)

Users want to save frequently-used search queries and view recent search history for quick access to common lookups.

**Why this priority**: Enhances productivity for regular users and scholars who perform repetitive searches. Nice-to-have feature that adds convenience.

**Independent Test**: Can be tested by saving a search query, navigating away, and clicking saved search to restore exact query with filters.

**Acceptance Scenarios**:

1. **Given** user performs search with specific query and filters, **When** they click "Save Search", **Then** modal prompts for search name
2. **Given** user names saved search, **When** saved, **Then** search appears in "Saved Searches" dropdown with custom name
3. **Given** user clicks saved search, **When** selected, **Then** system restores exact query text, filters, and sort order
4. **Given** user performs multiple searches, **When** viewing history, **Then** last 20 searches are displayed with timestamp
5. **Given** saved search, **When** user right-clicks or long-presses, **Then** options to rename, delete, or duplicate appear
6. **Given** user has 10+ saved searches, **When** viewing list, **Then** searches are organized by most recently used
7. **Given** saved searches, **When** user exports, **Then** system downloads JSON file with all saved query configurations
8. **Given** logged-in user saves search on desktop, **When** accessing dictionary on mobile device, **Then** saved search appears in list (cross-device sync)
9. **Given** anonymous user saves search in localStorage, **When** they later log in, **Then** system prompts to migrate localStorage searches to user account

---

### User Story 5 - Inline Audio Playback (Priority: P3)

Users want to hear pronunciation of Sanskrit words directly within search results without opening detail pages.

**Why this priority**: Valuable for learning pronunciation but not critical for dictionary lookup functionality. Requires audio file availability.

**Independent Test**: Can be tested by clicking audio icon on dictionary entry and hearing pronunciation playback.

**Acceptance Scenarios**:

1. **Given** dictionary entry with audio file, **When** displayed, **Then** audio play icon is visible next to word
2. **Given** user clicks audio icon, **When** activated, **Then** audio playback begins immediately without page navigation
3. **Given** audio playing, **When** user clicks icon again, **Then** playback pauses
4. **Given** multiple entries with audio, **When** user plays one, **Then** previous audio automatically stops
5. **Given** audio playback controls, **When** displayed, **Then** options include play/pause, playback speed (0.5x, 1x, 1.5x), and volume
6. **Given** entry without audio, **When** displayed, **Then** no audio icon appears or icon is disabled with tooltip explaining "No audio available"

---

### User Story 6 - Export and Download Functionality (Priority: P3)

Users want to export search results or specific dictionary entries in various formats (CSV, JSON, PDF) for offline use or study materials.

**Why this priority**: Useful for academic research and creating study materials, but not essential for primary dictionary lookup workflow.

**Independent Test**: Can be tested by selecting entries, choosing export format, and verifying downloaded file contains correct data.

**Acceptance Scenarios**:

1. **Given** user viewing search results, **When** they click "Export" button, **Then** modal shows format options (CSV, JSON, PDF) and field selection
2. **Given** user selects CSV format, **When** exporting, **Then** file includes columns for word, phonetic, origin, description in selected language
3. **Given** user selects JSON format, **When** exporting, **Then** file contains complete dictionary entry data including attributes and sourceData
4. **Given** user selects PDF format, **When** exporting, **Then** file generates formatted document with proper Sanskrit fonts
5. **Given** user selects multiple entries, **When** exporting, **Then** only selected entries are included in download
6. **Given** user exports with filters active, **When** downloading, **Then** export includes all results matching current filters (not just visible page)
7. **Given** large export (1000+ entries), **When** processing, **Then** system shows progress bar and streams data to prevent memory issues
8. **Given** user exports results with origin filter "mw" active, **When** file downloads, **Then** filename follows pattern dictionary-export-20251115-143022-mw.csv with timestamp and filter codes
9. **Given** user exports with multiple filters (mw, ap90, word-length 5-10), **When** file downloads, **Then** filename includes relevant filter codes: dictionary-export-20251115-143022-mw-ap90-len5-10.json

---

### User Story 7 - Quick Lookup Popup Widget (Priority: P2)

Users want a lightweight dictionary popup that can be triggered from anywhere in the application to quickly look up words without leaving their current page.

**Why this priority**: Significantly improves workflow integration across the application. Valuable for users reading devotional content or Sanskrit texts.

**Independent Test**: Can be tested by triggering popup from entity pages, typing a word, and seeing instant results without page change.

**Acceptance Scenarios**:

1. **Given** user on any application page, **When** they press keyboard shortcut (Ctrl+Shift+D or Cmd+Shift+D), **Then** dictionary popup appears
2. **Given** popup opened, **When** user types search term, **Then** results appear inline within popup using same search logic as main page
3. **Given** popup with results, **When** user clicks entry, **Then** full detail modal opens over popup
4. **Given** user selects text on page, **When** they right-click and select "Look up in dictionary", **Then** popup opens with pre-filled search
5. **Given** popup opened, **When** user clicks outside popup or presses Escape, **Then** popup closes and focus returns to previous location
6. **Given** popup search, **When** user wants more results, **Then** "Open in full dictionary" link redirects to main dictionary page with same query
7. **Given** popup in use, **When** rendering, **Then** popup size is compact (max 400px width) with scrollable results area

---

### User Story 8 - Comparison View for Multiple Dictionaries (Priority: P3)

Users want to see the same word's definition across multiple dictionary sources side-by-side for comparative study.

**Why this priority**: Advanced feature for serious scholars. Most users only need single dictionary view. Adds complexity to UI.

**Independent Test**: Can be tested by selecting a word and viewing its entries from 2-3 different dictionary origins in parallel columns.

**Acceptance Scenarios**:

1. **Given** user searches word available in multiple dictionaries, **When** clicking "Compare" button, **Then** split view shows each dictionary's entry in separate column
2. **Given** comparison view active, **When** displayed, **Then** columns are labeled with dictionary origin name
3. **Given** comparison with 3+ dictionaries, **When** rendered, **Then** horizontal scrolling enables viewing all columns
4. **Given** comparison view, **When** user hovers over difference, **Then** highlighting emphasizes unique content in each dictionary
5. **Given** user in comparison mode, **When** they toggle specific dictionaries, **Then** columns appear/disappear dynamically
6. **Given** comparison view on mobile, **When** displayed, **Then** vertical stacking replaces side-by-side columns

---

### User Story 9 - Code Architecture Refactoring (Priority: P0 - Foundation)

Developers need to refactor existing dictionary code to separate UI logic from business logic and consolidate server actions following project conventions, enabling maintainability and testability.

**Why this priority**: FOUNDATIONAL - Must be completed before implementing other enhancements. Current code mixes UI state management with business logic in components, violating separation of concerns. This refactoring enables cleaner implementation of all other user stories.

**Independent Test**: Can be tested by verifying all existing dictionary functionality works identically after refactoring, with new modular structure allowing isolated testing of business logic.

**Acceptance Scenarios**:

1. **Given** existing DictionaryResults component, **When** refactored, **Then** component only handles presentation logic while delegating search state to custom hook
2. **Given** dictionary search logic in actions.ts, **When** refactored, **Then** business logic is extracted to testable utility functions in src/lib/dictionary/search-service.ts
3. **Given** current inline query logic in components, **When** refactored, **Then** all TanStack Query usage is consolidated in custom hooks (use-dictionary-search.ts)
4. **Given** filter operations scattered across components, **When** refactored, **Then** filter logic is centralized in src/lib/dictionary/filter-service.ts with pure functions
5. **Given** server actions performing multiple responsibilities, **When** refactored, **Then** actions only handle authentication and delegate to service layer
6. **Given** direct database calls in actions, **When** refactored, **Then** repository pattern is used with src/lib/dictionary/dictionary-repository.ts abstracting Prisma queries
7. **Given** URL parameter handling in components, **When** refactored, **Then** URL state management is isolated in useSearchParamsUpdater hook
8. **Given** existing DictionaryResults with mixed concerns, **When** refactored, **Then** component is split into DictionaryResultsContainer (logic) and DictionaryResultsList (presentation)
9. **Given** search-toolbar with inline business logic, **When** refactored, **Then** toolbar uses useDictionaryFilters hook for all filter state and validation
10. **Given** refactored code structure, **When** running existing tests, **Then** 100% of existing functionality passes without behavioral changes
11. **Given** refactored service layer, **When** writing unit tests, **Then** business logic can be tested without React/Next.js dependencies

**Refactoring Scope**:

**Phase 1 - Repository Layer**:

- Create `src/lib/dictionary/dictionary-repository.ts` with methods: findWords(), countWords(), aggregateSearch()
- Extract all Prisma queries from actions.ts to repository
- Add TypeScript interfaces for repository methods

**Phase 2 - Service Layer**:

- Create `src/lib/dictionary/search-service.ts` with functions: performSearch(), calculateRelevance(), applyFilters()
- Create `src/lib/dictionary/filter-service.ts` with functions: validateFilters(), buildFilterQuery(), serializeFilters()
- Move business logic from actions.ts to services

**Phase 3 - Server Actions Cleanup**:

- Simplify actions.ts to only: authenticate, call services, handle errors, return discriminated union responses
- Ensure all actions follow pattern: auth check → service call → response formatting

**Phase 4 - Hook Consolidation**:

- Enhance `use-dictionary-search.ts` to handle all search state, filters, pagination
- Create `use-dictionary-filters.ts` for filter panel state management
- Remove direct TanStack Query calls from components

**Phase 5 - Component Refactoring**:

- Split DictionaryResults into container/presentation components
- Update search-toolbar to use hooks exclusively
- Remove all business logic from JSX components

**Success Metrics for Refactoring**:

- Zero breaking changes to existing functionality
- 90%+ reduction in component complexity (measured by lines of code in components)
- 100% of business logic testable without React
- All server actions under 50 lines of code
- Repository layer fully abstracted from business logic

---

### Edge Cases

- What happens when full-text search returns 5000+ results? **Pagination limits to 50 results per page, total count displayed, recommendation to refine search**
- How does system handle search queries with special regex characters? **System escapes special characters automatically or shows validation error with helpful message**
- What happens when user applies contradictory filters (e.g., origin="mw" AND origin="ap90" with AND logic)? **System validates filter logic, shows warning message, uses OR logic for same-field filters**
- How does system handle saved searches when dictionary schema changes? **System validates saved search against current schema, marks outdated searches, prompts user to update**
- What happens when exporting 10,000+ entries to PDF? **System shows warning about file size, offers to split into multiple files, or suggests CSV/JSON alternatives**
- How does system handle audio playback when file is missing or URL broken? **Graceful error with "Audio unavailable" message, logs error for admin review**
- What happens when user's search history reaches storage limit? **System auto-prunes oldest entries beyond 100 items, provides option to clear history**
- How does comparison view handle dictionaries with different schemas? **System maps to common fields (word, phonetic, description), shows unique fields in "Additional Info" section**
- What happens when popup is triggered on small mobile screen? **Popup expands to full-screen modal on mobile devices for better usability**
- How does highlighting handle Sanskrit conjuncts and ligatures? **Word-level highlighting preserves grapheme clusters, highlighting complete words without breaking visual integrity of Devanagari/Telugu characters**
- What happens to anonymous user's saved searches when they log in? **System detects localStorage saved searches and prompts user with option to migrate to account (preserving existing account searches) or discard localStorage searches**
- What happens when export filename would exceed filesystem limits due to many active filters? **System truncates filter codes at 200 characters, adds ellipsis, ensures total filename stays under 255 characters while preserving timestamp and extension**

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST implement relevance scoring algorithm for full-text search with score range 0-100
- **FR-002**: System MUST highlight matching text at word boundaries in both word and description fields using visual markers that preserve ligatures and conjuncts
- **FR-002a**: System MUST detect word boundaries appropriately for Sanskrit, Telugu, and Latin scripts without breaking grapheme clusters
- **FR-003**: System MUST support multi-script search where query in any script (Devanagari, IAST, ITRANS) matches all script variations
- **FR-004**: System MUST provide filter options for origin, language, word length (min/max characters), has-audio boolean, has-attributes boolean, and date range in a collapsible sidebar panel
- **FR-004a**: System MUST require explicit "Apply" button click in filter panel to execute filter changes and update results
- **FR-004b**: System MUST provide "Clear All" button in filter panel that immediately resets all filters and updates results
- **FR-004c**: System MUST discard pending filter changes when user closes filter panel without clicking "Apply"
- **FR-005**: System MUST support combining multiple filters using AND logic for different fields and OR logic for same field multiple values
- **FR-006**: System MUST persist active filters in URL query parameters for shareable links and restore filter panel state on page load
- **FR-007**: System MUST provide three view modes: Compact (single line), Card (medium detail), Detailed (all fields)
- **FR-008**: System MUST apply appropriate Unicode fonts based on detected script (Devanagari, Telugu, IAST)
- **FR-009**: System MUST support responsive layout adapting from multi-column to single-column on mobile devices
- **FR-010**: System MUST allow users to save search configurations with custom names
- **FR-011**: System MUST store saved searches in user account database for authenticated users and browser localStorage for anonymous users with maximum 50 saved searches per user
- **FR-011a**: System MUST sync saved searches across devices for logged-in users via database storage
- **FR-011b**: System MUST prompt anonymous users to migrate localStorage saved searches to their account upon login
- **FR-012**: System MUST maintain search history with last 20 queries including timestamp
- **FR-013**: System MUST support exporting search results to CSV, JSON, and PDF formats
- **FR-013a**: System MUST name exported files using pattern dictionary-export-{YYYYMMDD-HHMMSS}-{filter-codes}.{ext} where timestamp is in UTC and filter codes are abbreviated active filter values
- **FR-013b**: System MUST limit filename length to 255 characters, truncating filter codes with ellipsis if necessary while preserving timestamp and extension
- **FR-014**: System MUST stream large exports (1000+ entries) using chunked processing to prevent memory issues
- **FR-015**: System MUST include selected fields in export based on user preference (all fields vs. specific fields)
- **FR-016**: System MUST provide inline audio playback controls with play/pause, speed adjustment (0.5x, 1x, 1.5x), and volume
- **FR-017**: System MUST auto-stop previous audio when new audio plays
- **FR-018**: System MUST render dictionary popup as modal overlay with max 400px width and scrollable content
- **FR-019**: System MUST support keyboard shortcut (Ctrl/Cmd+Shift+D) to trigger popup from any page
- **FR-020**: System MUST provide comparison view for displaying same word across multiple dictionary sources
- **FR-021**: System MUST highlight differences when comparing dictionary entries using visual indicators
- **FR-022**: System MUST handle missing audio files gracefully with clear user feedback
- **FR-023**: System MUST validate filter combinations and prevent contradictory logic
- **FR-024**: System MUST escape special regex characters in user search queries automatically
- **FR-025**: System MUST auto-prune search history beyond 100 items keeping most recent
- **FR-026**: System MUST preserve user's view mode preference across sessions
- **FR-027**: System MUST show relevance score percentage with each search result
- **FR-028**: System MUST support diacritic-agnostic search with priority for exact diacritic matches
- **FR-029**: System MUST meet WCAG 2.1 Level AA accessibility standards for all dictionary enhancement features
- **FR-030**: System MUST support full keyboard navigation with visible focus indicators for all interactive elements
- **FR-031**: System MUST provide appropriate ARIA labels, roles, and live regions for screen reader users
- **FR-032**: System MUST announce dynamic content changes (filter updates, search results, modal openings) to assistive technologies
- **FR-033**: System MUST maintain logical tab order through search interface, filters, results, and all controls
- **FR-034**: System MUST ensure minimum 4.5:1 color contrast ratio for normal text and 3:1 for large text and UI components

### Code Architecture Requirements (Refactoring)

- **FR-035**: System MUST implement repository pattern with DictionaryRepository class in src/lib/dictionary/dictionary-repository.ts abstracting all Prisma database operations
- **FR-036**: System MUST separate business logic into service layer with SearchService and FilterService in src/lib/dictionary/ with pure, testable functions
- **FR-037**: System MUST limit server actions in src/app/(app)/dictionary/actions.ts to authentication, service delegation, and response formatting with maximum 50 lines per action
- **FR-038**: System MUST consolidate all TanStack Query usage into custom hooks (use-dictionary-search.ts, use-dictionary-filters.ts) removing direct query calls from components
- **FR-039**: System MUST implement container/presentation component pattern with DictionaryResultsContainer handling logic and DictionaryResultsList handling rendering
- **FR-040**: System MUST extract URL parameter state management to useSearchParamsUpdater hook with no direct searchParams manipulation in UI components
- **FR-041**: System MUST implement discriminated union response types for all server actions following pattern: {status: "success", data: T} | {status: "error", error: string}
- **FR-042**: System MUST ensure repository methods accept plain TypeScript types (not Prisma types) as parameters for better abstraction
- **FR-043**: System MUST implement dependency injection pattern where services receive repository as constructor parameter for testability
- **FR-044**: System MUST maintain 100% backward compatibility with existing dictionary functionality after refactoring with zero breaking changes to public API
- **FR-045**: System MUST enable unit testing of business logic without React/Next.js dependencies by keeping services framework-agnostic
- **FR-046**: System MUST follow project's Prisma client location convention (import from @/app/generated/prisma) in repository layer only
- **FR-047**: System MUST implement error boundaries in container components to handle service layer errors gracefully
- **FR-048**: System MUST use Zod schemas for input validation in service layer with clear error messages for invalid data

### Key Entities

- **SearchResult**: Extended with relevance score (0-100 float), highlighted text snippets, match type (exact, prefix, fuzzy), search metadata
- **UserFilter**: Configuration object containing origin array, language string, word length range (min/max), has-audio boolean, has-attributes boolean, date range (start/end), sort preferences
- **SavedSearch**: Named search configuration with optional user ID (null for anonymous), search name, query text, filter configuration, sort order, creation timestamp, last used timestamp, storage type (database or localStorage)
- **SearchHistory**: Individual search record with query text, filters applied, timestamp, result count
- **ViewMode**: Enumeration of display layouts (COMPACT, CARD, DETAILED)
- **ExportConfiguration**: Format type (CSV/JSON/PDF), selected fields array, filter snapshot, total entry count, generated filename with timestamp and filter codes

### Architecture Entities (Refactoring)

- **DictionaryRepository**: Data access layer interface with methods findWords(query), countWords(filters), aggregateSearch(pipeline), abstracting Prisma operations
- **SearchService**: Business logic for search operations with methods performSearch(params), calculateRelevance(word, query), normalizeScripts(text)
- **FilterService**: Filter management with methods validateFilters(filters), buildQuery(filters), serializeToUrl(filters), deserializeFromUrl(params)
- **SearchState**: Immutable state object containing searchTerm, filters, sortOptions, pagination, used by hooks and services
- **RepositoryQuery**: Internal query representation converting domain filters to database-specific queries (MongoDB aggregation, Prisma where clauses)
- **ServiceResponse<T>**: Generic response wrapper for service layer: {success: boolean, data?: T, error?: string, metadata?: object}

### Technical Constraints

- MongoDB full-text search with $text and $meta: "textScore" for relevance scoring
- Text highlighting using regex-based string replacement or search-friendly React components
- Sanscript library for multi-script normalization in search queries
- Browser localStorage for saved searches (max 5MB, fallback to IndexedDB for larger storage)
- URL query parameters for filter persistence using URLSearchParams API
- Server Actions for export operations using streaming responses for large datasets
- PDF generation using library like jsPDF with support for Unicode fonts
- Audio playback using HTML5 Audio API with Web Audio API for speed control
- Keyboard event listeners for global shortcuts with proper cleanup
- CSS Grid/Flexbox for responsive layouts with container queries for component-level responsiveness
- React state management for view mode preferences persisted to localStorage
- Debounced search input (300ms) to reduce API calls during typing

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Full-text search with relevance ranking returns ordered results within 800ms for databases with 100,000+ words
- **SC-002**: Search result highlighting renders visually distinct matches with <50ms render time per result
- **SC-003**: Users can apply 3+ simultaneous filters and see results update within 1 second
- **SC-004**: View mode switching (Compact/Card/Detailed) transitions smoothly with <200ms layout reflow
- **SC-005**: Saved searches are retrieved and restored within 500ms with all filters intact
- **SC-006**: Export of 1000 dictionary entries completes within 5 seconds for CSV/JSON, 15 seconds for PDF
- **SC-007**: Audio playback begins within 500ms of clicking play button
- **SC-008**: Dictionary popup opens within 300ms of keyboard shortcut or context menu selection
- **SC-009**: Comparison view displays 3 dictionaries side-by-side on desktop screens (1024px+) without horizontal scroll
- **SC-010**: Multi-script search successfully finds matches for 95%+ of Sanskrit words entered in any supported script
- **SC-011**: Users successfully complete common search tasks 40% faster with new filtering compared to basic search
- **SC-012**: Mobile responsive layout maintains full functionality with no feature loss compared to desktop
- **SC-013**: Search history and saved searches persist across browser sessions with 100% accuracy
- **SC-014**: Exported files contain accurate data with proper encoding for 99%+ of entries
- **SC-015**: Inline audio works for 90%+ of dictionary entries that have audio files associated
- **SC-016**: All interactive elements are fully operable via keyboard with no functionality requiring mouse-only interaction
- **SC-017**: Dictionary interface passes automated accessibility testing tools (axe, WAVE) with zero critical violations
- **SC-018**: Saved searches for logged-in users sync across devices within 5 seconds of save action
- **SC-019**: Exported filenames are human-readable and enable users to identify export contents and timestamp without opening the file

### Code Quality Outcomes (Refactoring)

- **SC-020**: All existing dictionary functionality maintains 100% behavioral compatibility after refactoring with zero regression bugs
- **SC-021**: Component code complexity reduces by 80%+ measured by cyclomatic complexity (components average under 5 complexity score)
- **SC-022**: Business logic test coverage reaches 90%+ for service layer with tests requiring no React/Next.js runtime
- **SC-023**: Server actions average under 40 lines of code each with single responsibility (authentication + delegation)
- **SC-024**: Repository layer successfully isolates 100% of database queries from business logic with no Prisma imports outside repository
- **SC-025**: Custom hooks (use-dictionary-search, use-dictionary-filters) handle 100% of TanStack Query operations with zero direct useQuery calls in components
- **SC-026**: Service layer functions achieve 95%+ pure function ratio (no side effects, deterministic outputs)
- **SC-027**: Refactored code passes TypeScript strict mode with zero type assertions or 'any' types in new code
- **SC-028**: Performance metrics maintain or improve after refactoring: search operations complete in same or less time compared to baseline
- **SC-029**: New architecture enables adding new filter types in under 50 lines of code without modifying existing components
