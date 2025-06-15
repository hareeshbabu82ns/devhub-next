import { Option } from "@/components/ui/multi-select";
import { Entity, EntityTypeEnum } from "./types";

export const LS_AUDIO_PLAYER_VOLUME = "audioPlayerVolume";

export const QUERY_RESULT_LIMIT_KEY = "resultLimits";
export const QUERY_RESULT_LIMIT_DEFAULT = "12";
export const QUERY_RESULT_LIMITS = ["12", "24", "36", "48", "96", "144", "192"];

export const LANGUAGE_MEANING_SELECT_KEY = "languageMeaning";
export const LANGUAGE_SELECT_KEY = "language";
export const LANGUAGE_SELECT_DEFAULT = "ENG";

export const TEXT_SIZE_SELECT_KEY = "textSize";
export const TEXT_SIZE_SELECT_DEFAULT = "md";

export const ENTITY_DEFAULT_IMAGE_THUMBNAIL = "/default-om_256.png";

export const QUERY_STALE_TIME_SHORT = 1000 * 60 * 60; // 1 hour
export const QUERY_STALE_TIME_MEDIUM = 1000 * 60 * 60 * 12; // 12 hours
export const QUERY_STALE_TIME_LONG = 1000 * 60 * 60 * 24; // 1 day

export const ENTITY_TYPES = [
  "ADHYAAYAM",
  "AUTHOR",
  "DANDAKAM",
  "GHATTAM",
  "GOD",
  "ITIHASAM",
  "KAANDAM",
  "KAVYAM",
  "KEERTHANAM",
  "OTHERS",
  "PARVAM",
  "PURANAM",
  "SARGA",
  "SKANDAM",
  "SLOKAM",
  "STHOTRAM",
  "VRATHAM",
] as const;

export const ENTITY_TYPES_PARENTS = {
  GOD: [],
  AUTHOR: [],
  VRATHAM: ["GOD", "AUTHOR"],
  ITIHASAM: ["GOD", "AUTHOR"],
  PURANAM: ["GOD", "AUTHOR"],
  STHOTRAM: ["GOD", "AUTHOR", "VRATHAM"],
  DANDAKAM: ["GOD", "AUTHOR"],
  KAANDAM: ["ITIHASAM"],
  KAVYAM: ["GOD", "AUTHOR"],
  SARGA: ["KAANDAM", "KAVYAM"],
  PARVAM: ["PURANAM"],
  ADHYAAYAM: ["PURANAM", "VRATHAM", "KAVYAM", "OTHERS"],
  SKANDAM: ["PURANAM"],
  GHATTAM: ["SKANDAM"],
  KEERTHANAM: ["GOD", "AUTHOR"],
  SLOKAM: [
    "ADHYAAYAM",
    "DANDAKAM",
    "GHATTAM",
    "KAANDAM",
    "KEERTHANAM",
    "OTHERS",
    "PARVAM",
    "SARGA",
    "STHOTRAM",
  ],
  OTHERS: [
    "AUTHOR",
    "DANDAKAM",
    "GOD",
    "ITIHASAM",
    "PURANAM",
    "STHOTRAM",
    "VRATHAM",
  ],
} as Record<string, EntityTypeEnum[]>;

// leaf node is SLOKAM
export const ENTITY_TYPES_CHILDREN = {
  GOD: ["ITIHASAM", "PURANAM", "STHOTRAM", "DANDAKAM", "KEERTHANAM", "OTHERS"],
  AUTHOR: [
    "ITIHASAM",
    "PURANAM",
    "STHOTRAM",
    "DANDAKAM",
    "KEERTHANAM",
    "OTHERS",
  ],

  ITIHASAM: ["KAANDAM"],
  KAANDAM: ["SARGA"],
  KAVYAM: ["SARGA", "ADHYAAYAM"],
  SARGA: ["SLOKAM"],
  KEERTHANAM: ["SLOKAM"],

  PURANAM: ["PARVAM", "ADHYAAYAM", "SKANDAM", "GHATTAM"],
  PARVAM: ["ADHYAAYAM"],
  VRATHAM: ["ADHYAAYAM", "STHOTRAM"],
  ADHYAAYAM: ["SLOKAM"],

  SKANDAM: ["GHATTAM"],
  GHATTAM: ["SLOKAM"],
  STHOTRAM: ["SLOKAM"],
  DANDAKAM: ["SLOKAM"],
  OTHERS: ["ADHYAAYAM", "SLOKAM"],
  SLOKAM: [],
} as Record<string, EntityTypeEnum[]>;

