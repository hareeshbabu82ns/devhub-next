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
import { SearchIcon, RotateCcw } from "lucide-react";
import Sanscript from "@indic-transliteration/sanscript";
import { useTextSizeAtomValue } from "@/hooks/use-config";
import SanscriptHelpTrigger from "@/components/sanscript/SanscriptHelpTrigger";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";
import { useWebIMELanguagePersistence } from "@/hooks/use-webime-language-persistence";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SuggestionProvider } from "@/lib/sanscript/suggestion-provider";
import { StaticSuggestionProvider } from "@/lib/sanscript/static-suggestion-provider";
import { rankAndMergeSuggestions } from "@/lib/sanscript/suggestion-provider";

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
  /** localStorage key for persisting language selection (default: "webimeLanguage") */
  storageKey?: string;
  /** Callback when language changes */
  onLanguageChange?: (language: string) => void;
  /** Custom suggestion provider (default: StaticSuggestionProvider) */
  suggestionProvider?: SuggestionProvider;
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
      storageKey = "webimeLanguage",
      onLanguageChange,
      suggestionProvider,
      ...props
    },
    _fwdRef,
  ) => {
    const textSize = useTextSizeAtomValue();
    const [isDropdownActive, setIsDropdownActive] = useState<boolean>(false);
    const currentValueRef = useRef<string>("");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use persistence hook for language state management
    const {
      language: lang,
      setLanguage,
      resetLanguage,
      isLanguagePersisted,
      userHasSelectedLanguage,
      setUserHasSelectedLanguage,
    } = useWebIMELanguagePersistence(language, storageKey);

    // Initialize suggestion provider (default to static if not provided)
    const provider = useRef<SuggestionProvider>(
      suggestionProvider || new StaticSuggestionProvider(),
    );

    // Update provider if prop changes
    useEffect(() => {
      if (suggestionProvider) {
        provider.current = suggestionProvider;
      }
    }, [suggestionProvider]);

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

    const valuesCallbackIME = async (
      text: string,
      cb: (result: Record<string, string>[]) => void,
    ) => {
      if (lang === "NONE") {
        // For "NONE" language, use only suggestion provider (no transliteration)
        try {
          const suggestions = await provider.current.getSuggestions(text, {
            limit: 10,
          });
          const results = suggestions.map((s) => ({
            key: s.key,
            value: s.value,
          }));
          cb(results);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
          cb([]);
        }
        return;
      }

      // For other languages, combine transliteration with suggestions
      const transOut = transliterateText({
        text,
        toScheme: LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme,
      });

      // Get additional suggestions from provider
      try {
        const suggestions = await provider.current.getSuggestions(text, {
          language: lang,
          limit: 10,
          fromScheme: LANGUAGE_TO_TRANSLITERATION_DDLB[lang].scheme,
        });

        // Convert transliterations to suggestion format
        const transliterationSuggestions = transOut.map((t) => ({
          key: text,
          value: t,
          source: "transliteration" as const,
        }));

        // Merge and rank suggestions
        const merged = rankAndMergeSuggestions(
          [transliterationSuggestions, suggestions],
          text,
          20,
        );

        // Convert back to WebIME format
        const results = merged.map((s) => ({
          key: s.key,
          value: s.value,
        }));

        cb(results);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        // Fallback to just transliteration
        const outputItrans = transOut.map((t) => ({
          key: text,
          value: t,
        }));
        cb(outputItrans);
      }
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
      <div className="absolute right-0 top-0 flex items-center gap-1">
        {isLanguagePersisted && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    resetLanguage();
                    if (onLanguageChange) {
                      onLanguageChange(language || "NONE");
                    }
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset to default language</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Select
          value={lang}
          onValueChange={(newLang) => {
            setLanguage(newLang);
            if (onLanguageChange) {
              onLanguageChange(newLang);
            }
          }}
        >
          <SelectTrigger className="border-0 border-l-2 h-8 w-[100px]">
            <SelectValue placeholder="Input Language..." />
            {isLanguagePersisted && (
              <span className="ml-1 text-xs text-muted-foreground">●</span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.keys(LANGUAGE_TO_TRANSLITERATION_DDLB).map(
                (l: string) => (
                  <SelectItem key={l} value={l}>
                    {LANGUAGE_TO_TRANSLITERATION_DDLB[l].label}
                    {isLanguagePersisted && lang === l && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (saved)
                      </span>
                    )}
                  </SelectItem>
                ),
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
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
            withLanguageSelector &&
              (isLanguagePersisted ? "pr-[150px]" : "pr-[110px]"),
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
