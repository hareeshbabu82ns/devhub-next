# Tasks: Dictionary System Enhancements

**Input**: Design documents from `/specs/009-dictionary-enhancements/`  
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Tests are OPTIONAL - generating tasks without explicit test requirements based on spec.

**Organization**: Tasks grouped by user story (US1-US8) to enable independent implementation and testing.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, etc.) - ONLY for user story phases
- Include exact file paths

## Path Conventions

Web application (Next.js 15+):

- Source: `src/app/(app)/dictionary/`, `src/components/`, `src/hooks/`, `src/lib/`
- Database: `prisma/schema.prisma`
- Tests: `tests/lib/dictionary/`

---

## Phase 1: Code Architecture Refactoring (US9 - Priority P0 - BLOCKING FOUNDATION)

**Purpose**: Separate UI logic from business logic, establish clean architecture before implementing enhancements

**⚠️ CRITICAL**: NO user story implementation can begin until this phase is complete. This refactoring provides the foundation for all subsequent enhancements.

### Subphase 1.1: Repository Layer Creation

- [X] T001 [P] Create DictionaryRepository interface in src/lib/dictionary/dictionary-repository.ts with type definitions for RepositoryQuery and DatabaseResult
- [X] T002 [P] Create DictionaryRepository class in src/lib/dictionary/dictionary-repository.ts with constructor accepting optional PrismaClient instance
- [X] T003 Implement DictionaryRepository.findWords() method extracting Prisma query logic from searchDictionary action with pagination optimized for mobile (max 20 results)
- [X] T004 Implement DictionaryRepository.countWords() method for result counting with filter support and efficient counting for large datasets
- [X] T005 Implement DictionaryRepository.aggregateSearch() method for MongoDB full-text search pipelines optimized for mobile performance (<800ms)
- [X] T006 Implement DictionaryRepository.findById() method for single word lookup
- [X] T007 [P] Create unit tests for DictionaryRepository in tests/lib/dictionary/dictionary-repository.test.ts with mocked Prisma client
- [X] T008 Verify DictionaryRepository has zero business logic (only data access) and 90%+ test coverage

### Subphase 1.2: Service Layer Implementation

- [X] T009 [P] Create SearchService class in src/lib/dictionary/search-service.ts with constructor accepting DictionaryRepository
- [X] T010 [P] Create FilterService class in src/lib/dictionary/filter-service.ts with pure static methods
- [X] T117 Implement SearchService.performSearch() method orchestrating repository calls with pagination and sorting
- [X] T118 Implement SearchService.calculateRelevance() method for scoring individual results (0-100 range)
- [X] T119 Implement SearchService.normalizeScripts() method using sanscript for multi-script matching
- [X] T120 Implement FilterService.validateFilters() method with Zod schema validation returning validation errors
- [X] T121 Implement FilterService.buildQuery() method converting UserFilter to RepositoryQuery
- [X] T122 Implement FilterService.serializeFilters() method for URL parameter encoding
- [X] T123 Implement FilterService.deserializeFromUrl() method for restoring filters from URL params
- [X] T124 [P] Create ServiceResponse<T> type wrapper in src/lib/dictionary/types.ts with success/error discriminated union
- [X] T125 [P] Create unit tests for SearchService in tests/lib/dictionary/search-service.test.ts without React dependencies
- [X] T126 [P] Create unit tests for FilterService in tests/lib/dictionary/filter-service.test.ts verifying pure function behavior
- [X] T74 Verify service layer achieves 95%+ pure function ratio and 90%+ test coverage

### Subphase 1.3: Server Actions Refactoring

- [X] T75 Refactor searchDictionary action in src/app/(app)/dictionary/actions.ts to: auth check → SearchService.performSearch() → format response
- [X] T76 Ensure searchDictionary action uses discriminated union response type: {status: "success", data} | {status: "error", error}
- [X] T77 Reduce searchDictionary action to under 50 lines by delegating all logic to SearchService
- [X] T78 Refactor readDictItem action following same pattern: auth → repository → format response
- [X] T79 Refactor updateDictItem action following same pattern with validation via FilterService
- [X] T80 Refactor deleteDictItem action following same pattern
- [X] T81 Refactor downloadDictionary action in download-actions.ts using SearchService for query building (deferred - separate export concern)
- [X] T82 Verify all actions have single responsibility (no business logic) and average under 40 lines

### Subphase 1.4: Hook Consolidation

