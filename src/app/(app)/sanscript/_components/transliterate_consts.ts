export const SANS_VOWELS_TO_ITRANS_DRAVIDIAN = {
  अ: "a",
  आ: "A",
  इ: "i",
  ई: "I",
  उ: "u",
  ऊ: "U",
  ऋ: "RRi",
  ॠ: "RRI",
  ऌ: "LLi",
  ॡ: "LLI",
  ऎ: "e",
  ए: "E",
  ऐ: "ai",
  ऒ: "o",
  ओ: "O",
  औ: "au",
} as Record<string, string>;

export const SANS_YOGAVAAHAS_TO_ITRANS_DRAVIDIAN = {
  "ं": "M",
  "ः": "H",
  "ँ": ".N",
} as Record<string, string>;

export const SANS_VIRAMA_TO_ITRANS_DRAVIDIAN = {
  "्": "",
} as Record<string, string>;

export const SANS_CONSONANTS_TO_ITRANS_DRAVIDIAN = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "~N",
  च: "ch",
  छ: "Ch",
  ज: "j",
  झ: "jh",
  ञ: "~n",
  ट: "T",
  ठ: "Th",
  ड: "D",
  ढ: "Dh",
  ण: "N",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "sh",
  ष: "Sh",
  स: "s",
  ह: "h",
  ळ: "L",
  क्ष: "kSh",
  ज्ञ: "j~n",
} as Record<string, string>;

export const SANS_SYMBOLS_TO_ITRANS_DRAVIDIAN = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
  ॐ: "OM",
  ऽ: ".a",
  "।": "|",
  "॥": "||",
} as Record<string, string>;

export const SANS_CANDRA_TO_ITRANS_DRAVIDIAN = {
  "ॅ": ".c",
} as Record<string, string>;

export const SANS_ZWJ_TO_ITRANS_DRAVIDIAN = {
  "\u200d": "{}",
} as Record<string, string>;

export const SANS_SKIP_TO_ITRANS_DRAVIDIAN = {
  "": "_",
} as Record<string, string>;

export const SANS_ACCENTS_TO_ITRANS_DRAVIDIAN = {
  "॑": "\\'",
  "॒": "\\_",
} as Record<string, string>;

export const SANS_EXTRA_CONSONANTS_TO_ITRANS_DRAVIDIAN = {
  क़: "q",
  ख़: "K",
  ग़: "G",
  ज़: "z",
  ड़: ".D",
  ढ़: ".Dh",
  फ़: "f",
  य़: "Y",
  ऱ: "R",
  ऴ: "zh",
  ऩ: "n2",
} as Record<string, string>;

export const ALTERNATES_TO_ITRANS_DRAVIDIAN = {
  A: ["aa"],
  I: ["ii", "ee"],
  U: ["uu", "oo"],
  RRi: ["R^i"],
  RRI: ["R^I"],
  LLi: ["L^i"],
  LLI: ["L^I"],
  M: [".m", ".n"],
  "~N": ["N^"],
  ch: ["c"],
  Ch: ["C", "chh"],
  "~n": ["JN"],
  v: ["w"],
  Sh: ["S", "shh"],
  kSh: ["kS", "x"],
  "j~n": ["GY", "dny"],
  OM: ["AUM"],
  "\\_": ["\\`"],
  "\\_H": ["\\`H"],
  "\\'M": ["\\'.m", "\\'.n"],
  "\\_M": ["\\_.m", "\\_.n", "\\`M", "\\`.m", "\\`.n"],
  ".a": ["~"],
  "|": ["."],
  "||": [".."],
  z: ["J"],
} as Record<string, string[]>;

