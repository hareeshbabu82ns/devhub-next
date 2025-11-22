# Phase 14: WebIMEIdeInput Enhancement - Implementation Examples

This document provides code examples for implementing Phase 14 enhancements.

---

## Example 1: use-webime-language-persistence Hook

```typescript
// src/hooks/use-webime-language-persistence.ts

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LANGUAGE_TO_TRANSLITERATION_DDLB } from "@/app/(app)/sanscript/_components/utils";

interface UseWebimeLanguagePersistenceOptions {
  storageKey?: string;
  defaultLanguage?: string;
  propLanguage?: string;
  enabled?: boolean;
}

interface UseWebimeLanguagePersistenceResult {
  language: string;
  setLanguage: (lang: string) => void;
  clearLanguage: () => void;
  isHydrated: boolean;
  isPersisted: boolean;
  isControlled: boolean;
}

const DEFAULT_STORAGE_KEY = "webimeLanguage";
const DEFAULT_LANGUAGE = "NONE";

/**
 * Hook for persistent language selection with SSR-safe hydration
 *
 * Features:
 * - Context-specific storage keys
 * - Validation against available languages
 * - Controlled/uncontrolled component pattern
 * - Debounced writes to localStorage
 *
 * @example
 * // Uncontrolled with persistence
 * const { language, setLanguage } = useWebimeLanguagePersistence({
 *   storageKey: "webimeLanguage:dictionary",
 *   defaultLanguage: "NONE"
 * });
 *
 * @example
 * // Controlled mode (ignores storage)
 * const { language, setLanguage } = useWebimeLanguagePersistence({
 *   propLanguage: selectedLanguage,
 *   enabled: false
 * });
 */
export function useWebimeLanguagePersistence(
  options: UseWebimeLanguagePersistenceOptions = {},
): UseWebimeLanguagePersistenceResult {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    defaultLanguage = DEFAULT_LANGUAGE,
    propLanguage,
    enabled = true,
  } = options;

  // Controlled mode if propLanguage provided
  const isControlled = propLanguage !== undefined;

  // SSR-safe: Start with null, hydrate on client
  const [language, setLanguageState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isPersisted, setIsPersisted] = useState(false);

  // Debounce timer for localStorage writes
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Validate language against available options
   */
  const isValidLanguage = useCallback((lang: string): boolean => {
    return lang in LANGUAGE_TO_TRANSLITERATION_DDLB;
  }, []);

  /**
   * Load language from localStorage with validation
   */
  const loadFromStorage = useCallback((): string | null => {
    if (typeof window === "undefined" || !enabled) return null;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && isValidLanguage(stored)) {
        return stored;
      }
    } catch (error) {
      console.error("Failed to load language from localStorage:", error);
    }

    return null;
  }, [storageKey, enabled, isValidLanguage]);

  /**
   * Save language to localStorage with debouncing
   */
  const saveToStorage = useCallback(
    (lang: string) => {
      if (typeof window === "undefined" || !enabled) return;

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Debounce write (200ms)
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, lang);
        } catch (error) {
          console.error("Failed to save language to localStorage:", error);
        }
        saveTimerRef.current = null;
      }, 200);
    },
    [storageKey, enabled],
  );

  /**
   * Client-side hydration effect
   */
  useEffect(() => {
    if (isControlled) {
      // Controlled mode: use prop
      setLanguageState(propLanguage);
      setIsHydrated(true);
      setIsPersisted(false);
      return;
    }

    // Uncontrolled mode: load from storage or use default
    const stored = loadFromStorage();
    const resolvedLanguage = stored || defaultLanguage;

    setLanguageState(resolvedLanguage);
    setIsHydrated(true);
    setIsPersisted(stored !== null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  /**
   * Update language state when prop changes (controlled mode)
   */
  useEffect(() => {
    if (isControlled && propLanguage !== language) {
      setLanguageState(propLanguage);
    }
  }, [propLanguage, isControlled, language]);

  /**
   * Set language with validation and persistence
   */
  const setLanguage = useCallback(
    (newLang: string) => {
      if (!isValidLanguage(newLang)) {
        console.warn(`Invalid language: ${newLang}`);
        return;
      }

      if (isControlled) {
        // Controlled mode: don't save to storage
        setLanguageState(newLang);
        return;
      }

      // Uncontrolled mode: save to storage
      setLanguageState(newLang);
      setIsPersisted(true);
      saveToStorage(newLang);
    },
    [isControlled, isValidLanguage, saveToStorage],
  );

  /**
   * Clear persisted language and reset to default
   */
  const clearLanguage = useCallback(() => {
    if (isControlled) return; // No-op in controlled mode

    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Failed to clear language from localStorage:", error);
    }

    setLanguageState(defaultLanguage);
    setIsPersisted(false);
  }, [isControlled, storageKey, defaultLanguage]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Return current language or default during hydration
  const currentLanguage =
    language ?? (isControlled ? propLanguage! : defaultLanguage);

  return {
    language: currentLanguage,
    setLanguage,
    clearLanguage,
    isHydrated,
    isPersisted,
    isControlled,
  };
}
```