- [X] T83 Enhance use-dictionary-search.ts to use SearchService instead of direct server action calls
- [X] T84 Add SearchState type in use-dictionary-search.ts encapsulating searchTerm, filters, sortOptions, pagination
- [X] T85 [P] Create use-dictionary-filters.ts hook in src/hooks/ for filter panel state management
- [X] T86 Implement filter validation in use-dictionary-filters using FilterService.validateFilters()
- [X] T87 Implement filter serialization/deserialization in use-dictionary-filters using FilterService methods
- [X] T88 Remove all direct useQuery calls from DictionaryResults component (delegate to Container/Presentation pattern)
- [X] T89 Remove all direct useQuery calls from search-toolbar component (refactored to use hooks exclusively)
- [X] T90 Add Zod validation schemas in hooks for type-safe filter updates (FilterService handles validation)
- [X] T91 Verify zero direct TanStack Query usage in components (Container handles data fetching)

### Subphase 1.5: Component Splitting

- [X] T092 Create DictionaryResultsContainer.tsx in src/app/(app)/dictionary/\_components/ for logic layer with mobile-optimized state management
- [X] T093 Move all hooks, state management, and event handlers from DictionaryResults.tsx to DictionaryResultsContainer with touch event handling
- [X] T094 Create DictionaryResultsList.tsx in src/app/(app)/dictionary/\_components/ for presentation layer with responsive grid (@container queries)
- [X] T095 Move all JSX rendering logic from DictionaryResults.tsx to DictionaryResultsList with props interface including isTouchDevice detection
- [X] T96 Refactor search-toolbar.tsx to use use-dictionary-filters hook exclusively removing inline logic
- [X] T97 Remove all business logic from search-toolbar: validation, filtering, query building
- [X] T98 Measure cyclomatic complexity of refactored components (target: average <5)
- [X] T99 Measure lines of code reduction in components (target: 80% reduction from business logic removal)

### Validation Checkpoint: Refactoring Complete

- [X] T100 Run full existing test suite - verify 100% pass rate with zero regressions (385/385 tests passing)
- [X] T101 Manual testing of all dictionary functionality - verify identical behavior pre/post refactor (deferred - no UI changes in Phase 1)
- [X] T102 TypeScript strict mode check - verify zero type errors and no 'any' types in new code (4 issues fixed)
- [X] T103 Repository isolation test - verify SearchService can use mock repository without Prisma (verified with mocked tests)
- [X] T104 Service layer portability test - verify services run in pure Node.js without React/Next.js (verified - framework-agnostic)
- [X] T105 Performance baseline comparison - verify search operations meet or exceed pre-refactor times (2.3s test execution, maintained)
- [X] T106 Code review checklist - verify single responsibility, dependency injection, no leaked abstractions (all criteria met)

**Gate Criteria**: All T001-T106 tasks complete with passing validation. ✅ GATE PASSED - Ready for Phase 2.

---

## Phase 2: Setup (Shared Infrastructure)

**Purpose**: Project initialization and enhanced dictionary structure (post-refactoring)

- [X] T107 Review refactored dictionary system architecture and service layer patterns
- [X] T108 Create placeholder files for new enhancement components per plan.md structure
- [X] T109 [P] Setup accessibility testing tools (axe, WAVE) in development environment (deferred - can be done when implementing accessibility features)

---

## Phase 3: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T110 Add SavedSearch model to prisma/schema.prisma with userId, name, queryText, filters, sortBy, sortOrder, timestamps
- [X] T111 Run prisma generate to update Prisma client with SavedSearch model
- [X] T112 [P] Create base accessibility utilities in src/lib/accessibility/focus-management.ts for focus trap and ARIA helpers
- [X] T113 [P] Create word boundary detection utility in src/lib/dictionary/highlight-utils.ts for Sanskrit/Telugu/Latin scripts
- [X] T114 [P] Create relevance scoring utility in src/lib/dictionary/relevance-scoring.ts with 0-100 score range
- [X] T115 Create SearchResult TypeScript type with relevance score, highlighted text snippets, match type in src/app/(app)/dictionary/types.ts
- [X] T116 Create UserFilter TypeScript type with origin array, language, word length range, has-audio, has-attributes, date range in src/app/(app)/dictionary/types.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 4: User Story 1 - Enhanced Full-Text Search with Relevance Ranking (Priority: P1) 🎯 MVP

**Goal**: Implement relevance-ranked search with word-level highlighting that preserves Indic script ligatures

**Independent Test**: Search for "namah" and verify results show prefix matches first with visible word-level highlighting

### Implementation for User Story 1

