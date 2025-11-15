# Feature Specification: Panchangam (Hindu Calendar) System

**Feature Branch**: `004-panchangam-system`  
**Created**: 2025-11-15  
**Status**: Implemented  
**Domain**: Calendar & Astronomy

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Daily Panchangam (Priority: P1)

Users want to view Hindu calendar information (Tithi, Nakshatra, Yoga, Karana, sunrise/sunset times) for their location and date.

**Why this priority**: Core feature providing essential daily religious calendar information. Without this, the Panchangam feature has no value.

**Independent Test**: Can be fully tested by selecting a location and date, then viewing the Panchangam data with all timing information.

**Acceptance Scenarios**:

1. **Given** user on dashboard/Panchangam page, **When** page loads, **Then** current day's Panchangam for default location (Calgary) is displayed
2. **Given** Panchangam display, **When** user views data, **Then** they see Tithi, Nakshatra, Yoga, Karana with start/end times
3. **Given** Panchangam display, **When** viewed, **Then** sunrise, sunset, moonrise, moonset times are shown in local timezone
4. **Given** Panchangam display, **When** viewed, **Then** auspicious timings (Abhijit Muhurta, Brahma Muhurta, Amrit Kalam, Rahu Kalam, etc.) are displayed
5. **Given** Panchangam data, **When** displayed, **Then** Hindu calendar date (Samvat, month, paksha) is shown alongside Gregorian date

---

### User Story 2 - Change Location for Panchangam (Priority: P1)

Users want to view Panchangam for different geographical locations as astronomical times vary by location.

**Why this priority**: Essential for accuracy - Panchangam times are location-specific. Users need data relevant to where they are.

**Independent Test**: Can be tested by switching between two locations (e.g., Calgary and Tirupati) and verifying times change appropriately.

**Acceptance Scenarios**:

1. **Given** Panchangam view, **When** user clicks location selector, **Then** dropdown shows available locations (Calgary, Tirupati, etc.)
2. **Given** location dropdown, **When** user selects different location, **Then** Panchangam data refreshes with times for new location
3. **Given** location change, **When** selected, **Then** all times are automatically converted to selected location's timezone
4. **Given** user preference, **When** location is changed, **Then** selection is persisted for future visits (localStorage or user profile)
5. **Given** location with different timezone, **When** viewing Panchangam, **Then** timezone offset is clearly displayed

---

### User Story 3 - Navigate to Different Dates (Priority: P1)

Users want to view Panchangam for past or future dates to plan religious activities.

**Why this priority**: Core navigation feature. Users need to check auspicious dates for ceremonies and events.

**Independent Test**: Can be tested by using date picker to view yesterday, today, and tomorrow's Panchangam data.

**Acceptance Scenarios**:

1. **Given** Panchangam view, **When** user clicks date picker, **Then** calendar interface opens allowing date selection
2. **Given** date picker, **When** user selects past date, **Then** Panchangam for that date is loaded (from cache or fetched)
3. **Given** date picker, **When** user selects future date, **Then** Panchangam is fetched and displayed
4. **Given** Panchangam view, **When** user clicks "Previous Day" button, **Then** previous day's Panchangam loads
5. **Given** Panchangam view, **When** user clicks "Next Day" button, **Then** next day's Panchangam loads
6. **Given** Panchangam view, **When** user clicks "Today" button, **Then** current day's Panchangam loads regardless of current date

---

### User Story 4 - Automatic Caching and Performance (Priority: P2)

System needs to cache Panchangam data locally to reduce external API calls and improve loading speed.

**Why this priority**: Improves performance and reliability, reduces dependency on external service. Not critical for basic functionality.

**Independent Test**: Can be tested by viewing Panchangam, clearing cache, viewing again, and verifying second load is faster.

**Acceptance Scenarios**:

1. **Given** Panchangam request for specific date/location, **When** data doesn't exist in cache, **Then** system fetches from drikpanchang.com and caches locally
2. **Given** cached Panchangam data, **When** user requests same date/location again, **Then** data loads from file cache without external request
3. **Given** cached data older than 24 hours for past date, **When** requested, **Then** cached version is used without re-fetching
4. **Given** cached data for future date, **When** that date becomes today, **Then** system may re-fetch for updated information
5. **Given** cache directory, **When** previous day's data exists, **Then** system automatically deletes old cache files to save space
6. **Given** cache file, **When** saved, **Then** filename includes geoname ID, date, and cache version for uniqueness

