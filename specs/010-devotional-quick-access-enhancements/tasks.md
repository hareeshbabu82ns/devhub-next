# Tasks: Devotional Quick Access Enhancements

**Feature Spec**: `/specs/010-devotional-quick-access-enhancements/`  
**Input Documents**: feature-spec.md, implementation-plan.md, responsive-design-guide.md  
**Tests**: Optional - not explicitly requested in specification

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which implementation phase this task belongs to (PH1, PH2, PH3, PH4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Tailwind Configuration)

**Purpose**: Add custom breakpoint for responsive layouts

- [X] T001 Add `xs: '475px'` breakpoint to `tailwind.config.ts` screens configuration

**Checkpoint**: Breakpoint available for all responsive classes

---

## Phase 2: Foundational (URL State Management)

**Purpose**: Core URL state management infrastructure that all tabs depend on

**⚠️ CRITICAL**: No UI changes can begin until URL state management is functional

- [X] T002 [P] Create `useDevotionalTabState` hook in `src/hooks/use-devotional-tab-state.ts` with URL param parsing and state sync
- [X] T003 [P] Create `useKeyboardShortcuts` hook in `src/hooks/use-keyboard-shortcuts.ts` for generic keyboard shortcut handling
- [ ] T004 Write unit tests for `useDevotionalTabState` in `src/hooks/__tests__/use-devotional-tab-state.test.ts` covering URL parsing, state updates, and param cleanup
- [ ] T005 Write unit tests for `useKeyboardShortcuts` in `src/hooks/__tests__/use-keyboard-shortcuts.test.ts` covering shortcut registration and conflict detection

**Checkpoint**: URL state management hooks complete and tested - UI implementation can begin

---

## Phase 3: URL Navigation & Core Responsiveness (Priority: High) 🎯 MVP

**Goal**: Enable URL-based tab navigation and fix mobile responsiveness issues

**Independent Test**: Navigate to `/dashboard?tab=daily&day=monday`, verify Monday tab loads, check browser back/forward works

### Component Infrastructure

- [X] T006 [P] [PH1] Create `EmptyState` component in `src/components/utils/EmptyState.tsx` with icon, title, description, context, and action props
- [X] T007 [P] [PH1] Create `EntityGridSkeleton` component in `src/components/blocks/entity-grid-skeleton.tsx` with configurable count and responsive grid layout
- [X] T008 [PH1] Update `DevotionalQuickAccess` component in `src/app/(app)/dashboard/_components/DevotionalQuickAccess.tsx` to use `useDevotionalTabState` hook and sync tab value with URL
- [X] T009 [PH1] Add responsive tab trigger styling to `DevotionalQuickAccess.tsx` with mobile text abbreviations and icon sizing

### EverydayDevotionalTab Updates

- [X] T010 [PH1] Update `EverydayDevotionalTab` in `src/app/(app)/dashboard/_components/EverydayDevotionalTab.tsx` to accept `initialPage` prop and sync page changes to URL
- [X] T011 [PH1] Replace loader with `EntityGridSkeleton` in `EverydayDevotionalTab.tsx` during initial load
- [X] T012 [PH1] Replace empty state with `EmptyState` component in `EverydayDevotionalTab.tsx` with context-aware message for everyday content
- [X] T013 [PH1] Update entity grid classes in `EverydayDevotionalTab.tsx` with enhanced breakpoints (`grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`)
- [X] T014 [PH1] Update action button styling in `EverydayDevotionalTab.tsx` for responsive placement and mobile controls layout

### WeeklyDevotionalTab Updates

