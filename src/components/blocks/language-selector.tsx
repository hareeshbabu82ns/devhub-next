import { useLocalStorage } from "usehooks-ts";
import { LANGUAGES_DDLB } from "@/lib/constants";
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

export const LANGUAGE_MEANING_SELECT_KEY = "languageMeaning";
export const LANGUAGE_SELECT_KEY = "language";
export const LANGUAGE_SELECT_DEFAULT = "ENG";

export default function LanguageSelector({
  storageKey = LANGUAGE_SELECT_KEY,
}: {
  storageKey: string;
}) {
  const [language, setLanguage] = useLocalStorage(
    storageKey,
    LANGUAGE_SELECT_DEFAULT,
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
