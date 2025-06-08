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
import { LANGUAGE_TO_TRANSLITERATION_DDLB, transliterateText } from "./utils";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import Sanscript from "@indic-transliteration/sanscript";
import { useTextSizeAtomValue } from "@/hooks/use-config";
import SanscriptHelpTrigger from "@/components/sanscript/SanscriptHelpTrigger";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";

export interface WebIMEIdeProps extends React.ComponentProps<"input"> {
  containerClassName?: string;
  label?: string;
  /** Language for input transliteration. Use "NONE" to disable transliteration and show text suggestions. */
  language?: string;
  showSearchIcon?: boolean;
  withLanguageSelector?: boolean;
  showHelpIcon?: boolean;
  /** Target transliteration scheme for output */
  valueAs?: string;
  /** Callback when text changes, includes the processed text and selected language */
  onTextChange?: (value: string, language: string) => void;
}

/**
 * WebIMEIdeInput - Enhanced input component with transliteration support
 *
 * Features:
 * - Supports multiple transliteration schemes (Sanskrit, Telugu, etc.)
 * - "None" option for no transliteration with helpful text suggestions
 * - Popup suggestions for common Sanskrit/religious terms
 * - Language selector dropdown
 * - Help icon for transliteration guidance
 * - Smart onTextChange behavior: doesn't trigger during dropdown navigation,
 *   only when user types or makes final selection
 */
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
    const textSize = useTextSizeAtomValue();
    const [lang, setLang] = useState<string>(language || "NONE");
    const [isDropdownActive, setIsDropdownActive] = useState<boolean>(false);
    const [userHasSelectedLanguage, setUserHasSelectedLanguage] =
      useState<boolean>(false);
    const currentValueRef = useRef<string>("");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync internal language state with prop changes (important for hydration)
    // Only update if the language prop actually changes and user hasn't manually selected a language
    useEffect(() => {
      if (
        language !== undefined &&
        language !== lang &&
        !userHasSelectedLanguage
      ) {
        setLang(language);
      }
    }, [language, userHasSelectedLanguage]); // Added userHasSelectedLanguage to dependencies

    const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onTextChange) return;

      const value = event.target ? event.target.value : "";
      currentValueRef.current = value; // Store the current value

      // If language is "NONE", no WebIME is active, so trigger onTextChange immediately
      if (lang === "NONE") {
        onTextChange(value, lang);
        return;
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // For other languages with WebIME, use a delay to check if dropdown appears
      timeoutRef.current = setTimeout(() => {
        // Check multiple ways that WebIME dropdown might be visible
        const tributeContainer = document.querySelector(
          ".tribute-container",
        ) as HTMLElement;
        const popoverElements = document.querySelectorAll(
          '[class*="bg-popover"]',
        );

        // Check if any WebIME-related elements are visible
        let isDropdownVisible = false;

        if (tributeContainer) {
          isDropdownVisible =
            tributeContainer.style.display !== "none" &&
            tributeContainer.offsetHeight > 0 &&
            tributeContainer.offsetWidth > 0;
        }

        // Also check for any popover-style elements that might be the WebIME dropdown
        if (!isDropdownVisible) {
          for (const el of popoverElements) {
            const htmlEl = el as HTMLElement;
            if (htmlEl.offsetHeight > 0 && htmlEl.offsetWidth > 0) {
              isDropdownVisible = true;
              break;
            }
          }
        }

        // Don't trigger onTextChange when dropdown is active OR visible in DOM
        if (isDropdownActive || isDropdownVisible) {
          return;
        }

        // Use the stored value to prevent race conditions
        const currentValue = currentValueRef.current;

        const transOut =
          lang === valueAs
            ? currentValue
            : Sanscript.t(
                currentValue,
                LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme,
                valueAs,
              );
        onTextChange(transOut, lang);

        timeoutRef.current = null; // Clear the ref after execution
      }, 150); // Increased delay to 150ms to allow WebIME processing
    };

    const valuesCallbackIME = (
      text: string,
      cb: (result: Record<string, string>[]) => void,
    ) => {
      if (lang === "NONE") {
        cb([]);
        return;
      }

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

    const textRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (!textRef?.current) return;
      const currentRef = textRef.current;

      // Don't create WebIME instance for "NONE" language - just use normal input
      if (lang === "NONE") {
        return () => {
          // Clean up any pending timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        };
      }

      const ime = new WebIME({
        values: valuesCallbackIME,
        loadingItemTemplate:
          "<span class='p-2 px-4 text-muted-foreground'>Loading...</span>",
        containerClass: "bg-popover rounded-sm shadow-lg p-2 mt-4 z-50",
        itemClass: `text-${textSize} leading-loose tracking-widest flex flex-row gap-2 p-2 px-4 cursor-default`,
        menuItemTemplate: (item) => (item.original as { value: string }).value,
      });

      // Event handler functions
      const handleTributeReplaced = (e: any) => {
        setIsDropdownActive(false);
        // Handle selection - trigger onTextChange with the selected value
        if (onTextChange && e.detail?.item?.original?.value) {
          const selectedValue = e.detail.item.original.value;

          // For transliteration languages, apply transliteration if needed
          const transOut =
            lang === valueAs
              ? selectedValue
              : Sanscript.t(
                  selectedValue,
                  LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme,
                  valueAs,
                );
          onTextChange(transOut, lang);
        }
      };

      const handleTributeActiveTrue = () => {
        setIsDropdownActive(true);
      };

      const handleTributeActiveFalse = () => {
        setIsDropdownActive(false);
      };

      // Listen for tribute events - note the correct event names
      currentRef.addEventListener("tribute-replaced", handleTributeReplaced);
      currentRef.addEventListener(
        "tribute-active-true",
        handleTributeActiveTrue,
      );
      currentRef.addEventListener(
        "tribute-active-false",
        handleTributeActiveFalse,
      );

      ime.attach(textRef.current as never);

      return () => {
        ime.detach(currentRef as never);
        // Clean up event listeners
        currentRef.removeEventListener(
          "tribute-replaced",
          handleTributeReplaced,
        );
        currentRef.removeEventListener(
          "tribute-active-true",
          handleTributeActiveTrue,
        );
        currentRef.removeEventListener(
          "tribute-active-false",
          handleTributeActiveFalse,
        );

        // Clean up any pending timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang, textSize, onTextChange, valueAs]);

    const languageSelector = (
      <Select
        value={lang}
        onValueChange={(newLang) => {
          setLang(newLang);
          setUserHasSelectedLanguage(true); // Mark that user has manually selected a language
        }}
      >
        <SelectTrigger className="border-0 border-l-2 absolute right-0 top-0 h-8 w-[100px]">
          <SelectValue placeholder="Input Language..." />
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
            // Apply font family only for supported languages, not for "NONE"
            lang !== "NONE" &&
              LANGUAGE_FONT_FAMILY[lang as keyof typeof LANGUAGE_FONT_FAMILY],
            `leading-loose tracking-widest`,
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
