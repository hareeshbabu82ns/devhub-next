# Feature Specification: Multilingual Entity Management System

**Feature Branch**: `002-entity-management`  
**Created**: 2025-11-15  
**Status**: Implemented  
**Domain**: Content Management

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse Hierarchical Devotional Content (Priority: P1)

Users want to browse devotional content (Stotrams, Shlokas) organized hierarchically, viewing children entities within parent entities.

**Why this priority**: Core value proposition - users need to discover and access devotional content. Without this, the application has no purpose.

**Independent Test**: Can be fully tested by navigating to entities page, viewing list of entities, clicking on parent entity, and seeing child entities. Delivers complete browsing experience.

**Acceptance Scenarios**:

1. **Given** user on entities page, **When** page loads, **Then** they see list of all entities ordered by type and custom order field
2. **Given** list of entities, **When** user clicks on parent entity (e.g., Lalitha Sahasranamam), **Then** they see all child entities (individual Shlokas)
3. **Given** entity detail page, **When** user views entity, **Then** they see text in multiple languages, meaning, attributes, audio player (if available), and thumbnail image
4. **Given** hierarchical entity, **When** user navigates to child, **Then** they see breadcrumb navigation showing parent hierarchy
5. **Given** entity with audio, **When** user clicks play, **Then** audio player starts playing the devotional audio file

---

### User Story 2 - Create and Edit Multilingual Content (Priority: P1)

Content creators need to add new devotional content with text in multiple languages (Sanskrit, Telugu, English, etc.) along with meanings and metadata.

**Why this priority**: Essential for content management. Without ability to create/edit, the content library cannot grow or be maintained.

**Independent Test**: Can be tested by creating a new entity with multilingual text, saving it, and verifying all languages display correctly.

**Acceptance Scenarios**:

1. **Given** authenticated user on "New Entity" page, **When** they select entity type and add text in multiple languages, **Then** entity is created with all language versions
2. **Given** entity creation form, **When** user adds Sanskrit text, **Then** system automatically generates transliterated versions using @indic-transliteration/sanscript
3. **Given** existing entity, **When** user clicks edit, **Then** they see form pre-filled with current values including all language translations
4. **Given** entity edit form, **When** user adds meaning in English/Telugu, **Then** meaning is saved as language-specific array entry
5. **Given** entity form, **When** user adds custom attributes (deity, occasion, source), **Then** attributes are stored as key-value pairs
6. **Given** entity form, **When** user uploads image thumbnail, **Then** image is stored and displayed on entity detail page
7. **Given** entity form, **When** user uploads audio file, **Then** audio is stored and playable on entity detail page

---

### User Story 3 - Manage Entity Hierarchy and Relationships (Priority: P1)

Users need to organize content by creating parent-child relationships (e.g., a Stotra containing multiple Shlokas).

**Why this priority**: Hierarchical organization is fundamental to devotional content structure. Enables logical grouping and navigation.

**Independent Test**: Can be tested by creating parent entity, adding children, and navigating the hierarchy to verify relationships work.

**Acceptance Scenarios**:

1. **Given** entity edit form, **When** user selects parent entity from dropdown, **Then** entity is linked as child of selected parent
2. **Given** entity with children, **When** viewed, **Then** children are displayed in order specified by "order" field
3. **Given** entity detail page, **When** multiple children exist, **Then** they are displayed with navigation to view each child
4. **Given** child entity, **When** viewed, **Then** breadcrumb shows path from root parent to current entity
5. **Given** entity hierarchy, **When** user clicks on sibling navigation, **Then** they can move to previous/next entity at same level

---

### User Story 4 - Bookmark Favorite Content (Priority: P2)

Users want to mark devotional content as favorites for quick access later.

**Why this priority**: Enhances user experience by enabling personal content curation. Not critical for basic browsing functionality.

**Independent Test**: Can be tested by bookmarking an entity, navigating to bookmarks view, and verifying bookmarked content appears.

**Acceptance Scenarios**:

