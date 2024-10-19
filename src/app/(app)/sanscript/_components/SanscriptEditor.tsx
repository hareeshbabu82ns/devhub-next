import WebIMEIde from "./WebIMEIde";
import { languageAtom } from "@/hooks/use-config";
import { useAtom } from "jotai";

const SanscriptEditor = () => {
  const [language] = useAtom(languageAtom);
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