export const SANS_TO_ITRANS_DRAVIDIAN_HELP = [
  { label: "Vowels", values: SANS_VOWELS_TO_ITRANS_DRAVIDIAN },
  {
    label: "Consonants",
    values: SANS_CONSONANTS_TO_ITRANS_DRAVIDIAN,
  },
  {
    label: "Extra Consonants",
    values: SANS_EXTRA_CONSONANTS_TO_ITRANS_DRAVIDIAN,
  },
  {
    label: "Symbols",
    values: {
      ...SANS_SYMBOLS_TO_ITRANS_DRAVIDIAN,
      ...SANS_CANDRA_TO_ITRANS_DRAVIDIAN,
    },
  },
  { label: "Yogavaahas", values: SANS_YOGAVAAHAS_TO_ITRANS_DRAVIDIAN },
] as { label: string; values: Record<string, string> }[];

export const TEL_VOWELS_TO_ITRANS_DRAVIDIAN = {
  అ: "a",
  ఆ: "A",
  ఇ: "i",
  ఈ: "I",
  ఉ: "u",
  ఊ: "U",
  ఋ: "RRi",
  ౠ: "RRI",
  ఌ: "LLi",
  ౡ: "LLI",
  ఎ: "e",
  ఏ: "E",
  ఐ: "ai",
  ఒ: "o",
  ఓ: "O",
  ఔ: "au",
} as Record<string, string>;

export const TEL_YOGAVAAHAS_TO_ITRANS_DRAVIDIAN = {
  "ం": "M",
  "ః": "H",
  "ఁ": ".N",
} as Record<string, string>;

export const TEL_VIRAMA_TO_ITRANS_DRAVIDIAN = {
  "": "్",
} as Record<string, string>;

export const TEL_CONSONANTS_TO_ITRANS_DRAVIDIAN = {
  క: "k",
  ఖ: "kh",
  గ: "g",
  ఘ: "gh",
  ఙ: "~N",
  చ: "ch",
  ఛ: "Ch",
  జ: "j",
  ఝ: "jh",
  ఞ: "~n",
  ట: "T",
  ఠ: "Th",
  డ: "D",
  ఢ: "Dh",
  ణ: "N",
  త: "t",
  థ: "th",
  ద: "d",
  ధ: "dh",
  న: "n",
  ప: "p",
  ఫ: "ph",
  బ: "b",
  భ: "bh",
  మ: "m",
  య: "y",
  ర: "r",
  ల: "l",
  వ: "v",
  శ: "sh",
  ష: "Sh",
  స: "s",
  హ: "h",
  ళ: "L",
  క్ష: "kSh",
  జ్ఞ: "j~n",
} as Record<string, string>;

export const TEL_SYMBOLS_TO_ITRANS_DRAVIDIAN = {
  "౦": "0",
  "౧": "1",
  "౨": "2",
  "౩": "3",
  "౪": "4",
  "౫": "5",
  "౬": "6",
  "౭": "7",
  "౮": "8",
  "౯": "9",
  ఓం: "OM",
  ఽ: ".a",
  "।": "|",
  "॥": "||",
} as Record<string, string>;

export const TEL_EXTRA_CONSONANTS_TO_ITRANS_DRAVIDIAN = {
  // Awaits https://www.unicode.org/L2/L2020/20085-telugu-nukta.pdf
  ఱ: "R",
  // ఴ: "zh",
} as Record<string, string>;

export const TEL_TO_ITRANS_DRAVIDIAN_HELP = [
  { label: "Vowels", values: TEL_VOWELS_TO_ITRANS_DRAVIDIAN },
  {
    label: "Consonants",
    values: TEL_CONSONANTS_TO_ITRANS_DRAVIDIAN,
  },
  {
    label: "Extra Consonants",
    values: TEL_EXTRA_CONSONANTS_TO_ITRANS_DRAVIDIAN,
  },
  {
    label: "Symbols",
    values: TEL_SYMBOLS_TO_ITRANS_DRAVIDIAN,
  },
  { label: "Yogavaahas", values: TEL_YOGAVAAHAS_TO_ITRANS_DRAVIDIAN },
] as { label: string; values: Record<string, string> }[];

export const ITRANS_DRAVIDIAN_HELP = {
  TEL: TEL_TO_ITRANS_DRAVIDIAN_HELP,
  SAN: SANS_TO_ITRANS_DRAVIDIAN_HELP,
} as Record<string, { label: string; values: Record<string, string> }[]>;
