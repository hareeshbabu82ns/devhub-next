# Feature Specification: Sanskrit Dictionary System

**Feature Branch**: `003-dictionary-system`  
**Created**: 2025-11-15  
**Status**: Implemented  
**Domain**: Dictionary & Translation

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Search Sanskrit/Telugu Words (Priority: P1)

Users want to look up Sanskrit or Telugu words to find their meanings, with support for phonetic search and transliteration.

**Why this priority**: Core dictionary functionality. Without search, the dictionary has no value to users.

**Independent Test**: Can be fully tested by entering a Sanskrit word, seeing results with meanings in multiple languages, and verifying phonetic matches work.

**Acceptance Scenarios**:

1. **Given** user on dictionary page, **When** they enter Sanskrit word in any script (Devanagari, IAST, ITRANS), **Then** matching dictionary entries are displayed
2. **Given** dictionary search results, **When** displayed, **Then** each entry shows word in multiple scripts, phonetic representation, and description in available languages
3. **Given** user entering partial word, **When** searching, **Then** autocomplete suggestions appear based on phonetic matching
4. **Given** search query with transliteration, **When** user types "namah" (ITRANS), **Then** results include "नमः" (Devanagari) and "నమః" (Telugu)
5. **Given** dictionary results, **When** user clicks on entry, **Then** detailed view shows full description, attributes, and source data

---

### User Story 2 - Browse Dictionary by Origin (Priority: P1)

Users want to browse dictionaries by source (Monier-Williams, Apte, etc.) with pagination for large word collections.

**Why this priority**: Essential for exploring dictionary content systematically. Users need to understand which dictionary source they're using.

**Independent Test**: Can be tested by selecting a dictionary origin, browsing pages, and verifying correct words are displayed.

**Acceptance Scenarios**:

1. **Given** dictionary page, **When** user selects dictionary origin (mw, ap90, eng2te), **Then** only words from that dictionary are displayed
2. **Given** dictionary view, **When** user navigates pages, **Then** words are displayed in sequential wordIndex order
3. **Given** dictionary listing, **When** viewed, **Then** each entry shows word, brief description, and phonetic representation
4. **Given** large dictionary (10,000+ words), **When** user browses, **Then** pagination loads quickly (<1 second per page)
5. **Given** dictionary filter, **When** user combines origin filter with search, **Then** results are scoped to selected dictionary

---

### User Story 3 - Import Dictionary from SQLite (Priority: P2)

Administrators need to import dictionary data from SQLite databases into MongoDB, with progress tracking and error handling.

**Why this priority**: Required for initial setup and updates, but not needed for daily operations once data is loaded.

**Independent Test**: Can be tested by running import script with SQLite file, monitoring progress, and verifying data appears in dictionary.

**Acceptance Scenarios**:

1. **Given** admin with SQLite dictionary file, **When** they run import command, **Then** dictionary data is converted and inserted into MongoDB
2. **Given** dictionary import process, **When** running, **Then** progress percentage and status updates are displayed in real-time
3. **Given** dictionary import, **When** processing words, **Then** system automatically generates phonetic representations and transliterations
4. **Given** dictionary import with errors, **When** invalid rows encountered, **Then** errors are logged and import continues with valid rows
5. **Given** existing dictionary data, **When** re-importing, **Then** admin can choose to delete existing data or merge with new data
6. **Given** large dictionary file, **When** importing, **Then** bulk insert operations use chunking (1000-5000 records per chunk) for memory efficiency

---

### User Story 4 - View Word Details with Source Data (Priority: P2)

Users want to see detailed information about dictionary words including etymology, grammar, and original source data.

**Why this priority**: Valuable for scholars and serious learners, but basic search/meaning is sufficient for most users.

**Independent Test**: Can be tested by clicking on dictionary entry and viewing all available details including source JSON.

**Acceptance Scenarios**:

1. **Given** dictionary search results, **When** user clicks on word entry, **Then** detail page shows word in all scripts, full description, and attributes
2. **Given** dictionary word detail, **When** source data exists, **Then** JSON source data is displayed in expandable section
3. **Given** word with multiple meanings, **When** viewed, **Then** descriptions in different languages are displayed separately
4. **Given** word detail page, **When** attributes exist (grammar, etymology), **Then** they are displayed as labeled key-value pairs
5. **Given** word detail page, **When** related words exist, **Then** links to related entries are displayed