---

## Example 2: Suggestion Provider Implementation

```typescript
// src/lib/sanscript/suggestion-provider.ts

import { DictionaryRepository } from "@/lib/dictionary/dictionary-repository";
import Sanscript from "@indic-transliteration/sanscript";
import { LANGUAGE_TO_TRANSLITERATION_DDLB } from "@/app/(app)/sanscript/_components/utils";

/**
 * Suggestion source types
 */
export type SuggestionSource =
  | "transliteration"
  | "dictionary"
  | "static"
  | "history";

/**
 * Suggestion with metadata
 */
export interface Suggestion {
  value: string; // Display text
  key: string; // Original input
  source: SuggestionSource;
  score: number; // Relevance (0-100)
  metadata?: {
    origin?: string;
    frequency?: number;
  };
}

/**
 * Abstract suggestion provider interface
 */
export interface SuggestionProvider {
  getSuggestions(
    text: string,
    language: string,
    limit?: number,
  ): Promise<Suggestion[]>;
}

/**
 * Static word list provider
 */
export class StaticSuggestionProvider implements SuggestionProvider {
  private wordLists: Map<string, Array<{ word: string; frequency?: number }>>;

  constructor(
    wordLists: Record<string, Array<{ word: string; frequency?: number }>>,
  ) {
    this.wordLists = new Map(Object.entries(wordLists));
  }

  async getSuggestions(
    text: string,
    language: string,
    limit = 10,
  ): Promise<Suggestion[]> {
    const words = this.wordLists.get(language) || [];
    const normalizedText = text.toLowerCase();

    // Filter and rank words
    const matches = words
      .filter((w) => w.word.toLowerCase().startsWith(normalizedText))
      .map((w) => ({
        value: w.word,
        key: text,
        source: "static" as SuggestionSource,
        score: this.calculateScore(text, w.word, w.frequency || 50),
        metadata: { frequency: w.frequency },
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return matches;
  }

  private calculateScore(
    input: string,
    word: string,
    frequency: number,
  ): number {
    const inputLen = input.length;
    const wordLen = word.length;

    // Exact match: 100
    if (input.toLowerCase() === word.toLowerCase()) return 100;

    // Prefix match score (longer match = higher score)
    const prefixScore = (inputLen / wordLen) * 40;

    // Frequency score (normalized to 0-30)
    const freqScore = Math.min(frequency / 100, 1) * 30;

    // Length penalty (prefer shorter words)
    const lengthScore = Math.max(0, 30 - (wordLen - inputLen) * 2);

    return Math.min(100, prefixScore + freqScore + lengthScore);
  }
}

/**
 * Simple LRU Cache implementation
 */
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end
    this.cache.set(key, value);

    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Dictionary-based suggestion provider with caching
 */
export class DictionarySuggestionProvider implements SuggestionProvider {
  private cache: LRUCache<string, Suggestion[]>;

  constructor(
    private repository: DictionaryRepository,
    cacheSize = 100,
  ) {
    this.cache = new LRUCache(cacheSize);
  }

  async getSuggestions(
    text: string,
    language: string,
    limit = 10,
  ): Promise<Suggestion[]> {
    const cacheKey = `${language}:${text}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) return cached.slice(0, limit);

    try {
      // Normalize text for multi-script matching
      const scheme = LANGUAGE_TO_TRANSLITERATION_DDLB[language]?.scheme;
      const normalizedText = scheme
        ? Sanscript.t(text, scheme, "itrans_dravidian")
        : text;

      // Query dictionary
      const results = await this.repository.findWords({
        searchTerm: normalizedText,
        filters: {},
        limit: limit * 2, // Get extra for ranking
      });

      // Convert to suggestions
      const suggestions: Suggestion[] = results.words.map((word) => ({
        value: this.extractWordValue(word, language),
        key: text,
        source: "dictionary" as SuggestionSource,
        score: this.calculateRelevance(text, word),
        metadata: {
          origin: word.origin,
        },
      }));

      // Sort by score and cache
      const sorted = suggestions.sort((a, b) => b.score - a.score);
      this.cache.set(cacheKey, sorted);

      return sorted.slice(0, limit);
    } catch (error) {
      console.error("Dictionary suggestion error:", error);
      return [];
    }
  }

  private extractWordValue(word: any, language: string): string {
    // Extract word value in target language
    const wordLang = word.word?.find((w: any) => w.language === language);
    return wordLang?.value || word.phonetic || "";
  }

  private calculateRelevance(input: string, word: any): number {
    // Simple relevance based on phonetic match
    const phonetic = word.phonetic?.toLowerCase() || "";
    const inputLower = input.toLowerCase();

    if (phonetic.startsWith(inputLower)) return 80;
    if (phonetic.includes(inputLower)) return 60;
    return 40;
  }
}

