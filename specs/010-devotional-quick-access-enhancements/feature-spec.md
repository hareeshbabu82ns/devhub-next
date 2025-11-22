# Feature Spec: Devotional Quick Access Enhancements

## Overview

Enhance the DevotionalQuickAccess component and its tabs (Everyday, Days of Week, Bookmarks) to be more responsive and user-friendly while maintaining existing functionality. Add URL search param-based tab navigation for deep linking and shareable states.

## Current State Analysis

### Component Structure

```
DevotionalQuickAccess (Parent)
├── EverydayDevotionalTab
├── WeeklyDevotionalTab (with day selector)
└── BookmarkedEntitiesGrid
```

### Current Features

1. **EverydayDevotionalTab**
   - Displays entities tagged with `EVERYDAY` quick access category
   - Pagination with configurable page size
   - Grid layout (2 columns on mobile, 3 on tablet, 4 on desktop)
   - Entity search dialog for adding content
   - Dropdown menu for managing quick access categories
   - Touch device optimization

2. **WeeklyDevotionalTab**
   - Day-based content filtering (Sunday-Saturday)
   - Day selector with deity associations
   - Current day highlighting
   - Similar grid layout and actions as Everyday tab
   - Automatic day selection based on current date

3. **BookmarkedEntitiesGrid**
   - Displays bookmarked entities regardless of type
   - Uses different tile component (ArtSlokamTile vs ArtTile)
   - Single column layout with full details
   - Bookmark toggle functionality

### Current Issues & Pain Points

#### Responsiveness Issues

1. **Tab Layout**: Fixed 3-column tab list doesn't adapt well to narrow screens
2. **Day Selector**: Buttons wrap awkwardly on mobile in WeeklyDevotionalTab
3. **Action Buttons**: Top-right controls overflow on small screens
4. **Grid Breakpoints**: Could be optimized for tablets and ultrawide screens
5. **Pagination Controls**: DDLB + Refresh button cluster is cramped on mobile

#### UX/Usability Issues

1. **No Deep Linking**: Can't share or bookmark specific tabs or days
2. **Lost Context**: Refreshing page resets tab selection
3. **Day Navigation**: No quick way to jump to today in Weekly tab
4. **Empty States**: Generic messages don't guide users effectively
5. **Loading States**: Full component re-render on tab switch is jarring
6. **No Visual Continuity**: Tab content jumps when switching tabs
7. **Action Menu**: Same dropdown appears in every entity - could be optimized
8. **No Bulk Actions**: Can't manage multiple entities at once

#### Accessibility Issues

1. **Keyboard Navigation**: Tab focus management could be improved
2. **Screen Reader Support**: ARIA labels missing in some areas
3. **Color Dependencies**: Day deity colors only visual indicator
4. **Focus Indicators**: Not prominent enough in some states

## Proposed Enhancements

### 1. URL-Based Tab Navigation

**Objective**: Enable deep linking and persistent tab state via URL search params

**Implementation**:

```typescript
// URL Pattern: /dashboard?tab=everyday | /dashboard?tab=daily&day=monday
// /dashboard?tab=bookmarks&page=2

interface TabSearchParams {
  tab?: "everyday" | "daily" | "bookmarks";
  day?: DayOfWeek; // For daily tab only
  page?: number; // Preserve pagination state
}
```

**Features**:

- Default to `everyday` tab if no param present
- Sync tab state with URL using `useSearchParams` and `router.replace`
- Preserve other query params when switching tabs
- Support back/forward browser navigation
- Share-friendly URLs for specific content views

**Benefits**:

- Shareable links to specific devotional content
- Browser history works naturally
- Refresh doesn't lose context
- Better SEO potential for public pages

### 2. Responsive Layout Improvements

#### A. Header & Tab Controls

```
Mobile (<640px):
┌─────────────────────────┐
│ Quick Access            │
│ [=] [☆] [📖]           │  ← Full width stacked tabs
│                         │
│ [+] [Page 1/5 ▼] [↻]  │  ← Controls on new row
└─────────────────────────┘

Tablet (640px-1024px):
┌──────────────────────────────────────┐
│ Quick Access    [=][☆][📖]          │  ← Inline tabs
│                 [+] [Page ▼] [↻]    │  ← Controls right-aligned
└──────────────────────────────────────┘

Desktop (>1024px):
┌──────────────────────────────────────────────┐
│ Quick Access  [Everyday][Days][Bookmarks]    │
│                            [+] [Page 1/5▼] [↻]│
└──────────────────────────────────────────────┘
```