1. **Given** entity detail page, **When** user clicks bookmark icon, **Then** entity is marked as bookmarked and icon changes state
2. **Given** bookmarked entity, **When** user clicks bookmark icon again, **Then** entity is unbookmarked
3. **Given** entities list page, **When** user filters by "Bookmarked", **Then** only bookmarked entities are displayed
4. **Given** user with bookmarked content, **When** they access different device with same account, **Then** bookmarks are synced (server-side storage)

---

### User Story 5 - Search and Filter Entities (Priority: P2)

Users want to search for specific devotional content by name, text, deity, or occasion.

**Why this priority**: Important for large content libraries. Enhances discoverability but not critical for small collections.

**Independent Test**: Can be tested by entering search terms and verifying correct entities are filtered from the list.

**Acceptance Scenarios**:

1. **Given** entities list page, **When** user enters search term, **Then** entities matching text or meaning in any language are displayed
2. **Given** entities list page, **When** user filters by entity type (Stotra, Shloka), **Then** only entities of that type are shown
3. **Given** entities list page, **When** user filters by attribute (deity: Shiva), **Then** only entities with matching attribute are displayed
4. **Given** search results, **When** user clears filters, **Then** all entities are displayed again
5. **Given** MongoDB full-text search index, **When** user searches multilingual text, **Then** results include matches from all language fields

---

### User Story 6 - Manage Entity Types (Priority: P2)

Administrators need to define and manage entity types (Stotra, Shloka, Mantra, etc.) with multilingual names.

**Why this priority**: Allows system flexibility for different content categories. Can start with hardcoded types if needed.

**Independent Test**: Can be tested by creating new entity type in admin panel and using it when creating entities.

**Acceptance Scenarios**:

1. **Given** admin user in admin panel, **When** they create new entity type with code and multilingual names, **Then** type is available in entity creation forms
2. **Given** entity type list, **When** admin views types, **Then** they see all defined types with their codes and names
3. **Given** entity type in use, **When** admin tries to delete it, **Then** system prevents deletion if entities exist with that type
4. **Given** entity creation form, **When** user selects entity type, **Then** dropdown shows types in user's preferred language

---

### User Story 7 - Asset Management for Media Files (Priority: P3)

Users need to upload, organize, and manage audio files and images associated with entities.

**Why this priority**: Enhances content richness but entities can exist without media. Nice to have for complete experience.

**Independent Test**: Can be tested by uploading image/audio file and verifying it appears in entity and is accessible.

**Acceptance Scenarios**:

1. **Given** entity form, **When** user uploads image, **Then** image is stored in /public/assets/ or cloud storage with unique filename
2. **Given** entity form, **When** user uploads audio, **Then** audio is stored and file path is saved to entity
3. **Given** entity with audio, **When** viewed, **Then** audio player component displays with play/pause/seek controls
4. **Given** asset management page, **When** admin views all assets, **Then** they see list of uploaded files with usage information
5. **Given** unused asset, **When** admin deletes it, **Then** file is removed from storage

---

### Edge Cases

