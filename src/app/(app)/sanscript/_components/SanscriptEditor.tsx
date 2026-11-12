"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon, CopyIcon, LanguagesIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useDebounce } from "@/hooks/use-debounce";
import {
  CONVERTER_SCHEMES,
  convertTextSmart,
  detectScheme,
  getSchemeOption,
} from "@/lib/sanscript/transliteration";
import WebIMEIde from "./WebIMEIde";
import { getImeScheme, IME_LANGUAGES_ALL } from "./utils";

const DRAFT_KEY = "sanscript:editorDraft";

const SanscriptEditor = () => {
  const appLanguage = useLanguageAtomValue();
  const [text, setText] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  // Restore the draft after hydration, then keep it saved
  useEffect(() => {
    try {
      setText(localStorage.getItem(DRAFT_KEY) ?? "");
    } catch {
      // storage unavailable (private mode): the editor still works
    }
    setDraftLoaded(true);
  }, []);

  const debouncedText = useDebounce(text, 400);
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, debouncedText);
    } catch {
      // ignore quota / availability errors
    }
  }, [debouncedText, draftLoaded]);

  /** Replace the text, offering a one tap way back */
  const replaceText = (next: string, message: string) => {
    const previous = text;
    setText(next);
    toast.success(message, {
      action: { label: "Undo", onClick: () => setText(previous) },
    });
  };

  const convertAll = (to: string) => {
    if (!text.trim()) return;
    const converted = convertTextSmart(text, to);
    if (converted === text) {
      toast.info(`Nothing to convert to ${getSchemeOption(to)?.label}`);
      return;
    }
    replaceText(converted, `Converted to ${getSchemeOption(to)?.label}`);
  };

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const detected = getSchemeOption(detectScheme(text));
    return {
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      characters: Array.from(text).length,
      script: detected?.label,
    };
  }, [text]);

  const actions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            title="Convert the whole text to another script"
            disabled={!text.trim()}
          >
            <LanguagesIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
          <DropdownMenuLabel>Convert text to</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {CONVERTER_SCHEMES.map((scheme) => (
            <DropdownMenuItem
              key={scheme.value}
              onSelect={() => convertAll(scheme.value)}
            >
              {scheme.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        title="Copy text"
        disabled={!text}
        onClick={() => copyToClipboard(text)}
      >
        {isCopied ? (
          <CheckIcon className="size-4" />
        ) : (
          <CopyIcon className="size-4" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        title="Clear text"
        disabled={!text}
        onClick={() => replaceText("", "Editor cleared")}
      >
        <Trash2Icon className="size-4" />
      </Button>
    </>
  );

  return (
    <div className="flex flex-1 flex-col gap-2 min-h-0">
      <div className="flex flex-1 min-h-0">
        <WebIMEIde
          label="Editor"
          // Type in the app language when it has a script, Sanskrit otherwise.
          // A language picked in the selector is remembered and wins.
          language={getImeScheme(appLanguage) ? appLanguage : "SAN"}
          languages={IME_LANGUAGES_ALL}
          withLanguageSelector
          showHelpIcon
          storageKey="webimeLanguage:sanscript"
          actions={actions}
          value={text}
          onValueChange={setText}
          placeholder="Type phonetically (ITRANS), e.g. rAmaH, and pick the word with space or enter…"
        />
      </div>
      <div className="flex flex-wrap gap-x-4 px-1 text-xs text-muted-foreground">
        <span>{stats.words} words</span>
        <span>{stats.characters} characters</span>
        {stats.script && <span>Detected: {stats.script}</span>}
        <span className="ml-auto">Draft saved on this device</span>
      </div>
    </div>
  );
};

export default SanscriptEditor;