- [X] T015 [PH1] Update `WeeklyDevotionalTab` in `src/app/(app)/dashboard/_components/WeeklyDevotionalTab.tsx` to accept `initialDay` and `initialPage` props
- [X] T016 [PH1] Add day and page state sync to URL in `WeeklyDevotionalTab.tsx` using `useDevotionalTabState` hook
- [X] T017 [PH1] Wrap day selector in `ScrollArea` component in `WeeklyDevotionalTab.tsx` with horizontal scroll for mobile
- [X] T018 [PH1] Add "Today" quick jump button to day selector in `WeeklyDevotionalTab.tsx` with conditional visibility
- [X] T019 [PH1] Update day button styling in `WeeklyDevotionalTab.tsx` with mobile abbreviated text and deity labels for desktop
- [X] T020 [PH1] Replace loader with `EntityGridSkeleton` in `WeeklyDevotionalTab.tsx` during initial load
- [X] T021 [PH1] Replace empty state with `EmptyState` component in `WeeklyDevotionalTab.tsx` with day-specific deity context
- [X] T022 [PH1] Update entity grid classes in `WeeklyDevotionalTab.tsx` with enhanced breakpoints
- [X] T023 [PH1] Update action button controls layout in `WeeklyDevotionalTab.tsx` for mobile stacking

### BookmarkedEntitiesGrid Updates

- [X] T024 [PH1] Update `BookmarkedEntitiesGrid` in `src/app/(app)/dashboard/_components/BookmarkedEntitiesGrid.tsx` to accept `initialPage` prop
- [X] T025 [PH1] Add page state sync to URL in `BookmarkedEntitiesGrid.tsx` using `useDevotionalTabState` hook
- [X] T026 [PH1] Replace loader with skeleton component in `BookmarkedEntitiesGrid.tsx`
- [X] T027 [PH1] Replace empty state with `EmptyState` component in `BookmarkedEntitiesGrid.tsx` with bookmarks-specific message

**Checkpoint**: All tabs support URL navigation, responsive on mobile (320px+), empty states contextual

---

## Phase 4: Accessibility & Keyboard Navigation (Priority: Medium)

**Goal**: Add comprehensive ARIA labels, keyboard shortcuts, and screen reader support

**Independent Test**: Navigate with keyboard only, verify all tabs and controls accessible, test with screen reader

### ARIA Labels & Roles

- [X] T028 [P] [PH3] Add ARIA labels to tab list in `DevotionalQuickAccess.tsx` (`role="tablist"`, `aria-label="Devotional content categories"`)
- [X] T029 [P] [PH3] Add ARIA attributes to tab triggers in `DevotionalQuickAccess.tsx` (`aria-label`, `aria-controls`, `aria-selected`)
- [X] T030 [P] [PH3] Add ARIA attributes to tab panels in `DevotionalQuickAccess.tsx` (`role="tabpanel"`, `id`, `aria-labelledby`)
- [X] T031 [P] [PH3] Add ARIA labels to day selector in `WeeklyDevotionalTab.tsx` (`role="radiogroup"`, `aria-label="Day of week selector"`)
- [X] T032 [P] [PH3] Add ARIA attributes to day buttons in `WeeklyDevotionalTab.tsx` (`role="radio"`, `aria-checked`, `aria-label` with deity info)
- [X] T033 [P] [PH3] Add ARIA labels to action buttons in all tab components (search, pagination, refresh)

### Keyboard Shortcuts

- [X] T034 [PH3] Implement keyboard shortcuts in `WeeklyDevotionalTab.tsx` using `useKeyboardShortcuts` hook (t=today, s=search, left/right arrows for day navigation)
- [X] T035 [PH3] Add keyboard shortcut documentation to component comments in `WeeklyDevotionalTab.tsx`

### Screen Reader Support

- [X] T036 [P] [PH3] Add live region for loading states in `EverydayDevotionalTab.tsx` (`role="status"`, `aria-live="polite"`, `className="sr-only"`)
- [X] T037 [P] [PH3] Add live region for loading states in `WeeklyDevotionalTab.tsx` (`role="status"`, `aria-live="polite"`, `className="sr-only"`)
- [X] T038 [P] [PH3] Add live region for loading states in `BookmarkedEntitiesGrid.tsx` (`role="status"`, `aria-live="polite"`, `className="sr-only"`)
- [X] T039 [PH3] Add dynamic announcements for query results in live regions (e.g., "Showing X of Y items")