- What happens when user tries to create entity without any text? **Validation error: "At least one language text required"**
- How does system handle circular parent-child relationships? **Validation prevents entity from being its own ancestor**
- What happens when entity has 50+ children? **Pagination or lazy loading implemented for child lists**
- How does system handle very long text (>10,000 characters)? **Text field uses MongoDB Text type with no practical limit**
- What happens when user deletes parent entity? **System can either prevent deletion or cascade delete children (configurable)**
- How does system handle duplicate entity names? **Allowed, as devotional content may have variations with same name**
- What happens when audio file upload fails? **Entity is saved without audio, user can retry upload later**
- How does system handle multilingual text with missing translations? **Entity displays available languages, shows placeholders for missing ones**
- What happens when two users edit same entity simultaneously? **Last write wins (optimistic concurrency), potential future: version conflict detection**

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support creating entities with type, order, text, meaning, attributes, notes, image, and audio fields
- **FR-002**: System MUST store text and meaning as arrays of `LanguageValueType` objects with language code and value
- **FR-003**: System MUST support attributes as array of key-value pairs for flexible metadata (deity, occasion, source, etc.)
- **FR-004**: System MUST support self-referential many-to-many relationships for entity hierarchy (parents and children)
- **FR-005**: System MUST order entities by custom "order" field within same type/parent
- **FR-006**: System MUST support bookmarking entities with boolean flag per user
- **FR-007**: System MUST provide full-text search across text and meaning fields in all languages
- **FR-008**: System MUST generate and display breadcrumb navigation based on entity hierarchy
- **FR-009**: System MUST support image thumbnails stored as file paths or URLs
- **FR-010**: System MUST support audio files stored as file paths with playback capability
- **FR-011**: System MUST validate that parent entities exist before creating relationships
- **FR-012**: System MUST prevent deletion of entities that are parents of other entities (or cascade delete with warning)
- **FR-013**: System MUST support filtering entities by type, bookmarked status, and custom attributes
- **FR-014**: System MUST support pagination for large entity collections
- **FR-015**: System MUST track creation and update timestamps for all entities
- **FR-016**: System MUST support entity types as separate collection with code and multilingual names
- **FR-017**: System MUST support languages as separate collection with ISO codes and directionality (LTR/RTL)
- **FR-018**: System MUST integrate @indic-transliteration/sanscript for Sanskrit/Telugu/Devanagari conversions
- **FR-019**: System MUST support uploading images and audio files with proper MIME type validation
- **FR-020**: System MUST generate unique filenames for uploaded assets to prevent conflicts
- **FR-021**: System MUST support viewing single entity with all details and relationships
- **FR-022**: System MUST display sibling navigation (previous/next) within same parent context
- **FR-023**: System MUST support editing existing entities while preserving relationships
- **FR-024**: System MUST validate required fields (type, at least one text language) before saving
- **FR-025**: System MUST support exporting entity data for backup purposes

### Key Entities

- **Entity**: Core content model with type, order, multilingual text/meaning, attributes, hierarchy (parents/children), bookmarked flag, media (image/audio), timestamps
- **EntityType**: Content category definition with unique code and multilingual names (e.g., STOTRA, SHLOKA, MANTRA)
- **Language**: Supported language with ISO code, name, and text direction (e.g., "sa" for Sanskrit, "te" for Telugu)
- **LanguageValueType**: Embedded type for multilingual fields with language code and text value
- **AttributeValueType**: Embedded type for flexible key-value metadata pairs

### Technical Constraints

- MongoDB as database with compound indexes on `[type, bookmarked, updatedAt]` and `[parents]`
- Full-text search index on `[order, type, text, meaning]` for efficient searching
- Prisma ORM with custom client output at `src/app/generated/prisma`
- Server Components for entity listing and detail pages
- Server Actions for CRUD operations returning discriminated unions
- File storage in `/public/assets/` directory or cloud storage integration

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can browse entity hierarchy and view content in under 3 seconds per page load
- **SC-002**: Content creators can add new entity with multilingual text in under 3 minutes
- **SC-003**: Full-text search returns results within 500ms for collections up to 10,000 entities
- **SC-004**: Entity hierarchy correctly displays parent-child relationships with 100% accuracy
- **SC-005**: Multilingual text displays correctly in all supported languages (Sanskrit Devanagari, Telugu, English, IAST, transliteration)
- **SC-006**: Audio playback works on 95%+ of modern browsers (Chrome, Firefox, Safari, Edge)
- **SC-007**: Bookmarking feature responds instantly (<200ms) with optimistic UI updates
- **SC-008**: Image thumbnails load within 1 second and scale appropriately for different screen sizes
- **SC-009**: Entity creation form validates and provides clear error messages for invalid inputs
- **SC-010**: Users can navigate entity hierarchies up to 5 levels deep without performance degradation
- **SC-011**: 90%+ of users successfully find desired content using search/filter features
- **SC-012**: System handles 1000+ entities with hierarchical relationships without performance issues
- **SC-013**: Breadcrumb navigation accurately reflects entity hierarchy path in 100% of cases
- **SC-014**: Content editors can update existing entities and see changes reflected immediately
- **SC-015**: Zero data loss incidents when creating or editing multilingual content
