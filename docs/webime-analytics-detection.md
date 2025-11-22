# WebIME Analytics & Smart Detection

This document describes the privacy-preserving analytics and intelligent language detection features of the WebIME system.

## Language Usage Analytics

### Overview

Track language usage patterns locally to provide insights and improve user experience. All data is stored in `localStorage` - **never sent to any server**.

### Features

#### 1. **Usage Tracking**

Automatically records every language selection with:

- Language code
- Context (dictionary, entity, sanscript)
- Timestamp
- Usage count

#### 2. **Privacy-First Design**

- **No server communication**: All data stays in your browser
- **User-controlled**: Export, import, or clear at any time
- **Transparent**: View all tracked data in JSON format

#### 3. **Insights**

- Most frequently used languages
- Recent language history
- Usage by context (dictionary vs entity search vs sanscript editor)
- Total language switches

### Usage

#### Basic Tracking (Automatic)

Analytics are automatically tracked when using `useWebIMELanguagePersistence`:

```typescript
import { useWebIMELanguagePersistence } from "@/hooks/use-webime-language-persistence";

function MyComponent() {
  const { language, setLanguage } = useWebIMELanguagePersistence(
    undefined,
    "webimeLanguage:dictionary",
  );

  // Analytics are automatically recorded when setLanguage is called
  // Context is extracted from storage key ("dictionary" in this case)
}
```

#### Manual Analytics Access

```typescript
import { useLanguageAnalytics } from "@/hooks/use-language-analytics";

function AnalyticsDashboard() {
  const {
    analytics,
    getTopLanguages,
    getRecentLanguages,
    clearAnalytics,
    exportAnalytics,
    importAnalytics
  } = useLanguageAnalytics();

  // Get top 5 most used languages
  const topLanguages = getTopLanguages(5);

  // Get recent languages (last 5, excluding current)
  const recent = getRecentLanguages("SAN", 5);

  // Export analytics to JSON file
  const handleExport = () => {
    const json = exportAnalytics();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webime-analytics-${Date.now()}.json`;
    a.click();
  };

  // Import analytics from JSON file
  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      const success = importAnalytics(json);
      if (success) {
        console.log("Analytics imported successfully");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2>Language Usage Analytics</h2>
      <p>Total switches: {analytics?.totalSwitches}</p>
      <p>Most used: {analytics?.mostUsedLanguage}</p>

      <h3>Top Languages</h3>
      <ul>
        {topLanguages.map((entry) => (
          <li key={entry.language}>
            {entry.language}: {entry.count} times
          </li>
        ))}
      </ul>

      <button onClick={handleExport}>Export Analytics</button>
      <button onClick={clearAnalytics}>Clear All Data</button>
    </div>
  );
}
```

### Data Structure

```typescript
interface LanguageAnalytics {
  totalSwitches: number;
  mostUsedLanguage?: string;
  recentLanguages: string[]; // Last 10
  usageByLanguage: Record<
    string,
    {
      language: string;
      count: number;
      lastUsed: Date;
      contexts: Record<string, number>; // e.g., { "dictionary": 10, "entity": 5 }
    }
  >;
}
```

### Storage

- **Key**: `webime:analytics`
- **Max entries**: 50 languages
- **Format**: JSON in localStorage

---

## Smart Language Detection

### Overview

Automatically detect the script of input text and suggest switching to the appropriate language when a mismatch is detected.

### Features

#### 1. **Script Detection**

Identifies the script/alphabet of input text:

- Devanagari (Sanskrit)
- Telugu
- Tamil
- Malayalam
- Kannada
- Gujarati
- Bengali
- Latin (ITRANS/English)

#### 2. **Confidence Scoring**

Returns confidence level (0-1) based on:

- Percentage of characters matching detected script
- Threshold: 70% (configurable)

#### 3. **Smart Suggestions**

Suggests language change when:

- Input script doesn't match selected language
- Confidence exceeds threshold
- Valid language mapping exists

### Usage

#### Basic Detection

```typescript
import { useLanguageDetection } from "@/hooks/use-language-detection";

