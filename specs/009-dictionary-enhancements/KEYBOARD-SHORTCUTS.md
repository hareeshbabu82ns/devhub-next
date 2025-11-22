# Dictionary System - Keyboard Shortcuts Guide

**Version**: 1.0  
**Last Updated**: 2025-11-16  
**Accessibility Standard**: WCAG 2.1 AA  
**Tasks**: T185, T195

---

## Overview

The Dictionary System is fully accessible via keyboard navigation. This guide documents all keyboard shortcuts and navigation patterns to help users efficiently interact with dictionary features without requiring a mouse.

---

## Global Shortcuts

### Quick Lookup Popup
- **`Ctrl+Shift+D`** (Windows/Linux) or **`Cmd+Shift+D`** (macOS)
  - Opens the quick lookup popup from any page
  - **Desktop only** - not available on mobile devices
  - Focus automatically moves to search input
  - Press `Escape` to close and return focus

### Help
- **`?`** - Show keyboard shortcuts legend (when implemented)

---

## Navigation Shortcuts

### Skip Links
Available when pressing `Tab` from the top of the page:

1. **Skip to main content** - Jumps to the main dictionary content area
2. **Skip to search** - Jumps to the search toolbar
3. **Skip to filters** - Opens and focuses the filter panel
4. **Skip to results** - Jumps to the search results section

**Usage**: Press `Tab` from the top of the page to reveal skip links, then press `Enter` to activate.

---

## Search & Input

### Search Toolbar
- **`Tab`** - Move to search input
- **`Enter`** - Execute search with current query
- **`Escape`** - Clear search input (if focused)
- **`Ctrl+K`** or **`Cmd+K`** - Focus search input (when implemented)

### Search Suggestions
- **`↓`** (Down Arrow) - Move to next suggestion
- **`↑`** (Up Arrow) - Move to previous suggestion
- **`Enter`** - Select highlighted suggestion
- **`Escape`** - Close suggestions dropdown

---

## Filter Panel

### Opening/Closing
- **Click Filter button** or **Skip to filters** - Open filter panel
- **`Escape`** - Close filter panel without applying changes
- **Apply button** or **`Enter`** (when focused on Apply) - Apply filters and close panel

### Within Filter Panel
- **`Tab`** / **`Shift+Tab`** - Navigate between filter controls
- **`Space`** - Toggle checkboxes (Has Audio, Has Attributes)
- **`↓`** / **`↑`** - Navigate dropdown options
- **`Enter`** - Select dropdown option
- **`Home`** / **`End`** - Move to first/last item in dropdowns

### Multi-Select Origin Chips
- **`Tab`** - Focus on multi-select control
- **`Enter`** or **`Space`** - Open dropdown
- **`↓`** / **`↑`** - Navigate options
- **`Space`** - Toggle selection
- **`Enter`** - Confirm selections
- **`Escape`** - Cancel and close dropdown

### Word Length Range
- **`Tab`** - Focus on min/max inputs
- **Type number** - Set value directly
- **`↑`** / **`↓`** - Increment/decrement value (if number input)

### Date Range Picker
- **`Tab`** - Focus on date inputs
- **`Enter`** or **`Space`** - Open calendar picker
- **`↓`** / **`↑`** / **`←`** / **`→`** - Navigate calendar dates
- **`Space`** or **`Enter`** - Select date
- **`Escape`** - Close calendar

---

## View Modes

### View Mode Selector (Radio Group)
- **`Tab`** - Focus on view mode selector
- **`←`** / **`→`** - Switch between Compact/Card/Detailed modes
- **`Space`** or **`Enter`** - Select focused mode
- **Auto-save** - Selected mode is saved to localStorage

**Modes**:
- **Compact** - Single-line entries, optimized for scanning
- **Card** - Card layout with word, phonetic, description
- **Detailed** - Full information including attributes, timestamps

---

## Search Results

### Navigating Results
- **`Tab`** / **`Shift+Tab`** - Navigate through result cards
- **`Enter`** or **`Space`** - Activate focused card action (edit, compare, audio)
- **`Page Up`** / **`Page Down`** - Scroll through results
- **`Home`** / **`End`** - Jump to first/last result

### Result Card Actions
When focused on a result card:
- **`E`** - Edit entry (if implemented)
- **`C`** - Compare entry across dictionaries
- **`P`** or **`Space`** - Play audio pronunciation (if available)
- **`Ctrl+C`** or **`Cmd+C`** - Copy description to clipboard