### Focus Management

- [X] T040 [PH3] Implement focus management in tab switches in `DevotionalQuickAccess.tsx` to focus first interactive element
- [X] T041 [PH3] Add skip link to main content in `DevotionalQuickAccess.tsx` (`sr-only`, `focus:not-sr-only` classes)
- [X] T042 [PH3] Ensure prominent focus indicators on all interactive elements (verify `focus-visible:ring-2` classes)

**Checkpoint**: Full keyboard navigation works, screen reader announces state changes, ARIA labels comprehensive

---

## Phase 5: Performance Optimizations (Priority: Low)

**Goal**: Improve perceived performance with prefetching, code splitting, and optimistic updates

**Independent Test**: Measure tab switch time (should be <100ms cached), verify adjacent pages prefetch

### Query Optimization

- [X] T043 [PH4] Add query prefetching for next page in `EverydayDevotionalTab.tsx` using `queryClient.prefetchQuery` in `useEffect`
- [X] T044 [PH4] Add query prefetching for next page in `WeeklyDevotionalTab.tsx` using `queryClient.prefetchQuery` in `useEffect`
- [X] T045 [PH4] Add query prefetching for next page in `BookmarkedEntitiesGrid.tsx` using `queryClient.prefetchQuery` in `useEffect`
- [X] T046 [P] [PH4] Add `placeholderData: keepPreviousData` to queries in `EverydayDevotionalTab.tsx` for smooth transitions
- [X] T047 [P] [PH4] Add `placeholderData: keepPreviousData` to queries in `WeeklyDevotionalTab.tsx` for smooth transitions
- [X] T048 [P] [PH4] Add `placeholderData: keepPreviousData` to queries in `BookmarkedEntitiesGrid.tsx` for smooth transitions

### Code Splitting

- [X] T049 [PH4] Wrap `EverydayDevotionalTab` in lazy import with `React.lazy()` and `Suspense` boundary in `DevotionalQuickAccess.tsx`
- [X] T050 [PH4] Wrap `WeeklyDevotionalTab` in lazy import with `React.lazy()` and `Suspense` boundary in `DevotionalQuickAccess.tsx`
- [X] T051 [PH4] Wrap `BookmarkedEntitiesGrid` in lazy import with `React.lazy()` and `Suspense` boundary in `DevotionalQuickAccess.tsx`

### Performance Measurement

- [X] T052 [P] [PH4] Add `performance.mark()` and `performance.measure()` for tab switch timing in `DevotionalQuickAccess.tsx`
- [X] T053 [PH4] Add performance monitoring to track tab switch duration and log slow operations (>500ms)

**Checkpoint**: Tab switches feel instant (<100ms), next page loads faster, bundle size reduced with code splitting

---

## Phase 6: Polish & Testing

**Purpose**: Final testing, documentation, and production readiness

### Integration Testing

- [ ] T054 [P] Write integration tests in `src/app/(app)/dashboard/_components/__tests__/DevotionalQuickAccess.test.tsx` for tab switching with URL updates
- [ ] T055 [P] Write integration tests for day selection with query refetch in `WeeklyDevotionalTab` test file
- [ ] T056 [P] Write integration tests for pagination state persistence across tab switches

### E2E Testing

- [ ] T057 Create Playwright test in `e2e/dashboard-devotional.spec.ts` for deep linking to specific tab and day
- [ ] T058 Create Playwright test for URL updates when navigating between tabs
- [ ] T059 Create Playwright test for keyboard navigation flow (Tab, Arrow keys, Enter)
- [ ] T060 Create Playwright test for mobile viewport responsive layout (320px, 375px, 768px)

### Accessibility Testing

- [ ] T061 Run Lighthouse accessibility audit and ensure score >90 for `/dashboard` page
- [ ] T062 Manual screen reader testing with NVDA/VoiceOver on all tabs and interactions
- [ ] T063 Manual keyboard-only navigation test covering all features without mouse
- [ ] T064 Verify color contrast meets WCAG 2.1 AA standards using axe DevTools

