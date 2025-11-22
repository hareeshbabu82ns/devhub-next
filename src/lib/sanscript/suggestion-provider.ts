/**
 * Suggestion provider system for WebIME components
 *
 * This module provides interfaces and implementations for generating
 * context-aware word suggestions for Sanskrit/Telugu input across
 * different transliteration schemes.
 *
 * Architecture:
 * - SuggestionProvider: Abstract interface for all providers
 * - DictionarySuggestionProvider: Query DictionaryWord model for suggestions
 * - StaticSuggestionProvider: Use predefined word lists from JSON files
 */

/**
 * Represents a single suggestion result
 */
export interface Suggestion {
  /** The suggested word/phrase */
  value: string;
  /** Original key/input that triggered this suggestion */
  key: string;
  /** Source of the suggestion (e.g., "dictionary", "static", "transliteration") */
  source: "dictionary" | "static" | "transliteration";
  /** Optional metadata for display/ranking */
  metadata?: {
    /** How frequently this word appears (for ranking) */
    frequency?: number;
    /** Language/script of the suggestion */
    language?: string;
    /** Dictionary origin (for dictionary suggestions) */
    origin?: string;
  };
}

/**
 * Abstract interface for suggestion providers
 */
export interface SuggestionProvider {
  /**
   * Get suggestions based on input text and optional context
   *
   * @param text - Input text to generate suggestions for
   * @param options - Optional context (language, limit, etc.)
   * @returns Array of suggestions (max: options.limit or 10)
   */
  getSuggestions(
    text: string,
    options?: {
      language?: string;
      limit?: number;
      fromScheme?: string;
    },
  ): Promise<Suggestion[]>;
}

/**
 * Result from caching layer
 */
export interface CachedSuggestions {
  suggestions: Suggestion[];
  timestamp: number;
}

/**
 * LRU Cache for suggestion results
 */
export class SuggestionCache {
  private cache: Map<string, CachedSuggestions>;
  private maxSize: number;
  private ttl: number; // Time-to-live in milliseconds

  constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) {
    // 5 min default
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): Suggestion[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, cached);

    return cached.suggestions;
  }

  set(key: string, suggestions: Suggestion[]): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      suggestions,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Helper function to normalize input text for suggestion matching
 * Applies NFC normalization and conditional case folding
 */
export function normalizeForSuggestions(text: string, scheme?: string): string {
  // Unicode NFC normalization
  let normalized = text.normalize("NFC");

  // Apply case folding for Latin-based schemes
  if (
    !scheme ||
    scheme === "itrans" ||
    scheme === "iast" ||
    scheme === "slp1" ||
    scheme === "velthuis"
  ) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

/**
 * Rank and merge suggestions from multiple sources
 *
 * Ranking algorithm:
 * 1. Prefix matches score higher than contains
 * 2. Shorter matches score higher (more specific)
 * 3. Dictionary words score higher than static
 * 4. Frequency boosts (if available)
 */
export function rankAndMergeSuggestions(
  suggestionArrays: Suggestion[][],
  query: string,
  maxResults: number = 20,
): Suggestion[] {
  // Flatten and deduplicate
  const allSuggestions = suggestionArrays.flat();
  const uniqueMap = new Map<string, Suggestion>();

  for (const suggestion of allSuggestions) {
    const existing = uniqueMap.get(suggestion.value);
    if (!existing) {
      uniqueMap.set(suggestion.value, suggestion);
    } else {
      // If duplicate, prefer dictionary over static
      if (suggestion.source === "dictionary" && existing.source === "static") {
        uniqueMap.set(suggestion.value, suggestion);
      }
    }
  }

  const unique = Array.from(uniqueMap.values());

  // Calculate scores
  const scored = unique.map((suggestion) => {
    let score = 0;

    // Prefix match bonus
    const normalizedValue = normalizeForSuggestions(suggestion.value);
    const normalizedQuery = normalizeForSuggestions(query);

    if (normalizedValue.startsWith(normalizedQuery)) {
      score += 50;
    } else if (normalizedValue.includes(normalizedQuery)) {
      score += 20;
    }

    // Length penalty (prefer shorter, more specific matches)
    score += Math.max(0, 30 - normalizedValue.length);

    // Source bonus
    if (suggestion.source === "dictionary") {
      score += 15;
    } else if (suggestion.source === "static") {
      score += 10;
    } else {
      score += 5; // transliteration
    }

    // Frequency bonus (if available)
    if (suggestion.metadata?.frequency) {
      score += Math.min(10, suggestion.metadata.frequency / 100);
    }

    return { suggestion, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top N
  return scored.slice(0, maxResults).map((s) => s.suggestion);
}