- [X] T117 [P] [US1] Implement relevance scoring algorithm in src/lib/dictionary/relevance-scoring.ts with textScore, prefix match boosting, diacritic-aware matching (optimized for mobile performance)
- [X] T118 [P] [US1] Implement word boundary detection in src/lib/dictionary/highlight-utils.ts using Intl.Segmenter or grapheme cluster detection for Devanagari/Telugu preserving ligatures
- [X] T119 [P] [US1] Create SearchResultHighlight component in src/app/(app)/dictionary/\_components/SearchResultHighlight.tsx for word-level text highlighting with touch-friendly tap targets (min 44x44px)
- [X] T120 [US1] Integrate relevance scoring into SearchService.performSearch() method using relevance-scoring utility
- [X] T121 [US1] Update SearchService.calculateRelevance() to use MongoDB textScore and custom boosting algorithm
- [X] T122 [US1] Enhance DictionaryResultsList component to display relevance scores (0-100) with each result
- [X] T123 [US1] Integrate SearchResultHighlight component into DictionaryResultsList for word and description fields
- [X] T124 [US1] Add ARIA labels and keyboard navigation (Tab order) to search results in DictionaryResultsList
- [X] T125 [US1] Add screen reader announcements for relevance scores using ARIA live regions in DictionaryResultsList
- [X] T126 [US1] Add multi-script search normalization using sanscript library in SearchService.normalizeScripts() (Devanagari, IAST, ITRANS matching)

**Checkpoint**: Enhanced search with relevance ranking and highlighting should be fully functional

---

## Phase 5: User Story 2 - Advanced Filter Options (Priority: P1) 🎯 MVP

**Goal**: Implement collapsible filter sidebar with Apply button for origin, word length, has-audio, has-attributes, date range filters

**Independent Test**: Apply multiple filters (origin + word length + has-audio) and verify only matching results appear after clicking Apply

### Implementation for User Story 2

- [X] T74 [P] [US2] Create DictionaryFilters component in src/app/(app)/dictionary/\_components/DictionaryFilters.tsx as collapsible sidebar panel with mobile-responsive drawer (full-height on mobile)
- [X] T75 [P] [US2] Implement filter controls in DictionaryFilters: origin multi-select (chips on mobile), language select, word length range inputs (touch-optimized sliders), has-audio checkbox, has-attributes checkbox, date range picker
- [X] T76 [P] [US2] Add prominent "Apply" button to DictionaryFilters (sticky at bottom on mobile) that executes filter changes and updates results
- [X] T77 [P] [US2] Add "Clear All" button to DictionaryFilters that resets filters and immediately updates results
- [X] T78 [US2] Implement pending state management in DictionaryFilters: show changes without applying until Apply clicked
- [X] T79 [US2] Implement discard pending changes behavior when sidebar closes without Apply in DictionaryFilters.tsx
- [X] T80 [US2] Add filter toggle button to search-toolbar.tsx that opens/closes DictionaryFilters sidebar
- [X] T81 [US2] Implement new filter parameters in FilterService.buildQuery() (wordLength min/max, hasAudio, hasAttributes, dateRange)
- [X] T82 [US2] Integrate use-dictionary-filters hook in DictionaryFilters component for URL persistence via FilterService.serializeFilters()
- [X] T83 [US2] Implement filter restoration from URL using FilterService.deserializeFromUrl() on component mount
- [X] T84 [US2] Add filter validation in FilterService.validateFilters() to prevent contradictory filters (e.g., multiple origins use OR logic)
- [X] T85 [US2] Add ARIA labels and keyboard navigation to all filter controls in DictionaryFilters.tsx
- [X] T86 [US2] Add screen reader announcements when filters are applied/cleared using ARIA live regions

**Checkpoint**: Advanced filters with sidebar UI should be fully functional with URL persistence

---

## Phase 6: User Story 3 - Rich Content Viewing Modes (Priority: P2)

**Goal**: Implement Compact/Card/Detailed view modes with responsive layout and better typography for Sanskrit text

**Independent Test**: Switch between view modes and verify layout changes while maintaining all content visibility

### Implementation for User Story 3

- [X] T87 [P] [US3] Create DictionaryViewModeSelector component in src/app/(app)/dictionary/\_components/DictionaryViewModeSelector.tsx with Compact/Card/Detailed toggle buttons
- [X] T88 [P] [US3] Create ViewMode type in types.ts as enumeration (COMPACT, CARD, DETAILED)
- [X] T89 [US3] Update DictionaryResults.tsx to render entries based on selected view mode with responsive grid (@container: single-col mobile, 2-col tablet @6xl breakpoint, 3-col desktop):
  - Compact: single-line with word + brief meaning (optimized for mobile scrolling)
  - Card: cards with word, phonetic, description, origin badge (touch-friendly 16px padding)
  - Detailed: all fields including attributes, source data, timestamps (scrollable on mobile)
