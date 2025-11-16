/**
 * Relevance Scoring Tests (T191)
 * Tests for src/lib/dictionary/relevance-scoring.ts
 */

import { 
  calculateRelevanceScore, 
  sortByRelevance,
  calculateBatchRelevance,
  getRelevanceCategory,
  getRelevanceLabel,
  applyBoost,
  filterByRelevance,
  RelevanceCategory 
} from '../relevance-scoring';

describe('Relevance Scoring Utilities', () => {
  describe('calculateRelevanceScore', () => {
    it('should return high score for exact matches', () => {
      const result = calculateRelevanceScore({
        searchTerm: 'namah',
        word: 'namah',
        phonetic: 'namah',
        description: 'salutations',
        mongoTextScore: 1.0,
      });

      // MongoDB textScore of 1.0 * 20 = 20, + exactMatchBonus of 50 = 70+
      expect(result.totalScore).toBeGreaterThanOrEqual(70);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.exactMatchBonus).toBe(50);
    });

    it('should boost prefix matches', () => {
      const prefixResult = calculateRelevanceScore({
        searchTerm: 'nam',
        word: 'namah',
        phonetic: 'namah',
        description: 'salutations',
        mongoTextScore: 0.8,
      });

      const nonPrefixResult = calculateRelevanceScore({
        searchTerm: 'mah',
        word: 'namah',
        phonetic: 'namah',
        description: 'salutations',
        mongoTextScore: 0.8,
      });

      expect(prefixResult.totalScore).toBeGreaterThan(nonPrefixResult.totalScore);
      expect(prefixResult.prefixMatchBonus).toBe(30);
    });

    it('should handle empty query', () => {
      const result = calculateRelevanceScore({
        searchTerm: '',
        word: 'namah',
        phonetic: 'namah',
        description: 'salutations',
        mongoTextScore: 0.5,
      });

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should handle special characters in query', () => {
      const result = calculateRelevanceScore({
        searchTerm: 'om!@#$',
        word: 'om',
        phonetic: 'om',
        description: 'sacred syllable',
        mongoTextScore: 0.7,
      });

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should handle Sanskrit conjuncts correctly', () => {
      const result = calculateRelevanceScore({
        searchTerm: 'श्री',
        word: 'श्रीकृष्ण',
        phonetic: 'śrīkṛṣṇa',
        description: 'Lord Krishna',
        mongoTextScore: 0.9,
      });

      expect(result.totalScore).toBeGreaterThan(50);
    });

    it('should prioritize exact match over non-exact match', () => {
      const exactMatchResult = calculateRelevanceScore({
        searchTerm: 'om',
        word: 'om',
        phonetic: 'om',
        description: 'something else',
        mongoTextScore: 0.8,
      });

      const noMatchResult = calculateRelevanceScore({
        searchTerm: 'om',
        word: 'something',
        phonetic: 'something',
        description: 'om is a sacred syllable',
        mongoTextScore: 0.8,
      });

      expect(exactMatchResult.totalScore).toBeGreaterThan(noMatchResult.totalScore);
      expect(exactMatchResult.exactMatchBonus).toBe(50);
    });

    it('should handle diacritic-aware matching', () => {
      const result = calculateRelevanceScore({
        searchTerm: 'sri',
        word: 'śrī',
        phonetic: 'sri',
        description: 'honorific prefix',
        mongoTextScore: 0.85,
      });

      expect(result.totalScore).toBeGreaterThan(60);
    });

    it('should return consistent scores for same input', () => {
      const context = {
        searchTerm: 'test',
        word: 'testing',
        phonetic: 'testing',
        description: 'a test word',
        mongoTextScore: 0.75,
      };

      const result1 = calculateRelevanceScore(context);
      const result2 = calculateRelevanceScore(context);

      expect(result1.totalScore).toBe(result2.totalScore);
    });

    it('should handle very long query strings', () => {
      const longQuery = 'a'.repeat(1000);
      const result = calculateRelevanceScore({
        searchTerm: longQuery,
        word: 'short',
        phonetic: 'short',
        description: 'a short word',
        mongoTextScore: 0.5,
      });

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should handle unicode characters properly', () => {
      const result = calculateRelevanceScore({
        searchTerm: 'ॐ',
        word: 'ॐ',
        phonetic: 'om',
        description: 'sacred symbol',
        mongoTextScore: 1.0,
      });

      expect(result.totalScore).toBeGreaterThan(70);
      expect(result.exactMatchBonus).toBe(50);
    });

    it('should weight textScore appropriately', () => {
      const highTextScoreResult = calculateRelevanceScore({
        searchTerm: 'test',
        word: 'test',
        phonetic: 'test',
        description: 'test',
        mongoTextScore: 1.0,
      });

      const lowTextScoreResult = calculateRelevanceScore({
        searchTerm: 'test',
        word: 'test',
        phonetic: 'test',
        description: 'test',
        mongoTextScore: 0.1,
      });

      expect(highTextScoreResult.totalScore).toBeGreaterThan(lowTextScoreResult.totalScore);
      expect(highTextScoreResult.textScore).toBeGreaterThan(lowTextScoreResult.textScore);
    });

    it('should handle missing optional fields', () => {
      const result = calculateRelevanceScore({
        searchTerm: 'test',
        word: 'test',
        phonetic: '',
        description: '',
        mongoTextScore: 0.8,
      });

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle null-like values safely', () => {
      const result = calculateRelevanceScore({
        searchTerm: 'test',
        word: 'test',
        phonetic: null as any,
        description: undefined as any,
        mongoTextScore: 0.5,
      });

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should normalize scores to 0-100 range', () => {
      const result = calculateRelevanceScore({
        searchTerm: 'test',
        word: 'test',
        phonetic: 'test',
        description: 'test',
        mongoTextScore: 5.0, // Abnormally high
      });

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should apply length penalty for very long words', () => {
      const shortWordResult = calculateRelevanceScore({
        searchTerm: 'test',
        word: 'test',
        phonetic: 'test',
        description: 'test',
        mongoTextScore: 0.5,
      });

      const longWordResult = calculateRelevanceScore({
        searchTerm: 'test',
        word: 'a'.repeat(100),
        phonetic: 'a'.repeat(100),
        description: 'test',
        mongoTextScore: 0.5,
      });

      expect(longWordResult.lengthPenalty).toBe(-5);
      expect(shortWordResult.lengthPenalty).toBe(0);
    });

    it('should give position bonus to early words', () => {
      const earlyWordResult = calculateRelevanceScore({
        searchTerm: 'test',
        word: 'test',
        phonetic: 'test',
        description: 'test',
        wordIndex: 5,
        totalWords: 1000,
        mongoTextScore: 0.5,
      });

      const lateWordResult = calculateRelevanceScore({
        searchTerm: 'test',
        word: 'test',
        phonetic: 'test',
        description: 'test',
        wordIndex: 900,
        totalWords: 1000,
        mongoTextScore: 0.5,
      });

      expect(earlyWordResult.positionBonus).toBeGreaterThan(lateWordResult.positionBonus);
    });

    it('should give script bonus for same-script matches', () => {
      const sameScriptResult = calculateRelevanceScore({
        searchTerm: 'ॐ',
        word: 'ॐ नमः',
        phonetic: 'om namah',
        description: 'sacred',
        mongoTextScore: 0.8,
      });

      expect(sameScriptResult.scriptBonus).toBe(5);
    });
  });

  describe('Helper functions', () => {
    describe('sortByRelevance', () => {
      it('should sort results by relevance score in descending order', () => {
        const results = [
          { relevanceScore: 50, word: 'test1' },
          { relevanceScore: 90, word: 'test2' },
          { relevanceScore: 70, word: 'test3' },
        ];

        const sorted = sortByRelevance(results);

        expect(sorted[0].relevanceScore).toBe(90);
        expect(sorted[1].relevanceScore).toBe(70);
        expect(sorted[2].relevanceScore).toBe(50);
      });

      it('should not mutate original array', () => {
        const results = [
          { relevanceScore: 50, word: 'test1' },
          { relevanceScore: 90, word: 'test2' },
        ];

        const original = [...results];
        sortByRelevance(results);

        expect(results).toEqual(original);
      });
    });

    describe('getRelevanceCategory', () => {
      it('should return EXCELLENT for scores 90-100', () => {
        expect(getRelevanceCategory(95)).toBe(RelevanceCategory.EXCELLENT);
        expect(getRelevanceCategory(90)).toBe(RelevanceCategory.EXCELLENT);
        expect(getRelevanceCategory(100)).toBe(RelevanceCategory.EXCELLENT);
      });

      it('should return GOOD for scores 70-89', () => {
        expect(getRelevanceCategory(80)).toBe(RelevanceCategory.GOOD);
        expect(getRelevanceCategory(70)).toBe(RelevanceCategory.GOOD);
        expect(getRelevanceCategory(89)).toBe(RelevanceCategory.GOOD);
      });

      it('should return FAIR for scores 50-69', () => {
        expect(getRelevanceCategory(60)).toBe(RelevanceCategory.FAIR);
        expect(getRelevanceCategory(50)).toBe(RelevanceCategory.FAIR);
        expect(getRelevanceCategory(69)).toBe(RelevanceCategory.FAIR);
      });

      it('should return POOR for scores 0-49', () => {
        expect(getRelevanceCategory(30)).toBe(RelevanceCategory.POOR);
        expect(getRelevanceCategory(0)).toBe(RelevanceCategory.POOR);
        expect(getRelevanceCategory(49)).toBe(RelevanceCategory.POOR);
      });
    });

    describe('getRelevanceLabel', () => {
      it('should return appropriate labels for different categories', () => {
        expect(getRelevanceLabel(95)).toBe('Highly relevant');
        expect(getRelevanceLabel(80)).toBe('Relevant');
        expect(getRelevanceLabel(60)).toBe('Somewhat relevant');
        expect(getRelevanceLabel(30)).toBe('Less relevant');
      });
    });

    describe('applyBoost', () => {
      it('should boost scores by given factor', () => {
        expect(applyBoost(50, 1.5)).toBe(75);
        expect(applyBoost(60, 1.2)).toBe(72);
      });

      it('should cap boosted scores at 100', () => {
        expect(applyBoost(80, 2.0)).toBe(100);
        expect(applyBoost(90, 1.5)).toBe(100);
      });
    });

    describe('filterByRelevance', () => {
      it('should filter results by minimum relevance threshold', () => {
        const results = [
          { relevanceScore: 80, word: 'test1' },
          { relevanceScore: 40, word: 'test2' },
          { relevanceScore: 60, word: 'test3' },
          { relevanceScore: 20, word: 'test4' },
        ];

        const filtered = filterByRelevance(results, 50);

        expect(filtered).toHaveLength(2);
        expect(filtered[0].relevanceScore).toBe(80);
        expect(filtered[1].relevanceScore).toBe(60);
      });

      it('should use default threshold of 30', () => {
        const results = [
          { relevanceScore: 80, word: 'test1' },
          { relevanceScore: 20, word: 'test2' },
          { relevanceScore: 40, word: 'test3' },
        ];

        const filtered = filterByRelevance(results);

        expect(filtered).toHaveLength(2);
        expect(filtered.every(r => r.relevanceScore >= 30)).toBe(true);
      });
    });

    describe('calculateBatchRelevance', () => {
      it('should calculate relevance for multiple results', () => {
        const results = [
          { word: 'namah', phonetic: 'namah', description: 'salutations' },
          { word: 'om', phonetic: 'om', description: 'sacred' },
          { word: 'shanti', phonetic: 'shanti', description: 'peace' },
        ];

        const scored = calculateBatchRelevance(results, 'namah');

        expect(scored).toHaveLength(3);
        expect(scored[0].relevanceScore).toBeGreaterThan(scored[1].relevanceScore);
        expect(scored[0].scoreBreakdown).toBeDefined();
        expect(scored[0].scoreBreakdown.totalScore).toBe(scored[0].relevanceScore);
      });

      it('should handle empty results array', () => {
        const scored = calculateBatchRelevance([], 'test');

        expect(scored).toHaveLength(0);
      });
    });
  });
});
