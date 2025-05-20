"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  languageTags,
  sandhiJoins,
  sandhiSplits,
  sentenceParse,
} from "@/app/actions/sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";

/**
 * Custom hook for using the Sanskrit Sandhi Splits functionality
 */
export function useSandhiSplits() {
  const mutation = useMutation({
    mutationFn: sandhiSplits,
  });

  return {
    split: mutation.mutate,
    splits: mutation.data || [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Custom hook for using the Sanskrit Sandhi Joins functionality
 */
export function useSandhiJoins() {
  const mutation = useMutation({
    mutationFn: sandhiJoins,
  });

  return {
    join: mutation.mutate,
    joins: mutation.data || [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Custom hook for using the Sanskrit Language Tags functionality
 */
export function useLanguageTags() {
  const mutation = useMutation({
    mutationFn: languageTags,
  });

  return {
    getTags: mutation.mutate,
    tags: mutation.data || [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Custom hook for using the Sanskrit Sentence Parse functionality
 */
export function useSentenceParse() {
  const mutation = useMutation({
    mutationFn: sentenceParse,
  });

  return {
    parse: mutation.mutate,
    parseResults: mutation.data || [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Hook to query Sanskrit splits with pre-defined parameters
 */
export function useSandhiSplitsQuery(
  text: string,
  schemeFrom: TransliterationScheme,
  schemeTo: TransliterationScheme,
  limit = 2,
  options = { enabled: true },
) {
  return useQuery({
    queryKey: ["sandhiSplits", text, schemeFrom, schemeTo, limit],
    queryFn: () => sandhiSplits({ text, schemeFrom, schemeTo, limit }),
    enabled: options.enabled && text.length > 0,
  });
}

/**
 * Hook to query Sanskrit joins with pre-defined parameters
 */
export function useSandhiJoinsQuery(
  words: string[],
  schemeFrom: TransliterationScheme,
  schemeTo: TransliterationScheme,
  options = { enabled: true },
) {
  return useQuery({
    queryKey: ["sandhiJoins", words, schemeFrom, schemeTo],
    queryFn: () => sandhiJoins({ words, schemeFrom, schemeTo }),
    enabled: options.enabled && words.length > 0,
  });
}

/**
 * Hook to query Sanskrit language tags with pre-defined parameters
 */
export function useLanguageTagsQuery(
  text: string,
  schemeFrom: TransliterationScheme,
  schemeTo: TransliterationScheme,
  options = { enabled: true },
) {
  return useQuery({
    queryKey: ["languageTags", text, schemeFrom, schemeTo],
    queryFn: () => languageTags({ text, schemeFrom, schemeTo }),
    enabled: options.enabled && text.length > 0,
  });
}

/**
 * Hook to query Sanskrit sentence parse with pre-defined parameters
 */
export function useSentenceParseQuery(
  text: string,
  schemeFrom: TransliterationScheme,
  schemeTo: TransliterationScheme,
  limit = 2,
  preSegmented = false,
  options = { enabled: true },
) {
  return useQuery({
    queryKey: [
      "sentenceParse",
      text,
      schemeFrom,
      schemeTo,
      limit,
      preSegmented,
    ],
    queryFn: () =>
      sentenceParse({ text, schemeFrom, schemeTo, limit, preSegmented }),
    enabled: options.enabled && text.length > 0,
  });
}
