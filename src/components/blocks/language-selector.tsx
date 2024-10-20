"use client";

import { LANGUAGE_SELECT_KEY, LANGUAGES_DDLB } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAtom } from "jotai";
import { languageAtom, languageMeaningAtom } from "@/hooks/use-config";

export default function LanguageSelector({
  storageKey = LANGUAGE_SELECT_KEY,
}: {
  storageKey: string;
}) {
  const [language, setLanguage] = useAtom(
    storageKey === LANGUAGE_SELECT_KEY ? languageAtom : languageMeaningAtom,
  );

  const selectedLanguage = LANGUAGES_DDLB.find(
    (lang) => lang.value === language,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-30">
          {selectedLanguage?.label || "Language..."}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-50" align="end">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
          {LANGUAGES_DDLB.map((lang) => (
            <DropdownMenuRadioItem key={lang.value} value={lang.value}>
              {lang.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