### Pagination
- **`Tab`** to pagination controls
- **`←`** or **`Page Up`** - Previous page
- **`→`** or **`Page Down`** - Next page
- **`Home`** - First page
- **`End`** - Last page
- **Type page number** + **`Enter`** - Jump to specific page

---

## Saved Searches

### Saved Searches Dropdown
- **Click dropdown trigger** or **`Alt+S`** - Open saved searches
- **`↓`** / **`↑`** - Navigate saved searches
- **`Enter`** - Load selected search
- **`Delete`** - Delete selected search (with confirmation)
- **`Escape`** - Close dropdown

### Context Menu (Long-press on mobile, Right-click on desktop)
- **`Shift+F10`** or **`Menu key`** - Open context menu
- **`↓`** / **`↑`** - Navigate menu items
- **`Enter`** - Activate menu item
  - **Rename** - Rename saved search
  - **Delete** - Delete saved search
  - **Duplicate** - Create copy of saved search

### Save Search Modal
- **`Tab`** - Navigate form fields
- **`Enter`** - Save search (when in name input)
- **`Escape`** - Cancel without saving

---

## Audio Playback

### Audio Player Controls
When an entry has audio:
- **`P`** or **`Space`** - Play/Pause audio
- **`M`** - Mute/Unmute
- **`←`** / **`→`** - Seek backward/forward 5 seconds
- **`↑`** / **`↓`** - Increase/decrease volume
- **`0`-`9`** - Jump to 0%-90% of audio
- **`[`** / **`]`** - Decrease/increase playback speed

### Speed Selector
- **`Tab`** - Focus on speed selector
- **`↓`** / **`↑`** - Change speed (0.5x, 1x, 1.5x)
- **`Enter`** - Apply selected speed

---

## Export Modal

### Export Dialog
- **`Tab`** / **`Shift+Tab`** - Navigate export options
- **`↓`** / **`↑`** - Select format (CSV, JSON, PDF)
- **`Space`** - Toggle field checkboxes
- **`Enter`** - Start export (when on Export button)
- **`Escape`** - Cancel export

### Format Selection (Radio Group)
- **`←`** / **`→`** - Switch between CSV/JSON/PDF
- **`Space`** or **`Enter`** - Select format

### Field Selection
- **`Tab`** - Focus on field checkboxes
- **`Space`** - Toggle include/exclude
- **`Ctrl+A`** or **`Cmd+A`** - Select all fields (when in checkbox group)

---

## Comparison View

### Opening Comparison
- **Focus on result** → **`C`** - Open comparison for selected word
- **Click Compare button** - Open comparison view

### Within Comparison View
- **`Tab`** / **`Shift+Tab`** - Navigate dictionary columns
- **`Space`** - Toggle dictionary visibility
- **`←`** / **`→`** - Scroll horizontally (3+ dictionaries)
- **`Escape`** - Close comparison view

### Dictionary Toggle Buttons
- **`Tab`** - Focus on toggle buttons
- **`Space`** or **`Enter`** - Show/hide dictionary column
- **`Ctrl+A`** or **`Cmd+A`** - Show all dictionaries
- **`Ctrl+D`** or **`Cmd+D`** - Hide all dictionaries

---

## Quick Lookup Popup

### Opening/Closing
- **`Ctrl+Shift+D`** (Windows/Linux) or **`Cmd+Shift+D`** (macOS) - Open popup
- **`Escape`** - Close popup and restore focus
- **Click outside** - Close popup

### Within Popup
- **`Tab`** / **`Shift+Tab`** - Cycle through search input, results, actions
- **`Enter`** - Activate focused action
- **`Ctrl+O`** or **`Cmd+O`** - Open in full dictionary (when in popup)

### Focus Trap
- Focus cycles within popup while open
- Press `Escape` to exit and restore previous focus

---

## Modal Dialogs

### General Modal Behavior
All modals (Filters, Export, Save Search, Comparison):
- **`Escape`** - Close modal without saving
- **`Tab`** / **`Shift+Tab`** - Navigate within modal (focus trapped)
- **`Enter`** - Activate primary action (Apply, Save, Export)

### Confirmation Dialogs
- **`Enter`** or **`Y`** - Confirm action
- **`Escape`** or **`N`** - Cancel action
- **`Tab`** - Switch between Confirm/Cancel buttons

---

## Screen Reader Specific

### ARIA Live Announcements
The following updates are automatically announced to screen readers:

1. **Search Results**
   - "Found X results with average relevance score of Y"
   - "Found X results for search term 'query'"

