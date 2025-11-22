/**
 * Language Usage Analytics
 *
 * Privacy-preserving analytics for tracking language usage patterns
 * All data stored locally in localStorage, never sent to server
 */

/**
 * Language usage entry
 */
export interface LanguageUsageEntry {
  language: string;
  count: number;
  lastUsed: Date;
  contexts: Record<string, number>; // e.g., { "dictionary": 10, "entity": 5 }
}

/**
 * Analytics summary
 */
export interface LanguageAnalytics {
  totalSwitches: number;
  mostUsedLanguage?: string;
  recentLanguages: string[];
  usageByLanguage: Record<string, LanguageUsageEntry>;
}

/**
 * Storage key for analytics
 */
const ANALYTICS_STORAGE_KEY = "webime:analytics";

/**
 * Maximum number of language entries to track
 */
const MAX_ENTRIES = 50;

/**
 * Language usage analytics manager
 */
export class LanguageAnalyticsManager {
  private data: LanguageAnalytics;

  constructor() {
    this.data = this.loadFromStorage();
  }

  /**
   * Record a language usage event
   */
  recordUsage(language: string, context?: string): void {
    if (!language || language === "NONE") {
      return;
    }

    this.data.totalSwitches++;

    // Update or create entry
    if (!this.data.usageByLanguage[language]) {
      this.data.usageByLanguage[language] = {
        language,
        count: 0,
        lastUsed: new Date(),
        contexts: {},
      };
    }

    const entry = this.data.usageByLanguage[language];
    entry.count++;
    entry.lastUsed = new Date();

    // Track context if provided
    if (context) {
      entry.contexts[context] = (entry.contexts[context] || 0) + 1;
    }

    // Update recent languages (keep last 10)
    this.data.recentLanguages = this.data.recentLanguages.filter(
      (l) => l !== language,
    );
    this.data.recentLanguages.unshift(language);
    this.data.recentLanguages = this.data.recentLanguages.slice(0, 10);

    // Update most used language
    this.data.mostUsedLanguage = this.findMostUsedLanguage();

    // Enforce max entries
    this.enforceMaxEntries();

    // Save to storage
    this.saveToStorage();
  }

  /**
   * Get usage statistics for a specific language
   */
  getLanguageStats(language: string): LanguageUsageEntry | undefined {
    return this.data.usageByLanguage[language];
  }

  /**
   * Get overall analytics
   */
  getAnalytics(): LanguageAnalytics {
    return { ...this.data };
  }

  /**
   * Get top N most used languages
   */
  getTopLanguages(n: number = 5): LanguageUsageEntry[] {
    return Object.values(this.data.usageByLanguage)
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  /**
   * Get recent languages (excluding specific language)
   */
  getRecentLanguages(exclude?: string, limit: number = 5): string[] {
    return this.data.recentLanguages
      .filter((l) => l !== exclude)
      .slice(0, limit);
  }

  /**
   * Clear all analytics data
   */
  clearAnalytics(): void {
    this.data = {
      totalSwitches: 0,
      recentLanguages: [],
      usageByLanguage: {},
    };
    this.saveToStorage();
  }

  /**
   * Export analytics as JSON
   */
  exportAnalytics(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import analytics from JSON
   */
  importAnalytics(json: string): boolean {
    try {
      const imported = JSON.parse(json);

      // Validate structure
      if (
        typeof imported !== "object" ||
        typeof imported.totalSwitches !== "number" ||
        !Array.isArray(imported.recentLanguages) ||
        typeof imported.usageByLanguage !== "object"
      ) {
        console.error("Invalid analytics data structure");
        return false;
      }

      // Convert date strings back to Date objects
      for (const entry of Object.values(
        imported.usageByLanguage,
      ) as LanguageUsageEntry[]) {
        if (typeof entry.lastUsed === "string") {
          entry.lastUsed = new Date(entry.lastUsed);
        }
      }

      this.data = imported;
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error("Failed to import analytics:", error);
      return false;
    }
  }

  /**
   * Get language usage trend (increase/decrease over time)
   */
  getUsageTrend(
    language: string,
    windowDays: number = 7,
  ): "up" | "down" | "stable" {
    // This is a placeholder - would require time-series data
    // For now, just return 'stable'
    return "stable";
  }

  /**
   * Find most used language
   */
  private findMostUsedLanguage(): string | undefined {
    let maxCount = 0;
    let mostUsed: string | undefined;

    for (const [language, entry] of Object.entries(this.data.usageByLanguage)) {
      if (entry.count > maxCount) {
        maxCount = entry.count;
        mostUsed = language;
      }
    }

    return mostUsed;
  }

  /**
   * Enforce maximum number of tracked entries
   */
  private enforceMaxEntries(): void {
    const entries = Object.values(this.data.usageByLanguage);

    if (entries.length <= MAX_ENTRIES) {
      return;
    }

    // Sort by last used, remove oldest
    entries.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());

    const toKeep = entries.slice(0, MAX_ENTRIES);
    this.data.usageByLanguage = {};

    for (const entry of toKeep) {
      this.data.usageByLanguage[entry.language] = entry;
    }
  }

  /**
   * Load analytics from localStorage
   */
  private loadFromStorage(): LanguageAnalytics {
    if (typeof window === "undefined") {
      return this.getDefaultData();
    }

    try {
      const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);

      if (!stored) {
        return this.getDefaultData();
      }

      const parsed = JSON.parse(stored);

      // Convert date strings back to Date objects
      for (const entry of Object.values(
        parsed.usageByLanguage || {},
      ) as LanguageUsageEntry[]) {
        if (typeof entry.lastUsed === "string") {
          entry.lastUsed = new Date(entry.lastUsed);
        }
      }

      return {
        totalSwitches: parsed.totalSwitches || 0,
        mostUsedLanguage: parsed.mostUsedLanguage,
        recentLanguages: parsed.recentLanguages || [],
        usageByLanguage: parsed.usageByLanguage || {},
      };
    } catch (error) {
      console.error("Failed to load analytics from storage:", error);
      return this.getDefaultData();
    }
  }

  /**
   * Save analytics to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error("Failed to save analytics to storage:", error);
    }
  }

  /**
   * Get default analytics data
   */
  private getDefaultData(): LanguageAnalytics {
    return {
      totalSwitches: 0,
      recentLanguages: [],
      usageByLanguage: {},
    };
  }
}

/**
 * Singleton instance
 */
let analyticsInstance: LanguageAnalyticsManager | null = null;

/**
 * Get analytics manager instance
 */
export function getAnalyticsManager(): LanguageAnalyticsManager {
  if (!analyticsInstance) {
    analyticsInstance = new LanguageAnalyticsManager();
  }
  return analyticsInstance;
}
