# Sanskrit Utilities API Documentation

This document describes the Sanskrit utilities API provided in the DevHub project for processing Sanskrit text using GraphQL server actions.

## Overview

The Sanskrit utilities provide several important tools for working with Sanskrit text:

1. **Sandhi Splits** - Break down Sanskrit compounds into their constituent parts
2. **Sandhi Joins** - Combine Sanskrit words following sandhi rules
3. **Language Tags** - Get grammatical analysis of Sanskrit words
4. **Sentence Parse** - Parse a Sanskrit sentence into its constituent parts with detailed analysis, plus Graphviz diagrams of the splits and of each parse
5. **Segment** - Standalone form of each word of an already separated sentence
6. **Transliterate** - Transliteration by the service
7. **Phonetic Search** - Find words by how they sound
8. **Dictionary** - Search or page through the dictionaries held by the service

## Server Actions

All functionality is provided through typesafe server actions in `src/app/actions/sanskrit-utils.ts`.

### Configuration

The GraphQL endpoint is set via the environment variable `SANSCRIPT_UTILS_URL`.

### Types

#### TransliterationScheme Enum

Mirrors the service's `SanscriptScheme` GraphQL enum. The service also lists
`ENGLISH`, but rejects it for transliteration, so it is not offered.

```typescript
export enum TransliterationScheme {
  DEVANAGARI = "DEVANAGARI",
  IAST = "IAST",
  ITRANS = "ITRANS",
  SLP1 = "SLP1",
  TELUGU = "TELUGU",
  TAMIL = "TAMIL",
  KANNADA = "KANNADA",
}
```

#### Response Types

```typescript
export type LanguageTag = {
  word: string;
  tags: string[];
};

export type SentenceParseNode = {
  pada: string;
  root: string;
  tags: string[];
};

export type SentenceParseGraph = {
  node: SentenceParseNode;
};

export type SentenceParseAnalysis = {
  graph: SentenceParseGraph[];
};

export type SentenceParseResult = {
  analysis: SentenceParseAnalysis[];
};
```

### Functions

#### sandhiSplits

Splits Sanskrit text into its constituent parts using sandhi rules.

```typescript
async function sandhiSplits(params: {
  text: string;
  schemeFrom: TransliterationScheme;
  schemeTo: TransliterationScheme;
}): Promise<string[][]>;
```

**Example:**

```typescript
import {
  sandhiSplits,
  TransliterationScheme,
} from "@/app/actions/sanskrit-utils";

const splits = await sandhiSplits({
  text: "तपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरमि",
  schemeFrom: TransliterationScheme.DEVANAGARI,
  schemeTo: TransliterationScheme.IAST,
});

// Result: [["tapaḥ", "svādhyāya", "niratam", "tapasvī", "vāk", "vidām", "varam", "i"], ...]
```

#### sandhiJoins

Joins Sanskrit words using sandhi rules.

```typescript
async function sandhiJoins(params: {
  words: string[];
  schemeFrom: TransliterationScheme;
  schemeTo: TransliterationScheme;
}): Promise<string[]>;
```

**Example:**

```typescript
import {
  sandhiJoins,
  TransliterationScheme,
} from "@/app/actions/sanskrit-utils";

const joins = await sandhiJoins({
  words: ["tapaḥ", "svādhyāya", "niratam"],
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.TELUGU,
});

// Result: ["తపస్స్వాధ్యాయనిరతమ్"]
```

#### languageTags

Gets grammatical analysis of Sanskrit words.

```typescript
async function languageTags(params: {
  text: string;
  schemeFrom: TransliterationScheme;
  schemeTo: TransliterationScheme;
}): Promise<LanguageTag[]>;
```

**Example:**

```typescript
import {
  languageTags,
  TransliterationScheme,
} from "@/app/actions/sanskrit-utils";

const tags = await languageTags({
  text: "niratam",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.TELUGU,
});

// Result: [{
//   word: "నిరత",
//   tags: ["ఏకవచనమ్", "ద్వితీయావిభక్తిః", "పుంల్లిఙ్గమ్"]
// }]
```

#### sentenceParse

Parses a Sanskrit sentence into its constituent parts with detailed analysis.

```typescript
async function sentenceParse(params: {
  text: string;
  schemeFrom: TransliterationScheme;
  schemeTo: TransliterationScheme;
  limit?: number;
  preSegmented?: boolean;
}): Promise<SentenceParseResult[]>;
```

**Example:**

