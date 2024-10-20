import { useLanguageAtomValue } from "@/hooks/use-config";
import WebIMEIde from "./WebIMEIde";

const SanscriptEditor = () => {
  const language = useLanguageAtomValue();
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
