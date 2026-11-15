"use server";

import {
  Dhatu,
  LanguageTag,
  MeterLine,
  PhoneticWordResults,
  Pratyahara,
  SANSCRIPT_DICTIONARIES,
  SANSCRIPT_LEXICONS,
  SanscriptDictionaryItem,
  SanscriptDictionaryResults,
  SentenceParseGraph,
  SentenceParseResult,
  SplitPair,
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
   * Strict input/output: the text is taken as typed instead of being
   * normalised (punctuation and digits dropped, a final visarga / anusvara
   * read the way the lexicon spells it), and word forms in the output keep a
   * final `s` / `r` instead of a visarga. Left unset the service normalises.
   */
  strictIO: z.boolean().optional(),
};

/** The service accepts 1-100 for every result limit */
const resultLimit = z.number().int().min(1).max(100);

const sandhiSplitsSchema = z.object({
  text: z.string().min(1, "Text is required"),
  ...ioSchemes,
  limit: resultLimit.optional().default(2),
});

const splitPairsSchema = z.object({
  text: z.string().min(1, "Word is required"),
  ...ioSchemes,
  /** Only cut at this letter (0-based, counted in SLP1 letters) */
  position: z.number().int().min(0).optional(),
  /** Only pairs whose two parts are both known words */
  validOnly: z.boolean().optional(),
});

const sandhiJoinsSchema = z.object({
  words: z.array(z.string()).min(1, "At least one word is required"),
  ...ioSchemes,
});

const languageTagsSchema = z.object({
  text: z.string().min(1, "Text is required"),
  ...ioSchemes,
  /** Which lexicon to consult; the service combines them by default */
  lexicon: z.enum(SANSCRIPT_LEXICONS).optional(),
});

const sentenceParseSchema = z.object({
  text: z.string().min(1, "Text is required"),
  ...ioSchemes,
  /** Maximum number of sandhi splits to analyse */
  limit: resultLimit.optional().default(2),
  preSegmented: z.boolean().optional().default(false),
  /** Maximum number of analyses per split */
  parseLimit: resultLimit.optional().default(2),
  /** Per split, only the analyses that tie for the lowest cost */
  minCostOnly: z.boolean().optional(),
  /**
   * Treat a verb whose root the dhatupatha does not list as able to take an
   * object (`karma`)
   */
  unknownRootsTransitive: z.boolean().optional(),
  /** Also fetch the Graphviz source and image links of the diagrams */
  diagrams: z.boolean().optional().default(false),
  /** Script of the diagram labels; `schemeTo` when left out */
  diagramScheme: scheme.optional(),
});

const preSegmentedSchema = z.object({
  text: z.string().min(1, "Text is required"),
  ...ioSchemes,
});

const dhatusSchema = z.object({
  dhatu: z.string().min(1, "Root is required"),
  schemeFrom: scheme,
  schemeTo: scheme,
});

const pratyaharaSchema = z.object({
  name: z.string().min(1, "Pratyahara is required"),
  schemeFrom: scheme,
  schemeTo: scheme,
  /** `aR` and `iR` can end at the first or the second `R`; true takes the second */
  longForm: z.boolean().optional(),
  /** Include the long vowels alongside the short ones */
  withLongVowels: z.boolean().optional(),
});

const maheshvaraSutrasSchema = z.object({ schemeTo: scheme });

