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
        <Button
          variant="outline"
          size="icon"
          className="min-h-9 min-w-9 sm:h-10 sm:w-10 touch-manipulation"
        >
          <SettingsIcon className="size-5 sm:size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Quick Settings</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-4 pl-2 sm:pl-4">
          <p className="self-center text-sm sm:text-base">Results Page Size:</p>
          <QueryResultsLimitSelector />
          <p className="self-center text-sm sm:text-base">Text Size:</p>
          <TextSizeSelector />
          <p className="self-center text-sm sm:text-base">Language:</p>
          <LanguageSelector storageKey={LANGUAGE_SELECT_KEY} />
          <p className="self-center text-sm sm:text-base">Meaning Language:</p>
          <LanguageSelector storageKey={LANGUAGE_MEANING_SELECT_KEY} />
          <p className="self-center text-sm sm:text-base">Panchangam Place:</p>
          <PanchangamPlaceSelector />
          <p className="self-center text-sm sm:text-base">App Theme:</p>
          <ThemeModeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
