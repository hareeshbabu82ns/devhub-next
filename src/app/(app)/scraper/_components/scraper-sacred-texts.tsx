/**
 * Sacred Texts (sacred-texts.com) scraper.
 *
 *   Category ──▶ Book (full TOC) ──scrape──▶ chapter JSON ──build──▶ Entities
 *
 * The old /hin index now redirects to /categories/hinduism, so the book list
 * is read from the category page instead of a hard-coded table. Chapters are
 * scraped and turned into entities in small batches so long books (the
 * Mahabharata has ~2,000 chapters) can be stopped and resumed; entities that
 * already exist are skipped.
 */

"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpenIcon,
  HammerIcon,
  Loader2Icon,
  PlayIcon,
  RefreshCwIcon,
  SquareIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ENTITY_TYPES_DDLB, ENTITY_TYPES_PARENTS } from "@/lib/constants";
import EntitySearchDlgTrigger from "@/app/(app)/entities/_components/EntitySearchDlgTrigger";
// Type-only imports: the parser modules pull in cheerio / fs (server only).
import type { SacredTextsCategory } from "@/lib/scrape/sacred-texts";
import type { SacredTextsBookDetails } from "@/lib/scrape/sacred-texts-pipeline";
import {
  createSacredTextsEntityBatch,
  getSacredTextsBook,
  getSacredTextsCatalog,
  scrapeSacredTextsChapterBatch,
} from "../_actions/sacred-texts-actions";

/** The old sacred-texts.com/hin index is now /categories/hinduism. */
const DEFAULT_CATEGORY = "hinduism";
const SCRAPE_BATCH = 10;
const ENTITY_BATCH = 20;

interface EntitySettings {
  rootType: string;
  rootTitle: string;
  groupType: string;
  groupTitles: string;
  chapterType: string;
  verseType: string;
}

/** Names the existing Ramayanam / Mahabharatam imports used. */
const PRESETS: Record<string, Partial<EntitySettings>> = {
  "the-ramayana-in-sanskrit": {
    rootType: "ITIHASAM",
    rootTitle: "raamaayaNam",
    groupType: "KAANDAM",
    groupTitles: [
      "bAla kaandam",
      "ayOdhya kaandam",
      "araNya kaandam",
      "kiShkinda kaandam",
      "sundara kaandam",
      "yuddha kaandam",
      "uttara kaandam",
    ].join("\n"),
    chapterType: "SARGA",
  },
  "the-mahabharata-in-sanskrit": {
    rootType: "ITIHASAM",
    rootTitle: "mahaa bhaaratam",
    groupType: "PARVAM",
    groupTitles: [
      "aadi parvam",
      "sabhaa parvam",
      "vana parvam",
      "viraaTha parvam",
      "udyOga parvam",
      "bhISma parvam",
      "dhrONa parvam",
      "karNa parvam",
      "shelya parvam",
      "sauptika parvam",
      "shtrI parvam",
      "shAMti parvam",
      "anushaashana parvam",
      "ashvamEdhika parvam",
      "aashramavaishika parvam",
      "mausala parvam",
      "mahaaprasthaanika parvam",
      "svargaarohaNa parvam",
    ].join("\n"),
    chapterType: "ADHYAAYAM",
  },
};

function defaultSettings(book: SacredTextsBookDetails): EntitySettings {
  const grouped = book.structure.mode === "grouped";
  return {
    rootType: grouped ? "ITIHASAM" : "OTHERS",
    rootTitle: "",
    groupType: grouped ? "KAANDAM" : "",
    groupTitles: "",
    chapterType: grouped ? "SARGA" : "ADHYAAYAM",
    verseType: "SLOKAM",
    ...PRESETS[book.slug],
  };
}

type Run = {
  phase: "scrape" | "entities";
  done: number;
  total: number;
};

function TypeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ENTITY_TYPES_DDLB.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ScraperSacredTexts() {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [catalog, setCatalog] = useState<SacredTextsCategory | null>(null);
  const [filter, setFilter] = useState("");
  const [book, setBook] = useState<SacredTextsBookDetails | null>(null);
  const [settings, setSettings] = useState<EntitySettings | null>(null);
  const [parentId, setParentId] = useState("");
  const [pickParent, setPickParent] = useState(false);
  const [refetch, setRefetch] = useState(false);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const stopRef = useRef(false);

  const addLog = (line: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l].slice(0, 300));

  async function loadCatalog() {
    setBusy("catalog");
    setBlocked(null);
    const res = await getSacredTextsCatalog(category.trim(), refetch);
    setBusy(null);
    if (!res.ok) {
      setBlocked(res.error);
      toast.error(res.error);
      return;
    }
    setCatalog(res.data);
    const count = res.data.sections.reduce((n, s) => n + s.books.length, 0);
    addLog(`Catalog "${res.data.title}": ${res.data.sections.length} sections, ${count} books`);
  }

  async function openBook(slug: string, forceRefetch = refetch) {
    setBusy(`book:${slug}`);
    setBlocked(null);
    const res = await getSacredTextsBook(slug, forceRefetch);
    setBusy(null);
    if (!res.ok) {
      setBlocked(res.error);
      toast.error(res.error);
      return;
    }
    const b = res.data;
    setBook(b);
    setSettings(defaultSettings(b));
    setFrom(1);
    setTo(b.chapters.length ? b.chapters[b.chapters.length - 1].num : 0);
    addLog(
      `Book "${b.title}": ${b.chapters.length} TOC entries, ${
        b.structure.mode === "grouped" ? `${b.structure.groups.length} groups` : "flat"
      }, ${b.scraped.length} already scraped`,
    );
  }

  /** Content chapters (group index pages excluded) inside the TOC range. */
  const selected = useMemo(() => {
    if (!book) return [];
    const max = to > 0 ? to : Number.MAX_SAFE_INTEGER;
    return book.structure.groups
      .flatMap((g) => g.chapters)
      .filter((c) => c.num >= from && c.num <= max)
      .sort((a, b) => a.num - b.num);
  }, [book, from, to]);

  const scrapedSet = useMemo(() => new Set(book?.scraped ?? []), [book]);
  const selectedScraped = selected.filter((c) => scrapedSet.has(c.slug)).length;

  const filteredSections = useMemo(() => {
    if (!catalog) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return catalog.sections;
    return catalog.sections
      .map((s) => ({
        ...s,
        books: s.books.filter((b) =>
          `${b.title} ${b.author ?? ""} ${b.slug} ${s.title}`.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.books.length);
  }, [catalog, filter]);

  async function scrapeChapters() {
    if (!book) return;
    const todo = selected
      .filter((c) => refetch || !scrapedSet.has(c.slug))
      .map((c) => c.slug);
    if (!todo.length) {
      toast.info("All selected chapters are already scraped (turn on Refetch to redo them).");
      return;
    }
    stopRef.current = false;
    setBlocked(null);
    setRun({ phase: "scrape", done: 0, total: todo.length });
    let ok = 0;
    let failed = 0;
    const done: string[] = [];
    for (let i = 0; i < todo.length && !stopRef.current; i += SCRAPE_BATCH) {
      const batch = todo.slice(i, i + SCRAPE_BATCH);
      const res = await scrapeSacredTextsChapterBatch(book.slug, batch, refetch);
      if (!res.ok) {
        addLog(`Scrape failed: ${res.error}`);
        toast.error(res.error);
        break;
      }
      for (const r of res.data.results) {
        if (r.ok) {
          ok++;
          done.push(r.slug);
        } else {
          failed++;
          addLog(`✗ ${r.slug}: ${r.error}`);
        }
      }
      setRun({ phase: "scrape", done: Math.min(i + batch.length, todo.length), total: todo.length });
      if (res.data.blocked) {
        setBlocked(res.data.blocked);
        break;
      }
    }
    setBook((b) => (b ? { ...b, scraped: [...new Set([...b.scraped, ...done])] } : b));
    setRun(null);
    addLog(`Scraped ${ok} chapters${failed ? `, ${failed} failed` : ""}${stopRef.current ? " (stopped)" : ""}`);
    if (ok) toast.success(`Scraped ${ok} chapters`);
  }

  async function createEntities() {
    if (!book || !settings) return;
    const todo = selected.filter((c) => scrapedSet.has(c.slug)).map((c) => c.slug);
    if (!todo.length) {
      toast.info("Scrape the selected chapters first.");
      return;
    }
    const grouped = book.structure.mode === "grouped";
    stopRef.current = false;
    setRun({ phase: "entities", done: 0, total: todo.length });
    let rootId: string | undefined;
    let created = 0;
    let skipped = 0;
    let verses = 0;
    const missing: string[] = [];
    for (let i = 0; i < todo.length && !stopRef.current; i += ENTITY_BATCH) {
      const batch = todo.slice(i, i + ENTITY_BATCH);
      const res = await createSacredTextsEntityBatch({
        bookSlug: book.slug,
        parentId: parentId.trim() || undefined,
        rootId,
        rootType: settings.rootType,
        rootTitle: settings.rootTitle.trim() || undefined,
        groupType: grouped ? settings.groupType : undefined,
        groupTitles: grouped
          ? settings.groupTitles.split("\n").map((t) => t.trim())
          : undefined,
        chapterType: settings.chapterType,
        verseType: settings.verseType,
        chapterSlugs: batch,
      });
      if (!res.ok) {
        addLog(`Entity creation failed: ${res.error}`);
        toast.error(res.error);
        break;
      }
      rootId = res.data.rootId;
      created += res.data.created;
      skipped += res.data.skipped;
      verses += res.data.verses;
      missing.push(...res.data.missing);
      setRun({ phase: "entities", done: Math.min(i + batch.length, todo.length), total: todo.length });
    }
    setRun(null);
    if (missing.length) addLog(`Not found in scraped data: ${missing.join(", ")}`);
    if (rootId) {
      addLog(
        `Entities: ${created} chapters (${verses} verses/paragraphs) created, ${skipped} already existed — root ${rootId}`,
      );
      toast.success(`Created ${created} chapters under root ${rootId}`);
    }
  }

  const running = run !== null;
  const set = (patch: Partial<EntitySettings>) =>
    setSettings((s) => (s ? { ...s, ...patch } : s));

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0">
      <div>
        <h3 className="text-xl font-semibold">Sacred Texts</h3>
        <p className="text-muted-foreground text-sm">
          Browse a sacred-texts.com category (the old <code>/hin</code> index is now{" "}
          <code>/categories/hinduism</code>), pick a book, scrape its chapters and create
          entities. Pages are cached under <code>data/sacred-texts</code>.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="st-category">Category</Label>
          <Input
            id="st-category"
            className="w-48"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <Button onClick={loadCatalog} disabled={!!busy || running}>
          {busy === "catalog" ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <BookOpenIcon className="size-4" />
          )}
          Load books
        </Button>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="st-refetch" checked={refetch} onCheckedChange={setRefetch} />
          <Label htmlFor="st-refetch">Refetch (ignore cache)</Label>
        </div>
      </div>

      {blocked && (
        <Alert variant="destructive">
          <TriangleAlertIcon className="size-4" />
          <AlertTitle>Request refused</AlertTitle>
          <AlertDescription className="break-all">{blocked}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_2fr] min-h-0">
        {/* Catalog */}
        <div className="border rounded-md flex flex-col min-h-0">
          <div className="p-2 border-b">
            <Input
              placeholder={catalog ? "Filter books…" : "Load a category first"}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={!catalog}
            />
          </div>
          <ScrollArea className="h-[480px]">
            <div className="p-2 space-y-3">
              {filteredSections.map((s) => (
                <div key={s.id}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {s.title}
                  </div>
                  {s.books.map((b) => (
                    <button
                      key={`${s.id}-${b.slug}`}
                      type="button"
                      disabled={!!busy || running}
                      onClick={() => openBook(b.slug)}
                      className={cn(
                        "w-full text-left rounded px-2 py-1 text-sm hover:bg-muted disabled:opacity-60",
                        book?.slug === b.slug && "bg-muted font-medium",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {busy === `book:${b.slug}` && (
                          <Loader2Icon className="size-3 animate-spin shrink-0" />
                        )}
                        <span>{b.title}</span>
                      </span>
                      {b.author && (
                        <span className="block text-xs text-muted-foreground">{b.author}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
              {catalog && !filteredSections.length && (
                <p className="text-sm text-muted-foreground p-2">No books match.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Book */}
        <div className="border rounded-md p-4 flex flex-col gap-4 min-w-0">
          {!book || !settings ? (
            <p className="text-sm text-muted-foreground">Select a book to see its contents.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={book.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold hover:underline"
                  >
                    {book.title}
                  </a>
                  {book.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{book.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">{book.chapters.length} TOC entries</Badge>
                    <Badge variant="secondary">
                      {book.structure.mode === "grouped"
                        ? `${book.structure.groups.length} groups`
                        : "flat"}
                    </Badge>
                    <Badge variant="secondary">{book.scraped.length} scraped</Badge>
                    {book.structure.extras.length > 0 && (
                      <Badge variant="outline" title={book.structure.extras.map((e) => e.title).join(", ")}>
                        {book.structure.extras.length} non-chapter pages skipped
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Reload table of contents from the site"
                  disabled={!!busy || running}
                  onClick={() => openBook(book.slug, true)}
                >
                  <RefreshCwIcon className={cn("size-4", busy?.startsWith("book:") && "animate-spin")} />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md">
                <div className="flex flex-col gap-1">
                  <Label>From TOC #</Label>
                  <Input type="number" min={1} value={from} onChange={(e) => setFrom(e.target.valueAsNumber || 1)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>To TOC # (0 = end)</Label>
                  <Input type="number" min={0} value={to} onChange={(e) => setTo(e.target.valueAsNumber || 0)} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {selected.length} chapters selected
                {selected.length > 0 &&
                  ` (${selected[0].title} → ${selected[selected.length - 1].title})`}
                , {selectedScraped} scraped.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <TypeSelect label="Book entity type" value={settings.rootType} onChange={(v) => set({ rootType: v })} />
                <div className="flex flex-col gap-1">
                  <Label>Book title (ITRANS, optional)</Label>
                  <Input
                    value={settings.rootTitle}
                    placeholder={book.title}
                    onChange={(e) => set({ rootTitle: e.target.value })}
                  />
                </div>
                {book.structure.mode === "grouped" && (
                  <>
                    <TypeSelect label="Group type (Book N)" value={settings.groupType} onChange={(v) => set({ groupType: v })} />
                    <div className="flex flex-col gap-1 sm:row-span-2">
                      <Label>Group titles (ITRANS, one per line, optional)</Label>
                      <Textarea
                        rows={4}
                        value={settings.groupTitles}
                        placeholder={book.structure.groups.map((g) => g.title).join("\n")}
                        onChange={(e) => set({ groupTitles: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <TypeSelect label="Chapter type" value={settings.chapterType} onChange={(v) => set({ chapterType: v })} />
                <TypeSelect label="Verse / paragraph type" value={settings.verseType} onChange={(v) => set({ verseType: v })} />
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label>Place under (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={parentId}
                      placeholder="parent entity id"
                      onChange={(e) => setParentId(e.target.value.trim())}
                    />
                    <EntitySearchDlgTrigger
                      open={pickParent}
                      onOpenChange={setPickParent}
                      forTypes={ENTITY_TYPES_PARENTS[settings.rootType] ?? []}
                      onClick={(entity) => {
                        setParentId(entity.id);
                        setPickParent(false);
                      }}
                    />
                    {parentId && (
                      <Button size="icon" variant="ghost" onClick={() => setParentId("")}>
                        <XIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={scrapeChapters} disabled={!!busy || running || !selected.length}>
                  <PlayIcon className="size-4" />
                  1. Scrape chapters
                </Button>
                <Button onClick={createEntities} disabled={!!busy || running || !selectedScraped}>
                  <HammerIcon className="size-4" />
                  2. Create entities
                </Button>
                {running && (
                  <Button variant="destructive" onClick={() => (stopRef.current = true)}>
                    <SquareIcon className="size-4" />
                    Stop
                  </Button>
                )}
              </div>

              {run && (
                <div className="space-y-1">
                  <Progress value={(run.done / Math.max(run.total, 1)) * 100} />
                  <p className="text-xs text-muted-foreground">
                    {run.phase === "scrape" ? "Scraping" : "Creating entities"}: {run.done} / {run.total}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {log.length > 0 && (
        <ScrollArea className="h-40 border rounded-md">
          <pre className="p-2 text-xs whitespace-pre-wrap">{log.join("\n")}</pre>
        </ScrollArea>
      )}
    </div>
  );
}