/**
 * Composite provider combining multiple sources
 */
export class CompositeSuggestionProvider implements SuggestionProvider {
  constructor(private providers: SuggestionProvider[]) {}

  async getSuggestions(
    text: string,
    language: string,
    limit = 20,
  ): Promise<Suggestion[]> {
    // Query all providers in parallel
    const results = await Promise.all(
      this.providers.map((p) => p.getSuggestions(text, language, limit)),
    );

    // Flatten and deduplicate by value
    const allSuggestions = results.flat();
    const uniqueMap = new Map<string, Suggestion>();

    for (const suggestion of allSuggestions) {
      const existing = uniqueMap.get(suggestion.value);
      if (!existing || suggestion.score > existing.score) {
        uniqueMap.set(suggestion.value, suggestion);
      }
    }

    // Sort by score and return top N
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
```

---

## Example 3: Enhanced WebIMEIdeInput Integration

```typescript
// src/app/(app)/sanscript/_components/WebIMEIdeInput.tsx
// (showing only the changes/additions)

import { useWebimeLanguagePersistence } from "@/hooks/use-webime-language-persistence";
import { SuggestionProvider } from "@/lib/sanscript/suggestion-provider";

export interface WebIMEIdeProps extends React.ComponentProps<"input"> {
  // ... existing props ...

  /** Custom localStorage key for language persistence */
  storageKey?: string;

  /** Enable/disable language persistence (default: true) */
  enablePersistence?: boolean;

  /** Callback when language changes */
  onLanguageChange?: (language: string) => void;

  /** Custom suggestion provider */
  suggestionProvider?: SuggestionProvider;

  /** Maximum suggestions to show (default: 20) */
  maxSuggestions?: number;

  /** Show suggestion source metadata (default: false) */
  showSuggestionSource?: boolean;
}

const WebIMEIdeInput = React.forwardRef<HTMLInputElement, WebIMEIdeProps>(
  (
    {
      className,
      containerClassName,
      language: propLanguage,
      storageKey,
      enablePersistence = true,
      onLanguageChange,
      suggestionProvider,
      maxSuggestions = 20,
      showSuggestionSource = false,
      withLanguageSelector = false,
      showSearchIcon = false,
      showHelpIcon = false,
      valueAs = "itrans_dravidian",
      onTextChange,
      ...props
    },
    _fwdRef,
  ) => {
    const textSize = useTextSizeAtomValue();

    // Use persistence hook instead of direct useState
    const {
      language: lang,
      setLanguage: setLang,
      clearLanguage,
      isPersisted,
      isHydrated,
    } = useWebimeLanguagePersistence({
      storageKey: storageKey || "webimeLanguage",
      propLanguage,
      defaultLanguage: "NONE",
      enabled: enablePersistence,
    });

    const [isDropdownActive, setIsDropdownActive] = useState<boolean>(false);
    const currentValueRef = useRef<string>("");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Notify parent of language changes
    useEffect(() => {
      if (onLanguageChange && isHydrated) {
        onLanguageChange(lang);
      }
    }, [lang, onLanguageChange, isHydrated]);

    // Enhanced suggestion callback with provider integration
    const valuesCallbackIME = async (
      text: string,
      cb: (result: Record<string, string>[]) => void,
    ) => {
      if (lang === "NONE") {
        cb([]);
        return;
      }

      try {
        // Get transliteration suggestions (existing behavior)
        const transOut = transliterateText({
          text,
          toScheme: LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme,
        });

        const translitSuggestions = transOut.map((t) => ({
          key: text,
          value: t,
          source: "transliteration",
        }));

        // Get provider suggestions if available
        let providerSuggestions: any[] = [];
        if (suggestionProvider) {
          const suggestions = await suggestionProvider.getSuggestions(
            text,
            lang,
            maxSuggestions
          );

          providerSuggestions = suggestions.map((s) => ({
            key: s.key,
            value: s.value,
            source: s.source,
            score: s.score,
          }));
        }

        // Merge and deduplicate
        const allSuggestions = [...translitSuggestions, ...providerSuggestions];
        const uniqueMap = new Map<string, any>();

        for (const suggestion of allSuggestions) {
          if (!uniqueMap.has(suggestion.value)) {
            uniqueMap.set(suggestion.value, suggestion);
          }
        }

        // Convert to WebIME format
        const output = Array.from(uniqueMap.values())
          .slice(0, maxSuggestions)
          .map((s) => ({
            key: s.key,
            value: showSuggestionSource ? `${s.value} (${s.source})` : s.value,
          }));

        cb(output);
      } catch (error) {
        console.error("Suggestion error:", error);
        // Fallback to transliteration only
        const transOut = transliterateText({
          text,
          toScheme: LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme,
        });
        cb(transOut.map((t) => ({ key: text, value: t })));
      }
    };

    // Enhanced language selector with persistence indicator
    const languageSelector = (
      <Select
        value={lang}
        onValueChange={(newLang) => {
          setLang(newLang);
        }}
      >
        <SelectTrigger className="border-0 border-l-2 absolute right-0 top-0 h-8 w-[100px]">
          <div className="flex items-center gap-1">
            <SelectValue placeholder="Input Language..." />
            {isPersisted && isHydrated && (
              <span className="text-xs text-muted-foreground" title="Persisted">
                📌
              </span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {Object.keys(LANGUAGE_TO_TRANSLITERATION_DDLB).map((l: string) => (
              <SelectItem key={l} value={l}>
                {LANGUAGE_TO_TRANSLITERATION_DDLB[l].label}
              </SelectItem>
            ))}
            {isPersisted && enablePersistence && (
              <>
                <SelectItem value="__divider__" disabled>
                  ─────────
                </SelectItem>
                <SelectItem
                  value="__reset__"
                  onSelect={(e) => {
                    e.preventDefault();
                    clearLanguage();
                  }}
                >
                  Reset to Default
                </SelectItem>
              </>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    );

    // Rest of component unchanged...
    return (
      <div className={cn("relative flex flex-1", containerClassName)}>
        {/* ... existing JSX ... */}
      </div>
    );
  },
);
```

---

## Example 4: Usage in Dictionary Search

```typescript
// src/app/(app)/dictionary/_components/search-toolbar.tsx
// (showing integration example)

import { useMemo } from "react";
import { useDictionarySuggestionProvider } from "@/hooks/useDictionarySuggestionProvider";

function DictionarySearchToolbar() {
  // Create suggestion provider for dictionary context
  const suggestionProvider = useDictionarySuggestionProvider();

  return (
    <div className="relative flex-1">
      <SearchIcon className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
      <WebIMEIdeInput
        type="search"
        placeholder="Search dictionary..."
        defaultValue={searchParam}
        onTextChange={debouncedSetParams}
        className="w-full appearance-none bg-background shadow-none"

        // Persistence configuration
        storageKey="webimeLanguage:dictionary"
        enablePersistence={true}
        onLanguageChange={(lang) => {
          console.log("Dictionary search language:", lang);
        }}

        // Suggestion configuration
        suggestionProvider={suggestionProvider}
        maxSuggestions={20}
        showSuggestionSource={false}

        // Existing props
        withLanguageSelector
        showSearchIcon
      />
    </div>
  );
}
```

---

## Example 5: Suggestion Provider Hook

```typescript
// src/hooks/useDictionarySuggestionProvider.ts

"use client";

import { useMemo } from "react";
import { db } from "@/lib/db";
import { DictionaryRepository } from "@/lib/dictionary/dictionary-repository";
import {
  DictionarySuggestionProvider,
  StaticSuggestionProvider,
  CompositeSuggestionProvider,
  SuggestionProvider,
} from "@/lib/sanscript/suggestion-provider";

// Import static word lists
import commonSanskrit from "@/data/sanscript/suggestions/common-sanskrit.json";
import commonTelugu from "@/data/sanscript/suggestions/common-telugu.json";
import deityNames from "@/data/sanscript/suggestions/deity-names.json";

/**
 * Hook providing dictionary-enhanced suggestion provider
 * Combines static word lists with live dictionary queries
 */
export function useDictionarySuggestionProvider(): SuggestionProvider {
  return useMemo(() => {
    // Create repository instance
    const repository = new DictionaryRepository(db);

    // Create dictionary provider
    const dictionaryProvider = new DictionarySuggestionProvider(
      repository,
      100, // Cache size
    );

    // Create static provider with word lists
    const staticProvider = new StaticSuggestionProvider({
      SAN: [...commonSanskrit.words, ...deityNames.words],
      TEL: commonTelugu.words,
    });

    // Combine both providers
    return new CompositeSuggestionProvider([
      staticProvider, // Fast, offline suggestions first
      dictionaryProvider, // Accurate dictionary suggestions second
    ]);
  }, []);
}
```

---

## Example 6: Static Word List JSON

```json
// data/sanscript/suggestions/common-sanskrit.json

{
  "language": "SAN",
  "scheme": "devanagari",
  "description": "Top 500 most common Sanskrit words",
  "words": [
    {
      "word": "नमः",
      "transliteration": "namaH",
      "frequency": 9500,
      "meaning": "salutation, bow"
    },
    {
      "word": "शिव",
      "transliteration": "shiva",
      "frequency": 8200,
      "meaning": "auspicious, Lord Shiva"
    },
    {
      "word": "देव",
      "transliteration": "deva",
      "frequency": 7800,
      "meaning": "deity, divine"
    },
    {
      "word": "ॐ",
      "transliteration": "om",
      "frequency": 9800,
      "meaning": "sacred syllable"
    }
  ]
}
```

---

## Testing Examples

### Unit Test: Persistence Hook

```typescript
// tests/hooks/use-webime-language-persistence.test.ts

import { renderHook, act } from "@testing-library/react";
import { useWebimeLanguagePersistence } from "@/hooks/use-webime-language-persistence";

describe("useWebimeLanguagePersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("should initialize with default language", () => {
    const { result } = renderHook(() =>
      useWebimeLanguagePersistence({
        defaultLanguage: "NONE",
      }),
    );

    expect(result.current.language).toBe("NONE");
    expect(result.current.isPersisted).toBe(false);
  });

  test("should persist language to localStorage", async () => {
    const { result } = renderHook(() =>
      useWebimeLanguagePersistence({
        storageKey: "test:language",
      }),
    );

    act(() => {
      result.current.setLanguage("SAN");
    });

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(localStorage.getItem("test:language")).toBe("SAN");
    expect(result.current.isPersisted).toBe(true);
  });

  test("should restore language from localStorage", () => {
    localStorage.setItem("test:language", "TEL");

    const { result } = renderHook(() =>
      useWebimeLanguagePersistence({
        storageKey: "test:language",
      }),
    );

    // After hydration
    expect(result.current.language).toBe("TEL");
    expect(result.current.isPersisted).toBe(true);
  });

  test("should use prop language in controlled mode", () => {
    const { result, rerender } = renderHook(
      ({ propLanguage }) =>
        useWebimeLanguagePersistence({
          propLanguage,
        }),
      {
        initialProps: { propLanguage: "SAN" },
      },
    );

    expect(result.current.language).toBe("SAN");
    expect(result.current.isControlled).toBe(true);

    rerender({ propLanguage: "TEL" });
    expect(result.current.language).toBe("TEL");
  });

  test("should validate language before saving", () => {
    const { result } = renderHook(() => useWebimeLanguagePersistence());

    act(() => {
      result.current.setLanguage("INVALID");
    });

    expect(result.current.language).not.toBe("INVALID");
  });
});
```

### Integration Test: Component with Persistence

```typescript
// tests/components/WebIMEIdeInput.integration.test.ts

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WebIMEIdeInput from "@/app/(app)/sanscript/_components/WebIMEIdeInput";

describe("WebIMEIdeInput with persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("should persist language selection across remounts", async () => {
    const { unmount, rerender } = render(
      <WebIMEIdeInput
        storageKey="test:persist"
        withLanguageSelector
      />
    );

    // Select language
    const selector = screen.getByRole("combobox");
    await userEvent.click(selector);

    const option = screen.getByText("Sanskrit");
    await userEvent.click(option);

    // Wait for persistence
    await waitFor(() => {
      expect(localStorage.getItem("test:persist")).toBe("SAN");
    });

    // Unmount and remount
    unmount();
    rerender(
      <WebIMEIdeInput
        storageKey="test:persist"
        withLanguageSelector
      />
    );

    // Language should be restored
    await waitFor(() => {
      expect(screen.getByDisplayValue("Sanskrit")).toBeInTheDocument();
    });
  });

  test("should show persistence indicator", async () => {
    localStorage.setItem("test:persist", "TEL");

    render(
      <WebIMEIdeInput
        storageKey="test:persist"
        withLanguageSelector
      />
    );

    // Should show pin icon for persisted language
    await waitFor(() => {
      expect(screen.getByTitle("Persisted")).toBeInTheDocument();
    });
  });
});
```

---

## Migration Script Example

```typescript
// scripts/migrate-webime-storage.ts

/**
 * Migrate old webimeLanguage key to context-specific keys
 * Run once on application startup (in layout or provider)
 */
export function migrateWebimeStorage() {
  if (typeof window === "undefined") return;

  try {
    const oldKey = "webimeLanguage";
    const oldValue = localStorage.getItem(oldKey);

    if (!oldValue) return; // No migration needed

    const contextKeys = [
      "webimeLanguage:dictionary",
      "webimeLanguage:entity",
      "webimeLanguage:sanscript",
    ];

    // Copy to context-specific keys if they don't exist
    for (const key of contextKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, oldValue);
      }
    }

    // Don't remove old key for backward compatibility
    console.log("WebIME storage migrated to context-specific keys");
  } catch (error) {
    console.error("WebIME storage migration failed:", error);
  }
}
```

---

These examples provide concrete implementation patterns for Phase 14. Adjust as needed based on your specific requirements and coding standards.