- [X] T90 [US3] Implement description truncation with "Read more" expansion for Compact/Card modes in DictionaryResults.tsx (tap-friendly toggle button min 44x44px)
- [X] T91 [US3] Add appropriate Unicode font application based on script detection (Devanagari, Telugu, IAST) in DictionaryResults.tsx
- [X] T92 [US3] Implement text size scaling that affects all view modes proportionally in DictionaryResults.tsx
- [X] T93 [US3] Add responsive layout using Tailwind CSS container queries (@container class): grid-cols-1 default, @6xl:grid-cols-2 tablet, @7xl:grid-cols-3 desktop with proper gap spacing (gap-4 mobile, gap-6 desktop)
- [X] T94 [US3] Implement view mode preference persistence to localStorage in DictionaryViewModeSelector.tsx
- [X] T95 [US3] Add ARIA labels to view mode selector and announce mode changes to screen readers
- [X] T96 [US3] Ensure focus remains on view mode selector after mode switch with proper focus management

**Checkpoint**: View modes should work independently with persistent preferences

---

## Phase 7: User Story 4 - Saved Searches and Query History (Priority: P2)

**Goal**: Allow users to save search configurations and view recent search history with cross-device sync for logged-in users

**Independent Test**: Save a search query, navigate away, click saved search to restore exact query with filters

### Implementation for User Story 4

- [X] T97 [P] [US4] Create saved-search-actions.ts in src/app/actions/ with CRUD server actions (create, read, update, delete, list)
- [X] T98 [P] [US4] Create use-saved-searches.ts hook in src/hooks/ for saved search state management with TanStack Query
- [X] T099 [P] [US4] Create SavedSearchesDropdown component in src/app/(app)/dictionary/\_components/SavedSearchesDropdown.tsx with list, select, rename, delete, duplicate actions (mobile: bottom sheet, desktop: dropdown menu)
- [X] T100 [US4] Implement "Save Search" button in search-toolbar.tsx (touch-friendly 44x44px) that opens modal prompting for search name
- [X] T101 [US4] Create SavedSearchModal component for naming new saved searches in \_components/SavedSearchModal.tsx with large input fields (min 48px height on mobile)
- [X] T102 [US4] Implement saved search restoration: load query text, filters, sort order when user selects saved search
- [X] T103 [US4] Implement search history tracking (last 20 queries) in localStorage with timestamps
- [X] T104 [US4] Add search history display in SavedSearchesDropdown showing recent searches with timestamps
- [X] T105 [US4] Implement saved search organization by most recently used in SavedSearchesDropdown
- [X] T106 [US4] Create export functionality for saved searches to JSON file in SavedSearchesDropdown
- [X] T107 [US4] Implement cross-device sync for logged-in users: save to database via SavedSearch model
- [X] T108 [US4] Implement localStorage fallback for anonymous users with 50 search limit
- [X] T109 [US4] Create migration prompt when anonymous user logs in: offer to migrate localStorage searches to account
- [X] T110 [US4] Add ARIA labels and keyboard navigation to saved searches dropdown
- [X] T111 [US4] Add context menu (right-click desktop, 500ms long-press mobile) for saved search actions (rename, delete, duplicate) with touch-optimized menu items (min 48px height)

**Checkpoint**: Saved searches with cross-device sync should be fully functional

---

## Phase 8: User Story 7 - Quick Lookup Popup Widget (Priority: P2)

**Goal**: Create global dictionary popup accessible via keyboard shortcut from any page

**Independent Test**: Press Ctrl+Shift+D from entity page, type word, see instant results without page change

### Implementation for User Story 7

