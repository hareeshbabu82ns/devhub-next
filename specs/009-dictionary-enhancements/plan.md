# Implementation Plan: Dictionary System Enhancements

**Branch**: `009-dictionary-enhancements` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-dictionary-enhancements/spec.md`

## Summary

Enhance existing dictionary system with advanced search capabilities (relevance ranking, multi-script support), sophisticated filtering (collapsible sidebar with Apply button), multiple viewing modes (Compact/Card/Detailed), saved searches, inline audio, export functionality, quick lookup popup, and comparison view. **Critical**: All enhancements must be preceded by P0 refactoring (User Story 9) establishing repository pattern, service layer, and container/presentation component architecture. **Priority**: Mobile responsiveness and ease of use are paramount - every feature must work seamlessly on touch devices with clear, accessible UI patterns.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15+ (App Router), React 19  
**Primary Dependencies**: MongoDB + Prisma (custom @/app/generated/prisma), TanStack Query v5, Shadcn UI + Radix, Tailwind CSS with container queries, @indic-transliteration/sanscript  
**Storage**: MongoDB with full-text indexes and compound indexes for performance  
**Testing**: Jest with Node environment (focus on service layer), 90%+ coverage target for business logic  
**Target Platform**: Web (responsive mobile-first), PWA-capable (manifest.webmanifest), touch and keyboard accessible  
**Project Type**: Web application (Next.js full-stack)  
**Performance Goals**: <800ms search response for 100k+ words, <200ms view mode transitions, <500ms saved search restoration  
**Constraints**: WCAG 2.1 AA compliance mandatory, mobile-first responsive design with container queries, 100% backward compatibility post-refactoring  
**Scale/Scope**: 100k+ dictionary entries, support for 5+ dictionary origins, 50 saved searches per user, cross-device sync for authenticated users

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ Type-Safe Data Layer

- **Status**: COMPLIANT
- **Evidence**: Using custom Prisma client from `@/app/generated/prisma`, singleton `db` from `@/lib/db`
- **Actions**: Repository pattern will maintain this compliance by abstracting Prisma imports to repository layer only

### ✅ Discriminated Union Response Pattern

- **Status**: COMPLIANT
- **Evidence**: All server actions return `{status: "success", data} | {status: "error", error}` pattern
- **Actions**: Maintain pattern in refactored actions, add ServiceResponse<T> wrapper for service layer

### ✅ Multilingual Data First

- **Status**: COMPLIANT
- **Evidence**: DictionaryWord model uses LanguageValueType[] for word and description fields
- **Actions**: No schema changes needed, existing pattern supports all user stories

### ✅ Component Organization Standard

- **Status**: PARTIALLY COMPLIANT
- **Evidence**: Components in `src/app/(app)/dictionary/_components/` but mixing concerns
- **Actions**: Refactoring (User Story 9) will split into container/presentation, move shared utilities to `src/components/features/dictionary/`

### ✅ Form Validation Trinity

- **Status**: COMPLIANT
- **Evidence**: react-hook-form + zod + zodResolver used in dictionary forms
- **Actions**: Maintain pattern for saved search forms, filter validation forms

### ✅ Authentication & Authorization Pattern

- **Status**: COMPLIANT
- **Evidence**: All actions use `auth()` from `@/lib/auth` for session checks
- **Actions**: Maintain auth checks in refactored actions, add role checks for admin export features

### ✅ Testing Pure Functions

- **Status**: NEEDS IMPROVEMENT
- **Evidence**: Current tests in Node environment but limited service layer coverage
- **Actions**: Refactoring enables 90%+ test coverage for service layer (SearchService, FilterService) without React dependencies

### Gate Decision: **PASS** with refactoring commitment

All violations are addressed by User Story 9 (Code Architecture Refactoring) which is P0 blocking foundation.

## Project Structure

### Documentation (this feature)

```text
specs/009-dictionary-enhancements/
├── plan.md              # This file (implementation roadmap)
├── spec.md              # Feature specification with user stories
├── tasks.md             # Detailed task breakdown (173 tasks)
└── research.md          # Technical research (if needed)
```

### Source Code Structure

```text
src/
├── app/
│   ├── (app)/
│   │   └── dictionary/
│   │       ├── _components/
│   │       │   ├── DictionaryResultsContainer.tsx    # NEW: Logic layer
│   │       │   ├── DictionaryResultsList.tsx         # NEW: Presentation layer
│   │       │   ├── DictionaryFilters.tsx             # NEW: Filter sidebar
│   │       │   ├── DictionaryViewModeSelector.tsx    # NEW: View mode toggle
│   │       │   ├── SearchResultHighlight.tsx         # NEW: Highlight component
│   │       │   ├── SavedSearchManager.tsx            # NEW: Saved searches UI
│   │       │   ├── AudioPlayer.tsx                   # NEW: Inline audio
│   │       │   ├── ExportDialog.tsx                  # NEW: Export modal
│   │       │   ├── QuickLookupPopup.tsx             # NEW: Global popup
│   │       │   ├── ComparisonView.tsx               # NEW: Multi-dict compare
│   │       │   ├── DictionaryResults.tsx            # REFACTOR: Remove logic
│   │       │   ├── search-toolbar.tsx               # REFACTOR: Use hooks only
│   │       │   └── DictionaryView.tsx               # EXISTING: Main view
│   │       ├── actions.ts                           # REFACTOR: Thin layer
│   │       ├── download-actions.ts                  # REFACTOR: Use services
│   │       └── types.ts                             # ENHANCE: Add new types
│   └── generated/
│       └── prisma/                                  # Custom Prisma client
├── components/
│   ├── features/
│   │   └── dictionary/                              # NEW: Shared dict components
│   ├── ui/                                          # Shadcn primitives
│   └── blocks/                                      # Reusable composites
├── lib/
│   ├── dictionary/
│   │   ├── dictionary-repository.ts                 # NEW: Data access layer
│   │   ├── search-service.ts                        # NEW: Search logic
│   │   ├── filter-service.ts                        # NEW: Filter logic
│   │   ├── relevance-scoring.ts                     # NEW: Scoring algorithm
│   │   ├── highlight-utils.ts                       # NEW: Word boundary detection
│   │   ├── export-service.ts                        # NEW: Export logic
│   │   └── types.ts                                 # NEW: Service types
│   ├── accessibility/
│   │   └── focus-management.ts                      # NEW: Focus trap, ARIA
│   └── db/
│       └── index.ts                                 # EXISTING: Prisma singleton
├── hooks/
│   ├── use-dictionary-search.ts                     # REFACTOR: Enhanced
│   ├── use-dictionary-filters.ts                    # NEW: Filter management
│   ├── use-saved-searches.ts                        # NEW: Saved search hooks
│   └── use-audio-player.ts                          # NEW: Audio playback
└── types/
    └── dictionary.ts                                # ENHANCE: Add new types

