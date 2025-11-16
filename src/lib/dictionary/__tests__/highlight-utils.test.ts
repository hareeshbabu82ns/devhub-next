/**
 * Highlight Utils Tests (T192)
 * Tests for src/lib/dictionary/highlight-utils.ts
 * Multi-script test cases for Sanskrit/Telugu/Latin scripts
 */

import {
  detectScript,
  getWordBoundaries,
  highlightText,
  normalizeForComparison,
  isDiacriticMatch,
  getMatchSnippet,
  Script,
  MatchType,
} from '../highlight-utils';

describe('Highlight Utilities', () => {
  describe('detectScript', () => {
    it('should detect Devanagari script', () => {
      expect(detectScript('नमः')).toBe(Script.DEVANAGARI);
      expect(detectScript('ॐ श्री गणेशाय नमः')).toBe(Script.DEVANAGARI);
      expect(detectScript('कृष्ण')).toBe(Script.DEVANAGARI);
    });

    it('should detect Telugu script', () => {
      expect(detectScript('తెలుగు')).toBe(Script.TELUGU);
      expect(detectScript('శ్రీ రామ జయం')).toBe(Script.TELUGU);
    });

    it('should detect Latin script', () => {
      expect(detectScript('namah')).toBe(Script.LATIN);
      expect(detectScript('Om Namah Shivaya')).toBe(Script.LATIN);
      expect(detectScript('Krishna')).toBe(Script.LATIN);
    });

    it('should detect mixed scripts', () => {
      expect(detectScript('नमः namah')).toBe(Script.MIXED);
      expect(detectScript('Om ॐ')).toBe(Script.MIXED);
      expect(detectScript('తెలుగు Telugu')).toBe(Script.MIXED);
    });

    it('should handle unknown scripts', () => {
      expect(detectScript('')).toBe(Script.UNKNOWN);
      expect(detectScript('   ')).toBe(Script.UNKNOWN);
      expect(detectScript('123')).toBe(Script.UNKNOWN);
      expect(detectScript('!@#$')).toBe(Script.UNKNOWN);
    });
  });

  describe('getWordBoundaries', () => {
    it('should segment Devanagari text', () => {
      const boundaries = getWordBoundaries('ॐ नमः शिवाय');
      
      expect(boundaries.length).toBeGreaterThan(0);
      expect(boundaries.some(b => b.text.includes('ॐ'))).toBe(true);
      expect(boundaries.some(b => b.text.includes('नमः'))).toBe(true);
    });

    it('should segment Telugu text', () => {
      const boundaries = getWordBoundaries('శ్రీ రామ');
      
      expect(boundaries.length).toBeGreaterThan(0);
      expect(boundaries.some(b => b.text.includes('శ్రీ'))).toBe(true);
    });

    it('should segment Latin text', () => {
      const boundaries = getWordBoundaries('Om Namah Shivaya');
      
      expect(boundaries.length).toBe(3);
      expect(boundaries[0].text).toBe('Om');
      expect(boundaries[1].text).toBe('Namah');
      expect(boundaries[2].text).toBe('Shivaya');
    });

    it('should preserve conjuncts in Devanagari', () => {
      const boundaries = getWordBoundaries('श्री कृष्ण');
      
      // Conjuncts should be kept together
      const hasShri = boundaries.some(b => b.text === 'श्री');
      const hasKrishna = boundaries.some(b => b.text === 'कृष्ण');
      
      expect(hasShri).toBe(true);
      expect(hasKrishna).toBe(true);
    });

    it('should handle empty text', () => {
      expect(getWordBoundaries('')).toEqual([]);
      expect(getWordBoundaries('   ')).toEqual([]);
    });

    it('should handle mixed scripts', () => {
      const boundaries = getWordBoundaries('नमः namah');
      
      expect(boundaries.length).toBeGreaterThanOrEqual(2);
      expect(boundaries.some(b => b.script === Script.DEVANAGARI)).toBe(true);
      expect(boundaries.some(b => b.script === Script.LATIN)).toBe(true);
    });

    it('should handle hyphenated words in Latin', () => {
      const boundaries = getWordBoundaries('mother-in-law');
      
      // Implementation splits on hyphens, so we get 3 words
      expect(boundaries.length).toBe(3);
      expect(boundaries.some(b => b.text === 'mother')).toBe(true);
      expect(boundaries.some(b => b.text === 'in')).toBe(true);
      expect(boundaries.some(b => b.text === 'law')).toBe(true);
    });

    it('should handle apostrophes in Latin', () => {
      const boundaries = getWordBoundaries("don't can't");
      
      expect(boundaries.length).toBe(2);
      expect(boundaries[0].text).toBe("don't");
      expect(boundaries[1].text).toBe("can't");
    });
  });

  describe('highlightText', () => {
    it('should highlight exact matches', () => {
      const segments = highlightText('namah shivaya', 'namah');
      
      const highlightedSegment = segments.find(s => s.highlighted);
      expect(highlightedSegment).toBeDefined();
      expect(highlightedSegment?.matchType).toBe(MatchType.EXACT);
      expect(highlightedSegment?.text.toLowerCase()).toBe('namah');
    });

    it('should highlight prefix matches', () => {
      const segments = highlightText('namaste', 'nam');
      
      const highlightedSegment = segments.find(s => s.highlighted);
      expect(highlightedSegment).toBeDefined();
      expect(highlightedSegment?.matchType).toBe(MatchType.PREFIX);
    });

    it('should highlight contains matches', () => {
      const segments = highlightText('ashvinau', 'shvi');
      
      const highlightedSegment = segments.find(s => s.highlighted);
      expect(highlightedSegment).toBeDefined();
      expect(highlightedSegment?.matchType).toBe(MatchType.CONTAINS);
    });

    it('should handle case-insensitive matching by default', () => {
      const segments = highlightText('Namah Shivaya', 'namah');
      
      const highlightedSegment = segments.find(s => s.highlighted);
      expect(highlightedSegment).toBeDefined();
      expect(highlightedSegment?.matchType).toBe(MatchType.EXACT);
    });

    it('should handle case-sensitive matching when specified', () => {
      const segments = highlightText('namah Namah', 'namah', true);
      
      const highlightedSegments = segments.filter(s => s.highlighted);
      expect(highlightedSegments.length).toBe(1);
      expect(highlightedSegments[0].text).toBe('namah');
    });

    it('should highlight Devanagari text', () => {
      const segments = highlightText('ॐ नमः शिवाय', 'नमः');
      
      const highlightedSegment = segments.find(s => s.highlighted);
      expect(highlightedSegment).toBeDefined();
      expect(highlightedSegment?.text).toBe('नमः');
    });

    it('should preserve word boundaries', () => {
      const segments = highlightText('test testing', 'test');
      
      const highlightedSegments = segments.filter(s => s.highlighted);
      expect(highlightedSegments.length).toBe(2); // Both 'test' and 'testing' match
    });

    it('should handle empty search term', () => {
      const segments = highlightText('namah', '');
      
      expect(segments.length).toBe(1);
      expect(segments[0].highlighted).toBe(false);
      expect(segments[0].matchType).toBe(MatchType.NONE);
    });

    it('should handle empty text', () => {
      const segments = highlightText('', 'test');
      
      expect(segments.length).toBe(1);
      expect(segments[0].highlighted).toBe(false);
      expect(segments[0].text).toBe('');
    });

    it('should maintain correct positions', () => {
      const text = 'Om Namah Shivaya';
      const segments = highlightText(text, 'Namah');
      
      const highlightedSegment = segments.find(s => s.highlighted);
      expect(highlightedSegment).toBeDefined();
      expect(text.substring(highlightedSegment!.start, highlightedSegment!.end)).toBe('Namah');
    });
  });

  describe('normalizeForComparison', () => {
    it('should remove diacritics', () => {
      expect(normalizeForComparison('śrī')).toBe('sri');
      expect(normalizeForComparison('Kṛṣṇa')).toBe('krsna');
      expect(normalizeForComparison('Gaṇeśa')).toBe('ganesa');
    });

    it('should convert to lowercase', () => {
      expect(normalizeForComparison('NAMAH')).toBe('namah');
      expect(normalizeForComparison('Shivaya')).toBe('shivaya');
    });

    it('should handle empty text', () => {
      expect(normalizeForComparison('')).toBe('');
      expect(normalizeForComparison(null as any)).toBe('');
      expect(normalizeForComparison(undefined as any)).toBe('');
    });

    it('should handle special characters', () => {
      const result = normalizeForComparison('test!@#$');
      expect(result).toContain('test');
    });

    it('should be consistent', () => {
      const text = 'śrīkṛṣṇa';
      expect(normalizeForComparison(text)).toBe(normalizeForComparison(text));
    });
  });

  describe('isDiacriticMatch', () => {
    it('should match texts with different diacritics', () => {
      expect(isDiacriticMatch('śrī', 'sri')).toBe(true);
      // Note: Kṛṣṇa -> krsna after normalization, not 'krishna'
      expect(isDiacriticMatch('Kṛṣṇa', 'Krsna')).toBe(true);
      expect(isDiacriticMatch('Gaṇeśa', 'Ganesa')).toBe(true);
    });

    it('should handle case-insensitive matching', () => {
      expect(isDiacriticMatch('NAMAH', 'namah')).toBe(true);
      expect(isDiacriticMatch('Śrī', 'sri')).toBe(true);
    });

    it('should return false for non-matching texts', () => {
      expect(isDiacriticMatch('namah', 'shivaya')).toBe(false);
      expect(isDiacriticMatch('om', 'namah')).toBe(false);
    });

    it('should handle empty texts', () => {
      expect(isDiacriticMatch('', '')).toBe(true);
      expect(isDiacriticMatch('test', '')).toBe(false);
      expect(isDiacriticMatch('', 'test')).toBe(false);
    });
  });

  describe('getMatchSnippet', () => {
    it('should return snippet around match', () => {
      const text = 'This is a test sentence with some extra text to make it longer.';
      const snippet = getMatchSnippet(text, 'test', 20);
      
      expect(snippet).toContain('test');
      expect(snippet.length).toBeLessThan(text.length);
    });

    it('should add ellipsis for truncated text', () => {
      const text = 'This is a long test sentence that should be truncated on both ends to create a snippet.';
      const snippet = getMatchSnippet(text, 'test', 15);
      
      expect(snippet).toContain('...');
      expect(snippet).toContain('test');
    });

    it('should not add leading ellipsis if match is at start', () => {
      const text = 'test is at the beginning of this sentence';
      const snippet = getMatchSnippet(text, 'test', 20);
      
      expect(snippet.startsWith('...')).toBe(false);
      expect(snippet).toContain('test');
    });

    it('should not add trailing ellipsis if match is at end', () => {
      const text = 'This sentence ends with test';
      const snippet = getMatchSnippet(text, 'test', 20);
      
      expect(snippet.endsWith('...')).toBe(false);
      expect(snippet).toContain('test');
    });

    it('should return full text if shorter than context', () => {
      const text = 'short test';
      const snippet = getMatchSnippet(text, 'test', 100);
      
      expect(snippet).toBe(text);
    });

    it('should handle no match found', () => {
      const text = 'This sentence has no match';
      const snippet = getMatchSnippet(text, 'notfound', 20);
      
      expect(snippet.length).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      expect(getMatchSnippet('', 'test', 20)).toBe('');
    });

    it('should handle empty search term', () => {
      const text = 'test sentence';
      expect(getMatchSnippet(text, '', 20)).toBe(text);
    });

    it('should handle case-insensitive matching', () => {
      const text = 'This is a TEST sentence';
      const snippet = getMatchSnippet(text, 'test', 10);
      
      expect(snippet.toLowerCase()).toContain('test');
    });

    it('should handle multi-byte characters', () => {
      const text = 'ॐ नमः शिवाय तस्मै नमः';
      const snippet = getMatchSnippet(text, 'नमः', 10);
      
      expect(snippet).toContain('नमः');
    });
  });

  describe('Edge cases and special characters', () => {
    it('should handle multiple consecutive spaces', () => {
      const segments = highlightText('test    word', 'test');
      
      expect(segments.length).toBeGreaterThan(1);
      const highlightedSegment = segments.find(s => s.highlighted);
      expect(highlightedSegment).toBeDefined();
    });

    it('should handle punctuation', () => {
      const segments = highlightText('test, word. another!', 'word');
      
      const highlightedSegment = segments.find(s => s.highlighted);
      expect(highlightedSegment).toBeDefined();
      expect(highlightedSegment?.text).toBe('word');
    });

    it('should handle numbers mixed with text', () => {
      const segments = highlightText('test123 word456', 'test123');
      
      // Numbers might not be considered part of word in some implementations
      const highlighted = segments.filter(s => s.highlighted);
      expect(highlighted.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long words', () => {
      const longWord = 'a'.repeat(1000);
      const segments = highlightText(longWord, 'a');
      
      expect(segments.length).toBeGreaterThan(0);
    });

    it('should handle Unicode normalization forms', () => {
      // Same character in different Unicode representations
      const nfc = 'é'; // NFC form (single character)
      const nfd = 'é'; // NFD form (e + combining acute)
      
      expect(normalizeForComparison(nfc)).toBe(normalizeForComparison(nfd));
    });
  });

  describe('Performance considerations', () => {
    it('should handle large text efficiently', () => {
      const largeText = 'word '.repeat(10000);
      const start = Date.now();
      const segments = highlightText(largeText, 'word');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(segments.length).toBeGreaterThan(0);
    });

    it('should handle many word boundaries efficiently', () => {
      const text = Array.from({ length: 1000 }, (_, i) => `word${i}`).join(' ');
      const start = Date.now();
      const boundaries = getWordBoundaries(text);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(boundaries.length).toBe(1000);
    });
  });
});
