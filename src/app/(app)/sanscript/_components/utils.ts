import Sanscript from "@indic-transliteration/sanscript";

export const LANGUAGE_SANSCRIPT_DDLB = {
  SAN: { label: "Sanskrit", scheme: "devanagari" },
  TEL: { label: "Telugu", scheme: "telugu" },
  ITRANS: { label: "ITRANS", scheme: "itrans_dravidian" },
  IAST: { label: "IAST", scheme: "iast" },
  SLP1: { label: "SLP1", scheme: "slp1" },
} as Record<string, { label: string; scheme: string }>;

export const LANGUAGE_TO_TRANSLITERATION_DDLB = {
  SAN: { label: "Sanskrit", scheme: "devanagari" },
  TEL: { label: "Telugu", scheme: "telugu" },
} as Record<string, { label: string; scheme: string }>;

export const TRANSLITERATION_SCHEMES_FROM = [
  "itrans_dravidian",
  // "slp1",
  // "hk",
  // "wx",
  // "iast",
];

export const TRANSLITERATION_CHAR_MAP_TO_ITRANS = {
  ru: ["R^I", "R^i"],
  lr: ["L^I", "L^i"],
  ch: ["Ch"],
  th: ["Th", "t"],
  dh: ["Dh"],
  kh: ["x"],
  n: ["~N", "~n", "N"],
  t: ["T"],
  d: ["D"],
  s: ["sh", "Sh"],
  l: ["L"],
} as Record<string, string[]>;

const expandTransliterationText = (text: string): string[] => {
  const textArr: string[] = [text];
  Object.keys(TRANSLITERATION_CHAR_MAP_TO_ITRANS).forEach((charKey) => {
    const charArr = TRANSLITERATION_CHAR_MAP_TO_ITRANS[charKey];
    textArr.forEach((t) => {
      if (t.indexOf(charKey) >= 0) {
        charArr.forEach((c) => {
          textArr.push(t.replace(RegExp(charKey, "g"), c));
        });
      }
    });
  });
  // console.log(textArr);
  return textArr;
};

export const transliterateText = ({
  text,
  toScheme,
  fromScheme = "itrans_dravidian",
}: {
  text: string;
  fromScheme?: string;
  toScheme: string;
}): string[] => {
  const transOut = TRANSLITERATION_SCHEMES_FROM.map((scheme) =>
    Sanscript.t(text, scheme, toScheme)
  );
  const replacedTransOut = expandTransliterationText(text);
  const expandedTransOut = replacedTransOut.map((t) =>
    Sanscript.t(t, fromScheme, toScheme)
  );
  const transSet = new Set([...transOut, ...expandedTransOut]);
  return Array.from(transSet);
};

export type WordAtCursor = {
  start: number;
  end: number;
  word: string;
  prevText: string;
};

export const getWordAtCursor = (
  text: string,
  cursorPos: number
): WordAtCursor => {
  const letterBefore = text[Math.max(0, cursorPos - 1)] ?? " ";
  const letterAfter = text[Math.min(text.length, cursorPos + 1)] ?? " ";
  // console.log(letterBefore, letterAfter, cursorPos, text.length, text);

  if (letterBefore === " " && letterAfter === " ") {
    return { start: cursorPos, end: cursorPos, word: "", prevText: "" };
  }

  let start = Math.max(0, cursorPos - 1);
  let end = cursorPos;

  while (text[start] !== " " && start >= 0) {
    start--;
  }
  while (text[end] !== " " && end < text.length) {
    end++;
  }
  // console.log(start, end);

  return {
    start: start + 1,
    end,
    word: text.substring(start + 1, end),
    prevText: "",
  };
};

export function replaceWordAtCursor({
  textArea,
  word,
  start,
  end,
}: {
  textArea: HTMLTextAreaElement;
  word: string;
  start: number;
  end: number;
}) {
  const oldText = textArea.value;

  const prefix = oldText.substring(0, start);
  const suffix = oldText.substring(end);

  const newText = `${prefix}${word}${suffix}`;

  textArea.value = newText;

  textArea.selectionStart = start;
  textArea.selectionEnd = start + word.length;

  textArea.focus();
}