#### B. Day Selector (WeeklyDevotionalTab)

```
Mobile: Horizontal scrollable row
┌─────────────────────────┐
│ ← [Sun][Mon][Tue]→      │  ← Scroll left/right
│   Swipe for more days   │
└─────────────────────────┘

Tablet/Desktop: All days visible
┌──────────────────────────────────────┐
│ [Sun][Mon][Tue][Wed][Thu][Fri][Sat] │
└──────────────────────────────────────┘
```

**Implementation**:

- Use `ScrollArea` from shadcn for mobile day selector
- Add visual scroll indicators (fade edges)
- Snap to center for selected day on mobile
- Add "Today" shortcut button on mobile

#### C. Entity Grid Breakpoints

```typescript
// Enhanced breakpoints
const gridClasses = cn(
  "grid gap-4",
  "grid-cols-1 xs:grid-cols-2", // 1 col mobile, 2 col large phones
  "sm:grid-cols-2 md:grid-cols-3", // 2-3 cols tablet
  "lg:grid-cols-4 xl:grid-cols-5", // 4-5 cols desktop
  "2xl:grid-cols-6", // 6 cols ultrawide
);
```

#### D. Action Button Optimization

```typescript
// Responsive action placement
Mobile:
  - Kebab menu always visible (floating on tile)
  - Single dropdown with all actions

Tablet+:
  - Hover-reveal dropdown (current behavior)
  - Optional: Quick action buttons + dropdown for more
```

### 3. Enhanced Navigation & Context

#### A. Quick Jump Features

1. **Today Button** (WeeklyDevotionalTab)

   ```tsx
   <Button
     variant="outline"
     size="sm"
     onClick={() => handleDayChange(getTodayCategory())}
   >
     <CalendarCheck /> Today
   </Button>
   ```

2. **Tab State Preservation**
   - Store last viewed day in localStorage
   - Restore on return to page
   - Clear on explicit navigation away

#### B. Loading State Improvements

1. **Skeleton Screens**: Show grid skeleton during fetch
2. **Optimistic Updates**: Instant UI feedback for mutations
3. **Stale-While-Revalidate**: Show cached data during refetch

#### C. Empty State Enhancements

```tsx
// Context-aware empty states
Everyday Empty:
  Icon: Star
  Message: "Build your daily collection"
  Action: "Search stotrams, puranas, and vrathas to add"
  CTA: [Search Entities]

Daily Empty (e.g., Monday):
  Icon: Calendar + Shiva symbol
  Message: "No Shiva devotional content for Monday"
  Context: "Monday is dedicated to Lord Shiva"
  Action: [Search Shiva Stotrams]

Bookmarks Empty:
  Icon: Bookmark
  Message: "No bookmarks yet"
  Action: "Explore entities and bookmark your favorites"
  CTA: [Browse Entities]
```

### 4. Accessibility Enhancements

#### A. ARIA Labels & Roles

```tsx
// Tab list
<TabsList role="tablist" aria-label="Devotional content categories">
  <TabsTrigger
    value="everyday"
    aria-label="Everyday devotional content"
    aria-controls="everyday-panel"
  />
</TabsList>

// Day selector
<div role="radiogroup" aria-label="Day of week selector">
  <Button
    role="radio"
    aria-checked={isSelected}
    aria-label={`${day}, dedicated to ${deity}`}
  />
</div>
```

#### B. Keyboard Navigation

1. **Tab Switching**: Arrow keys in tab list
2. **Day Switching**: Arrow keys in day selector
3. **Grid Navigation**: Arrow keys in entity grid
4. **Quick Actions**: Keyboard shortcuts
   - `t` = Go to Today (in Daily tab)
   - `s` = Open Search
   - `/` = Focus search

#### C. Focus Management

```typescript
// Focus first entity after tab switch
useEffect(() => {
  if (tabValue === "everyday" && !isFetching) {
    // Focus first grid item
    firstEntityRef.current?.focus();
  }
}, [tabValue, isFetching]);
```

#### D. Screen Reader Announcements

```tsx
// Live region for dynamic updates
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {isLoading && "Loading devotional content..."}
  {data && `${data.total} items found`}
</div>
```