export const ENTITY_TYPES_DDLB = [
  { label: "God", value: "GOD" },
  { label: "Author", value: "AUTHOR" },
  { label: "Itihasam", value: "ITIHASAM" },
  { label: "Puranam", value: "PURANAM" },
  { label: "Sthotram", value: "STHOTRAM" },
  { label: "Dandakam", value: "DANDAKAM" },
  { label: "Kaandam", value: "KAANDAM" },
  { label: "Kavyam", value: "KAVYAM" },
  { label: "Keerthanam", value: "KEERTHANAM" },
  { label: "Sarga", value: "SARGA" },
  { label: "Parvam", value: "PARVAM" },
  { label: "Adhyaayam", value: "ADHYAAYAM" },
  { label: "Slokam", value: "SLOKAM" },
  { label: "Others", value: "OTHERS" },
  { label: "Skandam", value: "SKANDAM" },
  { label: "Ghattam", value: "GHATTAM" },
  { label: "Vratham", value: "VRATHAM" },
] as Option[];

export const ENTITY_TYPES_LANGUAGE_MAP: Record<
  EntityTypeEnum,
  Record<string, string>
> = {
  GOD: {
    SAN: "भगवान्",
    TEL: "దేవుడు",
    HIN: "भगवान्",
    TAM: "GOD",
    ITRANS: "bhagavAn",
    IAST: "bhagavān",
    SLP1: "BagavAn",
  },
  AUTHOR: {
    SAN: "कविः",
    TEL: "కవి",
    HIN: "कविः",
    TAM: "AUTHOR",
    ITRANS: "kaviH",
    IAST: "kaviḥ",
    SLP1: "kaviH",
  },
  VRATHAM: {
    SAN: "व्रतः",
    TEL: "వ్రతము",
    HIN: "व्रतः",
    TAM: "VRATHAM",
    ITRANS: "vrataH",
    IAST: "vrataḥ",
    SLP1: "vrataH",
  },
  ITIHASAM: {
    SAN: "इतिहासः",
    TEL: "ఇతిహాసము",
    HIN: "इतिहासः",
    TAM: "ITIHASAM",
    ITRANS: "itihAsaH",
    IAST: "itihāsaḥ",
    SLP1: "itihAsaH",
  },
  PURANAM: {
    SAN: "पुराणः",
    TEL: "పురణము",
    HIN: "पुराणः",
    TAM: "PURANAM",
    ITRANS: "puraaNaH",
    IAST: "purāṇaḥ",
    SLP1: "puraaNaH",
  },
  STHOTRAM: {
    SAN: "स्तॊत्रः",
    TEL: "స్తొత్రము",
    HIN: "स्तॊत्रः",
    TAM: "STHOTRAM",
    ITRANS: "stotraH",
    IAST: "stòtraḥ",
    SLP1: "stotraH",
  },
  DANDAKAM: {
    SAN: "दण्डकः",
    TEL: "దండకము",
    HIN: "दण्डकः",
    TAM: "DANDAKAM",
    ITRANS: "daNDakaH",
    IAST: "daṇḍakaḥ",
    SLP1: "daRqakaH",
  },
  KAANDAM: {
    SAN: "काण्डम्",
    TEL: "కాణ్డము",
    HIN: "काण्डम",
    TAM: "KAANDAM",
    ITRANS: "kANDam",
    IAST: "kāṇḍam",
    SLP1: "kARqam",
  },
  KAVYAM: {
    SAN: "काव्यम्",
    TEL: "కావ్యం",
    HIN: "काव्यम्",
    TAM: "KAVYAM",
    ITRANS: "kAAvyam",
    IAST: "kāvyam",
    SLP1: "kAvyaM",
  },
  KEERTHANAM: {
    SAN: "कृतिः",
    TEL: "కీర్తన",
    HIN: "कृतिः",
    TAM: "KEERTHANAM",
    ITRANS: "kRRitiH",
    IAST: "kṛtiḥ",
    SLP1: "kftiH",
  },
  SARGA: {
    SAN: "सर्गः",
    TEL: "సర్గము",
    HIN: "सर्गः",
    TAM: "SARGA",
    ITRANS: "sargaH",
    IAST: "sargaḥ",
    SLP1: "sargaH",
  },
  PARVAM: {
    SAN: "पुराणः",
    TEL: "పురాణము",
    HIN: "पुराणः",
    TAM: "PURANAM",
    ITRANS: "purANaH",
    IAST: "purāṇaḥ",
    SLP1: "purARaH",
  },
  ADHYAAYAM: {
    SAN: "अध्यायः",
    TEL: "అధ్యాయము",
    HIN: "अध्यायः",
    TAM: "ADHYAAYAM",
    ITRANS: "adhyAyaH",
    IAST: "adhyāyaḥ",
    SLP1: "aDyAyaH",
  },
  SLOKAM: {
    SAN: "स्लॊकः",
    TEL: "స్లోకము",
    HIN: "स्लॊकः",
    TAM: "SLOKAM",
    ITRANS: "slokaH",
    IAST: "slòkaḥ",
    SLP1: "slòkaH",
  },
  OTHERS: {
    SAN: "इतराणि",
    TEL: "ఇతరాలు",
    HIN: "इतराणि",
    TAM: "OTHERS",
    ITRANS: "itarANi",
    IAST: "itarāṇi",
    SLP1: "itarARi",
  },
  SKANDAM: {
    SAN: "स्कन्दः",
    TEL: "స్కన్దము",
    HIN: "स्कन्दः",
    TAM: "KAANDAM",
    ITRANS: "skandaH",
    IAST: "skandaḥ",
    SLP1: "skandaH",
  },
  GHATTAM: {
    SAN: "घट्टः",
    TEL: "ఘట్టము",
    HIN: "घट्टः",
    TAM: "GHATTAM",
    ITRANS: "ghaTTaH",
    IAST: "ghaṭṭaḥ",
    SLP1: "GawwaH",
  },
};

