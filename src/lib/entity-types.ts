/**
 * Entity type registry — the single place where content types are defined.
 *
 * To add a new kind of devotional content, add ONE entry here:
 *   - `code`     stored in the database (`Entity.type`), never rename an existing one
 *   - `label`    English label used in dropdowns
 *   - `names`    label per display language (falls back to `code` when missing)
 *   - `children` which types may be placed directly under this type; the first
 *                entry is the default when adding content under it
 *
 * Everything else (the allowed-parents map, dropdown options, the zod enum,
 * the `EntityTypeEnum` union) is derived from this list.
 */
export const ENTITY_TYPE_REGISTRY = [
  {
    code: "GOD",
    label: "God",
    names: {
      SAN: "भगवान्",
      TEL: "దేవుడు",
      HIN: "भगवान्",
      TAM: "GOD",
      ITRANS: "bhagavAn",
      IAST: "bhagavān",
      SLP1: "BagavAn",
    },
    children: [
      "STHOTRAM",
      "ITIHASAM",
      "PURANAM",
      "KAVYAM",
      "SHATAKAM",
      "DANDAKAM",
      "KEERTHANAM",
      "VRATHAM",
      "OTHERS",
    ],
  },
  {
    code: "AUTHOR",
    label: "Author",
    names: {
      SAN: "कविः",
      TEL: "కవి",
      HIN: "कविः",
      TAM: "AUTHOR",
      ITRANS: "kaviH",
      IAST: "kaviḥ",
      SLP1: "kaviH",
    },
    children: [
      "STHOTRAM",
      "ITIHASAM",
      "PURANAM",
      "KAVYAM",
      "SHATAKAM",
      "DANDAKAM",
      "KEERTHANAM",
      "VRATHAM",
      "OTHERS",
    ],
  },
  {
    code: "ITIHASAM",
    label: "Itihasam",
    names: {
      SAN: "इतिहासः",
      TEL: "ఇతిహాసము",
      HIN: "इतिहासः",
      TAM: "ITIHASAM",
      ITRANS: "itihAsaH",
      IAST: "itihāsaḥ",
      SLP1: "itihAsaH",
    },
    children: ["KAANDAM", "OTHERS"],
  },
  {
    code: "PURANAM",
    label: "Puranam",
    names: {
      SAN: "पुराणः",
      TEL: "పురణము",
      HIN: "पुराणः",
      TAM: "PURANAM",
      ITRANS: "puraaNaH",
      IAST: "purāṇaḥ",
      SLP1: "puraaNaH",
    },
    children: ["PARVAM", "ADHYAAYAM", "SKANDAM", "GHATTAM", "OTHERS"],
  },
  {
    code: "STHOTRAM",
    label: "Sthotram",
    names: {
      SAN: "स्तॊत्रः",
      TEL: "స్తొత్రము",
      HIN: "स्तॊत्रः",
      TAM: "STHOTRAM",
      ITRANS: "stotraH",
      IAST: "stòtraḥ",
      SLP1: "stotraH",
    },
    children: ["SLOKAM"],
  },
  {
    code: "SHATAKAM",
    label: "Shatakham",
    names: {
      SAN: "शतकम्",
      TEL: "శతకము",
      HIN: "शतकम्",
      TAM: "SHATAKAM",
      ITRANS: "shatakamaH",
      IAST: "śatakamaḥ",
      SLP1: "shatakamaH",
    },
    children: ["SLOKAM", "ADHYAAYAM", "SARGA", "OTHERS"],
  },
  {
    code: "DANDAKAM",
    label: "Dandakam",
    names: {
      SAN: "दण्डकः",
      TEL: "దండకము",
      HIN: "दण्डकः",
      TAM: "DANDAKAM",
      ITRANS: "daNDakaH",
      IAST: "daṇḍakaḥ",
      SLP1: "daRqakaH",
    },
    children: ["SLOKAM"],
  },
  {
    code: "KAANDAM",
    label: "Kaandam",
    names: {
      SAN: "काण्डम्",
      TEL: "కాణ్డము",
      HIN: "काण्डम",
      TAM: "KAANDAM",
      ITRANS: "kANDam",
      IAST: "kāṇḍam",
      SLP1: "kARqam",
    },
    children: ["SARGA", "SLOKAM"],
  },
  {
    code: "KAVYAM",
    label: "Kavyam",
    names: {
      SAN: "काव्यम्",
      TEL: "కావ్యం",
      HIN: "काव्यम्",
      TAM: "KAVYAM",
      ITRANS: "kAAvyam",
      IAST: "kāvyam",
      SLP1: "kAvyaM",
    },
    children: ["SARGA", "ADHYAAYAM"],
  },
  {
    code: "KEERTHANAM",
    label: "Keerthanam",
    names: {
      SAN: "कृतिः",
      TEL: "కీర్తన",
      HIN: "कृतिः",
      TAM: "KEERTHANAM",
      ITRANS: "kRRitiH",
      IAST: "kṛtiḥ",
      SLP1: "kftiH",
    },
    children: ["SLOKAM"],
  },
  {
    code: "SARGA",
    label: "Sarga",
    names: {
      SAN: "सर्गः",
      TEL: "సర్గము",
      HIN: "सर्गः",
      TAM: "SARGA",
      ITRANS: "sargaH",
      IAST: "sargaḥ",
      SLP1: "sargaH",
    },
    children: ["SLOKAM"],
  },
  {
    code: "PARVAM",
    label: "Parvam",
    names: {
      SAN: "पुराणः",
      TEL: "పురాణము",
      HIN: "पुराणः",
      TAM: "PURANAM",
      ITRANS: "purANaH",
      IAST: "purāṇaḥ",
      SLP1: "purARaH",
    },
    children: ["ADHYAAYAM", "SLOKAM"],
  },
  {
    code: "ADHYAAYAM",
    label: "Adhyaayam",
    names: {
      SAN: "अध्यायः",
      TEL: "అధ్యాయము",
      HIN: "अध्यायः",
      TAM: "ADHYAAYAM",
      ITRANS: "adhyAyaH",
      IAST: "adhyāyaḥ",
      SLP1: "aDyAyaH",
    },
    children: ["SLOKAM"],
  },
  {
    code: "SLOKAM",
    label: "Slokam",
    names: {
      SAN: "स्लॊकः",
      TEL: "స్లోకము",
      HIN: "स्लॊकः",
      TAM: "SLOKAM",
      ITRANS: "slokaH",
      IAST: "slòkaḥ",
      SLP1: "slòkaH",
    },
    children: [],
  },
  {
    code: "OTHERS",
    label: "Others",
    names: {
      SAN: "इतराणि",
      TEL: "ఇతరాలు",
      HIN: "इतराणि",
      TAM: "OTHERS",
      ITRANS: "itarANi",
      IAST: "itarāṇi",
      SLP1: "itarARi",
    },
    children: ["ADHYAAYAM", "SLOKAM"],
  },
  {
    code: "SKANDAM",
    label: "Skandam",
    names: {
      SAN: "स्कन्दः",
      TEL: "స్కన్దము",
      HIN: "स्कन्दः",
      TAM: "KAANDAM",
      ITRANS: "skandaH",
      IAST: "skandaḥ",
      SLP1: "skandaH",
    },
    children: ["GHATTAM"],
  },
  {
    code: "GHATTAM",
    label: "Ghattam",
    names: {
      SAN: "घट्टः",
      TEL: "ఘట్టము",
      HIN: "घट्टः",
      TAM: "GHATTAM",
      ITRANS: "ghaTTaH",
      IAST: "ghaṭṭaḥ",
      SLP1: "GawwaH",
    },
    children: ["SLOKAM"],
  },
  {
    code: "VRATHAM",
    label: "Vratham",
    names: {
      SAN: "व्रतः",
      TEL: "వ్రతము",
      HIN: "व्रतः",
      TAM: "VRATHAM",
      ITRANS: "vrataH",
      IAST: "vrataḥ",
      SLP1: "vrataH",
    },
    children: ["ADHYAAYAM", "STHOTRAM", "OTHERS"],
  },
] as const satisfies readonly EntityTypeDefinition[];

