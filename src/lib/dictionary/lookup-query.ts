/**
 * Lookup query builder (pure, no database access).
 *
 * Turns what the reader typed into MongoDB match / ranking expressions over
 * the `word` array of a DictWords document. Every headword is stored in
 * several forms ({language: SAN|ITRANS|IAST|SLP1|TEL|ENG, value}), so a query
 * typed in any script is matched against the form in that script:
 *
 * - Devanagari / Telugu / IAST input is matched strictly against the SAN,
 *   TEL and IAST forms.
 * - Latin input (ITRANS from the IME, SLP1, or loose spelling like
 *   "krishna") is transliterated to Devanagari for a strict SAN match, and
 *   also matched loosely against the ITRANS form, case-insensitively, with
 *   common spelling variants allowed (ri/RRi, s/sh, a/aa, jn/gy, n/M...).
 *
 * `*` matches any run of characters and `?` any single character.
 */

import sanscript from "@indic-transliteration/sanscript";

export type MatchMode =
  | "smart"
  | "exact"
  | "prefix"
  | "suffix"
  | "contains"
  | "meaning";

export const MATCH_MODES: MatchMode[] = [
  "smart",
  "exact",
  "prefix",
  "suffix",
  "contains",
  "meaning",
];

const MAX_QUERY_LENGTH = 80;

export type InputScript ="devanagari" | "telugu" | "iast" | "latin" | "other";

export function detectInputScript(text: string): InputScript {
  if (/[ऀ-ॿ]/.test(text)) return "devanagari";
  if (/[ఀ-౿]/.test(text)) return "telugu";
  if (/[āīūṛṝḷḹṃṁḥṅñṭḍṇśṣĀĪŪṚṜḶḸṂṀḤṄÑṬḌṆŚṢ]/.test(text)) return "iast";
  if (/^[\x20-\x7E]+$/.test(text)) return "latin";
  return "other";
}

export function hasWildcards(text: string): boolean {
  return /[*?]/.test(text);
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&");
}

