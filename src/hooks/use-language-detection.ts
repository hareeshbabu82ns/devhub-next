/**
 * Hook for Language Detection
 *
 * React hook wrapper for language detection utilities
 */

import { useCallback } from "react";
import {
  detectScript,
  shouldSuggestLanguageChange,
  isLikelyTransliteration,
  type ScriptDetection,
} from "@/lib/sanscript/language-detection";

/**
 * Hook for detecting script and suggesting language changes
 */
export function useLanguageDetection() {
  /**
   * Detect script from text
   */
  const detect = useCallback((text: string): ScriptDetection => {
    return detectScript(text);
  }, []);

  /**
   * Check if language change should be suggested
   */
  const checkSuggestion = useCallback(
    (
      text: string,
      currentLanguage: string,
      confidenceThreshold: number = 0.7,
    ): {
      shouldSuggest: boolean;
      detection?: ScriptDetection;
      message?: string;
    } => {
      return shouldSuggestLanguageChange(
        text,
        currentLanguage,
        confidenceThreshold,
      );
    },
    [],
  );

  /**
   * Check if text is likely transliteration
   */
  const checkTransliteration = useCallback((text: string): boolean => {
    return isLikelyTransliteration(text);
  }, []);

  return {
    detectScript: detect,
    shouldSuggestLanguageChange: checkSuggestion,
    isLikelyTransliteration: checkTransliteration,
  };
}
