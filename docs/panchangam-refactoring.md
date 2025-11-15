# Panchangam Component Refactoring

## Overview

The PanchangamInfo component has been completely refactored to follow best practices for React component architecture, separating UI concerns from business logic and breaking down a large monolithic component into smaller, reusable pieces.

## Architecture Changes

### Before

- Single 250+ line component with mixed concerns
- Business logic embedded in UI component
- Inline utility functions
- Difficult to test and maintain
- No type safety for data structures

### After

- Modular architecture with clear separation of concerns
- Custom hook for business logic (`usePanchangam`)
- Reusable utility functions in dedicated file
- Small, focused components (< 200 lines each)
- Comprehensive TypeScript types
- Easy to test and maintain

## New File Structure

```
src/
├── lib/
│   └── panchangam/
│       ├── actions.ts           # Server actions (updated with types)
│       └── utils.ts             # NEW: Utility functions
├── hooks/
│   └── use-panchangam.ts        # NEW: Custom hook for data fetching
├── components/
│   └── panchangam/
│       ├── index.ts             # NEW: Barrel export
│       ├── DateNavigation.tsx   # NEW: Date picker and navigation
│       ├── PanchangamHeader.tsx # NEW: Header with place selector
│       ├── PanchangamDetails.tsx # NEW: Day details display
│       └── DayOverview.tsx      # Existing (updated with types)
├── types/
│   └── panchangam.ts            # NEW: Type definitions
└── app/
    └── (app)/
        └── dashboard/
            └── _components/
                └── PanchangamInfo.tsx # Refactored main component
```

## New Components

### 1. **usePanchangam Hook** (`hooks/use-panchangam.ts`)

**Purpose**: Manages all Panchangam data fetching, state, and date navigation logic.

**Responsibilities**:

- Fetches panchangam data using TanStack Query
- Manages date state with timezone awareness
- Provides navigation handlers (previous/next day, today)
- Handles place selection and timezone conversions
- Caches data for performance

**API**:

```typescript
const {
  data, // Panchangam data
  isLoading, // Loading state
  isError, // Error state
  error, // Error object
  cityId, // Selected city/place
  placeTimezone, // Timezone for selected place
  timelineView, // Timeline view mode
  date, // Currently selected date
  setDate, // Date setter function
  handlePreviousDay, // Navigate to previous day
  handleNextDay, // Navigate to next day
  handleToday, // Reset to today
  refetch, // Manual refresh function
} = usePanchangam();
```

**Benefits**:

- Business logic separated from UI
- Easily testable in isolation
- Reusable across multiple components
- Type-safe data handling

### 2. **DateNavigation Component** (`components/panchangam/DateNavigation.tsx`)

**Purpose**: Provides date selection and navigation controls.

**Features**:

- Calendar date picker with popover
- Previous/Next day buttons
- Today button to reset to current date
- Responsive design for mobile and desktop

**Props**:

```typescript
interface DateNavigationProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  className?: string;
}
```

### 3. **PanchangamHeader Component** (`components/panchangam/PanchangamHeader.tsx`)

**Purpose**: Displays the panchangam title, place selector, and refresh button.

**Features**:

- Panchangam title with icon
- Place selector dropdown
- Refresh button for manual data reload
- Responsive layout

**Props**:

```typescript
interface PanchangamHeaderProps {
  onRefresh: () => void;
  className?: string;
}
```

### 4. **PanchangamDetails Component** (`components/panchangam/PanchangamDetails.tsx`)

**Purpose**: Displays detailed panchang information including tithi, nakshatra, and celestial times.

**Features**:

- Date display with full formatting
- Panchang information (Varam, Paksham, Masam, etc.)
- Tithi information with badges and transition times
- Nakshatra information with badges and transition times
- Sun and Moon rise/set times with icons
- Helper components for clean code organization

**Props**:

```typescript
interface PanchangamDetailsProps {
  date: Date | undefined;
  panchangamData: PanchangamData;
  className?: string;
}
```

**Sub-components**:

- `PanchangInfoRow`: Displays a single panchang info item
- `CelestialTimeDisplay`: Displays sun/moon rise and set times

### 5. **Utility Functions** (`lib/panchangam/utils.ts`)

**Purpose**: Reusable timezone and date utility functions.

**Functions**:

- `getTodayInTimezone(timeZone: string): Date` - Get current date in specific timezone
- `formatDateInTimezone(date: Date, timeZone: string): string` - Format date as DD/MM/YYYY
- `getPlaceTimezone(placeId: string, timezones: Record<string, string>, defaultTimezone?: string): string` - Get timezone for a place

**Benefits**:

- DRY principle - no duplication
- Easily testable
- Reusable across the application
- Handles edge cases consistently

### 6. **Type Definitions** (`types/panchangam.ts`)

**Purpose**: Comprehensive TypeScript type definitions for all Panchangam data structures.

**Types Defined**:

- `TimeRange` - Generic time range with start/end
- `TithiInfo` - Tithi information
- `NakshatraInfo` - Nakshatra information
- `PanchangInfo` - Complete panchang info
- `CelestialTime` - Sun/Moon rise/set times
- `DayInfo` - Complete day information
- `ScheduleItem` - Auspicious/inauspicious timings
- `PanchangamData` - Complete panchangam data
- `PanchangamResponse` - Server response structure
- `GetPanchangamParams` - Parameters for fetching data

**Benefits**:

- Type safety throughout the application
- Better IDE autocomplete
- Self-documenting code
- Prevents runtime errors

## Refactored Main Component

