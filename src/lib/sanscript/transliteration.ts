import Sanscript from "@indic-transliteration/sanscript";

/**
 * Shared transliteration helpers for the Sanskrit editor, the convertor and
 * the IME inputs. Everything here is pure, so it can be unit tested.
 */

export type SchemeKind = "brahmic" | "roman";

export interface SchemeOption {
  /** App level code (matches LANGUAGES where one exists: SAN, TEL, IAST ...) */
  value: string;
  label: string;
  /** Scheme name understood by @indic-transliteration/sanscript */
  scheme: string;
  kind: SchemeKind;
  /** Tailwind font class used to render text in this scheme */
  fontClass?: string;
  /** The script cannot represent every Sanskrit sound, so it does not round trip */
  lossy?: boolean;
  /** Unicode block of the script, [first, last] code point */
  block?: [number, number];
}

export const CONVERTER_SCHEMES: SchemeOption[] = [
  {
    value: "SAN",
    label: "Sanskrit (Devanagari)",
    scheme: "devanagari",
    kind: "brahmic",
    fontClass: "font-shobhika",
    block: [0x0900, 0x097f],
  },
  {
    value: "TEL",
    label: "Telugu",
    scheme: "telugu",
    kind: "brahmic",
    fontClass: "font-telugu",
    block: [0x0c00, 0x0c7f],
  },
  {
    value: "KAN",
    label: "Kannada",
    scheme: "kannada",
    kind: "brahmic",
    block: [0x0c80, 0x0cff],
  },
  {
    value: "MAL",
    label: "Malayalam",
    scheme: "malayalam",
    kind: "brahmic",
    block: [0x0d00, 0x0d7f],
  },
  {
    value: "TAM",
    label: "Tamil",
    scheme: "tamil",
    kind: "brahmic",
    lossy: true,
    block: [0x0b80, 0x0bff],
  },
  {
    value: "BEN",
    label: "Bengali",
    scheme: "bengali",
    kind: "brahmic",
    block: [0x0980, 0x09ff],
  },
  {
    value: "GUJ",
    label: "Gujarati",
    scheme: "gujarati",
    kind: "brahmic",
    block: [0x0a80, 0x0aff],
  },
  {
    value: "IAST",
    label: "IAST",
    scheme: "iast",
    kind: "roman",
    fontClass: "font-shobhika",
  },
  {
    value: "ISO",
    label: "ISO 15919",
    scheme: "iso",
    kind: "roman",
    fontClass: "font-shobhika",
  },
  {
    value: "ITRANS",
    label: "ITRANS",
    scheme: "itrans_dravidian",
    kind: "roman",
    fontClass: "font-shobhika",
  },
  {
    value: "HK",
    label: "Harvard-Kyoto",
    scheme: "hk",
    kind: "roman",
    fontClass: "font-shobhika",
  },
  {
    value: "SLP1",
    label: "SLP1",
    scheme: "slp1",
    kind: "roman",
    fontClass: "font-shobhika",
  },
  {
    value: "VELTHUIS",
    label: "Velthuis",
    scheme: "velthuis",
    kind: "roman",
    fontClass: "font-shobhika",
  },
  { value: "WX", label: "WX", scheme: "wx", kind: "roman" },
];

const SCHEME_BY_VALUE = new Map(CONVERTER_SCHEMES.map((s) => [s.value, s]));

export const BRAHMIC_SCHEMES = CONVERTER_SCHEMES.filter(
  (s) => s.kind === "brahmic",
);

export function getSchemeOption(value?: string | null) {
  return value ? SCHEME_BY_VALUE.get(value) : undefined;
}

/** Scheme used for what the user physically types when an IME is active */
export const IME_INPUT_SCHEME = "itrans_dravidian";

const hasScheme = (scheme?: string): scheme is string =>
  !!scheme && !!(Sanscript.schemes as Record<string, unknown>)[scheme];

const isRomanScheme = (scheme: string) =>
  !CONVERTER_SCHEMES.some((s) => s.scheme === scheme && s.kind === "brahmic");

/**
 * Sanscript.t that never throws and fixes the cases the library gets wrong:
 *  - unknown / "none" schemes return the text untouched instead of throwing
 *  - roman input is NFC normalised (decomposed diacritics pasted from PDFs or
 *    macOS otherwise turn into stray combining marks)
 *  - IAST short vowels (è, ò) produced for Dravidian text are read back as
 *    short vowels (the library turns them into a long vowel + stray accent)
 */
export function safeTransliterate(
  text: string,
  fromScheme: string,
  toScheme: string,
): string {
  if (!text) return "";
  if (fromScheme === toScheme) return text;
  if (!hasScheme(fromScheme) || !hasScheme(toScheme)) return text;

  try {
    let input = text;
    let from = fromScheme;
    if (isRomanScheme(from)) {
      input = input.normalize("NFC");
      if (from === "iast" && /[èòÈÒ]/.test(input)) {
        // Route through ISO 15919, where short e / o are plain letters
        input = Sanscript.t(input, "iast", "iso")
          .normalize("NFC")
          .replace(/\u1E15/g, "e") // ē + grave
          .replace(/\u1E51/g, "o") // ō + grave
          .replace(/\u0113\u0300/g, "e")
          .replace(/\u014D\u0300/g, "o");
        from = "iso";
        if (toScheme === "iso") return input;
      }
    }
    return Sanscript.t(input, from, toScheme);
  } catch (error) {
    console.warn(
      `Transliteration failed (${fromScheme} -> ${toScheme}):`,
      error,
    );
    return text;
  }
}

