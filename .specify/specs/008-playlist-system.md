# Feature Specification: Playlist & Audio Management

**Feature Branch**: `008-playlist-system`  
**Created**: 2025-11-15  
**Status**: Implemented  
**Domain**: Media Management

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and Name Playlists (Priority: P1)

Users want to create custom playlists to organize their favorite devotional audio content.

**Why this priority**: Core playlist functionality. Without ability to create playlists, the feature has no value.

**Independent Test**: Can be fully tested by creating a new playlist with a name, verifying it appears in playlist list, and checking it persists.

**Acceptance Scenarios**:

1. **Given** authenticated user on playlists page, **When** they click "Create Playlist", **Then** dialog appears prompting for playlist name
2. **Given** create playlist dialog, **When** user enters name and submits, **Then** new playlist is created and displayed in list
3. **Given** newly created playlist, **When** viewing playlist list, **Then** playlist shows name, creation date, song count (0), and user who created it
4. **Given** playlist creation, **When** saved, **Then** playlist is private by default (visible only to creator)
5. **Given** user with multiple playlists, **When** viewing list, **Then** playlists are ordered by creation date (newest first)

---

### User Story 2 - Add Songs to Playlist (Priority: P1)

Users want to add devotional audio files (from entities or uploaded files) to their playlists.

**Why this priority**: Essential for playlist utility. Empty playlists have no purpose.

**Independent Test**: Can be fully tested by creating playlist, adding 3 songs from different sources, and verifying all appear in correct order.

**Acceptance Scenarios**:

1. **Given** user viewing playlist details, **When** they click "Add Songs", **Then** dialog shows available audio sources (entity audio, uploaded files)
2. **Given** add songs dialog, **When** user selects entity with audio, **Then** entity audio is added to playlist with entity name and metadata
3. **Given** add songs dialog, **When** user uploads audio file, **Then** file is stored and added to playlist with user-provided title
4. **Given** song added to playlist, **When** saved, **Then** song appears in playlist with order number based on add sequence
5. **Given** playlist with songs, **When** user adds more songs, **Then** new songs are appended at the end with sequential order numbers
6. **Given** song addition, **When** completed, **Then** playlist song count updates and user sees success toast notification

---

### User Story 3 - Play Playlist with Audio Controls (Priority: P1)

Users want to play playlists sequentially with standard audio controls (play, pause, skip, seek, volume).

**Why this priority**: Core playback functionality. Playlists are useless without playback.

**Independent Test**: Can be fully tested by playing playlist, using all controls (pause, skip, seek), and verifying behavior is correct.

**Acceptance Scenarios**:

1. **Given** user viewing playlist with songs, **When** they click "Play Playlist", **Then** first song starts playing with audio controls displayed
2. **Given** audio playing, **When** user clicks pause, **Then** playback pauses and play button appears
3. **Given** audio paused, **When** user clicks play, **Then** playback resumes from paused position
4. **Given** audio playing, **When** user clicks next, **Then** current song stops and next song in playlist starts playing
5. **Given** audio playing, **When** user clicks previous, **Then** current song restarts or goes to previous song (depending on playback position)
6. **Given** audio player, **When** user adjusts volume slider, **Then** volume changes in real-time
7. **Given** audio player, **When** user clicks seek bar, **Then** playback jumps to selected position in current song
8. **Given** playlist playing, **When** current song ends, **Then** next song automatically starts playing (auto-advance)
9. **Given** last song in playlist, **When** it ends, **Then** playback stops and playlist returns to first song (or repeats if repeat enabled)

---

### User Story 4 - Reorder Songs in Playlist (Priority: P2)

Users want to change the order of songs in their playlists to customize playback sequence.

**Why this priority**: Enhances user control over playlist experience. Not critical for basic playback functionality.

**Independent Test**: Can be fully tested by creating playlist with 5 songs, dragging song from position 5 to position 2, and verifying order persists.

**Acceptance Scenarios**:

