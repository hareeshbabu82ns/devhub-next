# WebIME Language Persistence

## Overview

The WebIME language persistence feature allows users to save their preferred input language across sessions. Once a language is selected, it persists across page reloads and is restored automatically when the user returns.

## Features

- **SSR-Safe**: Handles server-side rendering without hydration mismatches
- **Context-Specific**: Different contexts (dictionary, entity search, sanscript) can maintain separate language preferences
- **Visual Indicators**: Shows when a language is persisted vs. default
- **Reset Option**: Users can reset to the default language anytime

## Usage

### Basic Usage

```tsx
import WebIMEIdeInput from "@/app/(app)/sanscript/_components/WebIMEIdeInput";

function MyComponent() {
  return (
    <WebIMEIdeInput
      placeholder="Type here..."
      withLanguageSelector
      storageKey="webimeLanguage:mycontext" // Optional: defaults to "webimeLanguage"
      onLanguageChange={(lang) => console.log("Language changed to:", lang)}
    />
  );
}
```

### Storage Keys

Use predefined storage keys for consistency:

```tsx
import { WEBIME_STORAGE_KEYS } from "@/hooks/use-webime-language-persistence";

// Available keys:
WEBIME_STORAGE_KEYS.DEFAULT; // "webimeLanguage"
WEBIME_STORAGE_KEYS.DICTIONARY; // "webimeLanguage:dictionary"
WEBIME_STORAGE_KEYS.ENTITY; // "webimeLanguage:entity"
WEBIME_STORAGE_KEYS.SANSCRIPT; // "webimeLanguage:sanscript"
```

### Context-Specific Usage

**Dictionary Search:**

```tsx
<WebIMEIdeInput storageKey="webimeLanguage:dictionary" withLanguageSelector />
```

**Entity Search:**

```tsx
<WebIMEIdeInput storageKey="webimeLanguage:entity" withLanguageSelector />
```

**Sanscript Page:**

```tsx
<WebIMEIde storageKey="webimeLanguage:sanscript" withLanguageSelector />
```

## How It Works

### Fallback Chain

When determining which language to use, the system follows this priority:

1. **Stored language** (from localStorage for the specific context)
2. **Prop language** (passed via the `language` prop)
3. **Default** ("NONE")

### Persistence Logic

- Language is saved to localStorage 200ms after user selects it (debounced)
- Language is validated against available options before restoring
- Invalid stored languages are automatically cleared

### Visual Indicators

- **Dot indicator** (●) appears in the language selector when a language is persisted
- **"(saved)" label** shown next to the currently persisted language in the dropdown
- **Reset button** (↻) appears when a language is persisted, allowing users to clear it

## API Reference

### WebIMEIdeInput Props

```typescript
interface WebIMEIdeProps {
  // ... other props

  /** localStorage key for persisting language selection (default: "webimeLanguage") */
  storageKey?: string;

  /** Callback when language changes */
  onLanguageChange?: (language: string) => void;

  /** Custom suggestion provider */
  suggestionProvider?: SuggestionProvider;
}
```

### Hook API

```typescript
function useWebIMELanguagePersistence(
  propLanguage?: string,
  storageKey?: string,
): {
  language: string;
  setLanguage: (lang: string) => void;
  resetLanguage: () => void;
  isLanguagePersisted: boolean;
  isHydrated: boolean;
  userHasSelectedLanguage: boolean;
  setUserHasSelectedLanguage: (value: boolean) => void;
};
```

## Examples

### Controlled Component

When you want to control the language externally:

```tsx
function MyComponent() {
  const [language, setLanguage] = useState("sa");

  return (
    <WebIMEIdeInput
      language={language}
      onLanguageChange={setLanguage}
      withLanguageSelector
    />
  );
}
```

### Uncontrolled Component with Persistence

Let the component manage its own state:

```tsx
function MyComponent() {
  return (
    <WebIMEIdeInput
      storageKey="webimeLanguage:myapp"
      withLanguageSelector
      onLanguageChange={(lang) => {
        console.log("User selected:", lang);
      }}
    />
  );
}
```

## Migration

### From Old to New System

If you have existing code using WebIMEIdeInput without persistence:

**Before:**

```tsx
<WebIMEIdeInput language={language} />
```

**After (no changes needed):**

```tsx
<WebIMEIdeInput language={language} />
```

The component remains fully backward compatible. To enable persistence, simply add:

```tsx
<WebIMEIdeInput language={language} storageKey="webimeLanguage:mycontext" />
```

## Best Practices

1. **Use context-specific keys** for different parts of your app:
   - Dictionary: `webimeLanguage:dictionary`
   - Entity search: `webimeLanguage:entity`
   - Sanscript tools: `webimeLanguage:sanscript`

2. **Provide language prop** as default when you have a logical default for a context:

   ```tsx
   <WebIMEIdeInput
     language="sa" // Default to Sanskrit
     storageKey="webimeLanguage:dictionary"
   />
   ```

3. **Use onLanguageChange** to track language changes for analytics or other purposes:
   ```tsx
   <WebIMEIdeInput
     onLanguageChange={(lang) => {
       analytics.track("language_changed", { language: lang });
     }}
   />
   ```

## Troubleshooting

### Language doesn't persist

- Check that `storageKey` is provided
- Verify localStorage is enabled in the browser
- Check browser console for errors

### Wrong language restored

- Clear localStorage for the specific key
- Check if multiple components are using the same key
- Verify the stored language is still valid

### Hydration mismatches

- The hook handles this automatically
- If you see warnings, ensure you're not accessing localStorage directly on the server

## Technical Details

### SSR Safety

The hook uses a two-step hydration approach:

1. **Server render**: Returns fallback/prop language
2. **Client mount**: Loads from localStorage and updates state

This prevents hydration mismatches while providing instant feedback.

### Storage Format

Languages are stored as plain strings in localStorage:

```
localStorage.getItem("webimeLanguage:dictionary") // "sa"
```

### Validation

Before restoring a language, it's validated against `LANGUAGE_TO_TRANSLITERATION_DDLB`. Invalid languages are discarded and cleared from storage.
