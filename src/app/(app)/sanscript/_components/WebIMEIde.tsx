import { Textarea } from "@/components/ui/textarea";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  getImeScheme,
  LANGUAGE_TO_TRANSLITERATION_DDLB,
  transliterateText,
} from "./utils";
import { cn } from "@/lib/utils";
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
import {
  getSchemeOption,
  needsTransliteration,
} from "@/lib/sanscript/transliteration";

export interface WebIMEIdeProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  label?: string;
  /**
   * Script the IME types in (SAN, TEL ...). "NONE", roman schemes and unknown
   * codes switch the IME off, leaving a plain textarea.
   */
  language?: string;
  withLanguageSelector?: boolean;
  showHelpIcon?: boolean;
  /** localStorage key for persisting language selection (default: "webimeLanguage") */
  storageKey?: string;
  /** Callback when language changes */
  onLanguageChange?: (language: string) => void;
  /** Custom suggestion provider (default: StaticSuggestionProvider) */
  suggestionProvider?: SuggestionProvider;
  /**
   * Remember the language picked in the selector (default: true).
   * Only applies together with `withLanguageSelector`: a field without a
   * selector is tied to its `language` prop and never reads a stored one.
   */
  enablePersistence?: boolean;
  /** Languages offered in the selector (default: None, Sanskrit, Telugu) */
  languages?: Record<string, { label: string; scheme: string }>;
  /** Called with the new text on every change, including IME selections */
  onValueChange?: (value: string) => void;
  /** Extra controls rendered in the toolbar, before the language selector */
  actions?: React.ReactNode;
}

// Same word boundaries the IME itself uses
const WORD_BEFORE_CARET = /[^\s.,?!()]+$/;

