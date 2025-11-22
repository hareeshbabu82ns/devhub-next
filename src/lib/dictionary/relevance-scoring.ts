/**
 * Relevance Scoring Utility
 * Calculates relevance scores (0-100 range) for dictionary search results
 * with support for prefix matching, exact matching, and diacritic-aware comparison
 */

import { normalizeForComparison, detectScript, Script } from './highlight-utils';

/**
 * Relevance score breakdown for debugging and optimization
 */
export interface RelevanceScoreBreakdown {
  totalScore: number; // 0-100
  textScore: number; // MongoDB textScore or custom score
  exactMatchBonus: number; // +50 for exact match
  prefixMatchBonus: number; // +30 for prefix match
  positionBonus: number; // +10 for early position in text
  lengthPenalty: number; // -5 for very long words
  scriptBonus: number; // +5 for native script matches
}

/**
 * Search match context
 */
export interface SearchMatchContext {
  searchTerm: string;
  word: string;
  description?: string;
  phonetic?: string;
  wordIndex?: number;
  totalWords?: number;
  mongoTextScore?: number; // MongoDB full-text search score
}

/**
 * Calculate relevance score for a dictionary entry
 * Returns score in 0-100 range
 */
export function calculateRelevanceScore(
  context: SearchMatchContext
): RelevanceScoreBreakdown {
  const breakdown: RelevanceScoreBreakdown = {
    totalScore: 0,
    textScore: 0,
    exactMatchBonus: 0,
    prefixMatchBonus: 0,
    positionBonus: 0,
    lengthPenalty: 0,
    scriptBonus: 0,
  };

  const normalizedSearch = normalizeForComparison(context.searchTerm);
  const normalizedWord = normalizeForComparison(context.word);
  const normalizedPhonetic = context.phonetic
    ? normalizeForComparison(context.phonetic)
    : '';

  // Base score from MongoDB textScore (if available) or default base score
  if (context.mongoTextScore !== undefined && context.mongoTextScore > 0) {
    // MongoDB textScore is typically 0.5-2.0, scale to 0-40 range
    breakdown.textScore = Math.min(40, context.mongoTextScore * 20);
  } else {
    // Default base score for non-full-text searches
    breakdown.textScore = 20;
  }

  // Exact match bonus: +50 points (highest priority)
  if (normalizedWord === normalizedSearch || normalizedPhonetic === normalizedSearch) {
    breakdown.exactMatchBonus = 50;
  }
  // Prefix match bonus: +30 points
  else if (
    normalizedWord.startsWith(normalizedSearch) ||
    normalizedPhonetic.startsWith(normalizedSearch)
  ) {
    breakdown.prefixMatchBonus = 30;
  }

  // Position bonus: +10 points for words appearing early in the dictionary
  if (context.wordIndex !== undefined && context.totalWords !== undefined) {
    const position = context.wordIndex / context.totalWords;
    if (position < 0.1) {
      breakdown.positionBonus = 10;
    } else if (position < 0.3) {
      breakdown.positionBonus = 5;
    }
  }

  // Length penalty: -5 points for very long words (may be less relevant)
  const wordLength = context.word.length;
  const searchLength = context.searchTerm.length;
  if (wordLength > searchLength * 3 && wordLength > 20) {
    breakdown.lengthPenalty = -5;
  }

  // Script bonus: +5 points if search term and word are in same script
  const searchScript = detectScript(context.searchTerm);
  const wordScript = detectScript(context.word);
  if (
    searchScript !== Script.UNKNOWN &&
    searchScript !== Script.MIXED &&
    searchScript === wordScript
  ) {
    breakdown.scriptBonus = 5;
  }

  // Calculate total score
  breakdown.totalScore = Math.max(
    0,
    Math.min(
      100,
      breakdown.textScore +
        breakdown.exactMatchBonus +
        breakdown.prefixMatchBonus +
        breakdown.positionBonus +
        breakdown.lengthPenalty +
        breakdown.scriptBonus
    )
  );

  return breakdown;
}

/**
 * Sort results by relevance score (descending)
 */
export function sortByRelevance<T extends { relevanceScore: number }>(
  results: T[]
): T[] {
  return [...results].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Batch calculate relevance scores for multiple results
 */
export function calculateBatchRelevance(
  results: Array<{
    word: string;
    description?: string;
    phonetic?: string;
    wordIndex?: number;
    mongoTextScore?: number;
  }>,
  searchTerm: string
): Array<{ relevanceScore: number; scoreBreakdown: RelevanceScoreBreakdown }> {
  const totalWords = results.length;

  return results.map((result, index) => {
    const scoreBreakdown = calculateRelevanceScore({
      searchTerm,
      word: result.word,
      description: result.description,
      phonetic: result.phonetic,
      wordIndex: result.wordIndex ?? index,
      totalWords,
      mongoTextScore: result.mongoTextScore,
    });

    return {
      relevanceScore: scoreBreakdown.totalScore,
      scoreBreakdown,
    };
  });
}

/**
 * Get relevance category for display purposes
 */
export enum RelevanceCategory {
  EXCELLENT = 'excellent', // 90-100
  GOOD = 'good', // 70-89
  FAIR = 'fair', // 50-69
  POOR = 'poor', // 0-49
}

export function getRelevanceCategory(score: number): RelevanceCategory {
  if (score >= 90) return RelevanceCategory.EXCELLENT;
  if (score >= 70) return RelevanceCategory.GOOD;
  if (score >= 50) return RelevanceCategory.FAIR;
  return RelevanceCategory.POOR;
}

/**
 * Get a human-readable relevance label
 */
export function getRelevanceLabel(score: number): string {
  const category = getRelevanceCategory(score);
  switch (category) {
    case RelevanceCategory.EXCELLENT:
      return 'Highly relevant';
    case RelevanceCategory.GOOD:
      return 'Relevant';
    case RelevanceCategory.FAIR:
      return 'Somewhat relevant';
    case RelevanceCategory.POOR:
      return 'Less relevant';
    default:
      return 'Unknown';
  }
}

/**
 * Boost relevance for specific criteria (e.g., dictionary origin preference)
 */
export function applyBoost(score: number, boostFactor: number): number {
  return Math.min(100, score * boostFactor);
}

/**
 * Filter results by minimum relevance threshold
 */
export function filterByRelevance<T extends { relevanceScore: number }>(
  results: T[],
  minScore = 30
): T[] {
  return results.filter((result) => result.relevanceScore >= minScore);
}