The `PanchangamInfo` component is now a clean composition layer:

```typescript
const PanchangamInfo: React.FC<PanchangamInfoProps> = ({ className }) => {
  const {
    data,
    isLoading,
    isError,
    cityId,
    date,
    setDate,
    handlePreviousDay,
    handleNextDay,
    handleToday,
    refetch,
  } = usePanchangam();

  // Loading and error states
  if (isLoading) return <Loader />;
  if (isError) return <SimpleAlert title="Error fetching panchangam" />;
  if (!data) return <SimpleAlert title="No panchangam data available" />;

  return (
    <div className={cn("@container/panchangam flex flex-col mt-4 gap-4", className)}>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <PanchangamHeader onRefresh={() => refetch()} />
            <Separator />
            <DateNavigation
              date={date}
              onDateSelect={setDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onToday={handleToday}
            />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <PanchangamDetails date={date} panchangamData={data.consizeInfo} />
              </div>
              <Card className="lg:col-span-3 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardContent className="p-0">
                    <DayOverview schedules={data.consizeInfo.schedules} place={cityId} />
                  </CardContent>
                </CardHeader>
              </Card>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};
```

**Key Improvements**:

- Reduced from 250+ lines to ~90 lines
- Clear separation of concerns
- Easy to understand at a glance
- Maintainable and extensible

## Benefits of Refactoring

### 1. **Separation of Concerns**

- UI components only handle presentation
- Business logic isolated in custom hook
- Utilities separated for reusability

### 2. **Improved Testability**

- Each component can be tested independently
- Custom hook can be tested without rendering UI
- Utilities can be unit tested easily

### 3. **Better Type Safety**

- Comprehensive type definitions
- No implicit `any` types
- Type-safe props and return values

### 4. **Enhanced Maintainability**

- Smaller, focused components
- Clear component responsibilities
- Easy to locate and fix bugs

### 5. **Increased Reusability**

- Components can be reused in other contexts
- Utilities available throughout the app
- Custom hook pattern for similar features

### 6. **Performance Optimizations**

- TanStack Query caching built into hook
- Memoization opportunities in smaller components
- Reduced unnecessary re-renders

### 7. **Developer Experience**

- Better IDE autocomplete
- Easier to onboard new developers
- Self-documenting code with types
- Barrel exports for clean imports

## Usage Examples

### Using the Custom Hook in Other Components

```typescript
import { usePanchangam } from "@/hooks/use-panchangam";

function MyCustomPanchangam() {
  const { data, date, handleNextDay } = usePanchangam();

  // Use the hook data and methods
  return (
    <div>
      <h1>Today's Tithi: {data?.consizeInfo.day.panchang.tithiToday.name}</h1>
      <button onClick={handleNextDay}>Next Day</button>
    </div>
  );
}
```

### Using Individual Components

```typescript
import { DateNavigation, PanchangamDetails } from "@/components/panchangam";

function CustomLayout() {
  const [date, setDate] = useState(new Date());

  return (
    <div>
      <DateNavigation
        date={date}
        onDateSelect={setDate}
        onPreviousDay={() => setDate(subDays(date, 1))}
        onNextDay={() => setDate(addDays(date, 1))}
        onToday={() => setDate(new Date())}
      />
      {/* Other content */}
    </div>
  );
}
```

### Using Utility Functions

```typescript
import {
  getTodayInTimezone,
  formatDateInTimezone,
} from "@/lib/panchangam/utils";

const todayInIndia = getTodayInTimezone("Asia/Kolkata");
const formattedDate = formatDateInTimezone(todayInIndia, "Asia/Kolkata");
```

## Migration Notes

### Breaking Changes

None - the refactored component maintains the same external API and behavior.

### Files Created

- `src/lib/panchangam/utils.ts`
- `src/hooks/use-panchangam.ts`
- `src/components/panchangam/DateNavigation.tsx`
- `src/components/panchangam/PanchangamHeader.tsx`
- `src/components/panchangam/PanchangamDetails.tsx`
- `src/components/panchangam/index.ts`
- `src/types/panchangam.ts`

### Files Modified

- `src/app/(app)/dashboard/_components/PanchangamInfo.tsx` - Complete refactor
- `src/lib/panchangam/actions.ts` - Added type imports and annotations
- `src/components/panchangam/DayOverview.tsx` - Updated to use shared types

## Testing Recommendations

### Unit Tests

1. Test utility functions in isolation
2. Test custom hook with React Testing Library
3. Test individual components with mock data

### Integration Tests

1. Test component composition
2. Test date navigation flow
3. Test place selection and data refresh

### E2E Tests

1. Test full user workflow
2. Test timezone handling
3. Test error states and loading states

## Future Enhancements

### Potential Improvements

1. **Memoization**: Add React.memo to components for performance
2. **Error Boundaries**: Wrap components in error boundaries
3. **Accessibility**: Add ARIA labels and keyboard navigation
4. **Animation**: Add smooth transitions for date changes
5. **Offline Support**: Cache data for offline viewing
6. **Export Functionality**: Allow users to export panchangam data
7. **Notifications**: Remind users about important timings

### Component Extensions

1. **WeekView**: Show entire week at a glance
2. **MonthView**: Calendar view with daily highlights
3. **Favorites**: Save and quickly access specific dates
4. **Sharing**: Share panchangam via social media or link

## Conclusion

This refactoring significantly improves the codebase quality, maintainability, and developer experience while maintaining 100% backward compatibility. The new architecture follows React and TypeScript best practices and provides a solid foundation for future enhancements.
