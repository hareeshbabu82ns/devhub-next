"use client";

/**
 * Browse helpers for a single dictionary: a letter strip (varṇamālā or A–Z)
 * and a "go to word" box. Both find the first entry starting with the text
 * and open the page it is on, highlighting it.
 */

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import sanscript from "@indic-transliteration/sanscript";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LANGUAGE_FONT_FAMILY, LANGUAGE_SCHEME_MAP } from "@/lib/constants";
import {
  ENGLISH_ALPHABET,
  SANSKRIT_ALPHABET_ITRANS,
  getDictionaryInfo,
} from "@/lib/dictionary/dictionary-catalog";
import { locateWord } from "../lookup-actions";
import { CornerDownLeftIcon, Loader2Icon } from "lucide-react";

const VOWEL_COUNT = 13;

function letterLabel(itrans: string, index: number, scheme: string): string {
  // Show consonants with their inherent vowel (क, not क्)
  const text = index < VOWEL_COUNT ? itrans : `${itrans}a`;
  try {
    return sanscript.t(text, "itrans", scheme);
  } catch {
    return itrans;
  }
}

interface DictionaryBrowseBarProps {
  origin: string;
  language: string;
  limit: number;
  total?: number;
  onLocate: (page: number, focusId: string) => void;
}

export function DictionaryBrowseBar({
  origin,
  language,
  limit,
  total,
  onLocate,
}: DictionaryBrowseBarProps) {
  const info = getDictionaryInfo(origin);
  const [goTo, setGoTo] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const scheme = LANGUAGE_SCHEME_MAP[language] ?? "devanagari";
  const fontClass =
    LANGUAGE_FONT_FAMILY[language as keyof typeof LANGUAGE_FONT_FAMILY];

  const letters = useMemo(
    () =>
      info.headword === "en"
        ? ENGLISH_ALPHABET.map((l) => ({ value: l.toLowerCase(), label: l }))
        : SANSKRIT_ALPHABET_ITRANS.map((l, i) => ({
            value: l,
            label: letterLabel(l, i, scheme),
          })),
    [info.headword, scheme],
  );

  const locate = useMutation({
    mutationFn: (query: string) => locateWord(origin, query),
    onSuccess: (result, query) => {
      if (!result) {
        toast.info(`Nothing in ${info.short} starts with “${query}”`);
        return;
      }
      if (result.matched !== query.trim()) {
        toast.info(`Closest match in ${info.short}: “${result.matched}…”`);
      }
      onLocate(Math.floor(result.position / limit), result.id);
    },
    onError: () => toast.error("Could not jump to that word"),
  });

  const submitGoTo = (e: React.FormEvent) => {
    e.preventDefault();
    if (goTo.trim()) {
      setActiveLetter(null);
      locate.mutate(goTo.trim());
    }
  };

  return (
    <section
      aria-label={`Browse ${info.name}`}
      className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold leading-tight truncate">{info.name}</p>
          <p className="text-xs text-muted-foreground">
            {typeof total === "number"
              ? `${total.toLocaleString()} entries · in dictionary order`
              : "In dictionary order"}
          </p>
        </div>
        <form onSubmit={submitGoTo} className="flex gap-2 sm:w-72">
          <Input
            value={goTo}
            onChange={(e) => setGoTo(e.target.value)}
            placeholder={info.headword === "en" ? "Go to word…" : "Go to word (any script)…"}
            aria-label="Go to word"
            className="h-10"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button
            type="submit"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={!goTo.trim() || locate.isPending}
            aria-label="Go"
          >
            {locate.isPending && !activeLetter ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CornerDownLeftIcon className="size-4" />
            )}
          </Button>
        </form>
      </div>

      <div
        role="toolbar"
        aria-label="Jump to letter"
        className={cn("flex gap-1 overflow-x-auto no-scrollbar pb-0.5", fontClass)}
      >
        {letters.map((l) => (
          <Button
            key={l.value}
            type="button"
            variant={activeLetter === l.value ? "default" : "ghost"}
            className="h-10 min-w-10 shrink-0 px-2 text-base"
            disabled={locate.isPending}
            onClick={() => {
              setActiveLetter(l.value);
              locate.mutate(l.value);
            }}
          >
            {l.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

export default DictionaryBrowseBar;
