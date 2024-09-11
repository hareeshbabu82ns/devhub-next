import { Option } from "@/components/ui/multi-select";
import { EntityTypeEnum } from "./types";

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

export const LANGUAGES = ["SAN", "TEL", "IAST", "SLP1", "ENG"] as const;

export const LANGUAGES_DDLB = [
  { label: "Sanskrit", value: "SAN" },
  { label: "Telugu", value: "TEL" },
  { label: "IAST", value: "IAST" },
  { label: "SLP1", value: "SLP1" },
  { label: "English", value: "ENG" },
] as Option[];

export const TEXT_SIZE_DDLB = [
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
  { label: "X Large", value: "xl" },
  { label: "2X Large", value: "2xl" },
] as Option[];
