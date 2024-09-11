import { LANGUAGE_SELECT_KEY } from "@/components/blocks/language-selector";
import { useReadLocalStorage } from "usehooks-ts";
import WebIMEIde from "./WebIMEIde";

const SanscriptEditor = () => {
  const language = useReadLocalStorage<string>(LANGUAGE_SELECT_KEY) || "SAN";
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-1">
        <WebIMEIde
          label="Transliteration Editor"
          language={language}
          withLanguageSelector
          showHelpIcon
        />
      </div>
    </div>
  );
};

export default SanscriptEditor;
