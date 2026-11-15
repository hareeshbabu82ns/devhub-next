"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  dhatuLookup,
  languageTags,
  maheshvaraSutras,
  phoneticWordSearch,
  pratyaharaVarnas,
  preSegmentedSplits,
  sandhiJoins,
  sandhiSplitPairs,
  sandhiSplits,
  sanscriptDictionaryBrowse,
  sanscriptDictionarySearch,
  sanscriptUtilsVersion,
  sentenceParse,
  transliterateText,
  verseMeter,
} from "@/app/actions/sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { QUERY_STALE_TIME_SHORT } from "@/lib/constants";

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
 * Custom hook for the two-part sandhi decompositions of a single word
 */
export function useSandhiSplitPairs() {
  const mutation = useMutation({
    mutationFn: sandhiSplitPairs,
  });

  return {
    splitPairs: mutation.mutate,
    pairs: mutation.data || [],
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
 * Custom hook for segmenting a sentence whose words are already separated
 */
export function usePreSegmentedSplits() {
  const mutation = useMutation({
    mutationFn: preSegmentedSplits,
  });

  return {
    segment: mutation.mutate,
    segments: mutation.data || [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Custom hook for looking a verbal root up in the dhatupatha
 */
export function useDhatuLookup() {
  const mutation = useMutation({
    mutationFn: dhatuLookup,
  });

  return {
    lookup: mutation.mutate,
    dhatus: mutation.data || [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Custom hook for the sounds a pratyahara stands for
 */
export function usePratyahara() {
  const mutation = useMutation({
    mutationFn: pratyaharaVarnas,
  });

  return {
    expand: mutation.mutate,
    pratyahara: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Custom hook for the guru / laghu pattern of each line of a verse
 */
export function useVerseMeter() {
  const mutation = useMutation({
    mutationFn: verseMeter,
  });

  return {
    scan: mutation.mutate,
    lines: mutation.data || [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * The fourteen Maheshvara sutras in the given script
 */
export function useMaheshvaraSutras(schemeTo: TransliterationScheme) {
  return useQuery({
    queryKey: ["maheshvaraSutras", schemeTo],
    queryFn: () => maheshvaraSutras({ schemeTo }),
    staleTime: Infinity,
    retry: false,
  });
}

/**
 * Custom hook for transliterating through the Sanskrit utils service
 */
export function useServiceTransliterate() {
  const mutation = useMutation({
    mutationFn: transliterateText,
  });

  return {
    transliterate: mutation.mutate,
    result: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Custom hook for finding words by sound
 */
export function usePhoneticWordSearch() {
  const mutation = useMutation({
    mutationFn: phoneticWordSearch,
  });

  return {
    search: mutation.mutate,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Custom hook for searching the service dictionaries
 */
export function useSanscriptDictionarySearch() {
  const mutation = useMutation({
    mutationFn: sanscriptDictionarySearch,
  });

  return {
    search: mutation.mutate,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Custom hook for paging through one service dictionary
 */
export function useSanscriptDictionaryBrowse() {
  const mutation = useMutation({
    mutationFn: sanscriptDictionaryBrowse,
  });

  return {
    browse: mutation.mutate,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Version of the Sanskrit utils service; also tells whether it is reachable
 */
export function useSanscriptUtilsVersion() {
  return useQuery({
    queryKey: ["sanscriptUtilsVersion"],
    queryFn: () => sanscriptUtilsVersion(),
    staleTime: QUERY_STALE_TIME_SHORT,
    retry: false,
  });
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
    staleTime: QUERY_STALE_TIME_SHORT,
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
    staleTime: QUERY_STALE_TIME_SHORT,
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
    staleTime: QUERY_STALE_TIME_SHORT,
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
    staleTime: QUERY_STALE_TIME_SHORT,
  });
}