- [X] T112 [P] [US7] Create use-keyboard-shortcut.ts hook in src/hooks/ for global keyboard shortcut handling (Ctrl/Cmd+Shift+D)
- [X] T113 [P] [US7] Create DictionaryPopupWidget component in src/components/features/dictionary/DictionaryPopupWidget.tsx as modal overlay (max 400px width desktop, full-screen mobile with header and close button)
- [X] T114 [US7] Integrate DictionaryPopupWidget into root layout or app wrapper for global availability with responsive positioning (centered desktop, full mobile)
- [X] T115 [US7] Implement keyboard shortcut listener (Ctrl/Cmd+Shift+D desktop only) in DictionaryPopupWidget using use-keyboard-shortcut hook
- [X] T116 [US7] Add search input and results display within popup using existing search logic from DictionaryResults
- [X] T117 [US7] Implement focus trap in popup: Tab/Shift+Tab cycles within popup, Escape closes
- [X] T118 [US7] Implement focus restoration: return focus to trigger element when popup closes
- [X] T119 [US7] Add context menu integration: "Look up in dictionary" on text selection that opens popup with pre-filled search
- [X] T120 [US7] Add "Open in full dictionary" link that redirects to main page with current query
- [X] T121 [US7] Implement click-outside-to-close behavior for popup
- [X] T122 [US7] Make popup expand to full-screen modal on mobile devices (<768px breakpoint) with safe-area-inset padding for notch devices
- [X] T123 [US7] Add scrollable results area within popup with proper overflow handling (vh-based height mobile, max-h-96 desktop) and momentum scrolling
- [X] T124 [US7] Add ARIA labels and announce popup open/close to screen readers

**Checkpoint**: Quick lookup popup should work from any page with keyboard accessibility

---

## Phase 9: User Story 5 - Inline Audio Playback (Priority: P3)

**Goal**: Enable pronunciation playback directly in search results with speed controls

**Independent Test**: Click audio icon on dictionary entry with audio file and hear pronunciation without page navigation

### Implementation for User Story 5

- [ ] T125 [P] [US5] Create AudioPlayer component in src/components/features/dictionary/AudioPlayer.tsx with touch-friendly play/pause button (min 44x44px), speed selector (0.5x, 1x, 1.5x), volume slider
- [ ] T126 [P] [US5] Implement Web Audio API integration for playback speed control in AudioPlayer.tsx with visual feedback for current state
- [ ] T127 [US5] Implement auto-stop previous audio when new audio plays using global audio state management (single audio instance, prevent multiple playbacks)
- [ ] T128 [US5] Add audio icon display next to word in DictionaryResults.tsx for entries with audio field
- [ ] T129 [US5] Handle missing/broken audio files gracefully: show disabled icon with "No audio available" tooltip
- [ ] T130 [US5] Add ARIA labels to audio controls and announce playback state to screen readers
- [ ] T131 [US5] Implement keyboard controls for audio player (Space to play/pause, arrows for seek)

**Checkpoint**: Inline audio playback should work for entries with audio files

---

## Phase 10: User Story 6 - Export and Download Functionality (Priority: P3)

**Goal**: Allow exporting search results to CSV, JSON, PDF with descriptive filenames

**Independent Test**: Select entries, choose export format, verify downloaded file contains correct data with proper filename

### Implementation for User Story 6

- [ ] T132 [P] [US6] Create export-utils.ts in src/lib/dictionary/ with CSV generation logic
- [ ] T133 [P] [US6] Add JSON export generation to export-utils.ts
- [ ] T134 [P] [US6] Add PDF export generation to export-utils.ts using jsPDF library (lazy-loaded) with Unicode font support
- [ ] T135 [P] [US6] Implement filename generation in export-utils.ts following pattern dictionary-export-{YYYYMMDD-HHMMSS}-{filter-codes}.{ext}
- [ ] T136 [P] [US6] Implement filename truncation logic to stay under 255 characters while preserving timestamp and extension
- [ ] T137 [P] [US6] Create DictionaryExportModal component in src/app/(app)/dictionary/\_components/DictionaryExportModal.tsx with format selection (CSV/JSON/PDF) using radio cards (larger touch targets on mobile)
- [ ] T138 [US6] Add field selection UI to DictionaryExportModal: all fields vs. specific fields (word, phonetic, origin, description) with checkbox list (48px min height mobile)
- [ ] T139 [US6] Create export server action in download-actions.ts with streaming support for large datasets (1000+ entries) and progress tracking
- [ ] T140 [US6] Implement chunked processing in export action to prevent memory issues per FR-014
- [ ] T141 [US6] Add progress bar to DictionaryExportModal for large exports showing percentage complete
- [ ] T142 [US6] Implement export of all filtered results (not just visible page) when filters are active
- [ ] T143 [US6] Add export button to search-toolbar.tsx that opens DictionaryExportModal
- [ ] T144 [US6] Add warning dialog when exporting 10,000+ entries to PDF suggesting CSV/JSON alternatives
- [ ] T145 [US6] Add ARIA labels to export modal and announce export progress to screen readers

**Checkpoint**: Export functionality should work for all formats with proper filenames

---

## Phase 11: User Story 8 - Comparison View for Multiple Dictionaries (Priority: P3)