1. **Given** user viewing playlist with multiple songs, **When** they enter edit mode, **Then** drag handles appear next to each song
2. **Given** edit mode enabled, **When** user drags song to new position, **Then** song moves and order numbers update for affected songs
3. **Given** reordered playlist, **When** user saves changes, **Then** new order is persisted to database
4. **Given** reordered playlist, **When** played, **Then** songs play in new order sequence
5. **Given** playlist with 50+ songs, **When** reordering, **Then** drag-drop remains responsive and smooth

---

### User Story 5 - Remove Songs from Playlist (Priority: P2)

Users want to remove songs they no longer want in a playlist without deleting the audio file.

**Why this priority**: Basic playlist curation functionality. Users need to manage playlist content.

**Independent Test**: Can be fully tested by removing a song from playlist, verifying it's gone, and confirming original audio still exists.

**Acceptance Scenarios**:

1. **Given** user viewing playlist, **When** they click delete icon on a song, **Then** confirmation dialog appears
2. **Given** delete confirmation, **When** user confirms, **Then** song is removed from playlist but audio file remains untouched
3. **Given** song removal, **When** completed, **Then** remaining songs' order numbers are adjusted to fill gap
4. **Given** playlist song count, **When** song is removed, **Then** count decrements immediately
5. **Given** playlist playing, **When** current song is removed, **Then** playback skips to next song automatically

---

### User Story 6 - Share and Make Playlists Public (Priority: P2)

Users want to share their playlists with others by making them public or generating share links.

**Why this priority**: Social feature for community engagement. Not essential for personal playlist usage.

**Independent Test**: Can be fully tested by making playlist public, accessing it from different user account, and verifying it's visible.

**Acceptance Scenarios**:

1. **Given** user viewing their playlist, **When** they toggle "Make Public" switch, **Then** playlist becomes visible to all users
2. **Given** public playlist, **When** other users browse public playlists, **Then** they can view and play it (but not edit)
3. **Given** public playlist, **When** other users view it, **Then** creator's name and playlist description are displayed
4. **Given** user viewing public playlist, **When** they click "Copy to My Playlists", **Then** duplicate playlist is created in their account
5. **Given** public playlist URL, **When** shared with non-registered users, **Then** they can view song list but must login to play
6. **Given** playlist owner, **When** they make playlist private again, **Then** it becomes invisible to other users immediately

---

### User Story 7 - Edit Playlist Metadata (Priority: P3)

Users want to edit playlist name, description, and cover image to personalize their collections.

**Why this priority**: Nice to have for organization and aesthetics. Basic functionality works without metadata.

**Independent Test**: Can be fully tested by editing playlist name, description, and image, then verifying changes appear everywhere.

**Acceptance Scenarios**:

1. **Given** user viewing their playlist, **When** they click "Edit Playlist", **Then** form appears with current name, description, and image
2. **Given** edit playlist form, **When** user changes name and saves, **Then** new name appears in playlist list and detail page
3. **Given** edit playlist form, **When** user adds description, **Then** description is displayed on playlist detail page
4. **Given** edit playlist form, **When** user uploads cover image, **Then** image is displayed as playlist thumbnail in lists
5. **Given** playlist metadata, **When** displayed publicly, **Then** cover image, name, and description are shown to all viewers

---

### Edge Cases