### 5. Performance Optimizations

#### A. Query Optimization

```typescript
// Prefetch adjacent pages
useEffect(() => {
  if (page < totalPages) {
    queryClient.prefetchQuery({
      queryKey: ["devotional", tab, { page: page + 1 }],
      queryFn: () => fetchNextPage(),
    });
  }
}, [page]);

// Keep previous data during refetch
const { data } = useQuery({
  ...options,
  placeholderData: keepPreviousData, // TanStack Query v5
});
```

#### B. Virtualization (Optional - for large lists)

```typescript
// Only for Bookmarks tab if needed
import { useVirtualizer } from "@tanstack/react-virtual";

// Render only visible items
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 200, // Estimated item height
});
```

#### C. Code Splitting

```typescript
// Lazy load heavy components
const WeeklyDevotionalTab = lazy(() => import('./WeeklyDevotionalTab'));
const BookmarkedEntitiesGrid = lazy(() => import('./BookmarkedEntitiesGrid'));

// Suspense boundary
<Suspense fallback={<TabSkeleton />}>
  <WeeklyDevotionalTab />
</Suspense>
```

### 6. Additional UX Enhancements

#### A. Swipe Gestures (Mobile)

```typescript
// Swipe between tabs on touch devices
import { useSwipeable } from "react-swipeable";

const handlers = useSwipeable({
  onSwipedLeft: () => goToNextTab(),
  onSwipedRight: () => goToPrevTab(),
  trackMouse: false, // Only touch
});
```

#### B. Bulk Actions (Future)

```tsx
// Multi-select mode
const [selectionMode, setSelectionMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<string[]>([]);

// Bulk operations
- Add multiple to category
- Bulk bookmark/unbookmark
- Bulk remove from quick access
```

#### C. Search & Filter (Within Tab)

```tsx
// Quick filter within current view
<Input
  placeholder="Filter by name..."
  value={localFilter}
  onChange={(e) => setLocalFilter(e.target.value)}
/>;

// Client-side filtering for better UX
const filteredResults = useMemo(
  () =>
    data?.results.filter((entity) =>
      entity.text.some((t) =>
        t.value.toLowerCase().includes(localFilter.toLowerCase()),
      ),
    ),
  [data, localFilter],
);
```

#### D. Entity Preview (Hover/Touch)

```tsx
// Quick preview without navigation
<HoverCard>
  <HoverCardTrigger>
    <ArtTile />
  </HoverCardTrigger>
  <HoverCardContent>
    <EntityPreview entity={entity} />
  </HoverCardContent>
</HoverCard>
```

## Implementation Phases

### Phase 1: URL Navigation & Core Responsiveness (High Priority)

- [ ] Implement URL search param sync for tabs
- [ ] Add day parameter for Weekly tab
- [ ] Fix mobile tab list layout
- [ ] Improve day selector responsiveness
- [ ] Optimize action button placement for mobile

**Estimated Effort**: 2-3 days

### Phase 2: Enhanced UX & Empty States (Medium Priority)

- [ ] Add context-aware empty states
- [ ] Implement "Today" quick jump
- [ ] Add skeleton loading states
- [ ] Improve error messages with recovery actions
- [ ] Add loading/success toast notifications

**Estimated Effort**: 1-2 days

### Phase 3: Accessibility & Keyboard Nav (Medium Priority)

- [ ] Add comprehensive ARIA labels
- [ ] Implement keyboard shortcuts
- [ ] Improve focus management
- [ ] Add screen reader announcements
- [ ] Test with screen readers

**Estimated Effort**: 1-2 days

### Phase 4: Performance & Polish (Low Priority)

- [ ] Add query prefetching
- [ ] Implement code splitting
- [ ] Add swipe gestures for mobile
- [ ] Optimize grid breakpoints for all devices
- [ ] Add entity hover preview

**Estimated Effort**: 1-2 days

### Phase 5: Advanced Features (Future)

- [ ] Bulk selection and operations
- [ ] In-tab search/filter
- [ ] Drag-and-drop reordering
- [ ] Custom category creation
- [ ] Export/import quick access sets

**Estimated Effort**: 3-4 days

## Success Metrics

### Functional Metrics

- ✅ All tabs accessible via URL
- ✅ Browser back/forward works correctly
- ✅ Tab state persists across page refreshes
- ✅ No layout overflow on any screen size (320px+)

