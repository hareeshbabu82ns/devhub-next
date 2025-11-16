# Dictionary System - User Guide

**Version**: 1.4.2  
**Last Updated**: 2025-11-16  
**Task**: T196

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Search Features](#search-features)
4. [Filtering Options](#filtering-options)
5. [View Modes](#view-modes)
6. [Saved Searches](#saved-searches)
7. [Quick Lookup Popup](#quick-lookup-popup)
8. [Audio Playback](#audio-playback)
9. [Export Features](#export-features)
10. [Comparison View](#comparison-view)
11. [Mobile Experience](#mobile-experience)
12. [Accessibility Features](#accessibility-features)
13. [Tips & Tricks](#tips--tricks)
14. [Troubleshooting](#troubleshooting)

---

## Introduction

The Dictionary System provides powerful search and browsing capabilities for Sanskrit, Telugu, and English dictionaries. With advanced features like relevance-ranked search, multiple view modes, saved searches, audio pronunciation, and comparison views, you can efficiently explore and study multilingual dictionary content.

### Key Features

✨ **Enhanced Search** - Relevance-ranked results with word-level highlighting  
🎯 **Advanced Filters** - Multi-criteria filtering with Apply button pattern  
👁️ **Multiple View Modes** - Compact, Card, and Detailed layouts  
💾 **Saved Searches** - Save and restore complex search queries  
⚡ **Quick Lookup** - Global popup accessible via keyboard shortcut  
🔊 **Audio Playback** - Inline pronunciation with speed controls  
📥 **Export** - Download results as CSV, JSON, or PDF  
🔍 **Comparison** - Side-by-side view across multiple dictionaries  
📱 **Mobile-First** - Optimized for touch devices and small screens  
♿ **Accessible** - WCAG 2.1 AA compliant with keyboard navigation

---

## Getting Started

### Accessing the Dictionary

1. **From Navigation Menu**: Click "Dictionary" in the main navigation
2. **Quick Lookup Popup**: Press `Ctrl+Shift+D` (Windows) or `Cmd+Shift+D` (Mac) from any page
3. **Direct URL**: Navigate to `/dictionary` in your browser

### First-Time Setup

1. **Select Dictionaries**: Choose one or more dictionary origins (Monier-Williams, Apte, etc.)
2. **Set Preferences**: Choose your preferred view mode (Compact, Card, or Detailed)
3. **Explore Interface**: Familiarize yourself with search, filters, and results layout

---

## Search Features

### Basic Search

**Simple Text Search**:
1. Enter a word or phrase in the search input
2. Press `Enter` or click the search button
3. Results appear below with relevance scores

**Example**: Search for "namah" to find related Sanskrit words

### Advanced Search

**Full-Text Search**:
- Toggle "Full Text Search" option in search toolbar
- Searches across word, phonetic, and description fields
- Uses MongoDB text indexing for performance

**Multi-Script Support**:
- Search in Devanagari: `नमः`
- Search in Latin/IAST: `namah` or `namaḥ`
- Search in Telugu: `నమః`
- System automatically normalizes and matches across scripts

### Relevance Ranking

Search results are automatically ranked by relevance (0-100 scale):

- **90-100 (Highly relevant)**: Exact matches, prefix matches
- **70-89 (Relevant)**: Partial matches in primary fields
- **50-69 (Somewhat relevant)**: Matches in descriptions
- **0-49 (Less relevant)**: Weak matches or contextual hits

**Relevance Factors**:
- ✅ Exact word match (+50 points)
- ✅ Prefix match (+30 points)
- ✅ Position in dictionary (+10 for early words)
- ✅ Script matching (+5 for same script)
- ❌ Very long words (-5 length penalty)

### Text Highlighting

Matching words are highlighted with color-coded indicators:
- **Yellow**: Exact matches
- **Orange**: Prefix matches
- **Light yellow**: Contains matches

Highlighting preserves:
- Sanskrit conjuncts (श्री shown as single unit)
- Telugu ligatures
- Diacritic marks (śrī vs sri)

---

## Filtering Options

### Opening the Filter Panel

**Desktop**:
- Click the **Filter** button in search toolbar
- Side panel opens from right side
- Width: 400px

**Mobile**:
- Tap the **Filter** button
- Full-screen drawer slides up from bottom
- Swipe down or tap backdrop to close

### Available Filters

#### 1. Dictionary Origins
**Type**: Multi-select chips  
**Options**: Monier-Williams (mw), Apte 90 (ap90), English-Telugu, etc.  
**Behavior**: OR logic (results from ANY selected dictionary)

**Usage**:
1. Click/tap the origin selector
2. Check desired dictionaries
3. Selected origins appear as removable chips
4. Click **Apply** to filter results

#### 2. Language
**Type**: Dropdown select  
**Options**: All, Sanskrit, Telugu, English, etc.  
**Behavior**: Filter results by language code

#### 3. Word Length Range
**Type**: Min/Max number inputs  
**Range**: 1-100 characters  
**Example**: Set min=3, max=10 to find words 3-10 characters long

#### 4. Has Audio
**Type**: Checkbox  
**Effect**: Show only entries with pronunciation audio files

#### 5. Has Attributes
**Type**: Checkbox  
**Effect**: Show only entries with additional metadata (deity, category, etc.)

#### 6. Date Range
**Type**: Date pickers  
**Fields**: Start date, End date  
**Effect**: Filter by last updated date

### Applying Filters

**Apply Button Pattern** (prevents accidental changes):
1. Make filter selections (changes are pending)
2. Click/tap **Apply** button to execute
3. Filter panel closes automatically
4. Results update with active filters

**Discarding Changes**:
- Close panel without clicking Apply
- Pending changes are discarded
- Previous filters remain active

**Clearing All Filters**:
- Click **Clear All** button
- All filters reset to default
- Results refresh immediately

### Filter Persistence

**URL Sync**:
- Filters are saved to URL parameters
- Share URLs to share search configuration
- Browser back/forward navigation works correctly

**Visual Indicators**:
- Active filter count badge in toolbar
- Selected origins shown as chips
- Blue accent on Apply button when changes pending

---

## View Modes

Switch between three layout modes to match your reading preference:

### Compact Mode 📋
**Best for**: Quick scanning, mobile devices, large result sets  
**Layout**: Single-line entries with minimal spacing  
**Shows**: Word + brief meaning (truncated)  
**Touch targets**: Optimized for mobile (44x44px minimum)

**Example**:
```
नमः | salutations, reverential salutation
श्री | prosperity, wealth, fortune, beauty
```

### Card Mode 📇 (Default)
**Best for**: Balanced view, general browsing  
**Layout**: Card-based grid (1-3 columns responsive)  
**Shows**: Word, phonetic, description, origin badge  
**Responsive**: 1 column mobile, 2 tablet, 3 desktop

**Example**:
```
┌──────────────────────────────┐
│ नमः (namah)          [MW]    │
│                              │
│ Reverential salutation,      │
│ bowing, obeisance            │
│                              │
│ ⭐ Relevance: 95             │
└──────────────────────────────┘
```

### Detailed Mode 📖
**Best for**: In-depth study, reference lookup  
**Layout**: Full-width entries with all fields  
**Shows**: Complete information including:
  - All text variations
  - Full descriptions
  - Attributes (deity, category, etc.)
  - Source data and links
  - Timestamps (created, updated)
  - Audio player (if available)

**Scrollable**: Long descriptions fully visible with scroll

### Switching View Modes

**Method 1 - View Mode Selector**:
- Click one of three mode buttons in toolbar
- Selection persists to localStorage
- Applies to current and future sessions

**Method 2 - Keyboard**:
- Tab to view mode selector
- Use ← / → arrow keys to switch modes
- Press Enter to confirm

---

## Saved Searches

Save frequently used search queries with filters for quick access.

### Creating a Saved Search

1. **Perform a search** with desired query and filters
2. **Click "Save Search"** button in toolbar
3. **Enter a name** in the modal dialog
4. **Click "Save"** to store

**What's Saved**:
- Search query text
- All active filters (origins, language, word length, etc.)
- Sort order and direction
- View mode preference (if implemented)

### Managing Saved Searches

**Viewing Saved Searches**:
- Click the **Saved Searches** dropdown in toolbar
- List shows up to 50 most recent searches
- Ordered by most recently used

**Restoring a Search**:
1. Open saved searches dropdown
2. Click desired search name
3. All settings restore immediately
4. Results refresh with saved parameters

**Context Menu Actions** (Right-click or long-press):
- **Rename**: Change the search name
- **Delete**: Remove from saved list (with confirmation)
- **Duplicate**: Create a copy with modified name

**Exporting Saved Searches**:
- Click "Export" in saved searches dropdown
- Downloads JSON file with all saved searches
- Useful for backup or sharing

### Search History

Automatically tracks your last 20 searches:
- Appears in saved searches dropdown (separate section)
- Shows timestamp and search term
- Click to restore search
- Cleared on browser history clear

### Cross-Device Sync

**For Logged-In Users**:
- Saved searches sync across devices
- Stored in database (SavedSearch model)
- Accessible from any browser after login

**For Anonymous Users**:
- Searches saved to browser localStorage
- Limited to 50 searches
- Not synced across devices
- Option to migrate when logging in

---

## Quick Lookup Popup

Access dictionary from anywhere with a keyboard shortcut.

### Opening the Popup

**Desktop**:
- Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (macOS)
- Popup appears centered on screen
- Focus moves to search input automatically

**Mobile**:
- Quick lookup not available (use main dictionary page)
- Shortcut is desktop-only feature

### Using the Popup

**Search Flow**:
1. Type query in search input
2. Results appear inline (limited to 10 results)
3. Scroll within popup to see more results
4. Click result to view details

**Actions**:
- **Open in Full Dictionary**: Click link to switch to main page with query
- **Close**: Press Escape or click outside
- **Navigate**: Tab through results and actions

### Context Menu Integration

**Right-Click Word on Any Page**:
1. Select text on webpage
2. Right-click selected text
3. Choose "Look up in dictionary" (if implemented)
4. Popup opens with pre-filled search

### Focus Management

**Automatic Focus**:
- Search input focused when opening
- Focus trapped within popup (Tab cycles inside)
- Focus restored to trigger element when closing

**Keyboard Navigation**:
- Tab/Shift+Tab: Navigate within popup
- Escape: Close and restore focus
- Enter: Submit search
- Ctrl+O / Cmd+O: Open in full dictionary

---

## Audio Playback

Listen to pronunciation for dictionary entries with audio files.

### Playing Audio

**Icon Indicator**:
- 🔊 icon appears next to words with audio
- Click/tap icon to play pronunciation
- Gray icon indicates no audio available

**Auto-Stop Behavior**:
- Previous audio stops when new audio plays
- Only one audio plays at a time
- Prevents overlapping pronunciations

### Audio Controls

**Play/Pause Button**:
- Large touch-friendly button (44x44px minimum)
- Shows play ▶️ or pause ⏸️ state
- Keyboard: Press `P` or `Space` to toggle

**Speed Selector**:
- Choose from 0.5x, 1x, 1.5x speed
- Useful for learning pronunciation
- Persists per audio element

**Volume Slider**:
- Adjust playback volume (0-100%)
- Independent of system volume
- Visual feedback while dragging

### Keyboard Controls

When audio player focused:
- **`Space`** or **`P`**: Play/Pause
- **`←` / `→`**: Seek backward/forward 5 seconds
- **`↑` / `↓`**: Volume up/down
- **`M`**: Mute/unmute
- **`[` / `]`**: Decrease/increase speed

### Accessibility

**Screen Reader Support**:
- Playback state announced ("Playing", "Paused")
- Current time and duration announced
- Speed changes announced

**Visual Indicators**:
- Progress bar shows playback position
- Current time / Total duration displayed
- Loading state shows spinner

---

## Export Features

Download search results in multiple formats for offline use or analysis.

### Opening Export Dialog

**Method 1 - Toolbar Button**:
- Click **Export** button in search toolbar
- Modal dialog opens

**Method 2 - Keyboard**:
- Tab to Export button, press Enter

### Export Formats

#### CSV (Comma-Separated Values)
**Best for**: Excel, Google Sheets, data analysis  
**Structure**: Header row + data rows  
**Encoding**: UTF-8 with BOM (for Excel compatibility)  
**Fields**: Configurable (see Field Selection)

**Example Output**:
```csv
word,phonetic,origin,description
नमः,namah,mw,"Reverential salutation, bowing"
श्री,śrī,mw,"Prosperity, wealth, fortune"
```

#### JSON (JavaScript Object Notation)
**Best for**: Developers, APIs, programmatic access  
**Structure**: Array of objects  
**Format**: Pretty-printed with 2-space indentation  
**Fields**: All fields included by default

**Example Output**:
```json
[
  {
    "word": "नमः",
    "phonetic": "namah",
    "origin": "mw",
    "description": "Reverential salutation, bowing"
  }
]
```

#### PDF (Portable Document Format)
**Best for**: Printing, sharing, archiving  
**Layout**: Table format with Unicode font support  
**Features**: Headers, page numbers, word wrap  
**Font**: Noto Sans Devanagari (embedded)

**⚠️ Warning**: PDF export for 10,000+ entries may be slow. Consider CSV/JSON alternatives.

### Field Selection

**Available Fields** (checkboxes):
- ☑️ Word (in original script)
- ☑️ Phonetic (romanized)
- ☑️ Origin (dictionary code)
- ☑️ Description (meaning and usage)
- ☑️ Attributes (metadata like deity, category)
- ☑️ Audio (file path if available)
- ☑️ Created/Updated dates

**Select All / Deselect All**: Toggle buttons for convenience

### Export Process

**Steps**:
1. Click **Export** button in toolbar
2. System fetches all matching results (not just visible page)
3. Select format (CSV, JSON, or PDF)
4. Choose fields to include
5. Click **Export as [FORMAT]** button
6. Progress bar shows completion (for large datasets)
7. File downloads automatically

**Large Dataset Handling** (1000+ entries):
- Chunked processing prevents memory issues
- Progress bar updates every 1000 entries
- Streaming download for immediate results

### Filename Convention

Exported files use descriptive names:

**Pattern**: `dictionary-export-{timestamp}-{filters}.{ext}`

**Examples**:
- `dictionary-export-20231116-143022-mw-ap90.csv`
- `dictionary-export-20231116-143022-search-namah.json`
- `dictionary-export-20231116-143022-telugu-5-10chars.pdf`

**Truncation**: Filenames limited to 255 characters (preserves timestamp and extension)

### Export Limits

- **CSV**: Up to 1 million entries (practical limit)
- **JSON**: Up to 100,000 entries (browser memory)
- **PDF**: Recommended max 10,000 entries (performance)

**For larger exports**: Consider splitting by origin or using API (if available)

---

## Comparison View

Compare the same word across multiple dictionaries side-by-side.

### Opening Comparison

**From Search Results**:
1. Find desired word in results
2. Click **Compare** button on result card
3. Comparison view opens in modal

**Keyboard**:
- Focus on result card
- Press `C` to open comparison

### Comparison Layout

**Desktop** (>1024px):
- Side-by-side columns (one per dictionary)
- Horizontal scroll for 3+ dictionaries
- Sticky headers show dictionary names

**Tablet** (768px-1024px):
- 2-column grid
- Vertical scroll

**Mobile** (<768px):
- Single-column vertical stack
- Swipe/scroll vertically through dictionaries
- Sticky origin labels

### Dictionary Toggle Controls

**Showing/Hiding Columns**:
- Toggle buttons at top of comparison view
- Click/tap to show/hide specific dictionary
- Useful when comparing many dictionaries

**Keyboard Shortcuts**:
- `Space`: Toggle focused dictionary
- `Ctrl+A` / `Cmd+A`: Show all
- `Ctrl+D` / `Cmd+D`: Hide all

### Difference Highlighting

**Unique Content Emphasis**:
- Content unique to one dictionary is highlighted
- Helps identify different interpretations
- Color-coded by dictionary origin

### Handling Different Schemas

**Common Fields**:
- Word, phonetic, description always shown
- Aligned across dictionaries

**Unique Fields**:
- Shown in "Additional Info" section
- Expandable/collapsible per dictionary
- Examples: Etymology (MW only), Grammar notes

### Exporting Comparison

**Export All Visible Dictionaries**:
1. Click **Export Comparison** button
2. Choose format (CSV, JSON, PDF)
3. All visible columns included
4. Filename indicates comparison mode

---

## Mobile Experience

Dictionary system is fully optimized for mobile devices.

### Responsive Design

**Breakpoints**:
- **Mobile**: <640px (iPhone SE, etc.)
- **Tablet**: 640px-1024px (iPad, etc.)
- **Desktop**: >1024px

**Layout Adaptations**:
- Single-column results on mobile
- 2-column grid on tablet
- 3-column grid on desktop
- Container queries for fine-grained control

### Touch Interactions

**Touch Targets**:
- Minimum 44x44px on all interactive elements
- Increased padding on mobile (16px vs 8px)
- Larger font sizes for readability

**Gestures**:
- **Tap**: Activate buttons, select items
- **Long-press**: Open context menus (500ms)
- **Swipe**: Dismiss filter drawer (experimental)
- **Pinch-zoom**: Disabled on UI, enabled on text content

### Mobile-Specific Features

**Filter Drawer**:
- Full-height drawer from bottom
- Sticky Apply button at bottom
- Swipe down to close (or backdrop tap)

**View Mode**:
- Compact mode recommended for mobile
- Reduced whitespace and padding
- Optimized for thumb reach

**Saved Searches**:
- Bottom sheet instead of dropdown
- Touch-friendly list items (48px min height)
- Swipe actions for delete/rename (if implemented)

**Clear All FAB** (Floating Action Button):
- Appears when filters active
- Fixed position at bottom-right
- Easy thumb access
- Haptic feedback on tap (if supported)

### Safe Area Support

**Notch/Dynamic Island**:
- Padding respects `env(safe-area-inset-*)`
- Content doesn't hide behind notch
- Bottom navigation avoids home indicator

**Landscape Mode**:
- Layout adjusts for landscape
- Filter drawer width limited (not full-width)
- Comparison view uses horizontal scroll

### Performance Optimizations

**Mobile-First**:
- Touch targets prioritized over hover states
- Reduced animations for performance
- Lazy loading for images and audio
- Debounced search input (300ms)

**Network Considerations**:
- Pagination limited to 20 results (vs 50 desktop)
- Audio files not preloaded
- PDF export warns on mobile networks

---

## Accessibility Features

Dictionary system meets WCAG 2.1 AA accessibility standards.

### Keyboard Navigation

**Full Keyboard Access**:
- All functionality available via keyboard
- Tab/Shift+Tab navigation
- Arrow keys for menus and lists
- Enter/Space to activate
- Escape to close/cancel

**Focus Indicators**:
- Visible 2px solid outline on all interactive elements
- 3:1 contrast ratio (WCAG AA compliant)
- Enhanced visibility in high contrast mode

**Skip Links**:
- Press Tab from top of page to reveal
- Jump to: Main content, Search, Filters, Results
- Invisible until focused (keyboard-only)

### Screen Reader Support

**ARIA Attributes**:
- All components have proper roles and labels
- Form fields have associated labels
- Buttons have descriptive text
- Status messages announced via live regions

**Live Region Announcements**:
- Search result counts
- Filter application status
- Export progress updates
- Audio playback state
- Error messages

**Landmarks**:
- Main content area
- Search region
- Navigation skip links
- Complementary filter panel

### Visual Accessibility

**Color Contrast**:
- Normal text: 4.5:1 minimum (WCAG AA)
- Large text: 3:1 minimum
- UI components: 3:1 minimum
- Focus indicators: 3:1 minimum

**Text Sizing**:
- Scales up to 200% without loss of functionality
- Responsive font sizing with clamp()
- No horizontal scrolling at 320px width

**High Contrast Mode**:
- Respects OS high contrast settings
- Uses system colors (Highlight, HighlightText)
- Enhanced outlines and borders

### Motion & Animation

**Reduced Motion**:
- Respects `prefers-reduced-motion` setting
- Disables transitions and animations
- Instant state changes
- No parallax or auto-playing content

**Smooth Scrolling**:
- Disabled in reduced motion mode
- Enabled by default for skip links

### Error Handling

**Accessible Errors**:
- Validation errors have `aria-invalid`
- Error messages linked via `aria-describedby`
- Focus moves to error on submission
- Visual and text indicators

---

## Tips & Tricks

### Power User Shortcuts

1. **Rapid Dictionary Switching**:
   - Save searches for each dictionary
   - Use keyboard shortcuts to switch
   - Bookmark URLs with different origins

2. **Efficient Filtering**:
   - Start with broad search
   - Add filters incrementally
   - Use Apply button to batch changes
   - Save complex filter combinations

3. **Study Workflow**:
   - Use Detailed view for learning
   - Play audio repeatedly (loop with ← after end)
   - Export to Anki-compatible CSV
   - Compare across dictionaries for nuances

4. **Mobile Productivity**:
   - Use Compact view on mobile
   - Save searches for one-tap access
   - Quick lookup from other apps (if implemented)
   - Voice input for searches

### Performance Tips

1. **Faster Searches**:
   - Limit dictionary origins for focused searches
   - Use exact queries over broad patterns
   - Enable full-text search for complex queries
   - Paginate through results instead of exporting all

2. **Smooth Scrolling**:
   - Use Compact view for large result sets
   - Enable virtual scrolling (if implemented)
   - Clear filters after use
   - Close filter panel when not needed

3. **Offline Preparation**:
   - Export frequently used results to PDF
   - Save searches before losing connectivity
   - Download audio files (browser cache)
   - Bookmark important dictionary pages

### Advanced Search Techniques

1. **Regex Patterns** (when not using full-text):
   - `^nam` - Words starting with "nam"
   - `nam$` - Words ending with "nam"
   - `n.mah` - "n", any char, "mah"
   - `(om|namah)` - Either "om" or "namah"

2. **Multi-Script Queries**:
   - Combine Devanagari and Latin: "नमः namah"
   - System normalizes and matches both
   - Useful for finding transliteration variants

3. **Filter Combinations**:
   - Origin + Word Length: Find short entries in specific dictionary
   - Has Audio + Language: Study pronunciation for specific script
   - Date Range + Origin: Track recent additions to dictionary

---

## Troubleshooting

### Common Issues

#### Search Returns No Results
**Causes**:
- No dictionaries selected in origins
- Filters too restrictive
- Typo in search query
- Query too specific

**Solutions**:
1. Check filter panel for active filters
2. Click "Clear All" to reset
3. Select at least one dictionary origin
4. Try broader search terms
5. Check spelling in original script

#### Audio Not Playing
**Causes**:
- Entry has no audio file
- Browser blocking autoplay
- Network connectivity issue
- Audio format not supported

**Solutions**:
1. Look for 🔊 icon (indicates audio available)
2. Check browser autoplay settings
3. Try clicking play button manually
4. Test with different entry
5. Check browser console for errors

#### Export Fails or Hangs
**Causes**:
- Too many results (>10,000 for PDF)
- Browser memory limit
- Network timeout
- Pop-up blocker

**Solutions**:
1. Add more filters to reduce result count
2. Use CSV/JSON instead of PDF
3. Try smaller page selections
4. Disable pop-up blocker
5. Use desktop browser (not mobile)

#### Filters Not Applying
**Causes**:
- Forgot to click Apply button
- Filter conflict/contradiction
- Browser cache issue

**Solutions**:
1. Verify you clicked Apply (not just close)
2. Check for conflicting filters
3. Try Clear All and reapply
4. Refresh page (Ctrl+R)
5. Clear browser cache

#### Saved Searches Missing
**Causes**:
- Logged out (cross-device sync lost)
- Browser data cleared
- Different browser/device
- Storage quota exceeded

**Solutions**:
1. Log in to restore synced searches
2. Check localStorage in browser dev tools
3. Use same browser where searches were saved
4. Export searches as backup (JSON)
5. Recreate important searches

### Browser Compatibility

**Recommended Browsers**:
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Known Issues**:
- IE 11: Not supported (use Edge)
- Safari < 14: Limited Intl.Segmenter support
- Mobile browsers: Keyboard shortcuts unavailable

### Getting Help

**Report Issues**:
1. Check this guide first
2. Search GitHub Issues
3. Create new issue with:
   - Browser and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

**Feature Requests**:
- Discuss in GitHub Discussions
- Provide use case and benefits
- Check if already requested

---

## Appendix

### Dictionary Origin Codes

| Code | Full Name | Language | Entries |
|------|-----------|----------|---------|
| mw | Monier-Williams | Sanskrit-English | ~170,000 |
| ap90 | Apte Practical Sanskrit-English | Sanskrit-English | ~32,000 |
| eng2te | English-Telugu | English-Telugu | ~50,000 |
| te2eng | Telugu-English | Telugu-English | ~50,000 |

### Version History

- **v1.4.2** (2025-11-16): Phase 12 accessibility enhancements
- **v1.4.0** (2025-11-15): All Phases 1-11 complete
- **v1.3.0**: Audio playback, export, comparison
- **v1.2.0**: Saved searches, quick lookup popup
- **v1.1.0**: Advanced filters, view modes
- **v1.0.0**: Enhanced search with relevance ranking

### Related Documentation

- [Keyboard Shortcuts](./KEYBOARD-SHORTCUTS.md) - Complete shortcut reference
- [Accessibility Audit](./ACCESSIBILITY-AUDIT.md) - WCAG compliance details
- [Developer Guide](./DEVELOPER-GUIDE.md) - Technical implementation (if available)

---

**Feedback Welcome!**  
Help us improve this guide by reporting unclear sections or suggesting additions.
