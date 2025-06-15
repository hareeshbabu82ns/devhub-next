import { Option } from "@/components/ui/multi-select";
import { DictionaryItem } from "./types";

export const DICTIONARY_ORIGINS_DDLB = [
  // { label: "Abhyankar San-Eng(San)", value: "ABHYNKAR" }, // TODO: use
  { label: "Aufrecht`s Catalogus Catalogorum", value: "ACC" },
  { label: "Apte Student`s Eng-San", value: "AE" },
  // { label: "Amarakosha San-San", value: "AMARA" }, // TODO: use
  { label: "Apte Practical San-Eng", value: "AP90" },
  // { label: "Apte Hindi San-Hin", value: "APTEHI" }, // TODO: use
  { label: "Abhidhānaratnamālā of Halāyudha San-San", value: "ARMH" },
  { label: "Benfey San-Eng", value: "BEN" },
  // { label: "Bharathi San-?", value: "BHARATI" },  // TODO: check
  { label: "Buddhist Hybrid (Edgerton) San-San", value: "BHS" },
  // { label: "BOP San-San(DE)", value: "BOP" },
  { label: "Borooah Eng-San", value: "BOR" },
  // { label: "BUR San-San(FR)", value: "BUR" },
  { label: "Cappeller San-Eng", value: "CAE" },
  // { label: "CCS San-San(DE)", value: "CCS" },
  { label: "Dhatu Pata", value: "DHATU_PATA" },
  { label: "English to Telugu", value: "ENG2TEL" },
  { label: "English to English", value: "ENG2ENG" },
  // { label: "GRA San-San(DE)", value: "GRA" },
  { label: "Goldstücker San-Eng", value: "GST" },
  { label: "Indian Epigraphical Glossary", value: "IEG" },
  { label: "Index to the Names in the Mahabharata", value: "INM" },
  { label: "Kṛdantarūpamālā", value: "KRM" },
  { label: "Lanman`s Sanskrit Reader Vocabulary", value: "LAN" },
  { label: "Mahabharata Cultural Index", value: "MCI" },
  { label: "Macdonell San-Eng", value: "MD" },
  { label: "Monier-Williams San-Eng", value: "MW" },
  { label: "Monier-Williams San-Eng", value: "MW72" },
  { label: "Monier-Williams Eng-San", value: "MWE" },
  // { label: "An Encyclopedic Dictionary", value: "PD" },
  { label: "Puranic Encyclopedia", value: "PE" },
  {
    label: "Personal and Geographical Names in the Gupta Inscriptions",
    value: "PGN",
  },
  { label: "Purana Index", value: "PUI" },
  // { label: "PW San-?", value: "PW" },
  // { label: "PWG San-?", value: "PWG" },
  // { label: "SCH San-DE", value: "SCH" },
  { label: "Shabda-Sagara San-Eng", value: "SHS" },
  { label: "Sabda-kalpadrum San-San", value: "SKD" },
  // { label: "Sabda-kalpadrum San-Kannada", value: "SKK" },
  { label: "Meulenbeld`s Sanskrit Names of Plants", value: "SNP" },
  // { label: "STC San-DE", value: "STC" },
  // { label: "upasargārthacandrikā San-San", value: "UPCH" }, // उपसर्गार्थचन्द्रिका
  { label: "Vacaspatyam San-San", value: "VCP" },
  { label: "The Vedic Index of Names and Subjects", value: "VEI" },
  { label: "Wilson San-Eng", value: "WIL" },
  { label: "Yates San-Eng", value: "YAT" },
  // { label: "Practical San-Eng", value: "AP" },
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
  // "ABHYANKAR",
  "ACC",
  "AE",
  // "AMARA",
  "AP90",
  // "APTEHI",
  "ARMH",
  "BEN",
  // "BHARATI",
  "BHS",
  // "BOP",
  "BOR",
  // "BUR",
  "CAE",
  // "CCS",
  "DHATU_PATA",
  "ENG2ENG",
  "ENG2TEL",
  // "GRA",
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
  // "PD",
  "PE",
  "PGN",
  "PUI",
  // "PW",
  // "PWG",
  // "SCH",
  "SHS",
  "SKD",
  // "SKK",
  "SNP",
  // "STC",
  // "UPCH",
  "VCP",
  "VEI",
  "WIL",
  "YAT",
  "OTHERS",
] as const;

export const DICTIONARY_SORT_OPTIONS = [
  { label: "Word (A-Z)", value: "word.value" },
  { label: "Word Index (A-Z)", value: "wordIndex" },
  { label: "Relevance", value: "relevance" },
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
    sourceData: e.sourceData,
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
