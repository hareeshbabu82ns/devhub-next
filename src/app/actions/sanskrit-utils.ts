"use server";

import {
  LanguageTag,
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

// Validation schemas for input parameters
const sandhiSplitsSchema = z.object({
  text: z.string().min(1, "Text is required"),
  schemeFrom: z.nativeEnum(TransliterationScheme),
  schemeTo: z.nativeEnum(TransliterationScheme),
  limit: z.number().optional().default(2),
});

const sandhiJoinsSchema = z.object({
  words: z.array(z.string()).min(1, "At least one word is required"),
  schemeFrom: z.nativeEnum(TransliterationScheme),
  schemeTo: z.nativeEnum(TransliterationScheme),
});

const languageTagsSchema = z.object({
  text: z.string().min(1, "Text is required"),
  schemeFrom: z.nativeEnum(TransliterationScheme),
  schemeTo: z.nativeEnum(TransliterationScheme),
});

const sentenceParseSchema = z.object({
  text: z.string().min(1, "Text is required"),
  schemeFrom: z.nativeEnum(TransliterationScheme),
  schemeTo: z.nativeEnum(TransliterationScheme),
  limit: z.number().optional().default(2),
  preSegmented: z.boolean().optional().default(false),
});

// Response types for GraphQL queries
type SandhiSplitsResponse = {
  splits: string[][];
};

type SandhiJoinsResponse = {
  joins: string[];
};

type LanguageTagsResponse = {
  tags: LanguageTag[];
};

type SentenceParseResponse = {
  parse: SentenceParseResult[];
};

/**
 * Split Sanskrit text into its constituent parts using sandhi rules
 *
 * @param params The parameters for sandhi splitting
 * @returns An array of possible splits
 */
export async function sandhiSplits(
  params: z.infer<typeof sandhiSplitsSchema>,
): Promise<string[][]> {
  // Validate the input parameters
  const validatedParams = sandhiSplitsSchema.parse(params);

  // Build and execute the GraphQL query
  const query = `
    query SandhiSplits($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!, $limit: Int ) {
      splits(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        limit: $limit
      )
    }
  `;

  const variables = {
    text: validatedParams.text,
    schemeFrom: validatedParams.schemeFrom,
    schemeTo: validatedParams.schemeTo,
    limit: validatedParams.limit,
  };

  try {
    const data = await fetchGraphQL<SandhiSplitsResponse>(query, variables);
    return data.splits;
  } catch (error) {
    console.error("Error in sandhiSplits:", error);
    throw new Error(
      `Failed to perform sandhi splits: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Join Sanskrit words using sandhi rules
 *
 * @param params The parameters for sandhi joining
 * @returns An array of possible joined forms
 */
export async function sandhiJoins(
  params: z.infer<typeof sandhiJoinsSchema>,
): Promise<string[]> {
  // Validate the input parameters
  const validatedParams = sandhiJoinsSchema.parse(params);

  // Build and execute the GraphQL query
  const query = `
    query SandhiJoins($words: [String!]!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!) {
      joins(
        words: $words
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
      )
    }
  `;

  const variables = {
    words: validatedParams.words,
    schemeFrom: validatedParams.schemeFrom,
    schemeTo: validatedParams.schemeTo,
  };

  try {
    const data = await fetchGraphQL<SandhiJoinsResponse>(query, variables);
    return data.joins;
  } catch (error) {
    console.error("Error in sandhiJoins:", error);
    throw new Error(
      `Failed to perform sandhi joins: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Get language tags for Sanskrit text
 *
 * @param params The parameters for language tagging
 * @returns An array of words with their associated tags
 */
export async function languageTags(
  params: z.infer<typeof languageTagsSchema>,
): Promise<LanguageTag[]> {
  // Validate the input parameters
  const validatedParams = languageTagsSchema.parse(params);

  // Build and execute the GraphQL query
  const query = `
    query LanguageTags($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!) {
      tags(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
      ) {
        word
        tags
      }
    }
  `;

  const variables = {
    text: validatedParams.text,
    schemeFrom: validatedParams.schemeFrom,
    schemeTo: validatedParams.schemeTo,
  };

  try {
    const data = await fetchGraphQL<LanguageTagsResponse>(query, variables);
    return data.tags;
  } catch (error) {
    console.error("Error in languageTags:", error);
    throw new Error(
      `Failed to get language tags: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Parse a Sanskrit sentence into its constituent parts
 *
 * @param params The parameters for sentence parsing
 * @returns Detailed analysis of the sentence structure
 */
export async function sentenceParse(
  params: z.infer<typeof sentenceParseSchema>,
): Promise<SentenceParseResult[]> {
  // Validate the input parameters
  const validatedParams = sentenceParseSchema.parse(params);

  // Build and execute the GraphQL query
  const query = `
    query SentenceParse(
      $text: String!, 
      $schemeFrom: SanscriptScheme!, 
      $schemeTo: SanscriptScheme!, 
      $limit: Int, 
      $preSegmented: Boolean
    ) {
      parse(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        limit: $limit
        preSegmented: $preSegmented
      ) {
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

  const variables = {
    text: validatedParams.text,
    schemeFrom: validatedParams.schemeFrom,
    schemeTo: validatedParams.schemeTo,
    limit: validatedParams.limit,
    preSegmented: validatedParams.preSegmented,
  };

  try {
    const data = await fetchGraphQL<SentenceParseResponse>(query, variables);
    return data.parse;
  } catch (error) {
    console.error("Error in sentenceParse:", error);
    throw new Error(
      `Failed to parse sentence: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