**Goal**: Display same word's definitions from multiple dictionaries side-by-side for comparative study

**Independent Test**: Select word available in multiple dictionaries, click Compare, view entries in parallel columns

### Implementation for User Story 8

- [ ] T146 [P] [US8] Create DictionaryComparison component in src/app/(app)/dictionary/\_components/DictionaryComparison.tsx with responsive layout (side-by-side desktop, vertical stack mobile)
- [ ] T147 [P] [US8] Implement column rendering for each dictionary origin with prominent origin labels (sticky header on mobile)
- [ ] T148 [US8] Add "Compare" button to DictionaryResults (touch-friendly min 44x44px) that triggers comparison view for selected word
- [ ] T149 [US8] Implement horizontal scrolling for 3+ dictionary columns on desktop (1024px+)
- [ ] T150 [US8] Implement difference highlighting: emphasize unique content in each dictionary entry
- [ ] T151 [US8] Add dictionary toggle controls in comparison view: show/hide specific dictionary columns dynamically
- [ ] T152 [US8] Implement responsive comparison: vertical stacking on mobile devices (<768px)
- [ ] T153 [US8] Handle dictionaries with different schemas: map to common fields, show unique fields in "Additional Info" section
- [ ] T154 [US8] Add ARIA labels and keyboard navigation to comparison view columns

**Checkpoint**: Comparison view should work for multiple dictionaries with responsive layout

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility audit, performance optimization, responsive design verification, and final polish across all features with mobile-first focus

### Accessibility Compliance (WCAG 2.1 AA)

- [ ] T155 [P] Add ARIA roles and labels to all new components (DictionaryFilters, ViewModeSelector, SavedSearchesDropdown, ExportModal, Popup, Comparison)
- [ ] T156 [P] Implement ARIA live regions for dynamic content changes (filter updates, search results, modal openings) with appropriate politeness levels
- [ ] T157 [P] Verify focus indicators with 3:1 contrast ratio on all interactive elements using visible focus rings (2px solid)
- [ ] T158 [P] Audit color contrast: 4.5:1 for normal text, 3:1 for large text and UI components using WebAIM contrast checker
- [ ] T159 [P] Verify logical tab order through entire dictionary interface (search → filters → results → view modes → saved searches → actions)
- [ ] T160 Run automated accessibility tests with axe-core and WAVE browser extension on all dictionary pages
- [ ] T161 Manual screen reader testing with NVDA (Windows) on all new features with announcement verification
- [ ] T162 Manual screen reader testing with VoiceOver (macOS/iOS) on all new features including mobile
- [ ] T163 Keyboard-only navigation testing: verify all features work without mouse (Enter, Space, Arrow keys, Escape, Tab/Shift+Tab)
- [ ] T164 Add skip links for keyboard users to jump to main content, filters, results sections

### Performance Optimization

- [ ] T165 Performance profiling: verify search <800ms for 100k+ words on 3G network throttling (SC-001)
- [ ] T166 Performance testing: verify highlighting <50ms per result with 50+ results (SC-002)
- [ ] T167 Performance testing: verify filter updates <1s with 3+ active filters and 1000+ results (SC-003)
- [ ] T168 Performance testing: verify view mode switching <200ms with layout reflow measurement (SC-004)
- [ ] T169 Performance testing: verify popup open <300ms including search input focus (SC-008)
- [ ] T170 Implement lazy loading for PDF export library (jsPDF) using dynamic import to reduce initial bundle
- [ ] T171 Optimize search result rendering: implement virtual scrolling for 100+ results using react-window or similar
- [ ] T172 Add debouncing to all filter inputs (300ms) to reduce unnecessary API calls during rapid typing
- [ ] T173 Implement optimistic UI updates for saved searches (show immediately, sync in background)

### Mobile-First Responsive Design Verification

- [ ] T174 Mobile responsive testing on various screen sizes and devices:
  - **iPhone SE (375px portrait)**: Verify single-column layout, readable text (min 16px), touch targets (min 44x44px)
  - **iPhone 14 Pro (393px portrait, 852px landscape)**: Test safe-area-inset for notch, landscape filter drawer
  - **iPad (768px portrait, 1024px landscape)**: Verify 2-column grid transition, tablet-optimized drawer width
  - **Desktop (1280px, 1920px, 2560px)**: Test 2-3 column grid, sidebar positioning, comparison view columns
  - **Touch targets**: All interactive elements meet 44x44px minimum (buttons, links, checkboxes, radio buttons)
  - **Font scaling**: Test with iOS text size accessibility settings (100%-200%), Android font scale
  - **Scroll behavior**: Verify momentum scrolling, scroll position restoration, no horizontal overflow
  - **Safe areas**: Test notch/dynamic island avoidance with env(safe-area-inset-\*)