/** Convert between two app level scheme codes (SAN, TEL, IAST ...) */
export function convertText(text: string, from: string, to: string): string {
  const fromOpt = getSchemeOption(from);
  const toOpt = getSchemeOption(to);
  if (!fromOpt || !toOpt) return text;
  return safeTransliterate(text, fromOpt.scheme, toOpt.scheme);
}

// Danda / double danda live in the Devanagari block but belong to every script
const isSharedPunctuation = (cp: number) => cp === 0x0964 || cp === 0x0965;
const isJoiner = (cp: number) => cp === 0x200c || cp === 0x200d;

function brahmicSchemeOfCodePoint(cp: number): SchemeOption | undefined {
  if (cp < 0x0900 || cp > 0x0d7f || isSharedPunctuation(cp)) return undefined;
  return BRAHMIC_SCHEMES.find(
    (s) => s.block && cp >= s.block[0] && cp <= s.block[1],
  );
}

/** The Brahmic script most of the text is written in, if any */
export function detectBrahmicScheme(text: string): string | undefined {
  const counts = new Map<string, number>();
  for (const ch of text) {
    const opt = brahmicSchemeOfCodePoint(ch.codePointAt(0)!);
    if (opt) counts.set(opt.value, (counts.get(opt.value) || 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

const ISO_ONLY = /[ēōĒŌṁṀ]|[rl]\u0325/i;
const ROMAN_DIACRITICS = /[āīūṛṝḷḹṅñṭḍṇśṣḥṃèò]/i;

/**
 * Best guess of the scheme a text is written in.
 * Returns undefined when it cannot tell (plain ASCII that could be HK, ITRANS
 * or just English), so callers keep whatever the user selected.
 */
export function detectScheme(text: string): string | undefined {
  if (!text.trim()) return undefined;
  const brahmic = detectBrahmicScheme(text);
  if (brahmic) return brahmic;

  const nfc = text.normalize("NFC");
  if (ISO_ONLY.test(nfc)) return "ISO";
  if (ROMAN_DIACRITICS.test(nfc)) return "IAST";

  // Plain ASCII could be HK, ITRANS, SLP1 or English: not worth guessing
  return undefined;
}

/**
 * Convert every script found in a text to one target scheme.
 * Each run of Brahmic text is converted from its own script, so a document
 * mixing Telugu and Devanagari ends up in a single script. Latin text is only
 * converted when `romanFrom` says which scheme it is written in.
 */
export function convertMixedText(
  text: string,
  to: string,
  options: { romanFrom?: string } = {},
): string {
  const toOpt = getSchemeOption(to);
  if (!toOpt || !text) return text;
  const romanOpt = getSchemeOption(options.romanFrom);

  const convertRun = (run: string, from?: SchemeOption) => {
    if (from) return safeTransliterate(run, from.scheme, toOpt.scheme);
    if (romanOpt && romanOpt.kind === "roman") {
      return safeTransliterate(run, romanOpt.scheme, toOpt.scheme);
    }
    return run;
  };

  let out = "";
  let run = "";
  let runScheme: SchemeOption | undefined;

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const scheme = brahmicSchemeOfCodePoint(cp);
    // joiners stay inside the word they belong to
    const sameRun =
      run !== "" && (scheme === runScheme || (isJoiner(cp) && !!runScheme));
    if (sameRun) {
      run += ch;
    } else {
      out += convertRun(run, runScheme);
      run = ch;
      runScheme = scheme;
    }
  }
  return out + convertRun(run, runScheme);
}

/**
 * Convert a whole document to `to`, working out the source by itself:
 * Brahmic runs are converted from their own script; if the text has no
 * Brahmic script at all the Latin text is read as `romanFallback` (or the
 * detected roman scheme).
 */
export function convertTextSmart(
  text: string,
  to: string,
  romanFallback = "ITRANS",
): string {
  if (detectBrahmicScheme(text)) return convertMixedText(text, to);
  const romanFrom = detectScheme(text) || romanFallback;
  return convertMixedText(text, to, { romanFrom });
}

const HAS_ASCII_LETTER = /[A-Za-z]/;
const HAS_NON_ASCII = /[^\x00-\x7F]/;

/**
 * Turn the word under the cursor into what should be transliterated.
 * When a word already holds target script letters followed by freshly typed
 * Latin ones (the user went back to extend or fix a word), the script part is
 * mapped back to the input scheme first so both halves join into proper
 * syllables: "రామ" + "ya" gives "rAmaya" (రామయ), not "రామ" + "య".
 */
export function composeImeWord(
  word: string,
  toScheme: string,
  inputScheme = IME_INPUT_SCHEME,
): string {
  if (!HAS_NON_ASCII.test(word) || !HAS_ASCII_LETTER.test(word)) return word;
  return safeTransliterate(word, toScheme, inputScheme);
}

/** True when the word has Latin letters that still need transliterating */
export function needsTransliteration(word: string): boolean {
  return HAS_ASCII_LETTER.test(word);
}