---

### User Story 5 - Create and Edit Dictionary Entries (Priority: P3)

Administrators want to manually add or edit dictionary entries for corrections or custom additions.

**Why this priority**: Nice to have for data curation, but bulk imports cover most use cases. Manual editing is edge case.

**Independent Test**: Can be tested by creating new dictionary word entry and verifying it appears in search results.

**Acceptance Scenarios**:

1. **Given** admin user, **When** they access "New Dictionary Word" form, **Then** they can enter word, phonetic, origin, and multilingual descriptions
2. **Given** dictionary word form, **When** entering word in one script, **Then** system suggests transliterations for other scripts
3. **Given** existing dictionary word, **When** admin clicks edit, **Then** form is pre-filled with current values including all languages
4. **Given** dictionary word form, **When** saving, **Then** wordIndex is auto-generated as next sequential number for that origin
5. **Given** dictionary word, **When** admin deletes it, **Then** confirmation dialog prevents accidental deletion

---

### User Story 6 - Multi-Dictionary Batch Import (Priority: P2)

Administrators need to import multiple dictionaries in sequence with consolidated progress reporting.

**Why this priority**: Saves time during initial setup with multiple dictionary sources. One-time operation but important for efficiency.

**Independent Test**: Can be tested by providing multiple SQLite files and monitoring sequential import of all dictionaries.

**Acceptance Scenarios**:

1. **Given** admin with multiple dictionary files, **When** they run batch import, **Then** each dictionary is imported sequentially
2. **Given** batch import process, **When** running, **Then** overall progress and per-dictionary progress are displayed
3. **Given** batch import with one failure, **When** error occurs, **Then** remaining dictionaries continue to import
4. **Given** batch import completion, **When** finished, **Then** summary shows success/failure count for each dictionary
5. **Given** batch import configuration, **When** admin specifies options, **Then** same options (chunkSize, deleteExisting) apply to all dictionaries

---

### User Story 7 - Transliteration and Script Conversion (Priority: P2)

Users want to see dictionary words in multiple scripts (Devanagari, Telugu, IAST, ITRANS) with accurate transliteration.

**Why this priority**: Critical for multilingual users, but basic Latin phonetics cover minimum viable product.

**Independent Test**: Can be tested by viewing a Sanskrit word and verifying it displays correctly in all supported scripts.

**Acceptance Scenarios**:

1. **Given** dictionary word in Devanagari, **When** displayed, **Then** automatic transliterations to IAST, ITRANS, and Telugu are shown
2. **Given** user entering search in ITRANS, **When** searching, **Then** system converts to Devanagari for matching
3. **Given** word with special characters, **When** transliterated, **Then** @indic-transliteration/sanscript preserves diacritics correctly
4. **Given** dictionary entry, **When** user clicks script toggle, **Then** word display switches between Devanagari, Telugu, and Latin scripts
5. **Given** phonetic field, **When** imported from source, **Then** system uses existing phonetics or generates from Devanagari

---

### Edge Cases

