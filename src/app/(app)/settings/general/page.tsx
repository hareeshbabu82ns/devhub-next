import TextSizeSelector from "@/components/blocks/text-size-selector";
import LanguageSelector, {
  LANGUAGE_MEANING_SELECT_KEY,
  LANGUAGE_SELECT_KEY,
} from "@/components/blocks/language-selector";
import QueryResultsLimitSelector from "@/components/blocks/result-limit-selector";
import AppearanceSettings from "../_components/AppearanceSettings";

const GeneralSettings = () => {
  return (
    <div className="grid gap-6">
      <div className="border rounded-sm p-4">
        <div>
          <h3 className="text-lg font-medium">Quick Settings</h3>
          <p className="text-muted-foreground text-sm">
            Various app settings for Content and UI.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4">
          <p>Results Page Size: </p>
          <QueryResultsLimitSelector />
          <p>Text Size: </p>
          <TextSizeSelector />
          <p>Language: </p>
          <LanguageSelector storageKey={LANGUAGE_SELECT_KEY} />
          <p>Meaning Language: </p>
          <LanguageSelector storageKey={LANGUAGE_MEANING_SELECT_KEY} />
        </div>
      </div>
      <AppearanceSettings />
    </div>
  );
};

export default GeneralSettings;
