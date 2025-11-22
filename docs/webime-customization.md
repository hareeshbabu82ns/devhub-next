# WebIME Custom Suggestion Providers

## Overview

The WebIME suggestion system allows you to provide context-aware word suggestions for Sanskrit, Telugu, and other Indic language inputs. This guide explains how to create custom suggestion providers and integrate them into your WebIME components.

## Architecture

The suggestion system follows a provider pattern with three main components:

1. **SuggestionProvider** (interface): Abstract contract for all providers
2. **StaticSuggestionProvider**: Predefined word lists (mantras, deity names)
3. **DictionarySuggestionProvider**: Database-backed suggestions from DictionaryWord model

## Provider Interface

```typescript
interface Suggestion {
  value: string; // The suggested word/phrase
  key: string; // Original input that triggered this
  source: "dictionary" | "static" | "transliteration";
  metadata?: {
    frequency?: number; // For ranking (higher = better)
    language?: string; // Language code (e.g., "sa", "te")
    origin?: string; // Dictionary origin (for database suggestions)
  };
}

interface SuggestionProvider {
  getSuggestions(
    text: string,
    options?: {
      language?: string;
      limit?: number;
      fromScheme?: string;
    },
  ): Promise<Suggestion[]>;
}
```

## Built-in Providers

### StaticSuggestionProvider

Provides suggestions from predefined word lists. Best for:

- Common mantras and religious terms
- Deity names
- Frequently used phrases
- Offline functionality

**Usage:**

```typescript
import { StaticSuggestionProvider } from "@/lib/sanscript/static-suggestion-provider";

const provider = new StaticSuggestionProvider();

// Get suggestions
const suggestions = await provider.getSuggestions("नम", {
  limit: 10,
});
// Returns: ["ॐ नमः शिवाय", "ॐ नमो नारायणाय", "नमस्ते", ...]
```

**Default Word Lists:**

- Common Sanskrit terms (mantras, greetings)
- Deity names (Shiva, Vishnu, Ganesha, etc.)
- Mantra beginnings (ॐ, श्री, जय, etc.)

### DictionarySuggestionProvider

Queries the DictionaryWord database. Best for:

- Comprehensive word suggestions
- Multi-script matching
- Dynamic content

**Usage:**

```typescript
import { DictionarySuggestionProvider } from "@/lib/sanscript/dictionary-suggestion-provider";

const provider = new DictionarySuggestionProvider(
  100, // Cache size (default: 100)
  5 * 60 * 1000, // Cache TTL (default: 5 minutes)
);

const suggestions = await provider.getSuggestions("namah", {
  limit: 10,
  fromScheme: "itrans",
});
```

**Features:**

- **Multi-script search**: Automatically tries Devanagari, IAST, ITRANS, SLP1
- **Caching**: LRU cache avoids repeated database queries
- **Performance optimized**: <200ms for most queries

## Creating Custom Providers

### Example: API-Based Provider

```typescript
import {
  SuggestionProvider,
  Suggestion,
} from "@/lib/sanscript/suggestion-provider";

export class APISuggestionProvider implements SuggestionProvider {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async getSuggestions(
    text: string,
    options?: { language?: string; limit?: number },
  ): Promise<Suggestion[]> {
    const limit = options?.limit || 10;

    try {
      const response = await fetch(
        `${this.apiUrl}/suggestions?q=${encodeURIComponent(text)}&limit=${limit}`,
      );

      const data = await response.json();

      return data.map((item: any) => ({
        key: text,
        value: item.word,
        source: "dictionary" as const,
        metadata: {
          frequency: item.frequency,
          language: item.language,
        },
      }));
    } catch (error) {
      console.error("API suggestion error:", error);
      return [];
    }
  }
}
```

### Example: User History Provider

```typescript
export class HistorySuggestionProvider implements SuggestionProvider {
  private history: Map<string, number>; // word -> usage count

  constructor() {
    this.history = new Map();
    this.loadFromStorage();
  }

  async getSuggestions(
    text: string,
    options?: { limit?: number },
  ): Promise<Suggestion[]> {
    const limit = options?.limit || 10;
    const normalizedQuery = text.toLowerCase();

    // Find matches in history
    const matches: Array<{ word: string; count: number }> = [];

    for (const [word, count] of this.history.entries()) {
      if (word.toLowerCase().includes(normalizedQuery)) {
        matches.push({ word, count });
      }
    }

    // Sort by usage count
    matches.sort((a, b) => b.count - a.count);

    return matches.slice(0, limit).map(({ word }) => ({
      key: text,
      value: word,
      source: "static" as const,
      metadata: {
        frequency: this.history.get(word),
      },
    }));
  }

  // Track word usage
  recordUsage(word: string): void {
    const count = this.history.get(word) || 0;
    this.history.set(word, count + 1);
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem("webime:history");
      if (stored) {
        this.history = new Map(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.history.entries());
      localStorage.setItem("webime:history", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }
}
```

## Integrating Providers

### With WebIMEIdeInput

```typescript
import WebIMEIdeInput from "@/app/(app)/sanscript/_components/WebIMEIdeInput";
import { useDictionarySuggestionProvider } from "@/hooks/use-dictionary-suggestion-provider";

function MyComponent() {
  const suggestionProvider = useDictionarySuggestionProvider();

  return (
    <WebIMEIdeInput
      suggestionProvider={suggestionProvider}
      withLanguageSelector
      placeholder="Type Sanskrit..."
    />
  );
}
```

### Combining Multiple Providers

You can create a composite provider that queries multiple sources:

