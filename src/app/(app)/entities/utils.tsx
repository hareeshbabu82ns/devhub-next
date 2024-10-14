import { LANGUAGES } from "@/lib/constants";
import { LanguageValueInput } from "@/lib/types";

export const entityLanguageValueTransliterateHelper = (
  textData: LanguageValueInput[],
) => {
  const tmpTextData = textData?.map((t) => {
    return {
      value: t.value
        ? t.value
        : `$transliterateFrom=${LANGUAGES.filter((l) => l !== t.language && l !== "ENG").join("|")}`,
      language: t.language,
    };
  });
  for (const lang of ["IAST", "SLP1", "ITRANS"]) {
    const langIndex = tmpTextData.findIndex((t) => t.language === lang);
    if (langIndex === -1) {
      tmpTextData.push({
        value: `$transliterateFrom=${LANGUAGES.filter((l) => l !== lang && l !== "ENG").join("|")}`,
        language: lang,
      });
    }
  }
  // console.log("textData", tmpTextData);
  return tmpTextData;
};
