import { TEXT_SIZE_SELECT_KEY } from "@/components/blocks/text-size-selector";
import React, { useEffect, useRef, useState } from "react";
import { useReadLocalStorage } from "usehooks-ts";
import WebIME from "webime";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_TO_TRANSLITERATION_DDLB, transliterateText } from "./utils";
import { cn } from "@/lib/utils";
import { Input, InputProps } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import Sanscript from "@indic-transliteration/sanscript";
import SanscriptHelpTrigger from "./SanscriptHelpTrigger";

export interface WebIMEIdeProps extends InputProps {
  containerClassName?: string;
  label?: string;
  language?: string;
  showSearchIcon?: boolean;
  withLanguageSelector?: boolean;
  showHelpIcon?: boolean;
  valueAs?: string;
  onTextChange?: (value: string, language: string) => void;
}

const WebIMEIdeInput = React.forwardRef<HTMLInputElement, WebIMEIdeProps>(
  (
    {
      className,
      containerClassName,
      language,
      withLanguageSelector = false,
      showSearchIcon = false,
      showHelpIcon = false,
      valueAs = "itrans_dravidian",
      onTextChange,
      ...props
    },
    _fwdRef,
  ) => {
    const textSize = useReadLocalStorage(TEXT_SIZE_SELECT_KEY);
    const [lang, setLang] = useState<string>(language || "SAN");

    const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onTextChange) return;
      const value = event.target ? event.target.value : "";
      const transOut =
        lang === valueAs
          ? value
          : Sanscript.t(
              value,
              LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme,
              valueAs,
            );
      onTextChange(transOut, lang);
    };

    const valuesCallbackIME = (
      text: string,
      cb: (result: Record<string, string>[]) => void,
    ) => {
      const transOut = transliterateText({
        text,
        toScheme: LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme,
      });
      const outputItrans = transOut.map((t) => ({
        key: text,
        value: t,
      }));
      //   // console.log(outputItrans);
      //   // setTimeout(() => cb(outputItrans), 1000);
      cb(outputItrans);
    };

    const textRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (!textRef?.current) return;
      const currentRef = textRef.current;

      const ime = new WebIME({
        // values: debouncedValues,
        values: valuesCallbackIME,
        loadingItemTemplate:
          "<span class='p-2 px-4 text-muted-foreground'>Loading...</span>",
        containerClass: "bg-popover rounded-sm shadow-lg p-2 mt-4 z-50",
        itemClass: `text-${textSize} flex flex-row gap-2 p-2 px-4 cursor-default`,
        menuItemTemplate: (item) => (item.original as { value: string }).value,
      });
      ime.attach(textRef.current as never);

      return () => ime.detach(currentRef as never);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang, textSize]);

    const languageSelector = (
      <Select value={lang} onValueChange={setLang}>
        <SelectTrigger className="border-none absolute right-1 top-1 h-8 w-[100px]">
          <SelectValue placeholder="Query Page Size..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {Object.keys(LANGUAGE_TO_TRANSLITERATION_DDLB).map((l: string) => (
              <SelectItem key={l} value={l}>
                {LANGUAGE_TO_TRANSLITERATION_DDLB[l].label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );

    const languageHelper = <SanscriptHelpTrigger language={lang} />;

    return (
      <div className={cn("relative flex flex-1", containerClassName)}>
        {showSearchIcon && (
          <SearchIcon className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={textRef}
          className={cn(
            `text-${textSize}`,
            showSearchIcon && "pl-8",
            withLanguageSelector && "pr-[110px]",
            className,
          )}
          onChange={onChangeHandler}
          {...props}
        />
        {withLanguageSelector && languageSelector}
        {showHelpIcon && languageHelper}
      </div>
    );
  },
);

WebIMEIdeInput.displayName = "WebIMEIdeInput";

export default WebIMEIdeInput;