export const LANGUAGE_FONT_FAMILY = {
  SAN: "font-shobhika",
  TEL: "font-telugu",
  HIN: "font-shobhika",
  ITRANS: "font-shobhika",
  IAST: "font-shobhika",
  SLP1: "font-shobhika",
};
export type LANGUAGES_TYPE =
  | "SAN"
  | "TEL"
  | "ITRANS"
  | "IAST"
  | "SLP1"
  | "ENG"
  | "TAM";
export const LANGUAGES = [
  "SAN",
  "TEL",
  "TAM",
  "ITRANS",
  "IAST",
  "SLP1",
  "ENG",
] as const;

export const LANGUAGES_DDLB = [
  { label: "Sanskrit", value: "SAN" },
  { label: "Telugu", value: "TEL" },
  { label: "IAST", value: "IAST" },
  { label: "SLP1", value: "SLP1" },
  { label: "ITRANS", value: "ITRANS" },
  { label: "Tamil", value: "TAM" },
  { label: "English", value: "ENG" },
] as Option[];

export const TEXT_SIZE_DDLB = [
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
  { label: "X Large", value: "xl" },
  { label: "2X Large", value: "2xl" },
  { label: "3X Large", value: "3xl" },
] as Option[];

export const LANGUAGE_SCHEME_MAP: Record<string, string> = {
  SAN: "devanagari",
  TEL: "telugu",
  HIN: "hindi",
  TAM: "tamil",
  ITRANS: "itrans_dravidian",
  IAST: "iast",
  SLP1: "slp1",
};

export const LANGUAGE_TO_TRANSLITERATION_DDLB = {
  SAN: { label: "Sanskrit", scheme: "devanagari" },
  TEL: { label: "Telugu", scheme: "telugu" },
} as Record<string, { label: string; scheme: string }>;

export const PANCHANGAM_PLACE_IDS = ["calgary", "tirupati"] as const;
export const PANCHANGAM_PLACE_SELECT_KEY = "panchangamPlace";
export const PANCHANGAM_PLACE_SELECT_DEFAULT = "calgary";
export const PANCHANGAM_PLACE_IDS_MAP = {
  tirupati: 1254360,
  calgary: 5913490,
} as Record<string, number>;