- What happens when search returns 1000+ results? **Pagination displays 50 results per page with fast navigation**
- How does system handle words with no description? **Displays word and phonetic only, marks description as "Not available"**
- What happens when importing duplicate wordIndex for same origin? **MongoDB unique constraint prevents duplicates, import logs error**
- How does system handle malformed SQLite data? **Row-level error handling skips bad rows, logs errors, continues import**
- What happens when transliteration fails for unsupported characters? **Falls back to original text, logs warning**
- How does system handle very long descriptions (>10,000 characters)? **MongoDB Text field handles large text, UI truncates with "Read more" expansion**
- What happens when user searches empty string? **Returns no results or prompts for search term**
- How does system handle concurrent imports? **Single import at a time recommended, multiple imports may cause memory issues**
- What happens when SQLite file is missing or corrupted? **Import fails gracefully with clear error message before processing**

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support searching dictionary words by phonetic representation with partial matching
- **FR-002**: System MUST support filtering dictionary words by origin (mw, ap90, eng2te, etc.)
- **FR-003**: System MUST store words as arrays of `LanguageValueType` objects for multilingual support
- **FR-004**: System MUST store descriptions as arrays of `LanguageValueType` objects
- **FR-005**: System MUST support attributes as key-value pairs for grammar, etymology, and metadata
- **FR-006**: System MUST maintain sequential wordIndex per dictionary origin for ordering
- **FR-007**: System MUST enforce unique constraint on [wordIndex, origin] combination
- **FR-008**: System MUST support full-text search on phonetic and word fields using MongoDB text index
- **FR-009**: System MUST support compound indexes on [origin, wordIndex] for efficient pagination
- **FR-010**: System MUST import dictionary data from SQLite databases using better-sqlite3
- **FR-011**: System MUST support bulk insert operations with configurable chunk size (default 1000-5000)
- **FR-012**: System MUST generate phonetic representations if not provided in source data
- **FR-013**: System MUST integrate @indic-transliteration/sanscript for script conversions
- **FR-014**: System MUST support converting between Devanagari, Telugu, IAST, ITRANS, and SLP1 scripts
- **FR-015**: System MUST preserve source data as JSON for reference and debugging
- **FR-016**: System MUST provide real-time progress callbacks during import operations
- **FR-017**: System MUST support deleting existing dictionary data before import (optional flag)
- **FR-018**: System MUST support importing multiple dictionaries in batch with consolidated reporting
- **FR-019**: System MUST validate SQLite schema before attempting import
- **FR-020**: System MUST handle import errors gracefully without corrupting existing data
- **FR-021**: System MUST support pagination for dictionary browsing with efficient queries
- **FR-022**: System MUST track creation and update timestamps for dictionary words
- **FR-023**: System MUST support CRUD operations on dictionary words via admin interface
- **FR-024**: System MUST provide CLI scripts for command-line dictionary imports
- **FR-025**: System MUST support exporting dictionary data for backup purposes

### Key Entities

- **DictionaryWord**: Word entry with wordIndex (sequential per origin), origin (dictionary source), word (multilingual array), description (multilingual array), phonetic (searchable string), attributes (key-value pairs), sourceData (original JSON), timestamps
- **SQLite Database**: Source dictionary data with schema: id, word, description, phonetic, and optional metadata columns
- **Import Progress**: Real-time status with percentage, current word count, total count, dictionary name, and error count
- **Dictionary Origin**: Identifier for source dictionary (mw=Monier-Williams, ap90=Apte Sanskrit Dictionary, eng2te=English to Telugu, etc.)

### Technical Constraints

- MongoDB as database with full-text search index on `[phonetic, word]`
- Compound indexes on `[origin, wordIndex]` for ascending and descending order
- Prisma ORM with custom client output at `src/app/generated/prisma`
- better-sqlite3 for reading SQLite source files
- @indic-transliteration/sanscript for transliteration (sanscript.t(text, fromScript, toScript))
- Modular architecture: dictionary-processor (pure functions), dictionary-database (abstraction layer), dictionary-import-orchestrator (high-level coordination)
- In-memory database implementation for testing without MongoDB
- Server Actions for CRUD operations returning discriminated unions
- CLI scripts using tsx for command-line execution

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Dictionary search returns results within 500ms for queries on database with 100,000+ words
- **SC-002**: Full-text search finds relevant matches for phonetic queries with 90%+ accuracy
- **SC-003**: Dictionary import processes 10,000 words in under 2 minutes on standard hardware
- **SC-004**: Transliteration accuracy of 99%+ for supported scripts (Devanagari, Telugu, IAST, ITRANS)
- **SC-005**: Users can browse dictionary pages with <1 second load time per page (50 words per page)
- **SC-006**: Import progress updates display in real-time with <1 second latency
- **SC-007**: Batch dictionary import completes successfully for 3+ dictionaries without manual intervention
- **SC-008**: Zero data corruption incidents during import operations
- **SC-009**: Pagination handles dictionaries with 100,000+ words without performance degradation
- **SC-010**: Word detail page loads complete entry with all transliterations in <1 second
- **SC-011**: Search autocomplete suggestions appear within 200ms of typing
- **SC-012**: 95%+ of dictionary rows successfully import from well-formed SQLite files
- **SC-013**: Import error handling allows recovery without restarting entire process
- **SC-014**: Users can find words using any supported script as search input
- **SC-015**: CLI import scripts execute successfully with clear progress output and error reporting