### Documentation

- [X] T065 [P] Update `specs/010-devotional-quick-access-enhancements/README.md` with implementation completion status
- [ ] T066 [P] Document keyboard shortcuts in user-facing documentation or help tooltip
- [X] T067 [P] Add inline code comments for complex URL state management logic in `useDevotionalTabState`
- [ ] T068 [P] Update project README with link to devotional quick access feature documentation

### Monitoring Setup

- [ ] T069 Add error tracking for tab component failures in production monitoring (Sentry/Vercel)
- [ ] T070 Configure alerts for error rate >1% on dashboard page
- [ ] T071 Add analytics events for tab switching, day selection, and entity actions

**Checkpoint**: All tests passing, documentation complete, monitoring configured, ready for production

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion - BLOCKS all UI work
- **Phase 3 (URL Nav & Responsive)**: Depends on Phase 2 completion - Main feature implementation
- **Phase 4 (Accessibility)**: Depends on Phase 3 completion - Enhancements to stable UI
- **Phase 5 (Performance)**: Depends on Phase 3 completion - Can run parallel to Phase 4
- **Phase 6 (Polish & Testing)**: Depends on Phases 3, 4, 5 completion

### Task Dependencies Within Phases

**Phase 2 (Foundational)**:

- T002, T003 can run in parallel (different files)
- T004, T005 depend on T002, T003 respectively (tests for hooks)

**Phase 3 (URL Nav & Responsive)**:

- T006, T007 can run in parallel (new component files)
- T008, T009 must be sequential (same file)
- T010-T014 (EverydayTab) can be done independently
- T015-T023 (WeeklyTab) can be done independently
- T024-T027 (BookmarksGrid) can be done independently
- All three tab updates can run in parallel if multiple developers

**Phase 4 (Accessibility)**:

- T028-T033 (ARIA labels) can all run in parallel (different components/sections)
- T034-T035 (Keyboard shortcuts) sequential (same component)
- T036-T039 (Screen reader) can run in parallel (different components)
- T040-T042 (Focus management) can run after ARIA labels

**Phase 5 (Performance)**:

- T043-T048 (Query optimization) - each tab can be done in parallel
- T049-T051 (Code splitting) must be sequential (same parent file)
- T052-T053 (Performance measurement) can run parallel to other tasks

**Phase 6 (Testing & Polish)**:

- T054-T056 (Integration tests) can run in parallel
- T057-T060 (E2E tests) can run in parallel
- T061-T064 (Accessibility tests) can run in parallel
- T065-T068 (Documentation) can run in parallel
- T069-T071 (Monitoring) can run in parallel

### Critical Path

1. **T001** (Tailwind config) → Foundation for all responsive work
2. **T002** (URL hook) → Foundation for all tab navigation
3. **T008** (DevotionalQuickAccess update) → Enables all child tab updates
4. **T010-T027** (Tab component updates) → Core feature functionality
5. **T028-T042** (Accessibility) → Production readiness
6. **T054-T064** (Testing) → Quality assurance

### Parallel Opportunities

**Maximum Parallelization** (with 5 developers):

- After T002 completes:
  - Dev 1: T010-T014 (EverydayTab)
  - Dev 2: T015-T023 (WeeklyTab)
  - Dev 3: T024-T027 (BookmarksGrid)
  - Dev 4: T006, T007 (New components)
  - Dev 5: T003-T005 (Keyboard shortcuts)

**Phase 4 Parallelization**:

- Dev 1: T028-T033 (ARIA labels across all files)
- Dev 2: T034-T035 (Keyboard shortcuts)
- Dev 3: T036-T039 (Screen reader support)
- Dev 4: T040-T042 (Focus management)

---

## Parallel Example: Phase 3 (URL Nav & Responsive)

```bash
# After T002 (URL hook) and T006-T007 (components) complete:

# Launch all three tab updates in parallel:
Developer A: "Update EverydayDevotionalTab with URL sync and responsive layout"
Developer B: "Update WeeklyDevotionalTab with URL sync and responsive layout"
Developer C: "Update BookmarkedEntitiesGrid with URL sync and responsive layout"

# Within each tab, tasks can proceed sequentially
# For example, Developer A does T010 → T011 → T012 → T013 → T014
```