function MyInput() {
  const { detectScript, shouldSuggestLanguageChange } = useLanguageDetection();

  const handleInput = (text: string) => {
    // Detect script
    const detection = detectScript(text);
    console.log(`Detected: ${detection.detectedScript}, confidence: ${detection.confidence}`);

    // Check if suggestion is needed
    const suggestion = shouldSuggestLanguageChange(text, currentLanguage, 0.7);
    if (suggestion.shouldSuggest) {
      // Show suggestion toast/dialog
      showToast(suggestion.message); // "You're typing in devanagari script. Switch to Sanskrit?"
    }
  };

  return <input onChange={(e) => handleInput(e.target.value)} />;
}
```

#### Advanced: Inline Suggestions

```typescript
import { useLanguageDetection } from "@/hooks/use-language-detection";
import { useState, useEffect } from "react";

function SmartInput() {
  const [text, setText] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("NONE");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const { shouldSuggestLanguageChange } = useLanguageDetection();

  useEffect(() => {
    if (text.length < 5) {
      setSuggestion(null);
      return;
    }

    const result = shouldSuggestLanguageChange(text, currentLanguage, 0.7);
    if (result.shouldSuggest) {
      setSuggestion(result.message || "Switch language?");
    } else {
      setSuggestion(null);
    }
  }, [text, currentLanguage, shouldSuggestLanguageChange]);

  return (
    <div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {suggestion && (
        <div className="inline-suggestion">
          {suggestion}
          <button onClick={() => {
            const detection = detectScript(text);
            if (detection.suggestedLanguage) {
              setCurrentLanguage(detection.suggestedLanguage);
              setSuggestion(null);
            }
          }}>
            Switch
          </button>
          <button onClick={() => setSuggestion(null)}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
```

### Detection Algorithm

1. **Character Analysis**: Count characters per script using Unicode ranges
2. **Dominant Script**: Find script with highest character count
3. **Confidence**: Calculate as `(dominant_count / total_chars)`
4. **Language Mapping**: Map script to WebIME language code

### Script-to-Language Mapping

| Script     | Language Code | WebIME Scheme  |
| ---------- | ------------- | -------------- |
| Devanagari | SAN           | devanagari     |
| Telugu     | TEL           | telugu         |
| Tamil      | TAM           | tamil          |
| Malayalam  | MAL           | malayalam      |
| Kannada    | KAN           | kannada        |
| Gujarati   | GUJ           | gujarati       |
| Bengali    | BEN           | bengali        |
| Latin      | NONE          | (ITRANS input) |

### Transliteration Detection

Check if text is likely transliteration (ITRANS format):

```typescript
import { useLanguageDetection } from "@/hooks/use-language-detection";

function MyComponent() {
  const { isLikelyTransliteration } = useLanguageDetection();

  const text = "namah shivAya"; // ITRANS format
  if (isLikelyTransliteration(text)) {
    console.log("User is typing in transliteration format");
    // Suggest ITRANS language
  }
}
```

**Detection patterns**:

- Double consonants: `namah`, `shri`
- CamelCase: `shivAya`, `namah`
- Special characters: `~` (nasalization), `^` (long vowels)

---

## Best Practices

### 1. **Privacy First**

Always inform users about local analytics:

```tsx
<div className="privacy-notice">
  <InfoIcon />
  <p>
    Analytics are stored locally in your browser and never sent to any server.
    You can export or clear them at any time.
  </p>
</div>
```

### 2. **Non-Intrusive Suggestions**

Don't interrupt user flow with modals. Use subtle notifications:

```tsx
{
  suggestion && (
    <Toast>
      {suggestion.message}
      <ToastAction onClick={handleSwitch}>Switch</ToastAction>
      <ToastAction onClick={handleDismiss}>Dismiss</ToastAction>
    </Toast>
  );
}
```

### 3. **Confidence Thresholds**

Adjust based on context:

- **High threshold (0.8-0.9)**: Critical input (commands, codes)
- **Medium threshold (0.7)**: General text input (default)
- **Low threshold (0.5-0.6)**: Exploratory/mixed-script content

### 4. **Context Awareness**

Consider context before suggesting:

```typescript
// Don't suggest in short inputs (< 5 chars)
if (text.length < 5) return;

// Don't suggest during rapid typing
const timeSinceLastInput = Date.now() - lastInputTime;
if (timeSinceLastInput < 1000) return;
```

---

## API Reference

### `useLanguageAnalytics()`

```typescript
{
  analytics: LanguageAnalytics | null;
  recordUsage: (language: string, context?: string) => void;
  getLanguageStats: (language: string) => LanguageUsageEntry | undefined;
  getTopLanguages: (n?: number) => LanguageUsageEntry[];
  getRecentLanguages: (exclude?: string, limit?: number) => string[];
  clearAnalytics: () => void;
  exportAnalytics: () => string;
  importAnalytics: (json: string) => boolean;
}
```

### `useLanguageDetection()`

```typescript
{
  detectScript: (text: string) => ScriptDetection;
  shouldSuggestLanguageChange: (
    text: string,
    currentLanguage: string,
    confidenceThreshold?: number
  ) => {
    shouldSuggest: boolean;
    detection?: ScriptDetection;
    message?: string;
  };
  isLikelyTransliteration: (text: string) => boolean;
}
```

### Types

```typescript
interface ScriptDetection {
  detectedScript: string;
  confidence: number; // 0-1
  suggestedLanguage?: string;
}

interface LanguageUsageEntry {
  language: string;
  count: number;
  lastUsed: Date;
  contexts: Record<string, number>;
}
```

---

## Testing

### Unit Tests

```typescript
import {
  detectScript,
  shouldSuggestLanguageChange,
} from "@/lib/sanscript/language-detection";

describe("Language Detection", () => {
  it("detects Devanagari script", () => {
    const result = detectScript("नमः शिवाय");
    expect(result.detectedScript).toBe("devanagari");
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.suggestedLanguage).toBe("SAN");
  });

  it("suggests language change when mismatch detected", () => {
    const result = shouldSuggestLanguageChange(
      "నమస్తే", // Telugu
      "SAN", // Sanskrit selected
      0.7,
    );
    expect(result.shouldSuggest).toBe(true);
    expect(result.detection?.detectedScript).toBe("telugu");
  });

  it("doesn't suggest when confidence is low", () => {
    const result = shouldSuggestLanguageChange(
      "hello", // Mixed/ambiguous
      "NONE",
      0.7,
    );
    expect(result.shouldSuggest).toBe(false);
  });
});
```

### Integration Tests

```typescript
import { useWebIMELanguagePersistence } from "@/hooks/use-webime-language-persistence";
import { useLanguageAnalytics } from "@/hooks/use-language-analytics";

it("tracks analytics when language is changed", () => {
  const { setLanguage } = useWebIMELanguagePersistence(
    undefined,
    "webimeLanguage:test",
  );
  const { analytics } = useLanguageAnalytics();

  setLanguage("SAN");

  expect(analytics?.totalSwitches).toBeGreaterThan(0);
  expect(analytics?.usageByLanguage["SAN"]).toBeDefined();
  expect(analytics?.usageByLanguage["SAN"].contexts["test"]).toBe(1);
});
```

---

## Troubleshooting

### Analytics Not Saving

**Problem**: Analytics cleared on page reload

**Solution**: Check localStorage quota and permissions

```typescript
// Check if localStorage is available
try {
  localStorage.setItem("test", "test");
  localStorage.removeItem("test");
  console.log("localStorage is available");
} catch (e) {
  console.error("localStorage is blocked or full");
}
```

### Incorrect Script Detection

**Problem**: Mixed-script text detected incorrectly

**Solution**: Increase confidence threshold or filter input

```typescript
// Filter out punctuation and whitespace before detection
const cleanText = text.replace(/[\s.,;:!?]/g, "");
const detection = detectScript(cleanText);
```

### Excessive Suggestions

**Problem**: Too many language switch suggestions

**Solution**: Add debouncing and minimum input length

```typescript
const [debouncedText] = useDebounce(text, 1000);

useEffect(() => {
  if (debouncedText.length < 5) return;
  // Check suggestion only after 1s delay and min 5 chars
}, [debouncedText]);
```