```typescript
export class CompositeSuggestionProvider implements SuggestionProvider {
  private providers: SuggestionProvider[];

  constructor(providers: SuggestionProvider[]) {
    this.providers = providers;
  }

  async getSuggestions(
    text: string,
    options?: { language?: string; limit?: number },
  ): Promise<Suggestion[]> {
    const limit = options?.limit || 20;

    // Query all providers in parallel
    const results = await Promise.all(
      this.providers.map((p) => p.getSuggestions(text, options)),
    );

    // Merge and rank results
    return rankAndMergeSuggestions(results, text, limit);
  }
}

// Usage:
const provider = new CompositeSuggestionProvider([
  new StaticSuggestionProvider(),
  new DictionarySuggestionProvider(),
  new HistorySuggestionProvider(),
]);
```

## Ranking Algorithm

The built-in `rankAndMergeSuggestions` function ranks suggestions using:

1. **Prefix match bonus**: +50 points if suggestion starts with query
2. **Contains bonus**: +20 points if suggestion contains query
3. **Length penalty**: Shorter matches score higher (more specific)
4. **Source bonus**: Dictionary > Static > Transliteration
5. **Frequency boost**: Up to +10 points based on usage frequency

You can customize ranking by implementing your own merge logic.

## Caching Patterns

### LRU Cache

```typescript
import { SuggestionCache } from "@/lib/sanscript/suggestion-provider";

const cache = new SuggestionCache(
  100,              // Max entries
  5 * 60 * 1000     // 5 minutes TTL
);

// In your provider:
async getSuggestions(text: string): Promise<Suggestion[]> {
  // Check cache
  const cached = cache.get(text);
  if (cached) return cached;

  // Fetch new suggestions
  const suggestions = await this.fetchSuggestions(text);

  // Cache results
  cache.set(text, suggestions);

  return suggestions;
}
```

### Cache Key Strategy

For providers with multiple parameters, create composite keys:

```typescript
const cacheKey = `${text}:${language}:${limit}`;
const cached = cache.get(cacheKey);
```

## Performance Best Practices

1. **Debounce input**: Wait 200-300ms before querying

   ```typescript
   const debouncedSearch = useDebounce(searchText, 300);
   ```

2. **Limit suggestions**: 10-20 results max

   ```typescript
   getSuggestions(text, { limit: 10 });
   ```

3. **Cache aggressively**: LRU cache with 5-minute TTL

   ```typescript
   new SuggestionCache(100, 5 * 60 * 1000);
   ```

4. **Fail gracefully**: Always return empty array on error

   ```typescript
   try {
     return await fetchSuggestions(text);
   } catch (error) {
     console.error(error);
     return [];
   }
   ```

5. **Use indexes**: Ensure database queries use proper indexes
   ```prisma
   @@index([origin, phonetic])
   @@fulltext([phonetic, word])
   ```

## Testing Providers

### Unit Tests

```typescript
import { StaticSuggestionProvider } from "@/lib/sanscript/static-suggestion-provider";

describe("StaticSuggestionProvider", () => {
  it("returns suggestions for prefix match", async () => {
    const provider = new StaticSuggestionProvider();
    const suggestions = await provider.getSuggestions("ॐ नम", { limit: 5 });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].value).toContain("ॐ नम");
    expect(suggestions[0].source).toBe("static");
  });

  it("respects limit parameter", async () => {
    const provider = new StaticSuggestionProvider();
    const suggestions = await provider.getSuggestions("श", { limit: 3 });

    expect(suggestions.length).toBeLessThanOrEqual(3);
  });
});
```

### Performance Tests

```typescript
it("returns suggestions within 50ms", async () => {
  const provider = new StaticSuggestionProvider();

  const start = performance.now();
  await provider.getSuggestions("नम");
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(50);
});
```

## Examples

### Sanskrit Study App

```typescript
const provider = new CompositeSuggestionProvider([
  new StaticSuggestionProvider(), // Common terms
  new DictionarySuggestionProvider(), // Full dictionary
]);

<WebIMEIdeInput
  suggestionProvider={provider}
  storageKey="webimeLanguage:study"
/>
```

### Mantra Input

```typescript
const mantraProvider = new StaticSuggestionProvider();
// Only add mantra-related word lists
mantraProvider.addWordList("vedic-mantras", vedic Mantras);

<WebIMEIdeInput
  suggestionProvider={mantraProvider}
  language="sa" // Default to Sanskrit
/>
```

### Dictionary Search

```typescript
const dictionaryProvider = useDictionarySuggestionProvider({
  cacheSize: 200,
  cacheTTL: 10 * 60 * 1000, // 10 minutes
});

<WebIMEIdeInput
  suggestionProvider={dictionaryProvider}
  storageKey="webimeLanguage:dictionary"
/>
```

## Troubleshooting

### No suggestions appearing

- Check provider is instantiated correctly
- Verify `getSuggestions` returns non-empty array
- Check browser console for errors
- Verify WebIME is initialized (language !== "NONE")

### Slow performance

- Implement caching
- Reduce limit parameter
- Add database indexes
- Debounce input

### Wrong suggestions

- Check ranking algorithm
- Verify text normalization (NFC)
- Review multi-script matching logic
- Check word list quality

## Resources

- [WebIME Library Documentation](https://github.com/your-org/webime)
- [Sanscript Transliteration](https://github.com/sanskrit/sanscript.js)
- [Prisma Full-Text Search](https://www.prisma.io/docs/concepts/components/prisma-client/full-text-search)
