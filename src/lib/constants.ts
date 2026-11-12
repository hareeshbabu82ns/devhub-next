import { Option } from "@/components/ui/multi-select";
import { EntityTypeEnum } from "./types";
import {
  ENTITY_TYPE_CODES,
  ENTITY_TYPE_REGISTRY,
  entityChildTypes,
  entityParentTypes,
} from "./entity-types";

export const LS_AUDIO_PLAYER_VOLUME = "audioPlayerVolume";
export const LS_AUDIO_QUEUE = "audioQueue";
export const LS_AUDIO_QUEUE_POSITION = "audioQueuePosition";

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

// Entity types are defined once in `./entity-types.ts`; everything below is
// derived from that registry so adding a type is a single-entry change.
export const ENTITY_TYPES = ENTITY_TYPE_CODES;

export const ENTITY_TYPES_PARENTS = Object.fromEntries(
  ENTITY_TYPE_REGISTRY.map((t) => [t.code, entityParentTypes(t.code)]),
) as Record<string, EntityTypeEnum[]>;

export const ENTITY_TYPES_CHILDREN = Object.fromEntries(
  ENTITY_TYPE_REGISTRY.map((t) => [t.code, entityChildTypes(t.code)]),
) as Record<string, EntityTypeEnum[]>;

export const ENTITY_TYPES_DDLB = ENTITY_TYPE_REGISTRY.map((t) => ({
  label: t.label,
  value: t.code,
})) as Option[];

export const ENTITY_TYPES_LANGUAGE_MAP = Object.fromEntries(
  ENTITY_TYPE_REGISTRY.map((t): [string, Record<string, string>] => [
    t.code,
    t.names,
  ]),
) as Record<EntityTypeEnum, Record<string, string>>;

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

export interface PanchangamPlace {
  id: string;
  label: string;
  region: string;
  geonameId: number;
  timezone: string;
}
export const PANCHANGAM_PLACES: PanchangamPlace[] = [
  {
    id: "calgary",
    label: "Calgary",
    region: "Alberta, Canada",
    geonameId: 5913490,
    timezone: "America/Edmonton", // MST/MDT (UTC-7/-6)
  },
  {
    id: "tirupati",
    label: "Tirupati",
    region: "Andhra Pradesh, India",
    geonameId: 1254360,
    timezone: "Asia/Kolkata", // IST (UTC+5:30)
  },
];
export const PANCHANGAM_PLACE_IDS = ["calgary", "tirupati"] as const;
export const PANCHANGAM_PLACE_SELECT_KEY = "panchangamPlace";
export const PANCHANGAM_PLACE_SELECT_DEFAULT = "calgary";
export const PANCHANGAM_PLACE_IDS_MAP = Object.fromEntries(
  PANCHANGAM_PLACES.map((p) => [p.id, p.geonameId]),
) as Record<string, number>;

export const PANCHANGAM_PLACE_TIMEZONES = Object.fromEntries(
  PANCHANGAM_PLACES.map((p) => [p.id, p.timezone]),
) as Record<string, string>;

export const PANCHANGAM_TIMELINE_VIEW_MODES = ["advanced", "legacy"] as const;
export type PanchangamTimelineViewMode =
  (typeof PANCHANGAM_TIMELINE_VIEW_MODES)[number];
export const PANCHANGAM_TIMELINE_VIEW_KEY = "panchangamTimelineView";
export const PANCHANGAM_TIMELINE_VIEW_DEFAULT: PanchangamTimelineViewMode =
  "advanced";
