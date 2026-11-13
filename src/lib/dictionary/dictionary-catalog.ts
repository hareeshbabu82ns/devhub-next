/**
 * Dictionary catalog: which dictionaries exist, how they group together, and
 * what script their headwords are in. Used to offer one-tap dictionary
 * presets, the browse landing page, and the A–Z / अ–ह jump strip.
 */

export type DictionaryGroupId =
  | "san-eng"
  | "san-san"
  | "eng-san"
  | "english"
  | "names";

export type HeadwordScript = "sa" | "en";

export interface DictionaryInfo {
  code: string;
  name: string;
  /** Short name for chips and badges */
  short: string;
  group: DictionaryGroupId;
  headword: HeadwordScript;
}

export interface DictionaryGroup {
  id: DictionaryGroupId;
  label: string;
  description: string;
}

export const DICTIONARY_GROUPS: DictionaryGroup[] = [
  {
    id: "san-eng",
    label: "Sanskrit → English",
    description: "Look up a Sanskrit word, read the meaning in English",
  },
  {
    id: "san-san",
    label: "Sanskrit → Sanskrit",
    description: "Traditional kośas, dhātu and kṛdanta references",
  },
  {
    id: "eng-san",
    label: "English → Sanskrit",
    description: "Find the Sanskrit word for an English one",
  },
  {
    id: "english",
    label: "English",
    description: "English → Telugu and English → English",
  },
  {
    id: "names",
    label: "Names & lore",
    description: "People, places, plants, epics, purāṇas and inscriptions",
  },
];

export const DICTIONARY_CATALOG: DictionaryInfo[] = [
  // Sanskrit → English
  { code: "MW", name: "Monier-Williams Sanskrit-English", short: "Monier-Williams", group: "san-eng", headword: "sa" },
  { code: "MW72", name: "Monier-Williams Sanskrit-English (1872)", short: "MW 1872", group: "san-eng", headword: "sa" },
  { code: "AP90", name: "Apte Practical Sanskrit-English", short: "Apte", group: "san-eng", headword: "sa" },
  { code: "SHS", name: "Shabda-Sagara Sanskrit-English", short: "Shabda-Sagara", group: "san-eng", headword: "sa" },
  { code: "WIL", name: "Wilson Sanskrit-English", short: "Wilson", group: "san-eng", headword: "sa" },
  { code: "YAT", name: "Yates Sanskrit-English", short: "Yates", group: "san-eng", headword: "sa" },
  { code: "BEN", name: "Benfey Sanskrit-English", short: "Benfey", group: "san-eng", headword: "sa" },
  { code: "CAE", name: "Cappeller Sanskrit-English", short: "Cappeller", group: "san-eng", headword: "sa" },
  { code: "MD", name: "Macdonell Sanskrit-English", short: "Macdonell", group: "san-eng", headword: "sa" },
  { code: "GST", name: "Goldstücker Sanskrit-English", short: "Goldstücker", group: "san-eng", headword: "sa" },
  { code: "LAN", name: "Lanman's Sanskrit Reader Vocabulary", short: "Lanman", group: "san-eng", headword: "sa" },
  { code: "BHS", name: "Buddhist Hybrid Sanskrit (Edgerton)", short: "Edgerton BHS", group: "san-eng", headword: "sa" },
  // Sanskrit → Sanskrit
  { code: "VCP", name: "Vācaspatyam", short: "Vācaspatyam", group: "san-san", headword: "sa" },
  { code: "SKD", name: "Śabdakalpadruma", short: "Śabdakalpadruma", group: "san-san", headword: "sa" },
  { code: "ARMH", name: "Abhidhānaratnamālā of Halāyudha", short: "Abhidhānaratnamālā", group: "san-san", headword: "sa" },
  { code: "DHATU_PATA", name: "Dhātupāṭha", short: "Dhātupāṭha", group: "san-san", headword: "sa" },
  { code: "KRM", name: "Kṛdantarūpamālā", short: "Kṛdantarūpamālā", group: "san-san", headword: "sa" },
  // English → Sanskrit
  { code: "MWE", name: "Monier-Williams English-Sanskrit", short: "MW English", group: "eng-san", headword: "en" },
  { code: "AE", name: "Apte Student's English-Sanskrit", short: "Apte English", group: "eng-san", headword: "en" },
  { code: "BOR", name: "Borooah English-Sanskrit", short: "Borooah", group: "eng-san", headword: "en" },
  // English
  { code: "ENG2TEL", name: "English → Telugu", short: "Eng → Tel", group: "english", headword: "en" },
  { code: "ENG2ENG", name: "English → English", short: "Eng → Eng", group: "english", headword: "en" },
  // Names, places and encyclopedic
  { code: "PE", name: "Puranic Encyclopedia", short: "Puranic Encyc.", group: "names", headword: "sa" },
  { code: "PUI", name: "Purana Index", short: "Purana Index", group: "names", headword: "sa" },
  { code: "INM", name: "Index to the Names in the Mahabharata", short: "Mbh Names", group: "names", headword: "sa" },
  { code: "MCI", name: "Mahabharata Cultural Index", short: "Mbh Cultural", group: "names", headword: "sa" },
  { code: "VEI", name: "Vedic Index of Names and Subjects", short: "Vedic Index", group: "names", headword: "sa" },
  { code: "IEG", name: "Indian Epigraphical Glossary", short: "Epigraphical", group: "names", headword: "sa" },
  { code: "PGN", name: "Names in the Gupta Inscriptions", short: "Gupta Names", group: "names", headword: "sa" },
  { code: "SNP", name: "Meulenbeld's Sanskrit Names of Plants", short: "Plant Names", group: "names", headword: "sa" },
  { code: "ACC", name: "Aufrecht's Catalogus Catalogorum", short: "Catalogus", group: "names", headword: "sa" },
];

const CATALOG_BY_CODE = new Map(DICTIONARY_CATALOG.map((d) => [d.code, d]));

export function getDictionaryInfo(code: string): DictionaryInfo {
  return (
    CATALOG_BY_CODE.get(code) ?? {
      code,
      name: code,
      short: code,
      group: "names",
      headword: "sa",
    }
  );
}

export function dictionariesInGroup(group: DictionaryGroupId): string[] {
  return DICTIONARY_CATALOG.filter((d) => d.group === group).map(
    (d) => d.code,
  );
}

/** Returns the group whose members exactly equal `origins`, if any */
export function matchingGroup(origins: string[]): DictionaryGroupId | null {
  if (origins.length === 0) return null;
  const set = new Set(origins);
  for (const g of DICTIONARY_GROUPS) {
    const members = dictionariesInGroup(g.id);
    if (members.length === set.size && members.every((m) => set.has(m))) {
      return g.id;
    }
  }
  return null;
}

/**
 * Letters for the browse jump strip, in dictionary (varṇamālā) order.
 * Values are ITRANS so they can be fed straight into a lookup; display
 * them transliterated into the reader's script.
 */
export const SANSKRIT_ALPHABET_ITRANS = [
  "a", "A", "i", "I", "u", "U", "RRi", "RRI", "LLi", "e", "ai", "o", "au",
  "k", "kh", "g", "gh", "~N",
  "ch", "Ch", "j", "jh", "~n",
  "T", "Th", "D", "Dh", "N",
  "t", "th", "d", "dh", "n",
  "p", "ph", "b", "bh", "m",
  "y", "r", "l", "v",
  "sh", "Sh", "s", "h",
];

export const ENGLISH_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