```typescript
import {
  sentenceParse,
  TransliterationScheme,
} from "@/app/actions/sanskrit-utils";

const parseResults = await sentenceParse({
  text: "vāgvidāṃ varam",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.TELUGU,
  limit: 2,
  preSegmented: false,
});

// Result: Complex nested structure with grammatical analysis
```

#### Other functions

| Function | Service query | Returns |
| --- | --- | --- |
| `sanscriptUtilsVersion()` | `version` | service version; doubles as a connectivity check |
| `preSegmentedSplits({ text, schemeFrom, schemeTo, limit?, strictIO? })` | `presegmented` | `string[]` |
| `transliterateText({ text, schemeFrom, schemeTo })` | `transliterate` | `string` |
| `phoneticWordSearch({ search, searchScheme?, outputScheme?, startsWith?, endsWith?, caseInsensitive?, limit?, offset? })` | `phoneticWordSearch` | `{ total, results: { key, word }[] }` |
| `sanscriptDictionarySearch({ search, searchScheme?, outputScheme?, origin?, searchOnlyKeys?, startsWith?, endsWith?, fuzzySearch?, caseInsensitive?, limit?, offset? })` | `dictionarySearch` | `{ total, results }` |
| `sanscriptDictionaryBrowse({ origin, outputScheme?, limit?, offset? })` | `dictionaryBrowse` | `{ total, results }` |
| `sanscriptDictionaryItem({ id, outputScheme? })` | `dictionarySearchById` | one dictionary entry |

`sandhiSplits`, `sandhiJoins`, `languageTags`, `sentenceParse` and
`preSegmentedSplits` also accept `strictIO`. Leave it unset (or `false`) unless
you need it: in strict mode the service rejects inputs it cannot read exactly,
and fails with an error rather than an empty result.

`sentenceParse` results carry `splitDot` / `parseDots` (Graphviz source) and
`splitDotURL` / `parseDotURLs`. The URLs point at image-charts.com and contain
the sentence, so the UI shows them as links to open rather than loading them
automatically.

The service's dictionary mutations (create / update / delete) are deliberately
not exposed.

## React Hooks

The package includes React hooks in `src/hooks/use-sanskrit-utils.ts` for easy integration with React components.

### Mutation Hooks

These hooks wrap the server actions with TanStack Query's mutation functionality.

- `useSandhiSplits()`
- `useSandhiJoins()`
- `useLanguageTags()`
- `useSentenceParse()`
- `usePreSegmentedSplits()`
- `useServiceTransliterate()`
- `usePhoneticWordSearch()`
- `useSanscriptDictionarySearch()`
- `useSanscriptDictionaryBrowse()`
- `useSanscriptUtilsVersion()` (query)

**Example:**

```typescript
import { useSandhiSplits } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/app/actions/sanskrit-utils";

function MySanskritComponent() {
  const { split, splits, isLoading, error } = useSandhiSplits();

  const handleSplit = () => {
    split({
      text: "देवदत्तः",
      schemeFrom: TransliterationScheme.DEVANAGARI,
      schemeTo: TransliterationScheme.IAST,
    });
  };

  // Use the results...
}
```

### Query Hooks

These hooks provide a more declarative approach for querying with predefined parameters.

- `useSandhiSplitsQuery(text, schemeFrom, schemeTo, options)`
- `useSandhiJoinsQuery(words, schemeFrom, schemeTo, options)`
- `useLanguageTagsQuery(text, schemeFrom, schemeTo, options)`
- `useSentenceParseQuery(text, schemeFrom, schemeTo, limit, preSegmented, options)`

**Example:**

```typescript
import { useSandhiSplitsQuery } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/app/actions/sanskrit-utils";

function MySanskritComponent({ text }) {
  const { data, isLoading, error } = useSandhiSplitsQuery(
    text,
    TransliterationScheme.DEVANAGARI,
    TransliterationScheme.IAST,
    { enabled: text.length > 0 },
  );

  // Use the data...
}
```

## UI Component

A complete UI for interacting with the Sanskrit utilities is available in `src/components/sanscript/sanscript-utils.tsx`. You can integrate this component into your application to provide a user interface for all the Sanskrit utilities.

To add the Sanskrit Utils tab to an existing Sanscript page, update the page component to include the `SanscriptUtils` component as shown in `src/app/(app)/sanscript/page.tsx`.

## Error Handling

All server actions include comprehensive error handling with typed error responses. The GraphQL client also handles network errors and GraphQL-specific errors, providing clear error messages that can be displayed in the UI.