export type EntityTypeDefinition = {
  code: string;
  label: string;
  names: Record<string, string>;
  children: readonly string[];
};

export type EntityTypeCode = (typeof ENTITY_TYPE_REGISTRY)[number]["code"];

const definitions: readonly EntityTypeDefinition[] = ENTITY_TYPE_REGISTRY;

/** All type codes, as a non-empty tuple so it can feed `z.enum`. */
export const ENTITY_TYPE_CODES = definitions.map((t) => t.code) as [
  EntityTypeCode,
  ...EntityTypeCode[],
];

const byCode = new Map(definitions.map((t) => [t.code, t]));

export const isEntityTypeCode = (code: unknown): code is EntityTypeCode =>
  typeof code === "string" && byCode.has(code);

/** Types that may be placed directly under `code` (empty for unknown types). */
export const entityChildTypes = (code: string): EntityTypeCode[] =>
  [...(byCode.get(code)?.children ?? [])] as EntityTypeCode[];

/** Types that `code` may be placed under — the inverse of `children`. */
export const entityParentTypes = (code: string): EntityTypeCode[] =>
  definitions
    .filter((t) => t.children.includes(code))
    .map((t) => t.code as EntityTypeCode);

/** Label for a type in the given display language, falling back to the code. */
export const entityTypeName = (code: string, language?: string): string => {
  const def = byCode.get(code);
  if (!def) return code;
  return (language && def.names[language]) || def.code;
};

/** English label for dropdowns, falling back to the code. */
export const entityTypeLabel = (code: string): string =>
  byCode.get(code)?.label ?? code;