const meterSchema = z.object({
  text: z.string().min(1, "Text is required"),
  schemeFrom: scheme,
  schemeTo: scheme,
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
 * Two-part sandhi decompositions of a single word, straight from the sandhi
 * rules: `tasminniti` -> `tasmin` + `iti`. Unlike `sandhiSplits` the parts
 * need not be real words; `valid` tells which pairs are.
 */
export async function sandhiSplitPairs(
  params: z.input<typeof splitPairsSchema>,
): Promise<SplitPair[]> {
  const variables = splitPairsSchema.parse(params);

  const query = `
    query SplitPairs($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!, $strictIO: Boolean, $position: Int, $validOnly: Boolean) {
      splitPairs(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        strictIO: $strictIO
        position: $position
        validOnly: $validOnly
      ) {
        left
        right
        valid
      }
    }
  `;

  const data = await runQuery<{ splitPairs: SplitPair[] }>(
    "find sandhi split pairs",
    query,
    variables,
  );
  return data.splitPairs;
}

/**
 * Join Sanskrit words using sandhi rules. Every form the rules allow comes
 * back, fully joined forms first; the rules over-generate, so not every
 * result is a form in real use.
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
 * Morphological analyses of a word, or of each word of a space-separated
 * text. A word the lexicon does not know yields no entries.
 *
 * @param params The parameters for language tagging
 * @returns One entry per reading: the form looked up, its stem and its tags
 */
export async function languageTags(
  params: z.input<typeof languageTagsSchema>,
): Promise<LanguageTag[]> {
  const variables = languageTagsSchema.parse(params);

  const query = `
    query LanguageTags($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!, $strictIO: Boolean, $lexicon: Lexicon) {
      tags(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        strictIO: $strictIO
        lexicon: $lexicon
      ) {
        form
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

const PARSE_TAG_FIELDS = `
  index
  pada
  root
  tags
`;

type RawSentenceParse = Omit<SentenceParseResult, "possibleRelations"> & {
  analysisSplitDot?: { graph: SentenceParseGraph[] } | null;
};

/**
 * Sandhi-split a sentence and analyse each split: which word relates to
 * which, and how (karaka relations, visheshana, samasta, ...).
 *
 * @param params The parameters for sentence parsing
 * @returns One entry per split with its status, its analyses (lowest cost
 *   first, each with CoNLL rows) and every relation that is possible between
 *   its words; with `diagrams`, also the Graphviz source / image links
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
      $preSegmented: Boolean,
      $parseLimit: Int,
      $minCostOnly: Boolean,
      $unknownRootsTransitive: Boolean,
      $diagrams: Boolean!,
      $diagramScheme: SanscriptScheme
    ) {
      parse(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        strictIO: $strictIO
        limit: $limit
        preSegmented: $preSegmented
        parseLimit: $parseLimit
        minCostOnly: $minCostOnly
        unknownRootsTransitive: $unknownRootsTransitive
      ) {
        split
        status
        splitDot(scheme: $diagramScheme) @include(if: $diagrams)
        splitDotURL(scheme: $diagramScheme) @include(if: $diagrams)
        analysis {
          cost
          conll
          dot(scheme: $diagramScheme) @include(if: $diagrams)
          dotURL(scheme: $diagramScheme) @include(if: $diagrams)
          graph {
            node { ${PARSE_TAG_FIELDS} }
            predecessor { ${PARSE_TAG_FIELDS} }
            relation: sambandha
          }
        }
        analysisSplitDot {
          graph {
            node { ${PARSE_TAG_FIELDS} }
            predecessor { ${PARSE_TAG_FIELDS} }
            relation: sambandha
          }
        }
      }
    }
  `;

  const data = await runQuery<{ parse: RawSentenceParse[] }>(
    "parse sentence",
    query,
    variables,
  );
  return data.parse.map(({ analysisSplitDot, ...result }) => ({
    ...result,
    possibleRelations: analysisSplitDot?.graph ?? [],
  }));
}

/**
 * Words of a sentence whose sandhi is already resolved (words divided by
 * spaces), in the form the parser uses. A word that is not known as it stands
 * is itself sandhi-split.
 *
 * @example text: "देवदत्तः ग्रामं गच्छति" -> ["devadattaḥ", "grāmam", "gacchati"]
 */
export async function preSegmentedSplits(
  params: z.input<typeof preSegmentedSchema>,
): Promise<string[]> {
  const variables = preSegmentedSchema.parse(params);

  const query = `
    query PreSegmented($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!, $strictIO: Boolean) {
      presegmented(
        text: $text
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        strictIO: $strictIO
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
 * Entries of the dhatupatha for a verbal root, given bare (`gam`), as taught
 * with its markers (`gamx~`), or the way `languageTags` names it.
 */
export async function dhatuLookup(
  params: z.input<typeof dhatusSchema>,
): Promise<Dhatu[]> {
  const variables = dhatusSchema.parse(params);

  const query = `
    query Dhatus($dhatu: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!) {
      dhatus(dhatu: $dhatu, schemeFrom: $schemeFrom, schemeTo: $schemeTo) {
        dhatu
        mulaDhatu
        artha
        gana
        karmakatva
        sakarmaka
        dvikarmaka
        ittva
        pada
        rupa
      }
    }
  `;

  const data = await runQuery<{ dhatus: Dhatu[] }>(
    "look up the root",
    query,
    variables,
  );
  return data.dhatus;
}

/**
 * The sounds a pratyahara such as `ac`, `hal` or `jaS` stands for
 */
export async function pratyaharaVarnas(
  params: z.input<typeof pratyaharaSchema>,
): Promise<Pratyahara> {
  const variables = pratyaharaSchema.parse(params);

  const query = `
    query Pratyahara($name: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!, $longForm: Boolean, $withLongVowels: Boolean) {
      pratyahara(
        name: $name
        schemeFrom: $schemeFrom
        schemeTo: $schemeTo
        longForm: $longForm
        withLongVowels: $withLongVowels
      ) {
        name
        varnas
      }
    }
  `;

  const data = await runQuery<{ pratyahara: Pratyahara }>(
    "expand the pratyahara",
    query,
    variables,
  );
  return data.pratyahara;
}

/**
 * The fourteen Maheshvara sutras
 */
export async function maheshvaraSutras(
  params: z.input<typeof maheshvaraSutrasSchema>,
): Promise<string[]> {
  const variables = maheshvaraSutrasSchema.parse(params);

  const data = await runQuery<{ maheshvaraSutras: string[] }>(
    "load the Maheshvara sutras",
    `query MaheshvaraSutras($schemeTo: SanscriptScheme!) {
      maheshvaraSutras(schemeTo: $schemeTo)
    }`,
    variables,
  );
  return data.maheshvaraSutras;
}

/**
 * Syllable weights (guru / laghu) of each line of a verse. Lines end at a
 * line break or a danda.
 */
export async function verseMeter(
  params: z.input<typeof meterSchema>,
): Promise<MeterLine[]> {
  const variables = meterSchema.parse(params);

  const query = `
    query Meter($text: String!, $schemeFrom: SanscriptScheme!, $schemeTo: SanscriptScheme!) {
      meter(text: $text, schemeFrom: $schemeFrom, schemeTo: $schemeTo) {
        text
        syllables
        pattern
      }
    }
  `;

  const data = await runQuery<{ meter: MeterLine[] }>(
    "scan the verse",
    query,
    variables,
  );
  return data.meter;
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
