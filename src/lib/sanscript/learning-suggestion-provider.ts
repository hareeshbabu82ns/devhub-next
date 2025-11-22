/**
 * Learning Suggestion Provider
 *
 * Tracks user-selected suggestions and boosts them in future rankings
 * Uses localStorage for persistence across sessions
 */

import {
  Suggestion,
  SuggestionProvider,
  normalizeForSuggestions,
} from "./suggestion-provider";

/**
 * Usage history entry
 */
interface UsageEntry {
  word: string;
  count: number;
  lastUsed: number; // timestamp
}

/**
 * Learning provider that adapts to user's selection patterns
 */
export class LearningSuggestionProvider implements SuggestionProvider {
  private usageHistory: Map<string, UsageEntry>;
  private storageKey: string;
  private maxHistorySize: number;

  constructor(storageKey: string = "webime:learning", maxSize: number = 1000) {
    this.storageKey = storageKey;
    this.maxHistorySize = maxSize;
    this.usageHistory = new Map();
    this.loadFromStorage();
  }

  /**
   * Get suggestions based on learned patterns
   */
  async getSuggestions(
    text: string,
    options?: {
      language?: string;
      limit?: number;
    },
  ): Promise<Suggestion[]> {
    const limit = options?.limit || 10;
    const normalizedQuery = normalizeForSuggestions(text);

    if (!normalizedQuery) {
      // Return most recently used suggestions when query is empty
      return this.getRecentSuggestions(limit);
    }

    const suggestions: Suggestion[] = [];

    // Search usage history for matches
    for (const [word, entry] of this.usageHistory.entries()) {
      const normalizedWord = normalizeForSuggestions(word);

      // Match prefix or contains
      if (
        normalizedWord.startsWith(normalizedQuery) ||
        normalizedWord.includes(normalizedQuery)
      ) {
        suggestions.push({
          key: text,
          value: word,
          source: "static", // Mark as static since it's from history
          metadata: {
            frequency: entry.count * 10, // Boost based on usage count
          },
        });
      }
    }

    // Sort by frequency (usage count) descending, then by recency
    suggestions.sort((a, b) => {
      const freqA = a.metadata?.frequency || 0;
      const freqB = b.metadata?.frequency || 0;

      if (freqA !== freqB) {
        return freqB - freqA;
      }

      // If same frequency, prefer more recent
      const entryA = this.usageHistory.get(a.value);
      const entryB = this.usageHistory.get(b.value);
      return (entryB?.lastUsed || 0) - (entryA?.lastUsed || 0);
    });

    // Return top N
    return suggestions.slice(0, limit);
  }

  /**
   * Get most recently used suggestions
   */
  private getRecentSuggestions(limit: number): Suggestion[] {
    const entries = Array.from(this.usageHistory.entries())
      .sort((a, b) => b[1].lastUsed - a[1].lastUsed)
      .slice(0, limit);

    return entries.map(([word, entry]) => ({
      key: "",
      value: word,
      source: "static" as const,
      metadata: {
        frequency: entry.count * 10,
      },
    }));
  }

  /**
   * Record that user selected a suggestion
   */
  recordUsage(word: string): void {
    const existing = this.usageHistory.get(word);

    if (existing) {
      // Increment count and update timestamp
      existing.count++;
      existing.lastUsed = Date.now();
    } else {
      // Check if at capacity
      if (this.usageHistory.size >= this.maxHistorySize) {
        // Remove oldest entry (by lastUsed timestamp)
        let oldestKey: string | null = null;
        let oldestTime = Date.now();

        for (const [key, entry] of this.usageHistory.entries()) {
          if (entry.lastUsed < oldestTime) {
            oldestTime = entry.lastUsed;
            oldestKey = key;
          }
        }

        if (oldestKey) {
          this.usageHistory.delete(oldestKey);
        }
      }

      // Add new entry
      this.usageHistory.set(word, {
        word,
        count: 1,
        lastUsed: Date.now(),
      });
    }

    // Save to storage
    this.saveToStorage();
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    totalWords: number;
    totalUsages: number;
    topWords: Array<{ word: string; count: number }>;
  } {
    const entries = Array.from(this.usageHistory.values());

    const totalUsages = entries.reduce((sum, entry) => sum + entry.count, 0);

    const topWords = entries
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((entry) => ({
        word: entry.word,
        count: entry.count,
      }));

    return {
      totalWords: this.usageHistory.size,
      totalUsages,
      topWords,
    };
  }

  /**
   * Clear usage history
   */
  clearHistory(): void {
    this.usageHistory.clear();
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error("Failed to clear usage history:", error);
    }
  }

  /**
   * Export history to JSON
   */
  exportHistory(): string {
    const data = Array.from(this.usageHistory.entries()).map(
      ([word, entry]) => ({
        word,
        count: entry.count,
        lastUsed: new Date(entry.lastUsed).toISOString(),
      }),
    );
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import history from JSON
   */
  importHistory(json: string): void {
    try {
      const data = JSON.parse(json);

      if (!Array.isArray(data)) {
        throw new Error("Invalid format: expected array");
      }

      this.usageHistory.clear();

      for (const item of data) {
        if (item.word && typeof item.count === "number") {
          this.usageHistory.set(item.word, {
            word: item.word,
            count: item.count,
            lastUsed: item.lastUsed
              ? new Date(item.lastUsed).getTime()
              : Date.now(),
          });
        }
      }

      this.saveToStorage();
    } catch (error) {
      console.error("Failed to import history:", error);
      throw error;
    }
  }

  /**
   * Load history from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.usageHistory = new Map(
          data.map((entry: UsageEntry) => [entry.word, entry]),
        );
      }
    } catch (error) {
      console.error("Failed to load usage history:", error);
      this.usageHistory = new Map();
    }
  }

  /**
   * Save history to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.usageHistory.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save usage history:", error);
    }
  }
}
