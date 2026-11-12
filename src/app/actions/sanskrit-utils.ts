"use server";

import {
  LanguageTag,
  PhoneticWordResults,
  SANSCRIPT_DICTIONARIES,
  SanscriptDictionaryItem,
  SanscriptDictionaryResults,
  SentenceParseResult,
  TransliterationScheme,
} from "@/types/sanscript";
import { z } from "zod";

// Environment variable for the GraphQL endpoint
const SANSCRIPT_UTILS_URL = process.env.SANSCRIPT_UTILS_URL;

/**
 * Function to make GraphQL requests to the Sanskrit utils API
 */
async function fetchGraphQL<T>(
  query: string,
  variables: Record<string, any> = {},
): Promise<T> {
  if (!SANSCRIPT_UTILS_URL) {
    throw new Error("SANSCRIPT_UTILS_URL environment variable is not defined");
  }

  try {
    const response = await fetch(SANSCRIPT_UTILS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      // Ensure server-side fetch respects the next.js cache behavior
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(
        `GraphQL error: ${result.errors.map((e: any) => e.message).join(", ")}`,
      );
    }

    return result.data;
  } catch (error) {
    console.error("Error fetching from Sanskrit Utils API:", error);
    throw new Error(
      `Failed to fetch from Sanskrit Utils API: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/** Run a query and re-throw failures with a message naming the operation */
async function runQuery<T>(
  operation: string,
  query: string,
  variables: Record<string, any>,
): Promise<T> {
  try {
    return await fetchGraphQL<T>(query, variables);
  } catch (error) {
    console.error(`Error in ${operation}:`, error);
    throw new Error(
      `Failed to ${operation}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Validation schemas for input parameters
const scheme = z.nativeEnum(TransliterationScheme);
const ioSchemes = {
  schemeFrom: scheme,
  schemeTo: scheme,
  /**
   * Strict input/output handling of the underlying sanskrit_parser. Left
   * unset the service uses its own default; strict mode rejects some inputs.
   */
  strictIO: z.boolean().optional(),
};

const sandhiSplitsSchema = z.object({
  text: z.string().min(1, "Text is required"),
  ...ioSchemes,
  limit: z.number().optional().default(2),
});

const sandhiJoinsSchema = z.object({
  words: z.array(z.string()).min(1, "At least one word is required"),
  ...ioSchemes,
});

const languageTagsSchema = z.object({
  text: z.string().min(1, "Text is required"),
  ...ioSchemes,
});

const sentenceParseSchema = z.object({
  text: z.string().min(1, "Text is required"),
  ...ioSchemes,
  limit: z.number().optional().default(2),
  preSegmented: z.boolean().optional().default(false),
});

const preSegmentedSchema = z.object({
  text: z.string().min(1, "Text is required"),
  ...ioSchemes,
  limit: z.number().optional().default(2),
});

const transliterateSchema = z.object({
  text: z.string().min(1, "Text is required"),
  schemeFrom: scheme,
  schemeTo: scheme,
});

const paging = {
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
};

const phoneticWordSearchSchema = z.object({
  search: z.string().min(1, "Search text is required"),
  searchScheme: scheme.optional(),
  outputScheme: scheme.optional(),
  caseInsensitive: z.boolean().optional(),
  startsWith: z.boolean().optional(),
  endsWith: z.boolean().optional(),
  ...paging,
});

const dictionary = z.enum(SANSCRIPT_DICTIONARIES);

const dictionarySearchSchema = z.object({
  search: z.string().min(1, "Search text is required"),
  searchScheme: scheme.optional(),
  outputScheme: scheme.optional(),
  origin: z.array(dictionary).optional(),
  fuzzySearch: z.boolean().optional(),
  searchOnlyKeys: z.boolean().optional(),
  caseInsensitive: z.boolean().optional(),
  startsWith: z.boolean().optional(),
  endsWith: z.boolean().optional(),
  ...paging,
});

const dictionaryBrowseSchema = z.object({
  origin: dictionary,
  outputScheme: scheme.optional(),
  ...paging,
});

const dictionaryItemSchema = z.object({
  id: z.string().min(1, "Id is required"),
  outputScheme: scheme.optional(),
});

const DICTIONARY_ITEM_FIELDS = `
  id
  wordIndex
  key
  description
  origin
`;

/**
 * Version of the sanscript-utils service. Doubles as a connectivity check.
 */
export async function sanscriptUtilsVersion(): Promise<string> {
  const data = await runQuery<{ version: string }>(
    "reach the Sanskrit utils service",
    `query Version { version }`,
    {},
  );
  return data.version;
}

/**
 * Split Sanskrit text into its constituent parts using sandhi rules
 *
 * @param params The parameters for sandhi splitting
 * @returns An array of possible splits
 */
export async function sandhiSplits(
  params: z.input<typeof sandhiSplitsSchema>,
): Promise<string[][]> {
  const variables = sandhiSplitsSchema.parse(params);

  const query = `
    query SandhiSplits($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!, $strictIO: Boolean, $limit: Int) {
      splits(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        strictIO: $strictIO
        limit: $limit
      )
    }
  `;

  const data = await runQuery<{ splits: string[][] }>(
    "perform sandhi splits",
    query,
    variables,
  );
  return data.splits;
}

/**
 * Join Sanskrit words using sandhi rules
 *
 * @param params The parameters for sandhi joining
 * @returns An array of possible joined forms
 */
export async function sandhiJoins(
  params: z.input<typeof sandhiJoinsSchema>,
): Promise<string[]> {
  const variables = sandhiJoinsSchema.parse(params);

  const query = `
    query SandhiJoins($words: [String!]!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!, $strictIO: Boolean) {
      joins(
        words: $words
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        strictIO: $strictIO
      )
    }
  `;

  const data = await runQuery<{ joins: string[] }>(
    "perform sandhi joins",
    query,
    variables,
  );
  return data.joins;
}

/**
 * Get language tags for Sanskrit text
 *
 * @param params The parameters for language tagging
 * @returns An array of words with their associated tags
 */
export async function languageTags(
  params: z.input<typeof languageTagsSchema>,
): Promise<LanguageTag[]> {
  const variables = languageTagsSchema.parse(params);

  const query = `
    query LanguageTags($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!, $strictIO: Boolean) {
      tags(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        strictIO: $strictIO
      ) {
        word
        tags
      }
    }
  `;

  const data = await runQuery<{ tags: LanguageTag[] }>(
    "get language tags",
    query,
    variables,
  );
  return data.tags;
}

/**
 * Parse a Sanskrit sentence into its constituent parts
 *
 * @param params The parameters for sentence parsing
 * @returns Detailed analysis of the sentence structure, plus Graphviz
 *   sources / image links of the split lattice and of every parse
 */
export async function sentenceParse(
  params: z.input<typeof sentenceParseSchema>,
): Promise<SentenceParseResult[]> {
  const variables = sentenceParseSchema.parse(params);

  const query = `
    query SentenceParse(
      $text: String!,
      $schemeFrom: SanscriptScheme!,
      $schemeTo: SanscriptScheme!,
      $strictIO: Boolean,
      $limit: Int,
      $preSegmented: Boolean
    ) {
      parse(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        strictIO: $strictIO
        limit: $limit
        preSegmented: $preSegmented
      ) {
        splitDot
        splitDotURL
        parseDots
        parseDotURLs
        analysis {
          graph {
            node {
              pada
              root
              tags
            }
            predecessor {
              pada
              root
              tags
            }
            relation: sambandha
          }
        }
      }
    }
  `;

  const data = await runQuery<{ parse: SentenceParseResult[] }>(
    "parse sentence",
    query,
    variables,
  );
  return data.parse;
}

/**
 * Normalise a sentence whose words are already separated (sandhi already
 * split, words divided by spaces) into its segmented form.
 *
 * @example text: "देवदत्तः ग्रामं गच्छति" -> ["devadattaḥ", "grāmam", "gacchati"]
 */
export async function preSegmentedSplits(
  params: z.input<typeof preSegmentedSchema>,
): Promise<string[]> {
  const variables = preSegmentedSchema.parse(params);

  const query = `
    query PreSegmented($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!, $strictIO: Boolean, $limit: Int) {
      presegmented(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        strictIO: $strictIO
        limit: $limit
      )
    }
  `;

  const data = await runQuery<{ presegmented: string[] }>(
    "segment the sentence",
    query,
    variables,
  );
  return data.presegmented;
}

/**
 * Transliterate text between the schemes supported by the service
 */
export async function transliterateText(
  params: z.input<typeof transliterateSchema>,
): Promise<string> {
  const variables = transliterateSchema.parse(params);

  const query = `
    query Transliterate($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!) {
      transliterate(text: $text, schemeFrom: $schemeFrom, schemeTo: $schemeTo)
    }
  `;

  const data = await runQuery<{ transliterate: string }>(
    "transliterate",
    query,
    variables,
  );
  return data.transliterate;
}

/**
 * Find words by how they sound, e.g. "rama" finds ramā, ramākānta ...
 */
export async function phoneticWordSearch(
  params: z.input<typeof phoneticWordSearchSchema>,
): Promise<PhoneticWordResults> {
  const searchWith = phoneticWordSearchSchema.parse(params);

  const query = `
    query PhoneticWordSearch($searchWith: PhoneticWordSearchInput!) {
      phoneticWordSearch(searchWith: $searchWith) {
        total
        results {
          key
          word
        }
      }
    }
  `;

  const data = await runQuery<{ phoneticWordSearch: PhoneticWordResults }>(
    "search words phonetically",
    query,
    { searchWith },
  );
  return {
    total: data.phoneticWordSearch.total,
    results: data.phoneticWordSearch.results ?? [],
  };
}

/**
 * Search the dictionaries held by the service
 */
export async function sanscriptDictionarySearch(
  params: z.input<typeof dictionarySearchSchema>,
): Promise<SanscriptDictionaryResults> {
  const { origin, ...rest } = dictionarySearchSchema.parse(params);
  // an empty list would match nothing: leave it out to search everywhere
  const searchWith = origin?.length ? { ...rest, origin } : rest;

  const query = `
    query DictionarySearch($searchWith: DictionarySearchInput!) {
      dictionarySearch(searchWith: $searchWith) {
        total
        results {
          ${DICTIONARY_ITEM_FIELDS}
        }
      }
    }
  `;

  const data = await runQuery<{ dictionarySearch: SanscriptDictionaryResults }>(
    "search the dictionaries",
    query,
    { searchWith },
  );
  return {
    total: data.dictionarySearch.total,
    results: data.dictionarySearch.results ?? [],
  };
}

/**
 * Page through one dictionary in its own order
 */
export async function sanscriptDictionaryBrowse(
  params: z.input<typeof dictionaryBrowseSchema>,
): Promise<SanscriptDictionaryResults> {
  const browseWith = dictionaryBrowseSchema.parse(params);

  const query = `
    query DictionaryBrowse($browseWith: DictionaryBrowseInput!) {
      dictionaryBrowse(browseWith: $browseWith) {
        total
        results {
          ${DICTIONARY_ITEM_FIELDS}
        }
      }
    }
  `;

  const data = await runQuery<{ dictionaryBrowse: SanscriptDictionaryResults }>(
    "browse the dictionary",
    query,
    { browseWith },
  );
  return {
    total: data.dictionaryBrowse.total,
    results: data.dictionaryBrowse.results ?? [],
  };
}

/**
 * Fetch one dictionary entry, rendered in the requested scheme
 */
export async function sanscriptDictionaryItem(
  params: z.input<typeof dictionaryItemSchema>,
): Promise<SanscriptDictionaryItem> {
  const variables = dictionaryItemSchema.parse(params);

  const query = `
    query DictionaryItem($id: ID!, $outputScheme: SanscriptScheme) {
      dictionarySearchById(id: $id, outputScheme: $outputScheme) {
        ${DICTIONARY_ITEM_FIELDS}
      }
    }
  `;

  const data = await runQuery<{ dictionarySearchById: SanscriptDictionaryItem }>(
    "load the dictionary entry",
    query,
    variables,
  );
  return data.dictionarySearchById;
}