const setNativeValue = (el: HTMLTextAreaElement, value: string) => {
  // Go through the prototype setter so React notices the change by itself
  // and fires onChange for the event being dispatched.
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
};

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
      languages = LANGUAGE_TO_TRANSLITERATION_DDLB,
      onValueChange,
      actions,
      onChange,
      onKeyUp,
      ...props
    },
    fwdRef,
  ) => {
    const textSize = useTextSizeAtomValue();
    const [infoOpen, setInfoOpen] = useState(false);

    const persist = enablePersistence && withLanguageSelector;
    const {
      language: lang,
      setLanguage,
      resetLanguage,
      isLanguagePersisted,
    } = useWebIMELanguagePersistence(language, storageKey, {
      enabled: persist,
      validLanguages: languages,
    });

    const imeScheme = getImeScheme(lang);

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

    const textRef = useRef<HTMLTextAreaElement | null>(null);
    const setRefs = useCallback(
      (el: HTMLTextAreaElement | null) => {
        textRef.current = el;
        if (typeof fwdRef === "function") fwdRef(el);
        else if (fwdRef) fwdRef.current = el;
      },
      [fwdRef],
    );

    // Latest handlers, readable from DOM listeners without re-attaching the IME
    const handlersRef = useRef({ onChange, onValueChange });
    handlersRef.current = { onChange, onValueChange };

    useEffect(() => {
      const el = textRef.current;
      if (!el || !imeScheme) return;

      const valuesCallbackIME = async (
        text: string,
        cb: (result: Record<string, string>[]) => void,
      ) => {
        const transOut = transliterateText({ text, toScheme: imeScheme });
        const fallback = () =>
          cb(transOut.map((t) => ({ key: text, value: t })));

        // Nothing to transliterate: offer the word as is, no suggestions
        if (!needsTransliteration(text)) return fallback();

        try {
          const suggestions = await provider.current.getSuggestions(text, {
            language: lang,
            limit: 10,
            fromScheme: imeScheme,
          });

          const merged = rankAndMergeSuggestions(
            [
              transOut.map((t) => ({
                key: text,
                value: t,
                source: "transliteration" as const,
              })),
              suggestions,
            ],
            text,
            20,
          );

          cb(merged.map((s) => ({ key: s.key, value: s.value })));
        } catch (error) {
          console.error("Error fetching suggestions:", error);
          fallback();
        }
      };

      const ime = new WebIME({
        values: valuesCallbackIME,
        loadingItemTemplate:
          "<span class='p-2 px-4 text-muted-foreground'>Loading...</span>",
        containerClass: "bg-popover rounded-sm shadow-lg p-2 mt-4 z-50",
        itemClass: `text-${textSize} leading-loose tracking-widest flex flex-row gap-2 p-2 px-4 cursor-default`,
        menuItemTemplate: (item) => (item.original as { value: string }).value,
      });

      // The IME writes the chosen word straight into the DOM, which React
      // does not see as a change. Report it, otherwise a controlled value
      // (forms, the convertor) lags one keystroke behind the screen.
      const handleReplaced = () => {
        const { onChange, onValueChange } = handlersRef.current;
        onChange?.({
          target: el,
          currentTarget: el,
          type: "change",
        } as unknown as React.ChangeEvent<HTMLTextAreaElement>);
        onValueChange?.(el.value);
      };

      // On-screen keyboards (Android in particular) do not send a usable
      // keydown for space, so the IME never commits the word. Commit the
      // word before the caret ourselves when a space arrives that way.
      let realSpaceKey = false;
      const handleKeyDown = (e: KeyboardEvent) => {
        realSpaceKey = e.key === " " && e.keyCode === 32;
      };
      const handleInput = (e: Event) => {
        const data = (e as InputEvent).data;
        const typedSpace = data === " " && !realSpaceKey;
        realSpaceKey = false;
        if (!typedSpace) return;

        const caret = el.selectionStart ?? 0;
        if (caret < 1 || el.value[caret - 1] !== " ") return;
        const before = el.value.slice(0, caret - 1);
        const word = before.match(WORD_BEFORE_CARET)?.[0];
        if (!word || !needsTransliteration(word)) return;

        const replacement = transliterateText({
          text: word,
          toScheme: imeScheme,
        })[0];
        if (!replacement || replacement === word) return;

        const start = before.length - word.length;
        setNativeValue(
          el,
          el.value.slice(0, start) + replacement + el.value.slice(caret - 1),
        );
        const position = start + replacement.length + 1;
        el.setSelectionRange(position, position);
        ime.hideMenu();
      };

      // Registered before the IME attaches, so they run ahead of its own
      el.addEventListener("keydown", handleKeyDown, true);
      el.addEventListener("input", handleInput, true);
      el.addEventListener("tribute-replaced", handleReplaced);
      ime.attach(el as never);

      return () => {
        ime.hideMenu();
        ime.detach(el as never);
        el.removeEventListener("keydown", handleKeyDown, true);
        el.removeEventListener("input", handleInput, true);
        el.removeEventListener("tribute-replaced", handleReplaced);
      };
    }, [lang, imeScheme, textSize]);

    const languageHelper = (
      <SanscriptHelpTrigger
        language={lang}
        open={infoOpen}
        onOpenChange={setInfoOpen}
      />
    );

    const languageSelector = (
      <div className="flex items-center gap-1">
        {isLanguagePersisted && persist && (
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
                    onLanguageChange?.(language || "NONE");
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
            onLanguageChange?.(newLang);
          }}
        >
          <SelectTrigger
            className="w-[110px] border-none"
            aria-label="Typing language"
          >
            <SelectValue placeholder="Type in..." />
            {isLanguagePersisted && persist && (
              <span className="ml-1 text-xs text-muted-foreground">●</span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.keys(languages).map((l: string) => (
                <SelectItem key={l} value={l}>
                  {languages[l].label}
                  {isLanguagePersisted && persist && lang === l && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (saved)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
    const showToolbar =
      label !== undefined ||
      withLanguageSelector ||
      showHelpIcon ||
      actions !== undefined;

    const fontClass =
      getSchemeOption(lang)?.fontClass ??
      LANGUAGE_FONT_FAMILY[lang as keyof typeof LANGUAGE_FONT_FAMILY];

    return (
      <div className={cn("relative flex flex-1", containerClassName)}>
        {showToolbar && (
          <div className="absolute flex w-full flex-row items-center justify-between gap-2 border-b p-2 px-2 sm:px-4 h-12">
            <div className="min-w-0 truncate">{label}</div>
            <div className="flex shrink-0 flex-row items-center">
              {actions}
              {withLanguageSelector ? languageSelector : null}
              {showHelpIcon && languageHelper}
            </div>
          </div>
        )}
        <Textarea
          ref={setRefs}
          className={cn(
            fontClass,
            `subpixel-antialiased text-${textSize} leading-loose tracking-widest resize-none`,
            showToolbar && "pt-14",
            className,
          )}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            onChange?.(e);
            onValueChange?.(e.target.value);
          }}
          onKeyUp={(e) => {
            if (e.ctrlKey && e.key === "i") setInfoOpen(true);
            onKeyUp?.(e);
          }}
          {...props}
        />
      </div>
    );
  },
);

WebIMEIde.displayName = "WebIMEIde";

export default WebIMEIde;
