import { Option } from "@/components/ui/multi-select";
import { EntityTypeEnum } from "./types";

export const QUERY_RESULT_LIMIT_KEY = "resultLimits";
export const QUERY_RESULT_LIMIT_DEFAULT = "10";
export const QUERY_RESULT_LIMITS = ["10", "25", "50", "100", "150", "200"];

export const LANGUAGE_MEANING_SELECT_KEY = "languageMeaning";
export const LANGUAGE_SELECT_KEY = "language";
export const LANGUAGE_SELECT_DEFAULT = "ENG";

export const TEXT_SIZE_SELECT_KEY = "textSize";
export const TEXT_SIZE_SELECT_DEFAULT = "md";

export const ENTITY_DEFAULT_IMAGE_THUMBNAIL = "/default-om_256.png";

export const ENTITY_TYPES = [
  "GOD",
  "AUTHOR",
  "ITIHASAM",
  "PURANAM",
  "STHOTRAM",
  "DANDAKAM",
  "KAANDAM",
  "SARGA",
  "PARVAM",
  "ADHYAAYAM",
  "SLOKAM",
  "OTHERS",
  "SKANDAM",
  "GHATTAM",
] as const;

export const ENTITY_TYPES_PARENTS = {
  GOD: [],
  AUTHOR: [],
  ITIHASAM: ["GOD", "AUTHOR"],
  PURANAM: ["GOD", "AUTHOR"],
  STHOTRAM: ["GOD", "AUTHOR"],
  DANDAKAM: ["GOD", "AUTHOR"],
  KAANDAM: ["ITIHASAM"],
  SARGA: ["KAANDAM"],
  PARVAM: ["PURANAM"],
  ADHYAAYAM: ["PURANAM"],
  SKANDAM: ["PURANAM"],
  GHATTAM: ["SKANDAM"],
  SLOKAM: [
    "KAANDAM",
    "SARGA",
    "PARVAM",
    "ADHYAAYAM",
    "STHOTRAM",
    "DANDAKAM",
    "GHATTAM",
    "OTHERS",
  ],
  OTHERS: ["GOD", "AUTHOR", "ITIHASAM", "PURANAM", "STHOTRAM", "DANDAKAM"],
} as Record<string, EntityTypeEnum[]>;

// leaf node is SLOKAM
export const ENTITY_TYPES_CHILDREN = {
  GOD: ["ITIHASAM", "PURANAM", "STHOTRAM", "DANDAKAM", "OTHERS"],
  AUTHOR: ["ITIHASAM", "PURANAM", "STHOTRAM", "DANDAKAM", "OTHERS"],

  ITIHASAM: ["KAANDAM"],
  KAANDAM: ["SARGA"],
  SARGA: ["SLOKAM"],

  PURANAM: ["PARVAM", "ADHYAAYAM", "SKANDAM", "GHATTAM"],
  PARVAM: ["ADHYAAYAM"],
  ADHYAAYAM: ["SLOKAM"],

  SKANDAM: ["GHATTAM"],
  GHATTAM: ["SLOKAM"],
  STHOTRAM: ["SLOKAM"],
  DANDAKAM: ["SLOKAM"],
  OTHERS: ["SLOKAM"],
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
  { label: "Sarga", value: "SARGA" },
  { label: "Parvam", value: "PARVAM" },
  { label: "Adhyaayam", value: "ADHYAAYAM" },
  { label: "Slokam", value: "SLOKAM" },
  { label: "Others", value: "OTHERS" },
  { label: "Skandam", value: "SKANDAM" },
  { label: "Ghattam", value: "GHATTAM" },
] as Option[];

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
