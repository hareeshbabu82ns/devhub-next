# Feature Specification: Sanskrit Utilities & Tools

**Feature Branch**: `007-sanskrit-tools`  
**Created**: 2025-11-15  
**Status**: Implemented  
**Domain**: Sanskrit Processing

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Script Transliteration (Priority: P1)

Users want to convert Sanskrit text between different scripts (Devanagari, Telugu, IAST, ITRANS, SLP1) accurately.

**Why this priority**: Core functionality for multilingual Sanskrit content. Essential for users who can't read certain scripts.

**Independent Test**: Can be fully tested by entering Sanskrit text in Devanagari, selecting target script (IAST), and verifying correct transliteration output.

**Acceptance Scenarios**:

1. **Given** user on Sanscript tool page, **When** they enter Sanskrit text in Devanagari, **Then** they see transliteration options for multiple target scripts
2. **Given** transliteration interface, **When** user selects IAST as target script, **Then** Devanagari text is converted to IAST with proper diacritics
3. **Given** transliteration interface, **When** user selects Telugu as target script, **Then** Sanskrit text is rendered in Telugu script accurately
4. **Given** transliteration interface, **When** user selects ITRANS (ASCII), **Then** output uses only ASCII characters for typing Sanskrit
5. **Given** transliteration tool, **When** user enters text in any supported script, **Then** system auto-detects source script or allows manual selection
6. **Given** transliteration output, **When** displayed, **Then** user can copy text to clipboard with one click

---

### User Story 2 - Sandhi Splitting (Priority: P2)

Sanskrit learners want to split compound words (Sandhi) into constituent words to understand sentence structure.

**Why this priority**: Valuable learning tool for Sanskrit students. Not critical for basic text display functionality.

**Independent Test**: Can be fully tested by entering compound Sanskrit word, requesting Sandhi split, and verifying grammatically correct splits are suggested.

**Acceptance Scenarios**:

1. **Given** user on Sandhi tool page, **When** they enter compound Sanskrit word, **Then** system returns possible splits with constituent words
2. **Given** Sandhi split results, **When** displayed, **Then** each split option shows original compound and separated words
3. **Given** Sandhi split interface, **When** user enters text in different scripts, **Then** system handles Devanagari, IAST, and ITRANS input
4. **Given** multiple valid Sandhi splits, **When** displayed, **Then** results are ranked by likelihood or frequency
5. **Given** Sandhi split results, **When** user clicks on a split, **Then** detailed grammatical explanation is shown (if available)
6. **Given** Sandhi split request, **When** no valid splits found, **Then** user sees "No splits found" message with option to try different input

---

### User Story 3 - Sandhi Joining (Priority: P3)

Advanced Sanskrit users want to combine words according to Sandhi rules to form grammatically correct compounds.

**Why this priority**: Advanced feature for content creators. Less frequently used than splitting. Nice to have for completeness.

**Independent Test**: Can be fully tested by entering two Sanskrit words, requesting Sandhi join, and verifying correct compound formation.

**Acceptance Scenarios**:

1. **Given** user on Sandhi join tool, **When** they enter two or more words, **Then** system returns possible compound forms following Sandhi rules
2. **Given** Sandhi join results, **When** displayed, **Then** each option shows the compound word and applicable Sandhi rule
3. **Given** Sandhi join interface, **When** user enters words in different scripts, **Then** output is provided in same script as input
4. **Given** multiple valid Sandhi joins, **When** displayed, **Then** results explain which Sandhi rule was applied (Svara, Vyanjana, Visarga)
5. **Given** Sandhi join with no valid combinations, **When** processed, **Then** user sees explanation of why joining is not possible

---

### User Story 4 - Language Tagging and Detection (Priority: P3)

Developers and content processors want to automatically detect script/language of Sanskrit text for processing pipelines.

**Why this priority**: Utility for automated content processing. Not needed for manual user interactions. Developer-focused feature.

**Independent Test**: Can be fully tested by providing mixed-script text and verifying correct language tags are assigned.

**Acceptance Scenarios**:

1. **Given** API endpoint for language tagging, **When** text is submitted, **Then** system returns language/script tags for each segment
2. **Given** mixed Sanskrit-English text, **When** processed, **Then** each section is tagged with appropriate language identifier
3. **Given** Sanskrit text in Devanagari, **When** analyzed, **Then** system returns "sa" (Sanskrit) or "hi" (Hindi) based on content
4. **Given** language detection result, **When** returned, **Then** confidence score is included for each detected language
5. **Given** unsupported script, **When** submitted, **Then** system returns "unknown" tag with error message

---

### User Story 5 - Sentence Parsing (Priority: P3)

Sanskrit scholars want to parse sentences to identify word boundaries, grammatical relationships, and syntactic structure.

**Why this priority**: Academic feature for serious scholars. Complex NLP task with limited immediate value for general users.

**Independent Test**: Can be fully tested by submitting Sanskrit sentence and verifying word segmentation and grammatical tags are provided.

**Acceptance Scenarios**:

1. **Given** user submits Sanskrit sentence, **When** parsing is requested, **Then** system identifies word boundaries and returns segmented words
2. **Given** parsed sentence, **When** displayed, **Then** each word is tagged with grammatical category (noun, verb, adjective, etc.)
3. **Given** sentence parsing result, **When** shown, **Then** morphological analysis includes case, number, gender for nouns
4. **Given** parsed sentence, **When** displayed, **Then** dependencies between words are visualized (subject-object-verb relationships)
5. **Given** complex sentence, **When** parsing fails, **Then** user receives partial results with indication of uncertain segments

---

### User Story 6 - Batch Text Processing (Priority: P3)

