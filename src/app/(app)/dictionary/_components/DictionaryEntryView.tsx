"use client";

/**
 * One dictionary entry with everything around it:
 * - the headword in every script (tap to copy) and the meaning in any of
 *   the stored scripts
 * - previous / next entry (also ← → keys) and the entries around it
 * - the same headword in other dictionaries
 * - entries in this dictionary beginning with this headword (compounds)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { AudioPlayer } from "@/components/features/dictionary/AudioPlayer";
import {
  useLanguageAtomValue,
  useQueryLimitAtomValue,
  useTextSizeAtomValue,
} from "@/hooks/use-config";
import { LANGUAGE_FONT_FAMILY, QUERY_STALE_TIME_LONG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getDictionaryInfo } from "@/lib/dictionary/dictionary-catalog";
import {
  EntryLink,
  getDictionaryEntry,
  getDictionaryEntryRelations,
} from "../lookup-actions";
import { DictionaryItem } from "../types";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  ListIcon,
  PencilIcon,
  SearchIcon,
} from "lucide-react";

const SCRIPT_LABEL: Record<string, string> = {
  SAN: "देवनागरी",
  TEL: "తెలుగు",
  IAST: "IAST",
  ITRANS: "ITRANS",
  SLP1: "SLP1",
  ENG: "English",
};

const fontFor = (lang: string) =>
  LANGUAGE_FONT_FAMILY[lang as keyof typeof LANGUAGE_FONT_FAMILY];

function copy(text: string, what = "Copied") {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(what))
    .catch(() => toast.error("Could not copy"));
}

function EntryLinkRow({
  link,
  current,
  language,
}: {
  link: EntryLink;
  current?: boolean;
  language: string;
}) {
  return (
    <Link
      href={`/dictionary/${link.id}`}
      aria-current={current ? "page" : undefined}
      className={cn(
        "block rounded-md px-3 py-2 min-h-10 truncate transition-colors",
        fontFor(language),
        current
          ? "bg-primary/10 text-primary font-semibold"
          : "hover:bg-muted/70",
      )}
    >
      {link.word}
    </Link>
  );
}

function ElsewhereItem({ item, language }: { item: DictionaryItem; language: string }) {
  const [open, setOpen] = useState(false);
  const info = getDictionaryInfo(item.origin);
  const long = item.description.length > 260;
  return (
    <li className="rounded-lg border border-border/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/dictionary/${item.id}`}
          className="min-w-0 flex items-center gap-2 hover:underline underline-offset-4"
        >
          <Badge variant="secondary" className="shrink-0" title={info.name}>
            {info.short}
          </Badge>
          <span className={cn("font-medium truncate", fontFor(language))}>{item.word}</span>
        </Link>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <div
        className={cn(
          "prose dark:prose-invert prose-sm max-w-none text-foreground/85 prose-p:my-1",
          fontFor(language),
          !open && long && "line-clamp-4",
        )}
      >
        <Markdown remarkPlugins={[remarkGfm]}>{item.description}</Markdown>
      </div>
      {long && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Show less" : "Read more"}
        </Button>
      )}
    </li>
  );
}

export function DictionaryEntryView({ id }: { id: string }) {
  const router = useRouter();
  const language = useLanguageAtomValue();
  const textSize = useTextSizeAtomValue();
  const pageSize = parseInt(useQueryLimitAtomValue()) || 20;
  const { data: session } = useSession();
  const [descLang, setDescLang] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dictionaryEntry", id, language],
    queryFn: () => getDictionaryEntry(id, language),
    staleTime: QUERY_STALE_TIME_LONG,
  });

  const { data: relations, isLoading: relationsLoading } = useQuery({
    queryKey: ["dictionaryEntryRelations", id, language],
    queryFn: () => getDictionaryEntryRelations(id, language),
    staleTime: QUERY_STALE_TIME_LONG,
    enabled: !!data,
  });

  const prev = data?.before.at(-1);
  const next = data?.after[0];

  // ← / → step through the dictionary
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft" && prev) router.push(`/dictionary/${prev.id}`);
      if (e.key === "ArrowRight" && next) router.push(`/dictionary/${next.id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full space-y-4">
        <Button variant="ghost" className="h-10 -ml-2" onClick={() => router.back()}>
          <ArrowLeftIcon className="size-4 mr-2" /> Back
        </Button>
        <SimpleAlert title="This dictionary entry could not be found" />
      </div>
    );
  }

  const { item } = data;
  const info = getDictionaryInfo(item.origin);
  const page = (limit: number) => Math.floor(data.position / limit);
  const browseHref = (() => {
    const params = new URLSearchParams({ origins: item.origin, focus: item.id });
    const p = page(pageSize);
    if (p > 0) params.set("offset", String(p));
    return `/dictionary?${params.toString()}`;
  })();

  const itransForm =
    item.wordData.find((w) => w.language === "ITRANS")?.value ??
    item.wordData.find((w) => w.language === "ENG")?.value ??
    item.word;
  const searchHref = `/dictionary?${new URLSearchParams({
    search: itransForm,
    mode: "prefix",
    origins: "",
  }).toString()}`;

  const descriptionLanguages = item.descriptionData.map((d) => d.language);
  const activeDescLang =
    descLang && descriptionLanguages.includes(descLang)
      ? descLang
      : descriptionLanguages.includes(language)
        ? language
        : descriptionLanguages[0];
  const description =
    item.descriptionData.find((d) => d.language === activeDescLang)?.value ??
    item.description;

  const audioUrl = item.sourceData?.audioUrl || item.sourceData?.audio;

  return (
    <article className="w-full space-y-4" aria-labelledby="entry-headword">
      {/* Top bar */}
      <nav className="flex items-center justify-between gap-2" aria-label="Entry navigation">
        <Button variant="ghost" className="h-10 -ml-2 px-2" onClick={() => router.back()}>
          <ArrowLeftIcon className="size-4 mr-1.5" /> Back
        </Button>
        <div className="flex items-center gap-1.5">
          <Button
            asChild={!!prev}
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={!prev}
            aria-label="Previous entry"
            title="Previous entry (←)"
          >
            {prev ? (
              <Link href={`/dictionary/${prev.id}`}>
                <ChevronLeftIcon className="size-4" />
              </Link>
            ) : (
              <ChevronLeftIcon className="size-4" />
            )}
          </Button>
          <Button
            asChild={!!next}
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={!next}
            aria-label="Next entry"
            title="Next entry (→)"
          >
            {next ? (
              <Link href={`/dictionary/${next.id}`}>
                <ChevronRightIcon className="size-4" />
              </Link>
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </Button>
        </div>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4 min-w-0">
          {/* Headword */}
          <header className="rounded-xl border border-border/50 bg-background/60 p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" title={info.name}>
                {info.short}
              </Badge>
              <span className="tabular-nums">
                Entry {(data.position + 1).toLocaleString()} of{" "}
                {data.dictionaryTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <h1
                id="entry-headword"
                className={cn(
                  "text-3xl sm:text-4xl font-bold tracking-tight break-words min-w-0",
                  fontFor(language),
                )}
              >
                {item.word}
              </h1>
              {audioUrl && <AudioPlayer audioUrl={audioUrl} wordId={item.id} compact />}
            </div>

            {/* Every stored form of the headword */}
            <ul className="flex flex-wrap gap-2" aria-label="Headword in other scripts">
              {item.wordData.map((w) => (
                <li key={w.language}>
                  <button
                    type="button"
                    onClick={() => copy(w.value, `Copied ${SCRIPT_LABEL[w.language] ?? w.language}`)}
                    className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 pl-3 pr-2 h-9 text-sm hover:bg-muted/70"
                    title="Copy"
                  >
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {SCRIPT_LABEL[w.language] ?? w.language}
                    </span>
                    <span className={cn("font-medium", fontFor(w.language))}>{w.value}</span>
                    <CopyIcon className="size-3 opacity-40 group-hover:opacity-80" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="h-10">
                <Link href={browseHref}>
                  <ListIcon className="size-4 mr-2" /> Browse here
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10">
                <Link href={searchHref}>
                  <SearchIcon className="size-4 mr-2" /> Search all dictionaries
                </Link>
              </Button>
              {session?.user && (
                <Button asChild variant="ghost" className="h-10">
                  <Link href={`/dictionary/${item.id}/edit`}>
                    <PencilIcon className="size-4 mr-2" /> Edit
                  </Link>
                </Button>
              )}
            </div>
          </header>

          {/* Meaning */}
          <section
            className="rounded-xl border border-border/50 bg-background/60 p-4 sm:p-6 space-y-3"
            aria-labelledby="entry-meaning"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="entry-meaning" className="font-semibold">
                Meaning
              </h2>
              <div className="flex items-center gap-1">
                {descriptionLanguages.length > 1 && (
                  <div
                    role="radiogroup"
                    aria-label="Show meaning in"
                    className="flex gap-1 overflow-x-auto no-scrollbar max-w-[70vw]"
                  >
                    {descriptionLanguages.map((l) => (
                      <Button
                        key={l}
                        type="button"
                        role="radio"
                        aria-checked={l === activeDescLang}
                        variant={l === activeDescLang ? "secondary" : "ghost"}
                        className="h-8 px-2.5 text-xs shrink-0"
                        onClick={() => setDescLang(l)}
                      >
                        {SCRIPT_LABEL[l] ?? l}
                      </Button>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copy(description, "Meaning copied")}
                  aria-label="Copy meaning"
                >
                  <CopyIcon className="size-4" />
                </Button>
              </div>
            </div>
            <div
              className={cn(
                "prose dark:prose-invert max-w-none prose-p:leading-relaxed",
                textSize === "sm" ? "prose-sm" : textSize === "lg" ? "prose-lg" : "prose-base",
                fontFor(activeDescLang),
              )}
            >
              <Markdown remarkPlugins={[remarkGfm]}>{description}</Markdown>
            </div>
            {item.attributes?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {item.attributes.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {a.key}: {a.value}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {/* Other dictionaries */}
          <section className="space-y-3" aria-labelledby="entry-elsewhere">
            <h2 id="entry-elsewhere" className="font-semibold">
              In other dictionaries
            </h2>
            {relationsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : relations?.elsewhere.length ? (
              <ul className="space-y-2">
                {relations.elsewhere.map((e) => (
                  <ElsewhereItem key={e.id} item={e} language={language} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No other dictionary has this exact headword.{" "}
                <Link href={searchHref} className="underline underline-offset-4">
                  Search for similar words
                </Link>
                .
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-4 min-w-0">
          {/* Nearby */}
          <section
            className="rounded-xl border border-border/50 bg-background/60 p-2"
            aria-labelledby="entry-nearby"
          >
            <h2 id="entry-nearby" className="px-3 pt-2 pb-1 text-sm font-semibold">
              Nearby in {info.short}
            </h2>
            <nav aria-label="Nearby entries">
              {data.before.map((l) => (
                <EntryLinkRow key={l.id} link={l} language={language} />
              ))}
              <EntryLinkRow
                link={{ id: item.id, origin: item.origin, wordIndex: item.wordIndex, word: item.word }}
                current
                language={language}
              />
              {data.after.map((l) => (
                <EntryLinkRow key={l.id} link={l} language={language} />
              ))}
            </nav>
          </section>

          {/* Compounds / derivatives */}
          {(relationsLoading || (relations?.beginningWith.length ?? 0) > 0) && (
            <section
              className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2"
              aria-labelledby="entry-beginning"
            >
              <h2 id="entry-beginning" className="text-sm font-semibold">
                Words beginning with <span className={fontFor(language)}>{item.word}</span>
              </h2>
              {relationsLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {relations!.beginningWith.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/dictionary/${l.id}`}
                        className={cn(
                          "inline-flex items-center rounded-full border border-border/60 px-3 h-9 text-sm hover:bg-muted/70",
                          fontFor(language),
                        )}
                      >
                        {l.word}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

export default DictionaryEntryView;
