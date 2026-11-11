/**
 * Turns a markdown answer into plain text a voice can read: no citation
 * markers, link targets, code or formatting symbols.
 */
export const toSpeakable = (markdown: string) =>
  markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // citations like [3] or [1, 2]
    .replace(/\s*\[\d+(?:\s*[,–-]\s*\d+)*\]/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, "")
    .replace(/\|/g, ", ")
    .replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, "$2")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

/**
 * Splits text into short pieces, at sentence ends where possible. Browsers
 * cut off long utterances, and a server voice starts sooner on short input.
 */
export const splitForSpeech = (text: string, max = 240): string[] => {
  const sentences =
    text.match(/[^.!?।॥\n]+(?:[.!?।॥]+|\n|$)/g)?.map((s) => s.trim()) ?? [];
  const pieces: string[] = [];
  let current = "";
  const flush = () => {
    if (current) pieces.push(current);
    current = "";
  };
  for (const sentence of sentences.filter(Boolean)) {
    if (sentence.length > max) {
      flush();
      // too long for one piece: break at commas, then at spaces
      let rest = sentence;
      while (rest.length > max) {
        const window = rest.slice(0, max);
        const cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf(" "));
        const at = cut > max / 3 ? cut + 1 : max;
        pieces.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
    } else if (current && current.length + sentence.length + 1 > max) {
      flush();
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  flush();
  return pieces;
};

/** Language to read a piece in, from the script most of it is written in. */
export const speechLangFor = (text: string, fallback = "en") => {
  const count = (re: RegExp) => text.match(re)?.length ?? 0;
  const devanagari = count(/[ऀ-ॿ]/g);
  const telugu = count(/[ఀ-౿]/g);
  const latin = count(/[A-Za-z]/g);
  if (telugu > latin && telugu >= devanagari) return "te-IN";
  // Sanskrit voices are rare; a Hindi voice reads Devanagari well
  if (devanagari > latin) return "hi-IN";
  return fallback;
};