prisma/
└── schema.prisma                                    # ENHANCE: Add SavedSearch model

tests/
└── lib/
    └── dictionary/
        ├── dictionary-repository.test.ts            # NEW: Repo tests
        ├── search-service.test.ts                   # NEW: Search tests
        ├── filter-service.test.ts                   # NEW: Filter tests
        ├── relevance-scoring.test.ts                # NEW: Scoring tests
        └── export-service.test.ts                   # NEW: Export tests
```

**Structure Decision**: Web application (Next.js 15+ App Router) with clean architecture layers. Repository pattern isolates database access, service layer contains pure business logic (90%+ testable without React), hooks consolidate TanStack Query usage, container/presentation components separate UI concerns. Mobile-first responsive design using Tailwind container queries (@container) and responsive breakpoints (sm:, md:, lg:).

## Complexity Tracking

| Complexity                   | Justification                                                                                                                                                   | Alternative Rejected                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository Pattern           | Current code mixes Prisma queries with business logic in components/actions. 100+ dictionary entries require clean abstraction for maintainability and testing. | Direct DB access insufficient - makes business logic untestable without database, violates single responsibility, prevents service layer reuse |
| Service Layer                | Business logic scattered across 5+ files (actions, components, hooks). Need centralized, framework-agnostic functions for search, filtering, relevance scoring. | Component-based logic insufficient - no way to test search algorithms without React, cannot reuse in background jobs or CLI tools              |
| Container/Presentation Split | Current DictionaryResults.tsx is 200+ lines mixing state, API calls, and JSX. Violates single responsibility, makes responsive design changes risky.            | Single component insufficient - cannot test UI rendering separately from data fetching, responsive breakpoints tangled with business logic     |

**Rationale**: Complexity is **essential** not **incidental** - enables 90%+ test coverage, independent responsive UI updates, and clean implementation of 8 user stories without regression risk.

---

## Implementation Checklist

### Phase 0: Pre-Implementation (Ready to Start)

- [x] Feature specification complete with 9 user stories
- [x] Clarifications recorded (10 Q&A pairs)
- [x] Technical context documented
- [x] Constitution compliance verified
- [x] Implementation plan created
- [x] Task breakdown complete (200 tasks)
- [ ] Development environment ready
- [ ] Feature branch created from main

### Phase 1: Foundation (Blocking - Must Complete First)

- [ ] Repository Layer (T001-T008) - 8 tasks
- [ ] Service Layer (T009-T014) - 6 tasks
- [ ] Server Actions Refactoring (T015-T022) - 8 tasks
- [ ] Hook Consolidation (T023-T031) - 9 tasks
- [ ] Component Splitting (T032-T039) - 8 tasks
- [ ] Validation Checkpoint (T040-T046) - 7 tasks

**Gate Criteria**: All refactoring complete with 100% backward compatibility, 90%+ service layer test coverage, zero regressions

### Phase 2: MVP Features (Can Run in Parallel After Foundation)

#### Track A: Enhanced Search (US1, Priority P1)

- [ ] Relevance Scoring (T047-T049)
- [ ] Search UI Integration (T050-T056)
- [ ] Accessibility (T057-T059)
- **Target**: <800ms search, word-level highlighting, WCAG 2.1 AA

#### Track B: Advanced Filters (US2, Priority P1)

- [ ] Filter Sidebar Component (T060-T066)
- [ ] Filter Logic Integration (T067-T073)
- [ ] URL Persistence & Validation (T074-T076)
- **Target**: <1s filter updates, mobile-responsive drawer

#### Track C: View Modes (US3, Priority P2)

- [ ] View Mode Selector (T077-T080)
- [ ] Responsive Grid Implementation (T081-T086)
- **Target**: <200ms mode switching, @container responsive

### Phase 3: Extended Features (Post-MVP)

#### Saved Searches (US4, Priority P2)

- [ ] Backend (T087-T089)
- [ ] UI Components (T090-T098)
- [ ] Cross-device Sync (T099-T101)
- **Target**: <500ms restoration, localStorage + DB storage

#### Quick Lookup Popup (US7, Priority P2)

- [ ] Global Widget (T102-T108)
- [ ] Keyboard Shortcut (T109-T111)
- [ ] Mobile Full-Screen (T112-T114)
- **Target**: <300ms popup open, accessible from any page

#### Audio Playback (US5, Priority P3)

- [ ] Audio Component (T115-T119)
- [ ] Inline Integration (T120-T121)
- **Target**: <500ms playback start, auto-stop previous

#### Export Functionality (US6, Priority P3)

- [ ] Export Service (T122-T128)
- [ ] Export Modal (T129-T135)
- [ ] Streaming for Large Exports (T136-T138)
- **Target**: 5s for 1000 entries CSV, descriptive filenames

#### Comparison View (US8, Priority P3)

- [ ] Comparison Component (T139-T145)
- [ ] Responsive Layout (T146-T147)
- **Target**: Side-by-side desktop, vertical stack mobile

### Phase 4: Polish & Production (Final Phase)

#### Accessibility Compliance (T148-T157)

- [ ] ARIA labels and live regions
- [ ] Focus management and indicators
- [ ] Screen reader testing
- [ ] Keyboard navigation testing
- **Target**: Zero critical violations, WCAG 2.1 AA certified

#### Performance Optimization (T158-T166)

- [ ] Search performance (<800ms)
- [ ] Highlighting performance (<50ms/result)
- [ ] Lazy loading and code splitting
- [ ] Virtual scrolling for large lists
- **Target**: All success criteria met

#### Mobile-First Responsive (T167-T173)

- [ ] Device testing (iPhone, iPad, Desktop)
- [ ] Touch interaction testing
- [ ] Container query verification
- [ ] Landscape orientation handling
- **Target**: Seamless experience on all devices

#### Ease of Use (T174-T183)

- [ ] Empty states and loading skeletons
- [ ] Onboarding tooltips
- [ ] Filter presets and suggestions
- [ ] Keyboard shortcut legend
- [ ] Haptic feedback on mobile
- **Target**: Intuitive, delightful user experience

#### Testing & Documentation (T184-T193)

- [ ] Unit tests (90%+ service layer coverage)
- [ ] Integration tests
- [ ] E2E mobile tests
- [ ] User documentation
- [ ] Developer guide
- **Target**: Production-ready documentation

---

## Success Metrics Tracking

| Metric                       | Target                   | How to Verify                              | Status |
| ---------------------------- | ------------------------ | ------------------------------------------ | ------ |
| **Search Performance**       | <800ms for 100k+ words   | Chrome DevTools Network tab, 3G throttling | ⏳     |
| **Highlighting Performance** | <50ms per result         | React DevTools Profiler, 50+ results       | ⏳     |
| **Filter Updates**           | <1s with 3+ filters      | Manual timing, 1000+ results               | ⏳     |
| **View Mode Switch**         | <200ms layout reflow     | Performance.measure() API                  | ⏳     |
| **Popup Open**               | <300ms from shortcut     | Performance.mark() timing                  | ⏳     |
| **Accessibility**            | Zero critical violations | axe, WAVE automated scans                  | ⏳     |
| **Mobile Touch Targets**     | 100% meet 44x44px min    | Manual inspection, real device testing     | ⏳     |
| **Test Coverage**            | 90%+ service layer       | Jest coverage report                       | ⏳     |
| **Code Complexity**          | <5 avg cyclomatic        | ESLint complexity plugin                   | ⏳     |
| **Responsive Breakpoints**   | Work on all devices      | BrowserStack, real device testing          | ⏳     |

**Legend**: ⏳ Pending | ✅ Passed | ❌ Failed

---

## Risk Mitigation

| Risk                                              | Probability | Impact | Mitigation Strategy                                                                    |
| ------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------- |
| Refactoring breaks existing functionality         | Medium      | High   | Comprehensive test suite, manual QA, incremental rollout with feature flags            |
| Mobile performance issues on low-end devices      | Medium      | Medium | Performance profiling on real devices, virtual scrolling, lazy loading, code splitting |
| Container queries not supported in older browsers | Low         | Low    | Graceful fallback to traditional responsive breakpoints, progressive enhancement       |
| Audio files missing/broken for many entries       | Medium      | Low    | Graceful error handling, clear UI feedback, don't block other features                 |
| Export generation too slow for large datasets     | Medium      | Medium | Streaming responses, chunked processing, progress indicators, suggest smaller exports  |
| Accessibility issues discovered late              | Low         | Medium | Early automated testing, regular screen reader testing throughout development          |

---

## Next Steps

1. **Review this plan** with team for feedback and approval
2. **Create feature branch** `009-dictionary-enhancements` from main
3. **Start Phase 1** (Refactoring) - BLOCKING foundation work
4. **Complete validation checkpoint** before proceeding to MVP
5. **Implement MVP** (US1 + US2) for early user feedback
6. **Iterate on remaining features** based on priority and feedback
7. **Final polish & accessibility audit** before production release
8. **Monitor metrics** post-release and iterate

**Estimated Timeline**:

- Foundation (Phase 1): 3-4 weeks
- MVP (Phase 2): 2-3 weeks
- Extended Features (Phase 3): 3-4 weeks
- Polish & Production (Phase 4): 2-3 weeks
- **Total**: 10-14 weeks for complete implementation

**Current Status**: Plan complete, ready to begin implementation ✅
