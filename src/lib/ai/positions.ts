/**
 * Questions that point at verses by where they are — "the first 10 slokas",
 * "verses 5 to 12", "chapter 3 verse 4", "the next 10" — cannot be answered
 * by searching for meaning or keywords: nothing in a verse says it is the
 * third one. They are recognised here so exactly those verses can be read,
 * and nothing else is sent to the model.
 */

/** Verses named outright. */
export type AbsolutePosition =
  | { kind: "first" | "last"; count: number }
  /** 1-based verse numbers, as inclusive ranges; `to` may be Infinity */
  | { kind: "numbers"; ranges: [number, number][] };

/** Verses named relative to the ones an earlier turn read. */
export type RelativePosition =
  /** count null: as many as were read last time */
  | { kind: "next" | "previous"; count: number | null }
  /** everything after the ones read last time */
  | { kind: "rest" }
  /** the ones read last time, again */
  | { kind: "same" };

export type PositionRequest = AbsolutePosition | RelativePosition;

export type QuestionTarget = {
  /**
   * Chapter numbers to descend through before reading, outermost first:
   * "kanda 2 sarga 5" and "verse 2.5.3" both give [2, 5]. -1 is the last one.
   */
  path: number[];
  position: PositionRequest | null;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  couple: 2,
  three: 3,
  four: 4,
  five: 5,
  few: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
};

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  last: -1,
  final: -1,
};

/** How many "the opening verses" means when no number is given. */
const UNCOUNTED_PLURAL = 5;

const UNIT =
  "(?:verses?|[sś]h?lok(?:am|a)s?|stanzas?|mantras?|padyam?s?|lines?)";
const CONTAINER =
  "(?:chapter|adhy[aā]y(?:am|a)|sarga|canto|section|part|k[aā][nṇ][dḍ]a(?:m)?|parva(?:m|n)?|book|skandha|da[sś]aka(?:m)?|anuv[aā]ka|ma[nṇ][dḍ]ala|s[uū]kta)";
const COUNT = `(\\d{1,3}|${Object.keys(NUMBER_WORDS).join("|")})`;
const NUMBER = "\\d{1,4}(?![.:]?\\d)";
const RANGE_WORD = "(?:-|–|—|to|through|thru|till|until)";
const LIST_WORD = `(?:${RANGE_WORD}|and|&|,)`;
/** "first 2 chapters" counts something other than verses */
const NOT_VERSES = `(?:${CONTAINER}s?|chapters?|books?|words?|letters?|syllables?|times?|things?|points?|questions?)`;

const FIRST = "first|opening|beginning|starting|initial";
const LAST = "last|final|closing|ending|concluding";

const re = (source: string, flags = "iu") => new RegExp(source, flags);

// ── which chapter ────────────────────────────────────────────────────────
// "chapter 3", "sarga 12", "chapter 1.2"
const CONTAINER_NUMBER = re(
  `\\b${CONTAINER}\\s*(?:numbers?\\s*|nos?\\.?\\s*|#\\s*)?(\\d{1,3}(?:\\.\\d{1,3})*)(?![.:]?\\d)`,
  "giu",
);
// "3rd chapter", "second sarga", "last chapter"
const CONTAINER_ORDINAL = re(
  `\\b(?:(\\d{1,3})(?:st|nd|rd|th)|(${Object.keys(ORDINAL_WORDS).join("|")}))\\s+${CONTAINER}\\b`,
  "giu",
);
// "verse 2.47", "slokas 1.2.5 to 1.2.9"
const DOTTED = re(
  `${UNIT}\\s*((?:\\d{1,3}\\.)+)(\\d{1,4})(?:\\s*${RANGE_WORD}\\s*(?:\\d{1,3}\\.)*(\\d{1,4}))?(?![.:]?\\d)`,
);

// ── which verses, by number ──────────────────────────────────────────────
// "verse 12", "slokas 5 to 10", "verses 3, 7 and 9", "verse 5 to verse 9"
const NUMBERED = re(
  `${UNIT}\\s*(?:numbers?\\s*|nos?\\.?\\s*|#\\s*)?(${NUMBER}(?:\\s*${LIST_WORD}\\s*(?:${UNIT}\\s*)?${NUMBER})*)`,
);
// "the 10th sloka"
const ORDINAL = re(`\\b(\\d{1,4})(?:st|nd|rd|th)\\s+${UNIT}`);
// "5 verses after verse 20"
const COUNT_AFTER = re(
  `\\b${COUNT}\\s+(?:more\\s+)?${UNIT}\\s+(?:after|following)\\s+(?:${UNIT}\\s*)?(${NUMBER})`,
);
// "5 verses from verse 20", "ten slokas starting at 20"
const COUNT_FROM = re(
  `\\b${COUNT}\\s+${UNIT}\\s+(?:from|(?:starting|beginning)\\s+(?:at|from|with))\\s+(?:${UNIT}\\s*)?(${NUMBER})`,
);
// "verse 20 onwards", "verses 20 to the end"
const ONWARDS = re(
  `${UNIT}\\s*(${NUMBER})\\s*(?:onwards?|and\\s+(?:onwards?|beyond|after)|(?:to|till|until)\\s+(?:the\\s+)?end)`,
);
// "from verse 20" (but not "from verse 20 to 30")
const FROM_OPEN = re(
  `\\bfrom\\s+${UNIT}\\s*(${NUMBER})(?!\\s*${LIST_WORD}\\s*(?:${UNIT}\\s*)?\\d)`,
);
const AFTER_OPEN = re(`\\bafter\\s+${UNIT}\\s*(${NUMBER})`);
const UP_TO = re(
  `\\b(?:up\\s*to|till|until|through)\\s+${UNIT}\\s*(${NUMBER})`,
);
const BEFORE = re(`\\bbefore\\s+${UNIT}\\s*(${NUMBER})`);

