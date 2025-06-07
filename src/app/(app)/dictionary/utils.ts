import { Option } from "@/components/ui/multi-select";
import { DictionaryItem } from "./types";

export const DICTIONARY_ORIGINS_DDLB = [
  { label: "Dhatu Pata", value: "DHATU_PATA" },
  { label: "English to Telugu", value: "ENG2TEL" },

  { label: "Abhidhānaratnamālā of Halāyudha San-San", value: "ARMH" },
  { label: "Vacaspatyam San-San", value: "VCP" },
  { label: "Sabda-kalpadrum San-San", value: "SKD" },

  { label: "Wilson San-Eng", value: "WIL" },
  { label: "Yates San-Eng", value: "YAT" },
  { label: "Goldstücker San-Eng", value: "GST" },
  { label: "Benfey San-Eng", value: "BEN" },
  { label: "Monier-Williams San-Eng", value: "MW72" },
  { label: "Apte Practical San-Eng", value: "AP90" },
  { label: "Lanman`s Sanskrit Reader Vocabulary", value: "LAN" },
  { label: "Cappeller San-Eng", value: "CAE" },
  { label: "Macdonell San-Eng", value: "MD" },
  { label: "Monier-Williams San-Eng", value: "MW" },
  { label: "Shabda-Sagara San-Eng", value: "SHS" },
  // { label: "Practical San-Eng", value: "AP" },
  // { label: "An Encyclopedic Dictionary", value: "PD" },

  { label: "Monier-Williams Eng-San", value: "MWE" },
  { label: "Borooah Eng-San", value: "BOR" },
  { label: "Apte Student`s Eng-San", value: "AE" },

  { label: "Index to the Names in the Mahabharata", value: "INM" },
  { label: "The Vedic Index of Names and Subjects", value: "VEI" },
  { label: "The Purana Index", value: "PUI" },
  { label: "Edgerton Buddhist Hybrid Sanskrit Dictionary", value: "BHS" },
  { label: "Aufrecht`s Catalogus Catalogorum", value: "ACC" },
  { label: "Kṛdantarūpamālā", value: "KRM" },
  { label: "Indian Epigraphical Glossary", value: "IEG" },
  { label: "Meulenbeld`s Sanskrit Names of Plants", value: "SNP" },
  { label: "Puranic Encyclopedia", value: "PE" },
  {
    label: "Personal and Geographical Names in the Gupta Inscriptions",
    value: "PGN",
  },
  { label: "Mahabharata Cultural Index", value: "MCI" },
  { label: "Others", value: "OTHERS" },
] as Option[];

export const MAP_DICTIONARY_ORIGINS: Record<string, string> =
  DICTIONARY_ORIGINS_DDLB.reduce(
    (acc, { value, label }) => {
      acc[value] = label;
      return acc;
    },
    {} as Record<string, string>,
  );

export const DICTIONARY_ORIGINS = [
  "ACC",
  "AE",
  "AP90",
  "ARMH",
  "BEN",
  "BHS",
  "BOR",
  "CAE",
  "DHATU_PATA",
  "ENG2TEL",
  "GST",
  "IEG",
  "INM",
  "KRM",
  "LAN",
  "MCI",
  "MD",
  "MW",
  "MW72",
  "MWE",
  "OTHERS",
  "PE",
  "PGN",
  "PUI",
  "SHS",
  "SKD",
  "SNP",
  "VCP",
  "VEI",
  "WIL",
  "YAT",
] as const;

export const DICTIONARY_SORT_OPTIONS = [
  { label: "Word (A-Z)", value: "word.value" },
  { label: "Word Index (A-Z)", value: "wordIndex" },
] as Option[];

export const DICTIONARY_SORT_ORDER_OPTIONS = [
  { label: "Ascending", value: "asc" },
  { label: "Descending", value: "desc" },
] as Option[];

// export const DICTIONARY_ORIGINS:string[] = Object.keys(MAP_DICTIONARY_ORIGINS);

export const mapDbToDictionary = (
  e: any,
  language: string,
  meaning?: string,
) => {
  const item: DictionaryItem = {
    id: e.id || e._id["$oid"],
    origin: e.origin,
    wordIndex: e.wordIndex,
    phonetic: e.phonetic,
    attributes: e.attributes,
    word: "",
    description: "",
    wordData: e.id
      ? e.word
      : e.word?.map((w: any) => ({
          language: w.lang || w.language,
          value: w.value,
        })),
    descriptionData: e.id
      ? e.description
      : e.description?.map((w: any) => ({
          language: w.lang || w.language,
          value: w.value,
        })),
  };
  item.word = (
    e.word.find((w: any) => w.language === language || w.lang === language) ||
    e.word[0]
  ).value;
  item.description = (
    e.description.find(
      (w: any) => w.language === language || w.lang === language,
    ) || e.description[0]
  ).value;
  // console.log( "mapDbToDictionary", item );
  return item;
};