---

### User Story 5 - Web Scraping with Error Handling (Priority: P2)

System needs to reliably scrape Panchangam data from drikpanchang.com with proper error handling when external service is unavailable.

**Why this priority**: Ensures robustness, but users expect some downtime when external service fails. Better than complete failure.

**Independent Test**: Can be tested by simulating network failure and verifying graceful error handling with cached fallback.

**Acceptance Scenarios**:

1. **Given** Panchangam fetch request, **When** external site is reachable, **Then** HTML is fetched and parsed using Cheerio
2. **Given** HTML parsing, **When** processing page, **Then** all timing tables are extracted with label and time columns
3. **Given** fetch failure, **When** external site is down, **Then** user sees error message "Unable to fetch Panchangam data" with cached data if available
4. **Given** malformed HTML, **When** parsing fails, **Then** error is logged and user sees graceful error message
5. **Given** successful fetch, **When** data is parsed, **Then** HTML is saved to cache file before returning to user
6. **Given** URL construction, **When** building request, **Then** geoname-id, date, and time format parameters are correctly encoded

---

### User Story 6 - Display Formatted Timing Information (Priority: P1)

Users need to see timing information formatted clearly with labels, times, and visual hierarchy.

**Why this priority**: Data presentation is critical for usability. Raw data without formatting is hard to read.

**Independent Test**: Can be tested by viewing Panchangam and verifying all sections are clearly labeled and times are readable.

**Acceptance Scenarios**:

1. **Given** Panchangam data, **When** displayed, **Then** timing information is grouped into logical sections (Sun/Moon, Auspicious Times, Inauspicious Times)
2. **Given** timing entry, **When** displayed, **Then** each entry shows label and corresponding time(s) with proper formatting
3. **Given** time period (e.g., Tithi), **When** displayed, **Then** shows start time, end time, and duration if available
4. **Given** Panchangam view, **When** on mobile device, **Then** timing tables are responsive and scrollable
5. **Given** 24-hour time format preference, **When** viewing Panchangam, **Then** all times use 24-hour format as configured

---

### User Story 7 - Integration with Dashboard (Priority: P2)

Users want to see today's Panchangam summary on their dashboard for quick reference without navigating to dedicated page.

**Why this priority**: Convenience feature for frequent users. Dedicated Panchangam page covers core functionality.

**Independent Test**: Can be tested by logging in to dashboard and verifying Panchangam widget displays current day's summary.

**Acceptance Scenarios**:

1. **Given** user on dashboard, **When** page loads, **Then** Panchangam widget shows today's Tithi and Nakshatra
2. **Given** dashboard Panchangam widget, **When** clicked, **Then** user is navigated to full Panchangam page
3. **Given** dashboard widget, **When** displaying summary, **Then** shows next auspicious timing (e.g., Abhijit Muhurta) if within current day
4. **Given** dashboard loading, **When** Panchangam fetch is slow, **Then** widget shows loading state without blocking other dashboard content
5. **Given** dashboard Panchangam error, **When** fetch fails, **Then** widget displays "Panchangam unavailable" without breaking dashboard

---

### Edge Cases