// ── which verses, from either end ────────────────────────────────────────
// "first 10 slokas", "last verse", "opening verses"
const EDGE_WITH_UNIT = re(
  `\\b(${FIRST}|${LAST})\\s+(?:${COUNT}\\s+)?(${UNIT})`,
);
// "explain the first 10"
const EDGE_BARE = re(
  `\\b(${FIRST}|${LAST})\\s+${COUNT}\\b(?!\\s+${NOT_VERSES})`,
);

// ── which verses, relative to the last ones read ─────────────────────────
// "next 10 slokas", "the next verse", "next ones"
const NEXT = re(
  `\\b(?:next|subsequent)\\s+(?:${COUNT}\\s+)?(?:(${UNIT})|ones?\\b)`,
);
const NEXT_BARE = re(
  `\\b(?:next|subsequent)\\s+${COUNT}\\b(?!\\s+${NOT_VERSES})`,
);
// "5 more verses", "ten more"
const MORE = re(`\\b${COUNT}\\s+more\\s+${UNIT}|^\\W*${COUNT}\\s+more\\W*$`);
const CONTINUE =
  /^\W*(?:please\s+)?(?:continue|go on|carry on|proceed|keep going|next|more)(?:\s+please)?\W*$/i;
const PREVIOUS = re(
  `\\b(?:previous|preceding|prior)\\s+(?:${COUNT}\\s+)?(${UNIT})`,
);
const PREVIOUS_BARE = re(
  `\\b(?:previous|preceding|prior)\\s+${COUNT}\\b(?!\\s+${NOT_VERSES})`,
);
// "these verses", "the same slokas", "this verse" — but not "that verse where…"
const SAME = re(
  `\\b(?:these|those|same|above|this|that)\\s+(?:${COUNT}\\s+)?${UNIT}\\b(?!\\s+(?:where|which|in\\s+which|that|when|whose))`,
);
const REST = /\b(?:the\s+rest|remaining|remainder)\b/i;

const toCount = (value: string) =>
  NUMBER_WORDS[value.toLowerCase()] ?? parseInt(value, 10);

const edgeKind = (word: string) =>
  re(`^(?:${LAST})$`).test(word) ? "last" : "first";

const isPlural = (unit: string | undefined) => !unit || /s$/i.test(unit);

const range = (from: number, to: number): AbsolutePosition | null =>
  to >= Math.max(from, 1)
    ? { kind: "numbers", ranges: [[Math.max(from, 1), to]] }
    : null;

function parsePath(question: string): number[] {
  const found: { at: number; numbers: number[] }[] = [];
  for (const m of question.matchAll(CONTAINER_NUMBER)) {
    found.push({ at: m.index ?? 0, numbers: m[1].split(".").map(Number) });
  }
  for (const m of question.matchAll(CONTAINER_ORDINAL)) {
    const n = m[1] ? parseInt(m[1], 10) : ORDINAL_WORDS[m[2].toLowerCase()];
    found.push({ at: m.index ?? 0, numbers: [n] });
  }
  return found
    .sort((a, b) => a.at - b.at)
    .flatMap((f) => f.numbers)
    .filter((n) => n >= 1 || n === -1);
}

function parseAbsolute(question: string): AbsolutePosition | null {
  let m = question.match(COUNT_AFTER);
  if (m) {
    const n = parseInt(m[2], 10);
    return range(n + 1, n + toCount(m[1]));
  }
  m = question.match(COUNT_FROM);
  if (m) {
    const n = parseInt(m[2], 10);
    return range(n, n + toCount(m[1]) - 1);
  }
  m = question.match(ONWARDS) ?? question.match(FROM_OPEN);
  if (m) return range(parseInt(m[1], 10), Infinity);
  m = question.match(AFTER_OPEN);
  if (m) return range(parseInt(m[1], 10) + 1, Infinity);

  m = question.match(NUMBERED);
  if (m) {
    const ranges = m[1]
      .split(/\s*(?:,|and|&)\s*/i)
      .map((part) => (part.match(/\d+/g) ?? []).map(Number))
      .filter((nums) => nums.length > 0)
      .map((nums): [number, number] => {
        const to = nums[nums.length - 1];
        return [Math.min(nums[0], to), Math.max(nums[0], to)];
      })
      .filter(([from]) => from >= 1);
    // "verse 12" alone is that verse; "up to verse 12" is read below
    const single = ranges.length === 1 && ranges[0][0] === ranges[0][1];
    const bounded = single && (UP_TO.test(question) || BEFORE.test(question));
    if (ranges.length > 0 && !bounded) return { kind: "numbers", ranges };
  }
  m = question.match(UP_TO);
  if (m) return range(1, parseInt(m[1], 10));
  m = question.match(BEFORE);
  if (m) return range(1, parseInt(m[1], 10) - 1);

  m = question.match(ORDINAL);
  if (m) return range(parseInt(m[1], 10), parseInt(m[1], 10));
  return null;
}