function safeT(text: string, from: string, to: string): string {
  try {
    return sanscript.t(text, from, to);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Loose ITRANS matching
// ---------------------------------------------------------------------------

const LATIN_CONSONANT = /[bcdfghjklmnpqrstvwxyz]/;

/**
 * Builds a case-insensitive regex body that matches the ITRANS spelling of a
 * word from a loose Latin spelling. "krishna" matches "kRRiShNa", "siva"
 * matches "shiva", "gyana" matches "j~nAna", "sanskrit" matches "saMskRRita".
 */
export function looseItransPattern(segment: string): string {
  const s = segment.toLowerCase();
  let out = "";
  let i = 0;
  const next = (n: number) => s.slice(i, i + n);
  while (i < s.length) {
    // Vocalic r written as ri / rri / r^i, with an optional long form
    if (next(3) === "rri" || next(3) === "r^i") {
      out += "(?:rr|r\\^)i{1,2}";
      i += 3;
      continue;
    }
    if (next(2) === "ri") {
      out += "(?:rr?|r\\^)i{1,2}";
      i += 2;
      continue;
    }
    if (next(3) === "lli") {
      out += "ll?i{1,2}";
      i += 3;
      continue;
    }
    if (next(3) === "j~n" || next(2) === "jn" || next(2) === "gy") {
      out += "(?:j~n|jn|gy|dny)";
      i += next(3) === "j~n" ? 3 : 2;
      continue;
    }
    if (next(3) === "ksh") {
      out += "(?:ksh|x)";
      i += 3;
      continue;
    }
    if (s[i] === "x") {
      out += "(?:ksh|x)";
      i += 1;
      continue;
    }
    if (next(2) === "sh") {
      out += "sh";
      i += 2;
      continue;
    }
    if (s[i] === "s") {
      out += "sh?";
      i += 1;
      continue;
    }
    if (next(3) === "chh") {
      out += "chh?";
      i += 3;
      continue;
    }
    if (next(2) === "ch") {
      out += "chh?";
      i += 2;
      continue;
    }
    if (s[i] === "c") {
      out += "ch?h?";
      i += 1;
      continue;
    }
    if (next(2) === "aa" || s[i] === "a") {
      // "ai" and "au" are their own vowels; leave them alone
      if (next(2) === "ai" || next(2) === "au") {
        out += next(2);
        i += 2;
        continue;
      }
      out += "aa?";
      i += next(2) === "aa" ? 2 : 1;
      continue;
    }
    if (next(2) === "ii" || next(2) === "ee") {
      out += "(?:ii?|ee)";
      i += 2;
      continue;
    }
    if (s[i] === "i") {
      out += "(?:ii?|ee)";
      i += 1;
      continue;
    }
    if (next(2) === "uu" || next(2) === "oo") {
      out += "(?:uu?|oo)";
      i += 2;
      continue;
    }
    if (s[i] === "u") {
      out += "(?:uu?|oo)";
      i += 1;
      continue;
    }
    if (next(2) === "~n") {
      out += "~n";
      i += 2;
      continue;
    }
    if (s[i] === "n") {
      const following = s[i + 1] ?? "";
      // Before a consonant "n" is often an anusvara (M) in ITRANS
      out += LATIN_CONSONANT.test(following) ? "(?:[~.]?n|m)" : "[~.]?n";
      i += 1;
      continue;
    }
    if (s[i] === "v" || s[i] === "w") {
      out += "[vw]";
      i += 1;
      continue;
    }
    out += escapeRegex(s[i]);
    i += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Strict Indic-script matching
// ---------------------------------------------------------------------------

interface IndicRanges {
  virama: string;
  /** dependent vowel signs + virama */
  signs: string;
  consonant: RegExp;
}

const DEVANAGARI: IndicRanges = {
  virama: "्",
  signs: "\u093A-\u094F\u0962\u0963",
  consonant: /[क-हक़-य़]$/,
};

const TELUGU: IndicRanges = {
  virama: "్",
  signs: "\u0C3E-\u0C4D\u0C55\u0C56\u0C62\u0C63",
  consonant: /[క-హౘ-ౚ]$/,
};

/**
 * Regex body for one Indic segment. When the segment is open on the right
 * (a prefix, or followed by a wildcard), a trailing virama is dropped so
 * "dharm" matches धर्म, and a bare consonant must not be followed by a
 * vowel sign so "dha" (ध) does not match धि.
 */
function indicSegmentPattern(
  segment: string,
  ranges: IndicRanges,
  openRight: boolean,
): string {
  if (!segment) return "";
  if (!openRight) return escapeRegex(segment);
  if (segment.endsWith(ranges.virama)) {
    return escapeRegex(segment.slice(0, -1));
  }
  if (ranges.consonant.test(segment)) {
    return `${escapeRegex(segment)}(?![${ranges.signs}])`;
  }
  return escapeRegex(segment);
}

// ---------------------------------------------------------------------------
// Pattern assembly
// ---------------------------------------------------------------------------

type Anchoring = { start: boolean; end: boolean };

function anchoringFor(mode: MatchMode, wildcard: boolean): Anchoring {
  // Wildcard patterns describe the whole word unless the mode says otherwise
  if (wildcard && mode === "smart") return { start: true, end: true };
  switch (mode) {
    case "exact":
      return { start: true, end: true };
    case "prefix":
      return { start: true, end: false };
    case "suffix":
      return { start: false, end: true };
    default:
      return { start: false, end: false };
  }
}

/** Splits "dh*ma?" into literal segments and wildcard tokens */
function tokenize(query: string): string[] {
  return query.split(/([*?])/).filter((t) => t.length > 0);
}

/**
 * Builds an anchored regex from a tokenized query, converting each literal
 * segment with `convert`. `convert` receives whether that segment is open on
 * the right (followed by a wildcard or an unanchored end) and on the left.
 */
function assemble(
  tokens: string[],
  anchoring: Anchoring,
  convert: (segment: string, openRight: boolean, openLeft: boolean) => string,
): string {
  let body = "";
  tokens.forEach((tok, idx) => {
    if (tok === "*") body += ".*";
    else if (tok === "?") body += ".";
    else {
      const isLast = idx === tokens.length - 1;
      const openRight = isLast ? !anchoring.end : true;
      const openLeft = idx === 0 ? !anchoring.start : true;
      body += convert(tok, openRight, openLeft);
    }
  });
  return `${anchoring.start ? "^" : ""}${body}${anchoring.end ? "$" : ""}`;
}

export interface WordCondition {
  languages: string[];
  regex: string;
  caseInsensitive: boolean;
}

export interface HeadwordQuery {
  script: InputScript;
  /** Any one matching makes the document a hit */
  conditions: WordCondition[];
  /** Exact values (any script) that rank first */
  exactValues: string[];
  /** Whole-word regex conditions that rank as exact (loose spellings) */
  exactConditions: WordCondition[];
  /** Starts-with conditions that rank above "contains" hits */
  prefixConditions: WordCondition[];
}

/** Devanagari forms a Latin query could stand for (ITRANS, Harvard-Kyoto) */
function latinToDevanagariCandidates(segment: string): string[] {
  const out = new Set<string>();
  for (const scheme of ["itrans", "optitrans", "hk"]) {
    const dev = safeT(segment, scheme, "devanagari");
    // Ignore results that still contain Latin letters
    if (dev && !/[a-zA-Z]/.test(dev)) out.add(dev);
  }
  return [...out];
}

function buildConditions(
  query: string,
  anchoring: Anchoring,
): { script: InputScript; conditions: WordCondition[] } {
  const script = detectInputScript(query);
  const tokens = tokenize(query);
  const conditions: WordCondition[] = [];

  const strictDevanagari = (toDev: (seg: string) => string[]) => {
    // Use every candidate transliteration per segment; combine as alternatives
    const regex = assemble(tokens, anchoring, (seg, openRight) => {
      const alts = toDev(seg)
        .map((d) => indicSegmentPattern(d, DEVANAGARI, openRight))
        .filter(Boolean);
      if (alts.length === 0) return escapeRegex(seg);
      return alts.length === 1 ? alts[0] : `(?:${alts.join("|")})`;
    });
    conditions.push({ languages: ["SAN"], regex, caseInsensitive: false });
  };

  switch (script) {
    case "devanagari":
      strictDevanagari((seg) => [seg]);
      break;
    case "telugu":
      conditions.push({
        languages: ["TEL"],
        regex: assemble(tokens, anchoring, (seg, open) =>
          indicSegmentPattern(seg, TELUGU, open),
        ),
        caseInsensitive: false,
      });
      strictDevanagari((seg) => [safeT(seg, "telugu", "devanagari")]);
      break;
    case "iast":
      conditions.push({
        languages: ["IAST"],
        regex: assemble(tokens, anchoring, (seg) => escapeRegex(seg)),
        caseInsensitive: true,
      });
      strictDevanagari((seg) => [safeT(seg.toLowerCase(), "iast", "devanagari")]);
      break;
    case "latin": {
      strictDevanagari(latinToDevanagariCandidates);
      conditions.push({
        languages: ["ITRANS"],
        regex: assemble(tokens, anchoring, (seg, _openRight, openLeft) => {
          const body = looseItransPattern(seg);
          // Don't start a match on the "h" of an aspirate (kh, ch, th, sh...)
          return openLeft && /^h/i.test(seg)
            ? `(?<![bcdgjkpst])${body}`
            : body;
        }),
        caseInsensitive: true,
      });
      // SLP1 is case-significant (S = श, s = स)
      conditions.push({
        languages: ["SLP1"],
        regex: assemble(tokens, anchoring, (seg) => escapeRegex(seg)),
        caseInsensitive: false,
      });
      conditions.push({
        languages: ["ENG", "IAST"],
        regex: assemble(tokens, anchoring, (seg) => escapeRegex(seg)),
        caseInsensitive: true,
      });
      break;
    }
    default:
      conditions.push({
        languages: ["SAN", "TEL", "ENG", "IAST", "ITRANS"],
        regex: assemble(tokens, anchoring, (seg) => escapeRegex(seg)),
        caseInsensitive: true,
      });
  }
  return { script, conditions };
}

function exactValuesFor(query: string, script: InputScript): string[] {
  if (hasWildcards(query)) return [];
  const out = new Set<string>([query]);
  switch (script) {
    case "latin":
      out.add(safeT(query, "itrans", "devanagari"));
      break;
    case "telugu":
      out.add(safeT(query, "telugu", "devanagari"));
      break;
    case "iast":
      out.add(query.toLowerCase());
      out.add(safeT(query.toLowerCase(), "iast", "devanagari"));
      break;
  }
  return [...out].filter(Boolean);
}

/**
 * Builds the headword query for every mode except "meaning".
 * Returns null when there is nothing to search for.
 */
export function buildHeadwordQuery(
  rawQuery: string,
  mode: MatchMode,
): HeadwordQuery | null {
  // Collapse "**" and cap the length: the query becomes a regex
  const query = rawQuery
    .normalize("NFC")
    .trim()
    .replace(/\*+/g, "*")
    .slice(0, MAX_QUERY_LENGTH);
  if (!query || /^[*?]+$/.test(query)) return null;

  const wildcard = hasWildcards(query);
  const anchoring = anchoringFor(mode, wildcard);
  const { script, conditions } = buildConditions(query, anchoring);

  const exact = buildConditions(query, { start: true, end: true });
  const prefix = buildConditions(query, { start: true, end: false });

  return {
    script,
    conditions,
    exactValues: exactValuesFor(query, script),
    exactConditions: exact.conditions,
    prefixConditions: prefix.conditions,
  };
}

// ---------------------------------------------------------------------------
// MongoDB expressions
// ---------------------------------------------------------------------------

function conditionToMatch(c: WordCondition) {
  return {
    word: {
      $elemMatch: {
        lang: c.languages.length === 1 ? c.languages[0] : { $in: c.languages },
        value: c.caseInsensitive
          ? { $regex: c.regex, $options: "i" }
          : { $regex: c.regex },
      },
    },
  };
}

/** `$match` filter selecting documents whose headword matches */
export function headwordMatchFilter(q: HeadwordQuery): Record<string, unknown> {
  const clauses = q.conditions.map(conditionToMatch);
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function anyWord(cond: unknown) {
  return {
    $anyElementTrue: [
      {
        $map: {
          input: { $ifNull: ["$word", []] },
          as: "w",
          in: cond,
        },
      },
    ],
  };
}

function conditionToExpr(c: WordCondition) {
  return anyWord({
    $and: [
      { $in: ["$$w.lang", c.languages] },
      {
        $regexMatch: {
          input: { $ifNull: ["$$w.value", ""] },
          regex: c.regex,
          options: c.caseInsensitive ? "i" : "",
        },
      },
    ],
  });
}

/**
 * `$addFields` stage computing `_tier` (0 exact, 1 loose exact, 2 starts
 * with, 3 contains) and `_len` (headword length) for ranking.
 */
export function rankingStage(q: HeadwordQuery): Record<string, unknown> {
  const strictConditions = q.conditions.filter((c) => !c.caseInsensitive);
  return {
    $addFields: {
      _tier: {
        $switch: {
          branches: [
            {
              case: anyWord({ $in: ["$$w.value", q.exactValues] }),
              then: 0,
            },
            {
              case: { $or: q.exactConditions.map(conditionToExpr) },
              then: 1,
            },
            {
              case: { $or: q.prefixConditions.map(conditionToExpr) },
              then: 2,
            },
          ],
          default: 3,
        },
      },
      // 0 when the script-exact form matched, 1 when only a loose spelling did
      _loose: strictConditions.length
        ? { $cond: [{ $or: strictConditions.map(conditionToExpr) }, 0, 1] }
        : 0,
      _len: {
        $strLenCP: {
          $ifNull: [{ $arrayElemAt: ["$word.value", 0] }, ""],
        },
      },
    },
  };
}

/**
 * Search string for a full-text ("meaning") search. Indic-script input is
 * also searched as lowercase ITRANS, which is how the phonetic index stores
 * Sanskrit words.
 */
export function meaningSearchText(rawQuery: string): string {
  const query = rawQuery.normalize("NFC").trim().replace(/[*?]/g, " ").trim();
  if (!query) return "";
  const script = detectInputScript(query);
  const extra: string[] = [];
  if (script === "devanagari") {
    extra.push(safeT(query, "devanagari", "itrans_dravidian").toLowerCase());
  } else if (script === "telugu") {
    extra.push(safeT(query, "telugu", "itrans_dravidian").toLowerCase());
  } else if (script === "iast") {
    extra.push(safeT(query.toLowerCase(), "iast", "itrans_dravidian").toLowerCase());
  }
  // A quoted phrase must stay intact; extra terms only widen word searches
  if (query.includes('"')) return query;
  return [query, ...extra.filter((e) => e && e !== query)].join(" ");
}

/** Mode values accepted in the URL, including legacy ones */
export function parseMatchMode(value: string | null | undefined): MatchMode {
  switch (value) {
    case "exact":
    case "key-exact":
    case "KEY_EXACT":
      return "exact";
    case "prefix":
    case "key-prefix":
    case "KEY_PREFIX":
      return "prefix";
    case "suffix":
      return "suffix";
    case "contains":
      return "contains";
    case "meaning":
    case "fulltext":
    case "FULLTEXT":
      return "meaning";
    default:
      return "smart";
  }
}
