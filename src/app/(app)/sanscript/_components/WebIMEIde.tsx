import { Textarea } from "@/components/ui/textarea";
import React, { useEffect, useRef, useState } from "react";
import WebIME from "webime";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  // getWordAtCursor,
  LANGUAGE_TO_TRANSLITERATION_DDLB,
  // replaceWordAtCursor,
  transliterateText,
} from "./utils";
import { cn } from "@/lib/utils";
// import Sanscript from "@indic-transliteration/sanscript";
import { useTextSizeAtomValue } from "@/hooks/use-config";
import SanscriptHelpTrigger from "@/components/sanscript/SanscriptHelpTrigger";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";

export interface WebIMEIdeProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  label?: string;
  language?: string;
  withLanguageSelector?: boolean;
  showHelpIcon?: boolean;
}

const WebIMEIde = React.forwardRef<HTMLTextAreaElement, WebIMEIdeProps>(
  (
    {
      className,
      containerClassName,
      label,
      language,
      withLanguageSelector = false,
      showHelpIcon = false,
      ...props
    },
    _fwdRef,
  ) => {
    const textSize = useTextSizeAtomValue();
    const [lang, setLang] = useState<string>(language || "SAN");
    const [infoOpen, setInfoOpen] = useState(false);

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
      cb(outputItrans);
    };

    // const debouncedValues = useDebounceCallback(valuesCallbackIME, 500);
    const updateTextAtCursor: React.KeyboardEventHandler<
      HTMLTextAreaElement
    > = (e) => {
      if (e.ctrlKey && e.key === "i") {
        setInfoOpen(true);
      }
      // const target = e.target as HTMLTextAreaElement;
      // if (target.selectionStart !== target.selectionEnd) return;
      // const cursorPos = target.selectionStart;

      // if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      //   e.preventDefault();

      //   // get current word
      //   const {
      //     word: wordAtCursor,
      //     start,
      //     end,
      //   } = getWordAtCursor(target.value, cursorPos);

      //   const transOut =
      //     e.key === "ArrowUp"
      //       ? Sanscript.t(
      //           wordAtCursor,
      //           "itrans_dravidian",
      //           LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme
      //         )
      //       : Sanscript.t(
      //           wordAtCursor,
      //           LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme,
      //           "itrans_dravidian"
      //         );

      //   if (wordAtCursor.trim().length > 0 && wordAtCursor !== transOut) {
      //     // console.log(`new range: (${start}, ${end})`, wordAtCursor, transOut);

      //     // replace word at cursor with transliteration
      //     replaceWordAtCursor({
      //       textArea: target,
      //       word: transOut,
      //       start: start,
      //       end: end,
      //     });
      //   }
      // }
    };

    const textRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (!textRef?.current) return;
      const currentRef = textRef.current;

      const ime = new WebIME({
        // values: debouncedValues,
        values: valuesCallbackIME,
        loadingItemTemplate:
          "<span class='p-2 px-4 text-muted-foreground'>Loading...</span>",
        containerClass: "bg-popover rounded-sm shadow-lg p-2 mt-4 z-50",
        itemClass: `text-${textSize} leading-loose tracking-widest flex flex-row gap-2 p-2 px-4 cursor-default`,
        menuItemTemplate: (item) => (item.original as { value: string }).value,
      });
      ime.attach(textRef.current as never);

      return () => ime.detach(currentRef as never);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang, textSize]);

    const languageHelper = (
      <SanscriptHelpTrigger
        language={lang}
        open={infoOpen}
        onOpenChange={setInfoOpen}
      />
    );

    const languageSelector = (
      <Select value={lang} onValueChange={setLang}>
        <SelectTrigger className="w-[100px] border-none">
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
    const showToolbar =
      label !== undefined || withLanguageSelector || showHelpIcon;

    return (
      <div className={cn("relative flex flex-1", containerClassName)}>
        {showToolbar && (
          <div className="absolute flex flex-1 flex-row w-full justify-between p-2 px-4 border-b h-12 items-center">
            <div>{label}</div>
            <div className="flex flex-row">
              {withLanguageSelector ? languageSelector : null}
              {showHelpIcon && languageHelper}
            </div>
          </div>
        )}
        <Textarea
          ref={textRef}
          className={cn(
            LANGUAGE_FONT_FAMILY[lang as keyof typeof LANGUAGE_FONT_FAMILY],
            `subpixel-antialiased text-${textSize} leading-loose tracking-widest resize-none`,
            showToolbar && "pt-14",
            className,
          )}
          onKeyUp={updateTextAtCursor}
          {...props}
        />
      </div>
    );
  },
);

WebIMEIde.displayName = "WebIMEIde";

export default WebIMEIde;
