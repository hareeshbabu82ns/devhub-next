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
import { useWebIMELanguagePersistence } from "@/hooks/use-webime-language-persistence";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RotateCcw } from "lucide-react";
import type { SuggestionProvider } from "@/lib/sanscript/suggestion-provider";
import { StaticSuggestionProvider } from "@/lib/sanscript/static-suggestion-provider";
import { rankAndMergeSuggestions } from "@/lib/sanscript/suggestion-provider";

export interface WebIMEIdeProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  label?: string;
  language?: string;
  withLanguageSelector?: boolean;
  showHelpIcon?: boolean;
  /** localStorage key for persisting language selection (default: "webimeLanguage") */
  storageKey?: string;
  /** Callback when language changes */
  onLanguageChange?: (language: string) => void;
  /** Custom suggestion provider (default: StaticSuggestionProvider) */
  suggestionProvider?: SuggestionProvider;
  /** Enable/disable persistence (default: true) */
  enablePersistence?: boolean;
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
      storageKey = "webimeLanguage",
      onLanguageChange,
      suggestionProvider,
      enablePersistence = true,
      ...props
    },
    _fwdRef,
  ) => {
    const textSize = useTextSizeAtomValue();
    const [infoOpen, setInfoOpen] = useState(false);

    // Use persistence hook for language state management (if enabled)
    const {
      language: lang,
      setLanguage,
      resetLanguage,
      isLanguagePersisted,
    } = useWebIMELanguagePersistence(
      language,
      enablePersistence ? storageKey : undefined,
    );

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

    const valuesCallbackIME = async (
      text: string,
      cb: (result: Record<string, string>[]) => void,
    ) => {
      // Get transliteration suggestions
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

    // const debouncedValues = useDebounceCallback(valuesCallbackIME, 500);
    const updateTextAtCursor: React.KeyboardEventHandler<
      HTMLTextAreaElement
    > = (e) => {
      if (e.ctrlKey && e.key === "i") {
        setInfoOpen(true);
      }
    };

    const textRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (!textRef?.current) return;
      const currentRef = textRef.current;

      const ime = new WebIME({
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
      <div className="flex items-center gap-1">
        {isLanguagePersisted && enablePersistence && (
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
                      onLanguageChange(language || "SAN");
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
            if (enablePersistence) {
              setLanguage(newLang);
            }
            if (onLanguageChange) {
              onLanguageChange(newLang);
            }
          }}
        >
          <SelectTrigger className="w-[100px] border-none">
            <SelectValue placeholder="Query Page Size..." />
            {isLanguagePersisted && enablePersistence && (
              <span className="ml-1 text-xs text-muted-foreground">●</span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.keys(LANGUAGE_TO_TRANSLITERATION_DDLB).map(
                (l: string) => (
                  <SelectItem key={l} value={l}>
                    {LANGUAGE_TO_TRANSLITERATION_DDLB[l].label}
                    {isLanguagePersisted && enablePersistence && lang === l && (
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
