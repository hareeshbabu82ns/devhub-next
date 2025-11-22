/**
 * Language Detection Utilities
 *
 * Smart language detection for WebIME input to suggest switching languages
 * when user types in a different script than the selected language
 */

import { LANGUAGE_TO_TRANSLITERATION_DDLB } from "@/app/(app)/sanscript/_components/utils";

/**
 * Script detection result
 */
export interface ScriptDetection {
  detectedScript: string;
  confidence: number; // 0-1
  suggestedLanguage?: string;
}

/**
 * Detect the script/alphabet of the input text
 */
export function detectScript(text: string): ScriptDetection {
  if (!text || text.trim().length === 0) {
    return { detectedScript: "unknown", confidence: 0 };
  }

  // Character ranges for different scripts
  const scriptRanges: Record<string, RegExp> = {
    devanagari: /[\u0900-\u097F]/,
    telugu: /[\u0C00-\u0C7F]/,
    tamil: /[\u0B80-\u0BFF]/,
    malayalam: /[\u0D00-\u0D7F]/,
    kannada: /[\u0C80-\u0CFF]/,
    gujarati: /[\u0A80-\u0AFF]/,
    bengali: /[\u0980-\u09FF]/,
    latin: /[A-Za-z]/,
  };

  // Count characters per script
  const scriptCounts: Record<string, number> = {};
  let totalChars = 0;

  for (const char of text) {
    // Skip whitespace and punctuation
    if (/\s|[.,;:!?]/.test(char)) {
      continue;
    }

    totalChars++;

    for (const [script, regex] of Object.entries(scriptRanges)) {
      if (regex.test(char)) {
        scriptCounts[script] = (scriptCounts[script] || 0) + 1;
        break;
      }
    }
  }

  if (totalChars === 0) {
    return { detectedScript: "unknown", confidence: 0 };
  }

  // Find dominant script
  let maxCount = 0;
  let detectedScript = "unknown";

  for (const [script, count] of Object.entries(scriptCounts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedScript = script;
    }
  }

  const confidence = maxCount / totalChars;

  // Map detected script to language code
  const suggestedLanguage = getSuggestedLanguage(detectedScript);

  return {
    detectedScript,
    confidence,
    suggestedLanguage,
  };
}

/**
 * Map detected script to WebIME language code
 */
function getSuggestedLanguage(script: string): string | undefined {
  const scriptToLanguage: Record<string, string> = {
    devanagari: "SAN", // Sanskrit
    telugu: "TEL",
    tamil: "TAM",
    malayalam: "MAL",
    kannada: "KAN",
    gujarati: "GUJ",
    bengali: "BEN",
    latin: "NONE", // Latin script - could be ITRANS or English
  };

  return scriptToLanguage[script];
}

/**
 * Check if current language selection matches the detected script
 */
export function shouldSuggestLanguageChange(
  text: string,
  currentLanguage: string,
  confidenceThreshold: number = 0.7,
): {
  shouldSuggest: boolean;
  detection?: ScriptDetection;
  message?: string;
} {
  const detection = detectScript(text);

  // Don't suggest if confidence is too low
  if (detection.confidence < confidenceThreshold) {
    return { shouldSuggest: false };
  }

  // Don't suggest if no language mapping found
  if (!detection.suggestedLanguage) {
    return { shouldSuggest: false };
  }

  // Don't suggest if already using the detected language
  if (detection.suggestedLanguage === currentLanguage) {
    return { shouldSuggest: false };
  }

  // Check if current language's output scheme matches detected script
  const currentScheme =
    LANGUAGE_TO_TRANSLITERATION_DDLB[currentLanguage]?.scheme;

  // For example, if typing Devanagari but selected ITRANS
  const scriptToScheme: Record<string, string> = {
    devanagari: "devanagari",
    telugu: "telugu",
    tamil: "tamil",
    malayalam: "malayalam",
    kannada: "kannada",
    gujarati: "gujarati",
    bengali: "bengali",
  };

  const detectedScheme = scriptToScheme[detection.detectedScript];

  if (detectedScheme && currentScheme !== detectedScheme) {
    const languageLabel =
      LANGUAGE_TO_TRANSLITERATION_DDLB[detection.suggestedLanguage]?.label;

    return {
      shouldSuggest: true,
      detection,
      message: `You're typing in ${detection.detectedScript} script. Switch to ${languageLabel}?`,
    };
  }

  return { shouldSuggest: false };
}

/**
 * Detect if text is likely transliteration (e.g., ITRANS) vs native script
 */
export function isLikelyTransliteration(text: string): boolean {
  // Check for common transliteration patterns
  const transliterationPatterns = [
    /[aeiou][mhntrl]{2,}/, // Double consonants (e.g., namah, shri)
    /[A-Z][a-z]+[A-Z]/, // CamelCase (e.g., namah, shivAya)
    /~/, // Tilde for nasalization
    /\^/, // Caret for long vowels
  ];

  return transliterationPatterns.some((pattern) => pattern.test(text));
}
