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
import { useState } from "react";
import { LanguageValueInput } from "@/lib/types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LANGUAGE_TO_TRANSLITERATION_DDLB } from "@/lib/constants";
import { Textarea } from "../ui/textarea";
import WebIMEIde from "@/app/(app)/sanscript/_components/WebIMEIde";
import { useLanguageAtomValue, useTextSizeAtomValue } from "@/hooks/use-config";

interface FormLanguageValueListProps {
  name: string;
  placeholder?: string;
  control: Control<any>;
}

const FormLanguageValueList = ( {
  name,
  control,
  placeholder,
}: FormLanguageValueListProps ) => {
  const language = useLanguageAtomValue();
  const textSize = useTextSizeAtomValue();

  const [ selectedLanguage, setSelectedLanguage ] = useState<string>( language );

  return (
    <FormField
      control={control}
      name={name}
      render={( { field } ) => {
        const selectedVal = field.value.find(
          ( v: LanguageValueInput ) => v.language === selectedLanguage,
        ) || { value: "" };

        const onTextChange: React.ChangeEventHandler<HTMLTextAreaElement> = (
          e,
        ) => {
          const newValues = selectedVal.language
            ? field.value.map( ( v: LanguageValueInput ) => {
              if ( v.language === selectedLanguage ) {
                return {
                  language: selectedLanguage,
                  value: e.target.value,
                };
              }
              return v;
            } )
            : [
              {
                language: selectedLanguage,
                value: e.target.value,
              },
              ...field.value,
            ];
          field.onChange( newValues );
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
                {LANGUAGES_DDLB.map( ( option ) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ) )}
              </SelectContent>
            </Select>
            <ResizablePanelGroup direction="horizontal" className="flex-grow">
              <ResizablePanel defaultSize={50} minSize={5}>
                <div className="flex h-full overflow-y-auto">
                  {Object.keys( LANGUAGE_TO_TRANSLITERATION_DDLB ).indexOf(
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
                    className={`flex-1 px-3 py-2 h-1 text-${textSize} subpixel-antialiased leading-loose tracking-widest markdown-content`}
                  >
                    <Markdown
                      remarkPlugins={[ remarkGfm ]}
                    >
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