function parseRelative(question: string): RelativePosition | null {
  let m = question.match(NEXT);
  if (m) {
    return {
      kind: "next",
      count: m[1] ? toCount(m[1]) : isPlural(m[2]) ? null : 1,
    };
  }
  m = question.match(NEXT_BARE);
  if (m) return { kind: "next", count: toCount(m[1]) };
  m = question.match(MORE);
  if (m) return { kind: "next", count: toCount(m[1] ?? m[2]) };
  if (CONTINUE.test(question)) return { kind: "next", count: null };

  m = question.match(PREVIOUS);
  if (m) {
    return {
      kind: "previous",
      count: m[1] ? toCount(m[1]) : isPlural(m[2]) ? null : 1,
    };
  }
  m = question.match(PREVIOUS_BARE);
  if (m) return { kind: "previous", count: toCount(m[1]) };

  if (REST.test(question)) return { kind: "rest" };
  if (SAME.test(question)) return { kind: "same" };
  return null;
}

function parseEdge(question: string): AbsolutePosition | null {
  const edge = question.match(EDGE_WITH_UNIT);
  if (edge) {
    const count = edge[2]
      ? toCount(edge[2])
      : isPlural(edge[3])
        ? UNCOUNTED_PLURAL
        : 1;
    if (count >= 1) return { kind: edgeKind(edge[1]), count };
  }
  const bare = question.match(EDGE_BARE);
  if (bare) {
    const count = toCount(bare[2]);
    if (count >= 1) return { kind: edgeKind(bare[1]), count };
  }
  return null;
}

/** Reads which chapter and which verses a question points at, if any. */
export function parseQuestion(question: string): QuestionTarget {
  const path = parsePath(question);

  const dotted = question.match(DOTTED);
  if (dotted) {
    const from = parseInt(dotted[2], 10);
    const to = dotted[3] ? parseInt(dotted[3], 10) : from;
    return {
      // "chapter 2, verse 2.47" names the chapter twice
      path:
        path.length > 0
          ? path
          : dotted[1].split(".").filter(Boolean).map(Number),
      position: range(Math.min(from, to), Math.max(from, to)),
    };
  }

  return {
    path,
    position:
      parseAbsolute(question) ?? parseRelative(question) ?? parseEdge(question),
  };
}

/** The verses a question points at by position, or null if it names none. */
export const parsePositions = (question: string) =>
  parseQuestion(question).position;

export const isRelative = (
  request: PositionRequest,
): request is RelativePosition =>
  request.kind === "next" ||
  request.kind === "previous" ||
  request.kind === "rest" ||
  request.kind === "same";

type Picked<T> = { items: T[]; truncated: boolean };

const capped = <T>(wanted: T[], max: number): Picked<T> => ({
  items: wanted.slice(0, max),
  truncated: wanted.length > max,
});

/**
 * Picks the requested items out of a container's children, which must be in
 * reading order. Verse numbers are `order + 1`, the number shown in
 * references. At most `max` are returned.
 */
export function selectPositions<T extends { order: number }>(
  items: T[],
  request: AbsolutePosition,
  max: number,
): Picked<T> {
  const wanted =
    request.kind === "numbers"
      ? items.filter((item) =>
          request.ranges.some(
            ([from, to]) => item.order + 1 >= from && item.order + 1 <= to,
          ),
        )
      : request.kind === "first"
        ? items.slice(0, request.count)
        : items.slice(-request.count);
  return capped(wanted, max);
}

/**
 * Picks the items before / after the ones read earlier (`readIds`) out of
 * their container's children, in reading order. Null when none of the
 * earlier ones are in this container; an empty pick when they were already
 * at its edge.
 */
export function selectRelative<T extends { id: string }>(
  items: T[],
  readIds: Set<string>,
  request: Exclude<RelativePosition, { kind: "same" }>,
  max: number,
): Picked<T> | null {
  let lo = -1;
  let hi = -1;
  items.forEach((item, index) => {
    if (!readIds.has(item.id)) return;
    if (lo < 0) lo = index;
    hi = index;
  });
  if (lo < 0) return null;
  if (request.kind === "rest") return capped(items.slice(hi + 1), max);
  const count = request.count ?? readIds.size;
  return capped(
    request.kind === "next"
      ? items.slice(hi + 1, hi + 1 + count)
      : items.slice(Math.max(0, lo - count), lo),
    max,
  );
}