2. **Filter Changes**
   - "X filters applied"
   - "Filters cleared"

3. **Export Progress**
   - "Exporting X entries..."
   - "Export complete - X entries exported"

4. **Saved Searches**
   - "Search saved: [name]"
   - "Search deleted: [name]"

5. **Comparison View**
   - "Showing X dictionaries"
   - "Dictionary [name] hidden/shown"

### Navigation Landmarks
Screen readers can jump to:
- **Main** - `<main>` landmark for dictionary content
- **Search** - `<search>` landmark for search toolbar
- **Navigation** - Skip links navigation
- **Status** - Live regions for dynamic updates

---

## Browser-Specific Shortcuts

### Chrome/Edge
- **`F6`** - Cycle through page sections
- **`Ctrl+F`** - Find in page (searches visible text)

### Firefox
- **`'`** (single quote) - Quick find links
- **`/`** (forward slash) - Quick find text

### Safari
- **`Cmd+L`** - Focus address bar
- **`Tab`** - Navigate interactive elements

---

## Mobile Keyboard (iOS/Android)

### External Keyboard Support
When using external keyboard with mobile device:
- Most desktop shortcuts work
- **Quick lookup popup not available** (no Ctrl+Shift+D)
- **Touch targets enlarged** (minimum 44x44px)

### On-Screen Keyboard
- **Done/Enter** - Execute search or form submission
- **Tab** - Navigate form fields (limited support)
- **Voice Input** - Use microphone button for dictation

---

## Accessibility Features

### High Contrast Mode
- All focus indicators visible in high contrast
- Increased outline width (3px)
- Uses system colors (Highlight/HighlightText)

### Reduced Motion
- Animations disabled or minimized
- Instant state changes instead of transitions
- Smooth scroll disabled (instant jump)

### Text Scaling
- UI scales with browser zoom (100%-200%)
- Text reflows responsively
- No horizontal scrolling required (except comparison view)

---

## Tips & Best Practices

### Efficient Navigation
1. **Use skip links** to jump directly to content
2. **Learn view mode shortcuts** to switch layouts quickly
3. **Master filter panel** for advanced searches
4. **Use saved searches** for frequent queries

### Keyboard-Only Workflow
1. Press **`Tab`** to reveal skip links
2. Skip to **Search** section
3. Enter query and press **`Enter`**
4. Skip to **Results**
5. Navigate results with **`Tab`**
6. Use **`C`** for comparison or **`P`** for audio

### Screen Reader Workflow
1. Use **landmarks** to navigate page structure
2. Listen for **live region announcements** for updates
3. Use **form mode** when filling filter fields
4. Enable **verbose output** for detailed ARIA labels

---

## Troubleshooting

### Keyboard Shortcuts Not Working?
1. **Check browser focus** - Click inside dictionary area first
2. **Disable browser extensions** - Some may intercept shortcuts
3. **Check OS accessibility settings** - May override shortcuts
4. **Try different browser** - Shortcut support varies

### Focus Lost or Trapped?
1. Press **`Escape`** to close modals/popups
2. Press **`Tab`** repeatedly to find focus
3. **Reload page** as last resort (Ctrl+R or Cmd+R)
4. Check for **JavaScript errors** in console

### Screen Reader Issues?
1. **Update screen reader** to latest version
2. **Enable forms mode** when editing fields
3. **Check ARIA support** in browser
4. **Report issues** with specific screen reader + browser combo

---

## Future Enhancements (Planned)

- [ ] **`Ctrl+K` / `Cmd+K`** - Command palette (quick actions)
- [ ] **`Ctrl+Z` / `Cmd+Z`** - Undo filter changes
- [ ] **`Ctrl+Y` / `Cmd+Y`** - Redo filter changes
- [ ] **`Ctrl+/` / `Cmd+/`** - Show keyboard shortcuts legend
- [ ] **`Ctrl+B` / `Cmd+B`** - Toggle bookmark for entry
- [ ] **`Ctrl+Shift+C` / `Cmd+Shift+C`** - Copy entry as markdown

---

## Feedback

Found a keyboard shortcut issue or have suggestions?
- **Report Issues**: GitHub Issues
- **Accessibility Feedback**: accessibility@devhub.com (if applicable)
- **Feature Requests**: Discuss in community forums

---

**See Also**:
- [Dictionary User Guide](./USER-GUIDE.md)
- [Accessibility Audit](./ACCESSIBILITY-AUDIT.md)
- [Developer Guide](./DEVELOPER-GUIDE.md)