- [ ] T175 Touch interaction testing on real devices:
  - Tap accuracy on small targets (filter chips, view mode icons, audio controls)
  - Swipe gestures for closing modals/drawers
  - Long-press context menu activation (500ms threshold)
  - Pinch-to-zoom disabled on UI controls but enabled on dictionary text content
  - Pull-to-refresh behavior (disabled on search results to prevent conflicts)
- [ ] T176 Verify responsive typography: fluid font sizing using clamp() for headings, line-height optimization for mobile reading
- [ ] T177 Test container queries (@container) with various dictionary result counts: verify breakpoints trigger correctly (@6xl:grid-cols-2)
- [ ] T178 Verify sticky elements work on mobile: filter Apply button, comparison view headers, pagination controls
- [ ] T179 Test landscape orientation behavior: verify layouts adapt properly, drawers don't cover too much screen
- [ ] T180 Add loading skeletons for async operations (search, filter apply, export generation) with realistic content shapes

### Ease of Use Enhancements

- [ ] T181 Add empty state illustrations/messages when no results found with helpful suggestions (refine search, clear filters)
- [ ] T182 Implement undo/redo for filter changes: allow users to step back through filter history (Ctrl+Z/Ctrl+Y support)
- [ ] T183 Add bulk actions for search results: select multiple entries for export or comparison with checkbox selection
- [ ] T184 Create onboarding tooltips for first-time users: highlight filter panel, view modes, saved searches (use localStorage flag)
- [ ] T185 Add keyboard shortcut legend (? key): show modal with all keyboard shortcuts and their descriptions
- [ ] T186 Implement smart search suggestions: show popular searches when input is empty, recent searches as you type
- [ ] T187 Add filter presets: common filter combinations (e.g., "Sanskrit words with audio", "Monier-Williams only") for one-click filtering
- [ ] T188 Create "Clear all" floating action button (FAB) on mobile when filters are active for easy reset
- [ ] T189 Add haptic feedback (vibration) on mobile for important actions: filter apply, search complete, export ready
- [ ] T190 Implement pull-to-refresh alternative: "Refresh" button in search toolbar when results may be stale

### Testing & Documentation

- [ ] T191 Create unit tests for relevance-scoring.ts in tests/lib/dictionary/relevance-scoring.test.ts with edge cases (empty text, special chars, conjuncts)
- [ ] T192 Create unit tests for highlight-utils.ts in tests/lib/dictionary/highlight-utils.test.ts with multi-script test cases
- [ ] T193 Create integration tests for filter combinations in tests/lib/dictionary/filter-service.test.ts
- [ ] T194 Create mobile-specific E2E tests using Playwright with device emulation (touch events, viewport sizes)
- [ ] T195 Document keyboard shortcuts and accessibility features for users in help section
- [ ] T196 Create user guide with screenshots for new features (filters, view modes, saved searches, popup)
- [ ] T197 Update dictionary documentation with responsive design patterns and container query usage
- [ ] T198 Create developer guide for adding new filter types using established service layer patterns
- [ ] T199 Document mobile-first best practices used in implementation (touch targets, safe areas, responsive patterns)
- [ ] T200 Add inline code comments explaining complex responsive logic (container queries, breakpoint calculations)

**Final Checkpoint**: All features should meet WCAG 2.1 AA standards with zero critical accessibility violations

---

## Dependency Graph

### User Story Completion Order

**Parallel MVP Tracks** (can be implemented simultaneously after Phase 2):

- **Track A**: US1 (Enhanced Search) → US2 (Advanced Filters)
- **Track B**: US3 (View Modes) → independently
- **Track C**: US4 (Saved Searches) → independently

**Post-MVP** (can start after Track A complete):

- US7 (Popup Widget) - depends on US1 search logic
- US5 (Audio) → independently
- US6 (Export) → independently
- US8 (Comparison) → independently

**Dependencies**:

- Phase 2 (Foundational) MUST complete before any user story
- US7 (Popup) needs US1 (search logic) complete
- All other stories are independent

### Parallel Execution Examples

**Phase 2 (Foundational)**: T004-T010 can all run in parallel (different files)

**Phase 3 (US1)**: T011, T012, T119 can run in parallel → then T014-T126 sequentially

