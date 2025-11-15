# Panchangam Component Architecture

## Component Hierarchy

```
PanchangamInfo (Main Container)
├── usePanchangam() Hook
│   ├── useQuery (TanStack Query)
│   ├── usePanchangamPlaceAtomValue
│   ├── Date State Management
│   └── Navigation Handlers
│
├── PanchangamHeader
│   ├── Title with Icon
│   ├── PanchangamPlaceSelector
│   └── Refresh Button
│
├── DateNavigation
│   ├── Previous Day Button
│   ├── Calendar Popover
│   │   └── Calendar Component
│   ├── Next Day Button
│   └── Today Button
│
├── PanchangamDetails
│   ├── Date Display
│   ├── Panchang Info
│   │   ├── Varam
│   │   ├── Paksham
│   │   ├── Masam
│   │   ├── Ayana
│   │   ├── Ritu
│   │   └── Samvatsaram
│   ├── Tithi Section
│   │   ├── Current Tithi Badge
│   │   └── Next Tithi Info
│   ├── Nakshatra Section
│   │   ├── Current Nakshatra Badge
│   │   └── Next Nakshatra Info
│   └── Celestial Times
│       ├── Sun Rise/Set
│       └── Moon Rise/Set
│
└── DayOverview (Timeline)
    ├── DayOverviewAdvanced (default)
    └── DayOverviewLegacy (alternative)
```

## Data Flow

```
Server Action (getDayPanchangam)
    ↓
    Fetches HTML from drikpanchang.com
    ↓
    Parses with Cheerio
    ↓
    Returns PanchangamResponse
    ↓
usePanchangam Hook
    ↓
    TanStack Query Cache
    ↓
    Components consume data via hook
    ↓
    User Interaction (date change, place change)
    ↓
    Hook updates state
    ↓
    Query refetches automatically
    ↓
    UI updates
```

## File Dependencies

```
PanchangamInfo.tsx
    ├── @/hooks/use-panchangam
    │   ├── @tanstack/react-query
    │   ├── @/hooks/use-config
    │   ├── @/lib/panchangam/actions
    │   ├── @/lib/panchangam/utils
    │   └── @/lib/constants
    │
    └── @/components/panchangam
        ├── PanchangamHeader
        │   ├── @/components/ui/button
        │   ├── @/components/ui/card
        │   ├── @/components/utils/icons
        │   └── @/components/blocks/panchangam-place-selector
        │
        ├── DateNavigation
        │   ├── @/components/ui/button
        │   ├── @/components/ui/calendar
        │   ├── @/components/ui/popover
        │   └── lucide-react
        │
        ├── PanchangamDetails
        │   ├── @/components/ui/card
        │   ├── @/components/ui/badge
        │   ├── @/components/ui/separator
        │   ├── @/types/panchangam
        │   └── lucide-react
        │
        └── DayOverview
            ├── @/hooks/use-config
            └── DayOverviewAdvanced | DayOverviewLegacy
```

## State Management

```
Global State (Jotai Atoms)
├── panchangamPlaceAtom (selected place)
└── panchangamTimelineViewAtom (view mode)

Local State (usePanchangam)
├── date (selected date)
└── Query state (data, loading, error)

Server State (TanStack Query)
└── Cached panchangam data by [place, date]
```

## Type System

```
Core Types (@/types/panchangam)
├── PanchangamResponse
│   ├── info: any[]
│   └── consizeInfo: PanchangamData
│
├── PanchangamData
│   ├── date: string
│   ├── place: string
│   ├── day: DayInfo
│   ├── month: string
│   ├── year: string
│   ├── ayana: string
│   ├── ritu: string
│   └── schedules: ScheduleItem[]
│
├── DayInfo
│   ├── panchang: PanchangInfo
│   ├── sun: CelestialTime
│   └── moon: CelestialTime
│
├── PanchangInfo
│   ├── tithiToday: TithiInfo
│   ├── tithiNext?: TithiInfo
│   ├── nakshatraToday: NakshatraInfo
│   ├── nakshatraNext?: NakshatraInfo
│   ├── weekday: string
│   └── paksha: string
│
└── ScheduleItem
    ├── title: string
    ├── startTime: string
    ├── endTime: string
    └── negative?: boolean
```

## Utility Functions Flow

```
Timezone & Date Utils (@/lib/panchangam/utils)

getTodayInTimezone(timezone)
    ↓
    Intl.DateTimeFormat
    ↓
    Parse parts
    ↓
    Return Date object

formatDateInTimezone(date, timezone)
    ↓
    Intl.DateTimeFormat
    ↓
    Parse parts
    ↓
    Return "DD/MM/YYYY" string

getPlaceTimezone(placeId, timezones, default)
    ↓
    Lookup in timezones map
    ↓
    Return timezone string
```

## Component Lifecycle

```
1. PanchangamInfo mounts
    ↓
2. usePanchangam initializes
    ↓
3. Gets place from atom (calgary/tirupati)
    ↓
4. Gets timezone for place
    ↓
5. Sets initial date (today in place timezone)
    ↓
6. useQuery triggers fetch
    ↓
7. getDayPanchangam server action runs
    ↓
8. Check cache file exists
    ↓
    Yes → Read from file
    No → Fetch from web → Save to cache
    ↓
9. Parse HTML with Cheerio
    ↓
10. Transform to PanchangamData
    ↓
11. Return to component
    ↓
12. Render with data

User Actions:
- Change date → Update state → Refetch
- Change place → Update timezone → Update date → Refetch
- Click refresh → Manual refetch
```

## Performance Optimizations

```
Caching Strategy
├── TanStack Query Cache
│   ├── Key: ["panchangam", cityId, date]
│   ├── Stale Time: QUERY_STALE_TIME_LONG
│   └── Cache Time: 5 minutes
│
├── File System Cache
│   ├── Location: data/ folder
│   ├── Format: HTML
│   ├── Cleanup: Previous day deleted automatically
│   └── Purpose: Reduce external API calls
│
└── Component Memoization (Future)
    ├── React.memo on PanchangamDetails
    ├── React.memo on DateNavigation
    └── useMemo for expensive calculations
```

## Error Handling

```
Error Boundaries
├── Component Level
│   ├── isLoading → <Loader />
│   ├── isError → <SimpleAlert />
│   └── !data → <SimpleAlert />
│
├── Query Level
│   ├── Network errors
│   ├── Parse errors
│   └── Invalid data errors
│
└── Server Action Level
    ├── Invalid place
    ├── Fetch failures
    └── File system errors
```