### Performance Metrics

- Tab switch < 100ms (cached)
- First contentful paint < 1.5s
- Time to interactive < 2.5s
- Lighthouse accessibility score > 90

### UX Metrics

- Reduced clicks to perform common actions
- Zero user-reported layout issues
- Keyboard navigation covers all features
- Touch targets meet 44x44px minimum

## Technical Considerations

### Next.js 15 Specifics

- Use `useSearchParams()` from `next/navigation`
- Use `useRouter()` for programmatic navigation
- Server components where possible (parent)
- Client components for interactivity (tabs)

### TanStack Query Patterns

- Use `placeholderData: keepPreviousData` for smooth transitions
- Implement prefetching for better perceived performance
- Leverage query invalidation for consistency

### Prisma/MongoDB Optimization

- Ensure indexes on `quickAccess` attribute
- Consider pagination cursor-based for large datasets
- Cache frequently accessed queries

### Browser Compatibility

- Test on Safari, Chrome, Firefox, Edge
- Test iOS Safari and Chrome Android
- Ensure touch gestures work correctly
- Fallback for older browsers

## Testing Strategy

### Unit Tests

- URL param parsing and generation
- Tab state synchronization
- Keyboard event handlers
- Responsive breakpoint logic

### Integration Tests

- Tab switching with URL updates
- Day selection with query refetch
- Pagination across tab switches
- Error state recovery

### E2E Tests (Playwright)

- Deep link to specific tab/day
- Navigate between tabs and verify URL
- Mobile swipe gesture (if implemented)
- Keyboard navigation flow

### Accessibility Tests

- Automated: axe-core, Lighthouse
- Manual: Screen reader testing (NVDA, VoiceOver)
- Keyboard-only navigation test
- Color contrast verification

## Documentation Updates

### User Documentation

- Add section on shareable links
- Document keyboard shortcuts
- Explain quick access categories

### Developer Documentation

- URL parameter schema
- Component state management
- Responsive design decisions
- Accessibility implementation notes

## Rollout Plan

1. **Development**: Implement in feature branch
2. **Internal Testing**: Team review and testing
3. **Staging Deploy**: Full QA cycle
4. **Canary Release**: 10% of users for 2 days
5. **Full Release**: Monitor for issues
6. **Monitoring**: Track performance metrics

## Risks & Mitigations

| Risk                         | Impact | Mitigation                                     |
| ---------------------------- | ------ | ---------------------------------------------- |
| Breaking existing deep links | High   | Maintain backward compatibility with old URLs  |
| Performance regression       | Medium | Benchmark before/after, implement lazy loading |
| Browser incompatibility      | Medium | Test on all major browsers early               |
| Accessibility regressions    | High   | Automated tests + manual verification          |
| Increased complexity         | Low    | Document thoroughly, add inline comments       |

## Clarifications

### Session 2025-11-22

- Q: Should we persist pagination state in URL? → A: Yes - Always persist pagination state in URL for deep linking and state preservation
- Q: Should we add entity count badges on tabs? → A: Defer to Phase 5 - Add as future enhancement based on user feedback
- Q: Should day selector show deity icons? → A: Text only - Keep buttons clean, use aria-label for deity context
- Q: Mobile filter UI pattern for Phase 5? → A: Defer decision to Phase 5 - Decide after validating filter requirements
- Q: Infinite scroll for Bookmarks tab? → A: Keep pagination - Defer infinite scroll to Phase 5

## Appendix

### Related Files

- `/src/app/(app)/dashboard/_components/DevotionalQuickAccess.tsx`
- `/src/app/(app)/dashboard/_components/EverydayDevotionalTab.tsx`
- `/src/app/(app)/dashboard/_components/WeeklyDevotionalTab.tsx`
- `/src/app/(app)/dashboard/_components/BookmarkedEntitiesGrid.tsx`
- `/src/lib/quick-access-constants.ts`
- `/src/app/(app)/dashboard/actions.ts`

### Dependencies

- Next.js 15+ (useSearchParams, useRouter)
- TanStack Query v5 (keepPreviousData)
- Radix UI / shadcn components
- Tailwind CSS for responsive utilities

### Reference Designs

- YouTube mobile tabs (swipe + URL state)
- Gmail mobile (responsive action buttons)
- Notion sidebar (keyboard shortcuts)
- Spotify day playlists (context-aware content)