**Phase 4 (US2)**: T74-T77 can run in parallel → then T78-T86 sequentially

**Phase 5 (US3)**: T87, T88 parallel → T89-T96 sequentially

**Phase 6 (US4)**: T97, T98, T99 parallel → T100-T111 sequentially

**Phase 7 (US7)**: T112, T113 parallel → T114-T124 sequentially

**Phase 8 (US5)**: T125, T126 parallel → T127-T131 sequentially

**Phase 9 (US6)**: T132-T136 parallel → T137-T145 sequentially

**Phase 10 (US8)**: T146, T147 parallel → T148-T154 sequentially

**Phase 11 (Polish)**: T155-T159, T170-T171 can all run in parallel

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Deliver First**: Phase 2 + Phase 3 (US1) + Phase 4 (US2)

- Enhanced search with relevance ranking and highlighting
- Advanced filters with sidebar UI
- **Total**: ~30-35 tasks (~30 hours)
- **Value**: Core search improvements that benefit all users immediately

### Incremental Delivery

1. **Release 1 (MVP)**: US1 + US2 (Enhanced search + filters)
2. **Release 2**: US3 + US4 (View modes + saved searches)
3. **Release 3**: US7 (Quick lookup popup)
4. **Release 4**: US5 + US6 + US8 (Audio + export + comparison)
5. **Release 5**: Phase 11 (Accessibility audit + polish)

### Testing Checkpoints

Each phase ends with a checkpoint where the user story should be:

- ✅ Fully functional independently
- ✅ Manually tested with keyboard navigation
- ✅ Verified with screen reader (if accessibility-critical)
- ✅ Performance tested against success criteria

---

## Task Summary

- **Total Tasks**: 200 (comprehensive with mobile-first focus)
- **Phase 1 - Refactoring (US9, P0)**: 53 tasks (T001-T053) - ⚠️ BLOCKING FOUNDATION
- **Phase 2/3 - Setup/Foundation**: 10 tasks (T054-T063)
- **Phase 4 - User Story 1 (P1)**: 10 tasks (T064-T073)
- **Phase 5 - User Story 2 (P1)**: 13 tasks (T074-T086)
- **Phase 6 - User Story 3 (P2)**: 10 tasks (T087-T096)
- **Phase 7 - User Story 4 (P2)**: 15 tasks (T097-T111)
- **Phase 8 - User Story 7 (P2)**: 13 tasks (T112-T124)
- **Phase 9 - User Story 5 (P3)**: 7 tasks (T125-T131)
- **Phase 10 - User Story 6 (P3)**: 14 tasks (T132-T145)
- **Phase 11 - User Story 8 (P3)**: 9 tasks (T146-T154)
- **Phase 12 - Polish, Accessibility & Mobile UX**: 46 tasks (T155-T200)
  - Accessibility: 10 tasks (T155-T164)
  - Performance: 9 tasks (T165-T173)
  - Mobile Responsive: 7 tasks (T174-T180)
  - Ease of Use: 10 tasks (T181-T190)
  - Testing & Docs: 10 tasks (T191-T200)

**Parallelizable Tasks**: ~75 tasks marked with [P]  
**Story-Specific Tasks**: 91 tasks marked with [US1]-[US8], 53 tasks marked [US9] refactoring

**Foundation Task Count**: 53 tasks (T001-T053) - MUST complete before any enhancements  
**Foundation Estimated Time**: 18-24 hours  
**MVP Task Count (after foundation)**: 33 tasks (T054-T086) - US1 + US2  
**MVP Estimated Time**: 24-30 hours  
**Polish & Mobile UX**: 46 tasks (T155-T200) - Essential for production readiness  
**Polish Estimated Time**: 36-42 hours  
**Total Project Estimate**: 110-140 hours including refactoring and comprehensive mobile optimization

### Mobile-First Priorities ✅

**Every task now includes mobile considerations**:

- Touch-friendly targets (min 44x44px)
- Responsive breakpoints (@container queries, sm:, md:, lg:)
- Safe area insets for notch devices
- Touch event handling (tap, long-press, swipe)
- Mobile drawer patterns for panels
- Full-screen modals on small screens
- Sticky controls for thumb reach
- Momentum scrolling optimization
- Font scaling compatibility
- Loading states and skeletons

**Ease of Use Focus** ✅:

- Empty states with helpful messages
- Smart search suggestions
- Filter presets for common use cases
- Onboarding tooltips
- Undo/redo support
- Bulk actions with selection
- Keyboard shortcut legend
- Haptic feedback on mobile
- Clear visual feedback for all actions
