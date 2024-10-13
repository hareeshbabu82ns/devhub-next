import { Control } from "react-hook-form";
import { FormField } from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES_DDLB } from "@/lib/constants";
import { useLocalStorage, useReadLocalStorage } from "usehooks-ts";
import { useState } from "react";
import { LanguageValueInput } from "@/lib/types";
import {
  LANGUAGE_SELECT_DEFAULT,
  LANGUAGE_SELECT_KEY,
} from "../blocks/language-selector";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TEXT_SIZE_SELECT_KEY } from "../blocks/text-size-selector";
import { LANGUAGE_TO_TRANSLITERATION_DDLB } from "@/lib/constants";
import { Textarea } from "../ui/textarea";
import WebIMEIde from "@/app/(app)/sanscript/_components/WebIMEIde";

interface FormLanguageValueListProps {
  name: string;
  placeholder?: string;
  control: Control<any>;
}

const FormLanguageValueList = ({
  name,
  control,
  placeholder,
}: FormLanguageValueListProps) => {
  const [language] = useLocalStorage(
    LANGUAGE_SELECT_KEY,
    LANGUAGE_SELECT_DEFAULT,
  );
  const textSize = useReadLocalStorage(TEXT_SIZE_SELECT_KEY);

  const [selectedLanguage, setSelectedLanguage] = useState<string>(language);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedVal = field.value.find(
          (v: LanguageValueInput) => v.language === selectedLanguage,
        ) || { value: "" };

        const onTextChange: React.ChangeEventHandler<HTMLTextAreaElement> = (
          e,
        ) => {
          const newValues = selectedVal.language
            ? field.value.map((v: LanguageValueInput) => {
                if (v.language === selectedLanguage) {
                  return {
                    language: selectedLanguage,
                    value: e.target.value,
                  };
                }
                return v;
              })
            : [
                {
                  language: selectedLanguage,
                  value: e.target.value,
                },
                ...field.value,
              ];
          field.onChange(newValues);
        };

        return (
          <div className="flex flex-col gap-4 flex-grow p-1">
            <Select
              defaultValue={language}
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES_DDLB.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ResizablePanelGroup direction="horizontal" className="flex-grow">
              <ResizablePanel defaultSize={50} minSize={5}>
                <div className="flex h-full overflow-y-auto">
                  {Object.keys(LANGUAGE_TO_TRANSLITERATION_DDLB).indexOf(
                    selectedLanguage,
                  ) < 0 ? (
                    <Textarea
                      key={`textarea-${name}-${selectedLanguage}`}
                      {...field}
                      placeholder={placeholder}
                      value={selectedVal.value}
                      onChange={onTextChange}
                    />
                  ) : (
                    <WebIMEIde
                      key={`web-ime-${name}-${selectedLanguage}`}
                      {...field}
                      language={selectedLanguage}
                      value={selectedVal.value}
                      onChange={onTextChange}
                      showHelpIcon
                    />
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel minSize={5}>
                <div className="flex h-full overflow-y-auto border rounded-md">
                  <div
                    className={`flex-1 px-3 py-2 h-1 text-${textSize} antialiased leading-8 tracking-wider`}
                  >
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {selectedVal.value}
                    </Markdown>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        );
      }}
    />
  );
};

export default FormLanguageValueList;