---

## Implementation Strategy

### MVP First (Phase 1-3 Only)

1. Complete Phase 1: Tailwind setup (5 min)
2. Complete Phase 2: URL state hooks (4 hours)
3. Complete Phase 3: All tab updates (2-3 days)
4. **STOP and VALIDATE**: Test URL navigation, mobile responsiveness
5. Deploy to staging for user feedback

### Full Production (All Phases)

1. Complete Phases 1-3 (MVP) → Functional with URL navigation
2. Complete Phase 4: Accessibility (1-2 days) → WCAG compliant
3. Complete Phase 5: Performance (1-2 days) → Optimized experience
4. Complete Phase 6: Testing & Polish (1-2 days) → Production ready
5. Total: ~7-10 days for full implementation

### Staged Rollout

- **Week 1**: Phases 1-3 (MVP) → Deploy to staging
- **Week 2**: Phases 4-5 → Deploy to production with 10% canary
- **Week 2-3**: Phase 6 → Full rollout with monitoring

---

## Success Criteria Checklist

**Functional Requirements**:

- [ ] All tabs accessible via URL parameters (`/dashboard?tab=daily&day=monday`)
- [ ] Browser back/forward navigation works correctly
- [ ] Tab state persists across page refreshes
- [ ] No layout overflow on any screen size (320px-2560px+)
- [ ] All existing features work without regression

**Performance Requirements**:

- [ ] Tab switch <100ms when cached (TanStack Query cache hit)
- [ ] Initial page load <1.5s (First Contentful Paint)
- [ ] Lighthouse performance score >90
- [ ] No Cumulative Layout Shift (CLS <0.1)

**Accessibility Requirements**:

- [ ] Lighthouse accessibility score >90
- [ ] Full keyboard navigation support (tabs, arrows, shortcuts)
- [ ] Screen reader compatible (tested with NVDA/VoiceOver)
- [ ] WCAG 2.1 AA compliant (color contrast, focus indicators)

**Responsive Requirements**:

- [ ] Mobile: Single column grid, scrollable day selector, stacked controls
- [ ] Tablet: 2-3 column grid, inline day selector, inline controls
- [ ] Desktop: 4-5 column grid, all controls visible
- [ ] Ultrawide: 6 column grid
- [ ] Touch targets ≥44x44px on mobile

---

## Notes

- All tasks include exact file paths for clarity
- [P] indicates parallelizable tasks (different files, no dependencies)
- [PHX] indicates which phase the task belongs to
- Each phase has clear checkpoint to validate progress
- URL state management (Phase 2) is critical foundation - must be solid before UI work
- Testing tasks (Phase 6) assume Phase 3-5 complete
- Performance measurement (T052-T053) should be implemented to validate <100ms target
- Monitor error rates in production per ANALYSIS.md recommendation (>1% triggers alert)

---

## Risk Mitigations (from Specification)

| Risk                         | Task Coverage                                                   |
| ---------------------------- | --------------------------------------------------------------- |
| Breaking existing deep links | T008 maintains backward compatibility (default to `everyday`)   |
| Performance regression       | T043-T053 ensure optimizations, T052-T053 measure performance   |
| Browser incompatibility      | T060 tests multiple viewports, T064 cross-browser accessibility |
| Accessibility regressions    | T028-T042 comprehensive ARIA, T061-T063 accessibility testing   |
| URL param edge cases         | T004 includes edge case tests per ANALYSIS.md recommendation    |

---

**Total Tasks**: 71  
**Estimated Duration**: 7-10 days (with 1-2 developers)  
**MVP Duration**: 2-3 days (Phase 1-3 only)  
**Parallelizable Tasks**: 35 marked with [P]

**Status**: ⏳ Ready for Implementation  
**Last Updated**: 2025-11-22
