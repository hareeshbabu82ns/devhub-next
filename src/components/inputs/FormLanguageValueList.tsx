import { Control, useFormContext } from "react-hook-form";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { isSyncScriptLanguage, syncScripts } from "@/lib/entity-text";

interface FormLanguageValueListProps {
  name: string;
  placeholder?: string;
  control: Control<any>;
  /**
   * Offer to regenerate the other transliterable scripts from the one being
   * edited, so Sanskrit / Telugu / IAST / SLP1 / ITRANS never drift apart.
   */
  syncScripts?: boolean;
}

const FormLanguageValueList = ( {
  name,
  control,
  placeholder,
  syncScripts: offerSync = false,
}: FormLanguageValueListProps ) => {
  const language = useLanguageAtomValue();
  const textSize = useTextSizeAtomValue();
  const isNarrow = useMediaQuery( "(max-width: 767px)" );
  const { getValues } = useFormContext();

  // Open on a language that actually has text: the display language when it
  // is present, otherwise the first one stored — never an empty-looking box.
  const [ selectedLanguage, setSelectedLanguage ] = useState<string>( () => {
    const values: LanguageValueInput[] = getValues( name ) ?? [];
    const hasText = ( l: string ) =>
      values.some( ( v ) => v.language === l && v.value );
    return hasText( language ) || values.length === 0
      ? language
      : ( values.find( ( v ) => v.value )?.language ?? language );
  } );
  const [ syncOn, setSyncOn ] = useState( true );
  const canSync = offerSync && isSyncScriptLanguage( selectedLanguage );

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
          field.onChange(
            canSync && syncOn
              ? syncScripts( newValues, selectedLanguage )
              : newValues,
          );
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
                    {field.value.some(
                      ( v: LanguageValueInput ) =>
                        v.language === option.value && v.value,
                    )
                      ? " •"
                      : ""}
                  </SelectItem>
                ) )}
              </SelectContent>
            </Select>
            {canSync && (
              <div className="flex items-center gap-2">
                <Switch
                  id={`sync-scripts-${name}`}
                  checked={syncOn}
                  onCheckedChange={setSyncOn}
                />
                <Label htmlFor={`sync-scripts-${name}`} className="font-normal">
                  Update the other scripts (Sanskrit, Telugu, IAST, SLP1,
                  ITRANS) as I type
                </Label>
              </div>
            )}
            {/* side by side on tablets and up, stacked on phones */}
            <ResizablePanelGroup
              direction={isNarrow ? "vertical" : "horizontal"}
              className="flex-grow min-h-[28rem] md:min-h-0"
            >
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
