/**
 * Word Boundary Detection and Text Highlighting Utilities
 * Handles Sanskrit/Telugu/Latin script word boundaries while preserving ligatures
 * and complex character combinations in Indic scripts.
 */

/**
 * Script detection based on Unicode ranges
 */
export enum Script {
  DEVANAGARI = 'devanagari',
  TELUGU = 'telugu',
  LATIN = 'latin',
  MIXED = 'mixed',
  UNKNOWN = 'unknown',
}

/**
 * Detect the script of a given text based on Unicode character ranges
 */
export function detectScript(text: string): Script {
  if (!text || text.trim().length === 0) return Script.UNKNOWN;

  const devanagariRange = /[\u0900-\u097F]/;
  const teluguRange = /[\u0C00-\u0C7F]/;
  const latinRange = /[A-Za-z]/;

  const hasDevanagari = devanagariRange.test(text);
  const hasTelugu = teluguRange.test(text);
  const hasLatin = latinRange.test(text);

  const scriptCount = [hasDevanagari, hasTelugu, hasLatin].filter(Boolean).length;

  if (scriptCount > 1) return Script.MIXED;
  if (hasDevanagari) return Script.DEVANAGARI;
  if (hasTelugu) return Script.TELUGU;
  if (hasLatin) return Script.LATIN;

  return Script.UNKNOWN;
}

/**
 * Word boundary interface for consistent word segmentation
 */
export interface WordBoundary {
  text: string;
  start: number;
  end: number;
  script: Script;
}

/**
 * Segment text into word boundaries using Intl.Segmenter (if available)
 * or fallback to regex-based segmentation for Indic scripts
 */
export function getWordBoundaries(text: string): WordBoundary[] {
  if (!text) return [];

  const script = detectScript(text);
  const boundaries: WordBoundary[] = [];

  // Use Intl.Segmenter if available (modern browsers)
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
      const segments = segmenter.segment(text);

      for (const segment of segments) {
        if (segment.isWordLike) {
          boundaries.push({
            text: segment.segment,
            start: segment.index,
            end: segment.index + segment.segment.length,
            script: detectScript(segment.segment),
          });
        }
      }

      return boundaries;
    } catch (e) {
      // Fallback if Intl.Segmenter fails
    }
  }

  // Fallback: regex-based word boundary detection
  return getWordBoundariesFallback(text, script);
}

/**
 * Fallback word boundary detection using regex patterns
 * Handles Devanagari, Telugu, and Latin scripts
 */
function getWordBoundariesFallback(text: string, script: Script): WordBoundary[] {
  const boundaries: WordBoundary[] = [];

  // Different patterns for different scripts
  let pattern: RegExp;

  if (script === Script.DEVANAGARI) {
    // Devanagari word pattern: includes base characters, vowel signs, and combining marks
    pattern = /[\u0900-\u097F]+/g;
  } else if (script === Script.TELUGU) {
    // Telugu word pattern: includes base characters, vowel signs, and combining marks
    pattern = /[\u0C00-\u0C7F]+/g;
  } else if (script === Script.LATIN) {
    // Latin word pattern: standard alphanumeric words
    pattern = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;
  } else {
    // Mixed or unknown: use a combination
    pattern = /[\u0900-\u097F]+|[\u0C00-\u0C7F]+|[A-Za-z]+(?:['-][A-Za-z]+)*/g;
  }

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    boundaries.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      script: detectScript(match[0]),
    });
  }

  return boundaries;
}

/**
 * Match type for highlighting
 */
export enum MatchType {
  EXACT = 'exact',
  PREFIX = 'prefix',
  CONTAINS = 'contains',
  NONE = 'none',
}

/**
 * Text segment with highlighting information
 */
export interface HighlightSegment {
  text: string;
  highlighted: boolean;
  matchType: MatchType;
  start: number;
  end: number;
}

/**
 * Highlight matching words in text, preserving script boundaries
 * Returns segments with highlighting information
 */
export function highlightText(
  text: string,
  searchTerm: string,
  caseSensitive = false
): HighlightSegment[] {
  if (!text || !searchTerm) {
    return [
      {
        text,
        highlighted: false,
        matchType: MatchType.NONE,
        start: 0,
        end: text.length,
      },
    ];
  }

  const segments: HighlightSegment[] = [];
  const boundaries = getWordBoundaries(text);
  const normalizedSearchTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  let lastEnd = 0;

  for (const boundary of boundaries) {
    // Add non-word text before this boundary
    if (boundary.start > lastEnd) {
      segments.push({
        text: text.substring(lastEnd, boundary.start),
        highlighted: false,
        matchType: MatchType.NONE,
        start: lastEnd,
        end: boundary.start,
      });
    }

    // Check if this word matches the search term
    const wordText = caseSensitive ? boundary.text : boundary.text.toLowerCase();
    let matchType = MatchType.NONE;
    let highlighted = false;

    if (wordText === normalizedSearchTerm) {
      matchType = MatchType.EXACT;
      highlighted = true;
    } else if (wordText.startsWith(normalizedSearchTerm)) {
      matchType = MatchType.PREFIX;
      highlighted = true;
    } else if (wordText.includes(normalizedSearchTerm)) {
      matchType = MatchType.CONTAINS;
      highlighted = true;
    }

    segments.push({
      text: boundary.text,
      highlighted,
      matchType,
      start: boundary.start,
      end: boundary.end,
    });

    lastEnd = boundary.end;
  }

  // Add remaining text
  if (lastEnd < text.length) {
    segments.push({
      text: text.substring(lastEnd),
      highlighted: false,
      matchType: MatchType.NONE,
      start: lastEnd,
      end: text.length,
    });
  }

  return segments;
}

/**
 * Normalize text for comparison (remove diacritics, case-insensitive)
 * Useful for diacritic-aware matching
 */
export function normalizeForComparison(text: string): string {
  if (!text) return '';

  // Remove diacritics using NFD normalization
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .toLowerCase();
}

/**
 * Compare two texts with diacritic awareness
 */
export function isDiacriticMatch(text1: string, text2: string): boolean {
  return normalizeForComparison(text1) === normalizeForComparison(text2);
}

/**
 * Get a text snippet around a match for preview
 */
export function getMatchSnippet(
  text: string,
  searchTerm: string,
  contextLength = 50
): string {
  if (!text || !searchTerm) return text;

  const normalizedText = text.toLowerCase();
  const normalizedSearch = searchTerm.toLowerCase();
  const matchIndex = normalizedText.indexOf(normalizedSearch);

  if (matchIndex === -1) return text.substring(0, contextLength * 2);

  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + searchTerm.length + contextLength);

  let snippet = text.substring(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}