Content administrators want to process multiple Sanskrit texts in batch for transliteration or Sandhi operations.

**Why this priority**: Efficiency feature for bulk content management. Individual processing covers most use cases.

**Independent Test**: Can be fully tested by uploading CSV file with Sanskrit texts, processing batch, and downloading results.

**Acceptance Scenarios**:

1. **Given** admin on batch processing page, **When** they upload CSV with Sanskrit texts, **Then** system processes all rows and returns results
2. **Given** batch processing job, **When** running, **Then** progress indicator shows completion percentage
3. **Given** batch results, **When** processing completes, **Then** user can download CSV with original text and processed output
4. **Given** batch processing with errors, **When** some rows fail, **Then** error log indicates which rows had issues
5. **Given** large batch (1000+ rows), **When** processing, **Then** job runs asynchronously with email notification on completion

---

### Edge Cases

- What happens when transliteration encounters unsupported characters? **Characters pass through unchanged with warning**
- How does system handle very long text (10,000+ characters) for transliteration? **Processes in chunks, may take 5-10 seconds**
- What happens when Sandhi split returns 50+ possible splits? **Returns top 10 most likely, offers "Show more" option**
- How does system handle mixed script input (Devanagari + English)? **Processes Sanskrit portions, preserves non-Sanskrit text**
- What happens when Sandhi API times out? **Returns error after 30 second timeout, suggests trying shorter text**
- How does system handle invalid Sanskrit input (gibberish)? **Attempts processing, returns low-confidence results with warning**
- What happens when user requests unavailable script conversion? **Shows error with list of supported scripts**
- How does system handle batch processing of 10,000+ texts? **Queue system with rate limiting, processes in background**

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST integrate @indic-transliteration/sanscript library for script conversions
- **FR-002**: System MUST support transliteration between Devanagari, Telugu, IAST, ITRANS, and SLP1 scripts
- **FR-003**: System MUST provide sanscript.t(text, sourceScript, targetScript) wrapper function
- **FR-004**: System MUST support auto-detection of source script for transliteration
- **FR-005**: System MUST preserve special characters and punctuation during transliteration
- **FR-006**: System MUST provide Server Action sandhiSplits(text, options) for compound word splitting
- **FR-007**: System MUST provide Server Action sandhiJoins(words, options) for word combination
- **FR-008**: System MUST provide Server Action languageTags(text, options) for language detection
- **FR-009**: System MUST provide Server Action sentenceParse(sentence, options) for syntactic analysis
- **FR-010**: System MUST return discriminated union responses from all Sanskrit utility Server Actions
- **FR-011**: System MUST handle timeout for external API calls (Sanskrit Heritage Site) with 30 second limit
- **FR-012**: System MUST cache common Sandhi split results to reduce external API calls
- **FR-013**: System MUST support batch processing for transliteration operations
- **FR-014**: System MUST validate input text for reasonable length (e.g., 10,000 character limit per request)
- **FR-015**: System MUST provide UI components for each utility (transliteration, Sandhi split, Sandhi join)
- **FR-016**: System MUST support copy-to-clipboard functionality for all processed outputs
- **FR-017**: System MUST display processing time and character count for user awareness
- **FR-018**: System MUST provide API endpoints for programmatic access to utilities (future enhancement)
- **FR-019**: System MUST handle script-specific character encoding correctly (UTF-8)
- **FR-020**: System MUST provide error messages when external Sandhi APIs are unavailable

### Key Entities

- **Sanscript Library**: @indic-transliteration/sanscript with conversion methods
- **Sanskrit Heritage Site API**: External service for Sandhi operations (if integrated)
- **Transliteration Request**: Input text, source script, target script, options
- **Sandhi Request**: Input text/words, operation type (split/join), options
- **Processing Result**: Discriminated union with success (data) or error (message)
- **Batch Job**: Collection of texts, operation type, progress tracking, results

### Technical Constraints

- @indic-transliteration/sanscript library for all script conversions
- Server Actions for all utility functions (no client-side processing for Sandhi)
- External API integration for Sandhi operations (may require API keys)
- Rate limiting for external API calls to prevent abuse
- Caching layer for frequent Sandhi queries (Redis or in-memory)
- Client-side form validation before server processing
- React components with real-time preview for transliteration
- Dedicated /sanscript route for utility tools page
- Support for both form-based UI and API endpoints

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Transliteration between any two scripts completes within 500ms for texts up to 1000 characters
- **SC-002**: Transliteration accuracy of 99.9%+ for standard Sanskrit text (verified against known test cases)
- **SC-003**: Sandhi split returns results within 5 seconds for compound words (assuming external API response)
- **SC-004**: Sandhi split accuracy of 90%+ for common compound words (verified against Sanskrit grammar references)
- **SC-005**: Users can successfully transliterate text on first attempt in 95%+ of cases
- **SC-006**: System handles 100+ concurrent transliteration requests without performance degradation
- **SC-007**: Batch processing handles 1000 texts with average processing time <10 seconds per text
- **SC-008**: Copy-to-clipboard functionality works on 95%+ of modern browsers
- **SC-009**: Language detection accuracy of 95%+ for pure Sanskrit text
- **SC-010**: Error handling provides clear messages for 100% of failure scenarios
- **SC-011**: UI remains responsive during processing with appropriate loading indicators
- **SC-012**: Transliteration preserves all diacritical marks in IAST output with 100% accuracy
- **SC-013**: Zero data corruption during script conversion (reversible operations)
- **SC-014**: 90%+ of users find transliteration tool easy to use without instructions
- **SC-015**: External API timeout handling prevents indefinite waiting in 100% of cases
