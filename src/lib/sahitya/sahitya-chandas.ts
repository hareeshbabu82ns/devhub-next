/**
 * Metre scansion of a Devanagari verse: splits it into syllables (akṣaras)
 * and marks each laghu or guru.
 *
 * The data repository used to carry this table (`ch.s`); upstream dropped it
 * in July 2025 and computes it at runtime instead, so it is computed here
 * from the verse text. When a record still has `ch.s`, that is used as is.
 *
 * Rules (classical prosody):
 *  - a syllable is a vowel with the consonants before it; consonants with a
 *    virāma join the onset of the next syllable (so "पूर्व" → पू · र्व), and
 *    consonants left at the end of a line close the last syllable;
 *  - a syllable is guru when its vowel is long (आ ई ऊ ॠ ॡ ए ऐ ओ औ), when it
 *    carries anusvāra or visarga, when it is closed by a consonant, or when
 *    the next syllable starts with two or more consonants; else laghu.
 *    Candrabindu does not make a syllable heavy.
 */

export type Weight = "l" | "g";
export type Syllable = [text: string, weight: Weight];

const VIRAMA = "्";
const NUKTA = "़";
const isConsonant = (c: string) =>
  (c >= "क" && c <= "ह") || (c >= "क़" && c <= "य़") || (c >= "ॸ" && c <= "ॿ");
const isIndependentVowel = (c: string) =>
  (c >= "ऄ" && c <= "औ") || c === "ॠ" || c === "ॡ" || (c >= "ॲ" && c <= "ॷ");
const isVowelSign = (c: string) =>
  (c >= "ा" && c <= "ौ") || c === "ॢ" || c === "ॣ" || (c >= "ॕ" && c <= "ॗ");
const LONG = new Set([..."आईऊॠॡएऐओऔ", ..."ाीूॄॣेैोौ"]);
const HEAVY_MARKS = new Set(["ं", "ः"]); // anusvāra, visarga
const NASAL = "ँ"; // candrabindu

interface Raw {
  text: string;
  onset: number;
  long: boolean;
  heavyMark: boolean;
  closed: boolean;
}

/** Splits one line (pāda or half-verse) into weighted syllables. */
export function scanLine(line: string): Syllable[] {
  const chars = [...line.normalize("NFC")];
  const out: Raw[] = [];
  let pending = "";
  let pendingCount = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (isConsonant(c)) {
      let cons = c;
      if (chars[i + 1] === NUKTA) cons += chars[++i];
      if (chars[i + 1] === VIRAMA) {
        pending += cons + chars[++i];
        pendingCount++;
        continue;
      }
      let text = pending + cons;
      let long = false;
      if (isVowelSign(chars[i + 1] ?? "")) {
        const sign = chars[++i];
        text += sign;
        long = LONG.has(sign);
      }
      out.push({ text, onset: pendingCount + 1, long, heavyMark: false, closed: false });
      pending = "";
      pendingCount = 0;
    } else if (isIndependentVowel(c)) {
      out.push({ text: pending + c, onset: pendingCount, long: LONG.has(c), heavyMark: false, closed: false });
      pending = "";
      pendingCount = 0;
    } else if (HEAVY_MARKS.has(c) || c === NASAL) {
      const last = out[out.length - 1];
      if (last && !pending) {
        last.text += c;
        if (HEAVY_MARKS.has(c)) last.heavyMark = true;
      }
    }
    // spaces, hyphens, avagraha, punctuation: no syllable, and consonants
    // pending across a word break still open the next syllable
  }
  if (pending && out.length) {
    const last = out[out.length - 1];
    last.text += pending;
    last.closed = true;
  }
  return out.map((s, i) => [
    s.text,
    s.long || s.heavyMark || s.closed || (out[i + 1]?.onset ?? 0) >= 2 ? "g" : "l",
  ]);
}

/** Metres counted in mātrās (āryā family), whose halves are not split. */
const isJati = (name: string) => /आर्या|गीति|मात्रा|वैतालीय|औपच्छन्दसिक/.test(name);

/**
 * Scans a whole verse into lines. The text is cut at dandas (and line
 * breaks); each half-verse is cut again into its two pādas (in the middle,
 * or one short of it for ardhasama metres), unless the text already has four
 * or more lines or the metre is counted in mātrās.
 */
export function scanVerse(verse: string, metre = ""): Syllable[][] {
  const lines = verse
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/[०-९0-9]/g, "")
    .split(/[।॥|\n]+/)
    .map(scanLine)
    .filter((l) => l.length > 0);
  if (lines.length >= 4 || isJati(metre)) return lines;
  // ardhasama metres (viyoginī 10+11, puṣpitāgrā 12+13…): every half has the
  // same odd length and its first pāda is one syllable shorter
  const sameOdd =
    lines.length > 1 && lines.every((l) => l.length === lines[0].length && l.length % 2 === 1);
  return lines.flatMap((l) => {
    if (l.length < 8) return [l];
    const cut = l.length % 2 === 0 ? l.length / 2 : sameOdd ? (l.length - 1) / 2 : 0;
    return cut ? [l.slice(0, cut), l.slice(cut)] : [l];
  });
}

const GANA: Record<string, string> = {
  lgg: "य",
  ggg: "म",
  ggl: "त",
  glg: "र",
  lgl: "ज",
  gll: "भ",
  lll: "न",
  llg: "स",
};

/** "जतजगग": the line's weights read in groups of three, then ल / ग. */
export function ganas(line: Syllable[]): string {
  const w = line.map((s) => s[1]).join("");
  let out = "";
  let i = 0;
  for (; i + 3 <= w.length; i += 3) out += GANA[w.slice(i, i + 3)];
  for (; i < w.length; i++) out += w[i] === "g" ? "ग" : "ल";
  return out;
}

export const matras = (line: Syllable[]) => line.reduce((n, s) => n + (s[1] === "g" ? 2 : 1), 0);

/** Accepts the source's own syllables (`ch.s`) when present. */
export function readSourceSyllables(s: unknown): Syllable[][] | null {
  if (!Array.isArray(s) || s.length === 0) return null;
  const lines = s
    .filter(Array.isArray)
    .map((line: unknown[]) =>
      line
        .filter((x): x is [string, string] => Array.isArray(x) && typeof x[0] === "string")
        .map(([t, w]): Syllable => [t, w === "g" ? "g" : "l"]),
    )
    .filter((l) => l.length > 0);
  return lines.length ? lines : null;
}

const cell = (s: string) => s.replace(/\|/g, "\\|");

/**
 * The scansion as markdown: one row per line, guru in bold, then the line's
 * gaṇas and mātrā count.
 */
export function scansionMarkdown(lines: Syllable[][], metre?: string): string {
  if (lines.length === 0) return "";
  const width = Math.max(...lines.map((l) => l.length));
  const head = [...Array.from({ length: width }, (_, i) => String(i + 1)), "गणाः", "मात्राः"];
  const rows = lines.map((l) => {
    const cells = Array.from({ length: width }, (_, i) =>
      l[i] ? (l[i][1] === "g" ? `**${cell(l[i][0])}**` : cell(l[i][0])) : "",
    );
    return `| ${[...cells, ganas(l), String(matras(l))].join(" | ")} |`;
  });
  return [
    metre ? `**छन्दः**: ${metre}` : "",
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows,
    "",
    "**गुरु** (bold) · लघु (plain)",
  ]
    .filter((x, i) => i > 0 || x)
    .join("\n")
    .replace(/^(\*\*छन्दः\*\*: .*)\n/, "$1\n\n");
}