- What happens when external site changes HTML structure? **Parser may fail, cached data is used if available, admin is notified**
- How does system handle timezone conversion errors? **Falls back to UTC, logs warning, displays timezone indicator**
- What happens when cache directory is full? **Old files are automatically deleted (previous days), configurable retention policy**
- How does system handle invalid geoname ID? **Returns error "Location not supported", user shown available locations**
- What happens when user requests date 10 years in future? **System fetches normally, data may be approximate or unavailable from source**
- How does system handle daylight saving time transitions? **Uses date-fns with IANA timezone data for accurate conversions**
- What happens when multiple users request same date/location simultaneously? **First request caches, subsequent requests read from cache**
- How does system handle cache corruption? **Validates cache file, re-fetches if invalid, logs error**
- What happens when source site is permanently down? **System relies on cached data, shows warning, suggests alternate source**

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST fetch Panchangam data from drikpanchang.com for specified date and geoname ID
- **FR-002**: System MUST parse HTML using Cheerio to extract timing tables and values
- **FR-003**: System MUST cache fetched HTML in `/data/` directory with filename format: `0_panchangam_{geonameId}_{day}_{month}_{year}.html`
- **FR-004**: System MUST read from cache file if available before fetching from external source
- **FR-005**: System MUST automatically delete cache files for previous day to manage storage
- **FR-006**: System MUST support configurable locations with geoname ID mapping (Calgary=5913490, Tirupati=1254360)
- **FR-007**: System MUST support timezone conversion using IANA timezone identifiers (America/Edmonton, Asia/Kolkata)
- **FR-008**: System MUST extract and display Tithi (lunar day) with start/end times
- **FR-009**: System MUST extract and display Nakshatra (lunar mansion) with start/end times
- **FR-010**: System MUST extract and display Yoga with start/end times
- **FR-011**: System MUST extract and display Karana with start/end times
- **FR-012**: System MUST extract and display sunrise, sunset, moonrise, moonset times
- **FR-013**: System MUST extract and display auspicious timings (Abhijit Muhurta, Brahma Muhurta, Amrit Kalam, Vijay Muhurta, Godhuli Muhurta)
- **FR-014**: System MUST extract and display inauspicious timings (Rahu Kalam, Gulikai Kalam, Yamaganda, Dur Muhurtam)
- **FR-015**: System MUST display Hindu calendar date (Samvat year, month name, paksha)
- **FR-016**: System MUST support date navigation (previous day, next day, today, date picker)
- **FR-017**: System MUST support location selection with dropdown or search interface
- **FR-018**: System MUST use 24-hour time format for display (configurable)
- **FR-019**: System MUST handle fetch errors gracefully with user-friendly error messages
- **FR-020**: System MUST log fetch attempts, cache hits/misses, and errors for debugging
- **FR-021**: System MUST construct URLs with proper query parameters (geoname-id, date, time-format)
- **FR-022**: System MUST parse dates in DD/MM/YYYY format for drikpanchang.com API
- **FR-023**: System MUST convert date components to specified timezone before fetching
- **FR-024**: System MUST validate date is within reasonable range (e.g., 1900-2100)
- **FR-025**: System MUST expose Panchangam functionality via Server Actions with discriminated union responses

### Key Entities

- **GetPanchangamParams**: Input parameters with date, geoname ID (defaults to Calgary), timezone
- **PanchangamResponse**: Parsed Panchangam data with all timing information, success/error status
- **PanchangamPlace**: Location mapping with geoname ID, name, timezone, coordinates (optional)
- **TimingEntry**: Individual timing with label and time/duration value
- **CacheFile**: HTML cache file with naming convention and expiry logic
- **DrikPanchang URL**: External source with baseUrl and query parameters

### Technical Constraints

- Cheerio for HTML parsing (server-side DOM manipulation)
- Node.js fs/promises for file-based caching
- date-fns for date manipulation and formatting
- File cache in `/data/` directory (gitignored)
- Server Actions for data fetching (no client-side scraping)
- usePanchangam() hook for client-side state management
- TanStack Query for caching and request deduplication on client
- No database storage for Panchangam data (file-based only)
- External dependency on drikpanchang.com (potential SPOF)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Panchangam data loads within 2 seconds on cache hit
- **SC-002**: Panchangam data loads within 5 seconds on cache miss (external fetch)
- **SC-003**: Cache hit rate of 80%+ for typical user access patterns (same day, multiple views)
- **SC-004**: Timing accuracy matches source website with 100% fidelity
- **SC-005**: Location switching updates all times correctly within 1 second
- **SC-006**: Date navigation responds within 1 second for cached dates
- **SC-007**: HTML parsing successfully extracts 95%+ of timing data from source
- **SC-008**: Error handling provides clear messages without exposing technical details
- **SC-009**: Cache management automatically cleans up old files daily
- **SC-010**: Timezone conversion accuracy of 100% including DST transitions
- **SC-011**: System handles 100+ Panchangam requests per day without performance issues
- **SC-012**: Dashboard widget loads Panchangam summary within 2 seconds
- **SC-013**: Mobile responsive design displays all timing tables without horizontal scroll
- **SC-014**: Zero data corruption in cache files
- **SC-015**: 99%+ uptime assuming external source is available