- What happens when user tries to add same song twice to playlist? **Allowed - song appears twice with different order positions**
- How does system handle audio file that no longer exists? **Shows "File not found" error, allows removal from playlist**
- What happens when user deletes entity with audio that's in playlists? **Playlist song reference remains but audio is unavailable**
- How does system handle very long playlists (500+ songs)? **Pagination or virtualized scrolling for performance**
- What happens when audio file format is unsupported by browser? **Shows format warning, attempts playback, falls back to download**
- How does system handle concurrent edits to same playlist? **Last write wins (optimistic concurrency), potential future: conflict detection**
- What happens when user makes playlist public with copyrighted content? **User responsibility - future: content moderation flags**
- How does system handle playlist playback when browser tab is backgrounded? **Uses Media Session API to continue playback**
- What happens when user tries to play playlist with 0 songs? **Shows "Add songs to start playing" message**

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to create playlists with name and optional description/image
- **FR-002**: System MUST associate each playlist with creator user ID for ownership
- **FR-003**: System MUST support adding songs to playlist from entity audio or uploaded files
- **FR-004**: System MUST store playlist songs with reference to audio source (asset path) and order number
- **FR-005**: System MUST support reordering songs within playlist by updating order field
- **FR-006**: System MUST support removing songs from playlist without deleting source audio
- **FR-007**: System MUST support deleting entire playlists with cascade delete of playlist songs
- **FR-008**: System MUST track creation and update timestamps for playlists
- **FR-009**: System MUST support public/private toggle for playlists (isPublic boolean)
- **FR-010**: System MUST restrict playlist editing to owner and admin users
- **FR-011**: System MUST allow any user to view and play public playlists
- **FR-012**: System MUST support audio playback with controls (play, pause, skip, seek, volume)
- **FR-013**: System MUST support auto-advance to next song when current song ends
- **FR-014**: System MUST display current song, elapsed time, and total duration during playback
- **FR-015**: System MUST support playlist image upload for cover art
- **FR-016**: System MUST validate audio file formats (MP3, WAV, M4A, OGG) before adding to playlist
- **FR-017**: System MUST generate unique filenames for uploaded audio files
- **FR-018**: System MUST store audio files in /public/assets/audio/ or cloud storage
- **FR-019**: System MUST support copying public playlists to user's own collection
- **FR-020**: System MUST display song metadata (title, artist, duration) in playlist view
- **FR-021**: System MUST support filtering user's playlists (my playlists, public, bookmarked)
- **FR-022**: System MUST return discriminated union responses from all playlist Server Actions
- **FR-023**: System MUST use react-use-audio-player or similar for audio playback management
- **FR-024**: System MUST support playlist sharing via URL with unique playlist ID
- **FR-025**: System MUST track addedAt timestamp for each song in playlist

### Key Entities

- **Playlist**: User's collection with id, name, image (optional), isPublic flag, userId (owner), songs relationship, timestamps
- **PlaylistSong**: Individual song entry with id, playlistId, src (audio path), order, addedAt timestamp
- **User**: Playlist owner with relationship to their playlists
- **Entity**: Source of audio files via audio field (optional link to entities)

### Technical Constraints

- MongoDB with Prisma ORM (custom client at src/app/generated/prisma)
- Cascade delete on playlist deletion (removes all PlaylistSongs)
- Cascade delete when user is deleted (removes their playlists)
- Compound index on [playlistId, order] for efficient song ordering
- Server Actions for CRUD operations with discriminated unions
- react-use-audio-player hook for client-side audio management
- Audio files stored locally (/public/assets/) or cloud storage (S3, Cloudinary)
- HTML5 Audio API for playback with fallback for unsupported formats
- Media Session API for background playback and media controls
- Drag-and-drop library (dnd-kit or react-beautiful-dnd) for reordering

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create playlist and add first song in under 1 minute
- **SC-002**: Playlist playback starts within 2 seconds of clicking play
- **SC-003**: Audio controls respond to user input within 200ms (play, pause, seek)
- **SC-004**: Playlist with 100 songs loads and displays within 2 seconds
- **SC-005**: Song reordering via drag-drop feels smooth with <16ms frame time (60 FPS)
- **SC-006**: Auto-advance between songs has no noticeable gap (<500ms)
- **SC-007**: Public playlists are instantly accessible to other users after publishing
- **SC-008**: Audio playback works on 95%+ of modern browsers (Chrome, Firefox, Safari, Edge)
- **SC-009**: Playlist song removal updates UI instantly with optimistic update
- **SC-010**: Audio file upload completes within 30 seconds for files up to 10MB
- **SC-011**: Zero playback errors for properly formatted audio files (MP3, WAV, M4A, OGG)
- **SC-012**: Playlist metadata (name, image) updates appear instantly across all UI instances
- **SC-013**: Users can successfully create, populate, and play playlists on first attempt 90%+ of the time
- **SC-014**: System handles 50+ concurrent audio streams without degradation
- **SC-015**: Playlist sharing via URL works with 100% reliability
