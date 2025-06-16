import LanguageSelector from "@/components/blocks/language-selector";
import PanchangamPlaceSelector from "@/components/blocks/panchangam-place-selector";
import QueryResultsLimitSelector from "@/components/blocks/result-limit-selector";
import TextSizeSelector from "@/components/blocks/text-size-selector";
import ThemeModeToggle from "@/components/blocks/theme-mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LANGUAGE_MEANING_SELECT_KEY,
  LANGUAGE_SELECT_KEY,
} from "@/lib/constants";
import { CogIcon as SettingsIcon } from "lucide-react";

export default function QuickSettingsTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <SettingsIcon className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Quick Settings</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-4 py-4 pl-4">
          <p>Results Page Size:</p>
          <QueryResultsLimitSelector />
          <p>Text Size:</p>
          <TextSizeSelector />
          <p>Language:</p>
          <LanguageSelector storageKey={LANGUAGE_SELECT_KEY} />
          <p>Meaning Language:</p>
          <LanguageSelector storageKey={LANGUAGE_MEANING_SELECT_KEY} />
          <p>Panchangam Place:</p>
          <PanchangamPlaceSelector />
          <p>App Theme:</p>
          <ThemeModeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