## Data Validation

Input parameters for all server actions are validated using Zod schemas, ensuring that requests are properly formatted before sending to the GraphQL API.

## Sample GraphQL Queries

- GraphQL Endpoint: env.SANSCRIPT_UTILS_URL

1. SandhiSplits

```gql
{
  splits(
    text: "तपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरम्"
    schemeFrom: DEVANAGARI
    schemeTo: IAST
    limit: 1
  )
}
```

```json
{
  "data": {
    "splits": [
      ["tapaḥ", "svādhyāya", "niratam", "tapasvī", "vāk", "vidām", "varam"]
    ]
  }
}
```

2. SandhiJoins

```gql
{
  joins(
    words: ["tapaḥ", "svādhyāya", "niratam"]
    schemeFrom: IAST
    schemeTo: TELUGU
  )
}
```

```json
{
  "data": {
    "joins": ["తపస్స్వాధ్యాయనిరతమ్"]
  }
}
```

3. LanguageTags

```gql
{
  tags(text: "niratam", schemeFrom: IAST, schemeTo: TELUGU) {
    word
    tags
  }
}
```

```json
{
  "data": {
    "tags": [
      {
        "tags": ["ఏకవచనమ్", "ద్వితీయావిభక్తిః", "పుంల్లిఙ్గమ్"],
        "word": "నిరత"
      }
    ]
  }
}
```

4. SentenseParse

```gql
{
  parse(
    text: "vāgvidāṃ varam"
    schemeFrom: IAST
    schemeTo: TELUGU
    limit: 1
    preSegmented: false
  ) {
    analysis {
      graph {
        predecessor {
          pada
          root
          tags
        }
        sambandha
        node {
          pada
          root
          tags
        }
      }
    }
  }
}
```

```json
{
  "data": {
    "parse": [
      {
        "analysis": [
          {
            "graph": [
              {
                "node": {
                  "pada": "వాక్",
                  "root": "వాచ్",
                  "tags": ["సమాసపూర్వపదనామపదమ్"]
                },
                "predecessor": {
                  "pada": "విదామ్",
                  "root": "విద్#౩",
                  "tags": ["షష్ఠీవిభక్తిః", "పుంల్లిఙ్గమ్", "బహువచనమ్"]
                },
                "sambandha": "సమస్త"
              },
              {
                "node": {
                  "pada": "విదామ్",
                  "root": "విద్#౩",
                  "tags": ["షష్ఠీవిభక్తిః", "పుంల్లిఙ్గమ్", "బహువచనమ్"]
                },
                "predecessor": {
                  "pada": "వరమ్",
                  "root": "వర",
                  "tags": ["నపుంసకలిఙ్గమ్", "ఏకవచనమ్", "ప్రథమావిభక్తిః"]
                },
                "sambandha": "షష్ఠీ-సమ్బన్ధ"
              },
              {
                "node": {
                  "pada": "వరమ్",
                  "root": "వర",
                  "tags": ["నపుంసకలిఙ్గమ్", "ఏకవచనమ్", "ప్రథమావిభక్తిః"]
                },
                "predecessor": null,
                "sambandha": null
              }
            ]
          },
          {
            "graph": [
              {
                "node": {
                  "pada": "వాక్",
                  "root": "వాచ్",
                  "tags": ["సమాసపూర్వపదనామపదమ్"]
                },
                "predecessor": {
                  "pada": "విదామ్",
                  "root": "విద్",
                  "tags": ["షష్ఠీవిభక్తిః", "నపుంసకలిఙ్గమ్", "బహువచనమ్"]
                },
                "sambandha": "సమస్త"
              },
              {
                "node": {
                  "pada": "విదామ్",
                  "root": "విద్",
                  "tags": ["షష్ఠీవిభక్తిః", "నపుంసకలిఙ్గమ్", "బహువచనమ్"]
                },
                "predecessor": {
                  "pada": "వరమ్",
                  "root": "వర",
                  "tags": ["ద్వితీయావిభక్తిః", "ఏకవచనమ్", "పుంల్లిఙ్గమ్"]
                },
                "sambandha": "షష్ఠీ-సమ్బన్ధ"
              },
              {
                "node": {
                  "pada": "వరమ్",
                  "root": "వర",
                  "tags": ["ద్వితీయావిభక్తిః", "ఏకవచనమ్", "పుంల్లిఙ్గమ్"]
                },
                "predecessor": null,
                "sambandha": null
              }
            ]
          }
        ]
      }
    ]
  }
}
```
