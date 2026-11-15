"use client";

/**
 * Looks through a dictionary's originals: search by headword (in any
 * script), key or any text in the row, and compare each original row with
 * the live search entry and with what a rebuild would make of it now.
 */

import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  ExternalLinkIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  TableIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getDictionaryInfo } from "@/lib/dictionary/dictionary-catalog";
import {
  getCompanionTables,
  getOriginalDetail,
  rebuildOneEntry,
  searchOriginals,
} from "@/app/actions/dictionary-pipeline-actions";
import type { RawSearchField } from "@/lib/dictionary/dictionary-pipeline";

const SCRIPTS = ["SAN", "IAST", "ITRANS", "SLP1", "TEL", "ENG"];

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function unwrap<T>(r: { status: "success"; data: T } | { status: "error"; error: string }): T {
  if (r.status === "error") throw new Error(r.error);
  return r.data;
}

function pick(values: { language: string; value: string }[] | undefined, lang: string) {
  if (!values?.length) return "";
  return (values.find((v) => v.language === lang) ?? values[0]).value;
}

function ScriptPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-28 text-xs" aria-label="Script">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SCRIPTS.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EntryPanel({
  title,
  word,
  description,
  script,
  meta,
}: {
  title: string;
  word?: { language: string; value: string }[];
  description?: { language: string; value: string }[];
  script: string;
  meta?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border p-3 space-y-2 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
        {meta}
      </div>
      {word ? (
        <>
          <p className="text-lg font-semibold break-words">{pick(word, script)}</p>
          <div className="flex flex-wrap gap-1">
            {word.map((w) => (
              <Badge key={w.language} variant="outline" className="font-normal text-[11px] max-w-full">
                <span className="text-muted-foreground mr-1">{w.language}</span>
                <span className="truncate">{w.value}</span>
              </Badge>
            ))}
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none break-words border-t pt-2">
            <Markdown remarkPlugins={[remarkGfm]}>{pick(description, script)}</Markdown>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">None</p>
      )}
    </section>
  );
}

function OriginalDetailView({
  origin,
  entryKey,
  isAdmin,
}: {
  origin: string;
  entryKey: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [script, setScript] = useState("IAST");
  const [rebuilding, setRebuilding] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dict-original", origin, entryKey],
    queryFn: async () => unwrap(await getOriginalDetail({ origin, key: entryKey })),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">This original is gone.</p>;

  const rebuild = async () => {
    if (!data.entry) return;
    setRebuilding(true);
    try {
      unwrap(await rebuildOneEntry({ id: data.entry.id }));
      toast.success("Entry rebuilt from its original");
      await queryClient.invalidateQueries({ queryKey: ["dict-original", origin, entryKey] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rebuild failed");
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold break-all">{data.headword || "(no headword)"}</h3>
        <Badge variant="secondary" className="font-mono text-[11px]">key {data.key}</Badge>
        <Badge variant="outline" className="font-mono text-[11px]">#{data.seq}</Badge>
        {data.entry?.editedAt && <Badge variant="outline">Edited by hand</Badge>}
        {data.differs && (
          <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-300">
            Rebuild would change it
          </Badge>
        )}
        {!data.entry && <Badge variant="destructive">No search entry</Badge>}
      </div>
      <Tabs defaultValue="original">
        <TabsList className="h-9">
          <TabsTrigger value="original" className="text-xs">Original</TabsTrigger>
          <TabsTrigger value="entry" className="text-xs">Entry</TabsTrigger>
          <TabsTrigger value="compare" className="text-xs">Compare</TabsTrigger>
        </TabsList>
        <TabsContent value="original" className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Exactly as captured · {new Date(data.importedAt).toLocaleString()}
            {data.rowid !== null && ` · rowid ${data.rowid}`}
          </p>
          <dl className="rounded-lg border divide-y">
            {Object.entries(data.row).map(([col, value]) => (
              <div key={col} className="grid gap-1 p-2 sm:grid-cols-[8rem_1fr]">
                <dt className="font-mono text-xs text-muted-foreground">{col}</dt>
                <dd className="font-mono text-xs whitespace-pre-wrap break-all">
                  {value === null ? <span className="text-muted-foreground">null</span> : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </TabsContent>
        <TabsContent value="entry" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <ScriptPicker value={script} onChange={setScript} />
            <div className="flex gap-2">
              {data.entry && (
                <Button asChild variant="outline" size="sm" className="h-8">
                  <a href={`/dictionary/${data.entry.id}`} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon className="size-3.5 mr-1" /> Open
                  </a>
                </Button>
              )}
              {isAdmin && data.entry && (
                <Button size="sm" variant="outline" className="h-8" disabled={rebuilding} onClick={rebuild}>
                  {rebuilding ? (
                    <Loader2Icon className="size-3.5 mr-1 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="size-3.5 mr-1" />
                  )}
                  Rebuild
                </Button>
              )}
            </div>
          </div>
          <EntryPanel
            title="Live search entry"
            word={data.entry?.word}
            description={data.entry?.description}
            script={script}
            meta={
              data.entry && (
                <span className="text-[11px] text-muted-foreground">
                  v{data.entry.processorVersion ?? 1} ·{" "}
                  {data.entry.searchTextLength.toLocaleString()} chars indexed
                </span>
              )
            }
          />
        </TabsContent>
        <TabsContent value="compare" className="space-y-2">
          <ScriptPicker value={script} onChange={setScript} />
          <div className="grid gap-3 lg:grid-cols-2">
            <EntryPanel
              title="Live"
              word={data.entry?.word}
              description={data.entry?.description}
              script={script}
            />
            {data.previewError ? (
              <p className="text-sm text-destructive">{data.previewError}</p>
            ) : (
              <EntryPanel
                title="Rebuilt now"
                word={data.preview?.word}
                description={data.preview?.description}
                script={script}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompanionTablesView({ origin }: { origin: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dict-companions", origin],
    queryFn: async () => unwrap(await getCompanionTables({ origin })),
  });
  const [filter, setFilter] = useState("");
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No companion tables were kept.</p>;
  const q = filter.trim().toLowerCase();
  return (
    <div className="space-y-3">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter rows…"
        className="h-9"
        aria-label="Filter companion rows"
      />
      {data.map((t) => {
        const rows = q
          ? t.rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)))
          : t.rows;
        return (
          <section key={`${t.file}:${t.table}`} className="rounded-lg border">
            <header className="flex flex-wrap items-center gap-2 border-b p-2 text-sm">
              <span className="font-medium">{t.table}</span>
              <Badge variant="secondary" className="text-[11px]">{t.role}</Badge>
              <span className="text-xs text-muted-foreground">
                {rows.length.toLocaleString()} of {t.rows.length.toLocaleString()} rows · {t.file}
              </span>
            </header>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr>
                    {t.columns.map((c) => (
                      <th key={c} className="text-left font-mono font-normal text-muted-foreground p-1.5 border-b">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 500).map((r, i) => (
                    <tr key={i} className="border-b last:border-0 align-top">
                      {t.columns.map((c) => (
                        <td key={c} className="p-1.5 font-mono break-all">
                          {String(r[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

const FIELD_HINT: Record<RawSearchField, string> = {
  headword: "Headword starts with… (any script)",
  key: "Exact key (lnum or rowid)",
  text: "Text anywhere in the original row",
};

export function DictionaryInspector({
  origin,
  open,
  onOpenChange,
  isAdmin,
  initialKey,
}: {
  origin: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  /** Open straight at this original (e.g. from an entry's "Original" link) */
  initialKey?: string | null;
}) {
  const [field, setField] = useState<RawSearchField>("headword");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"entries" | "companions">("entries");
  const debounced = useDebounced(query);

  useEffect(() => {
    setSelected(initialKey ?? null);
    setQuery("");
    setView("entries");
  }, [origin, initialKey]);

  const results = useInfiniteQuery({
    queryKey: ["dict-originals", origin, field, debounced],
    enabled: open && !!origin,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await searchOriginals({
          origin: origin!,
          query: debounced,
          field,
          afterSeq: pageParam || undefined,
          limit: 50,
        }),
      ),
    getNextPageParam: (last) =>
      last.hasMore && last.items.length ? last.items[last.items.length - 1].seq : undefined,
  });

  const items = results.data?.pages.flatMap((p) => p.items) ?? [];
  const info = origin ? getDictionaryInfo(origin) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-5xl p-0 flex flex-col gap-0">
        <SheetHeader className="border-b p-4 pr-12">
          <SheetTitle>{info?.name ?? origin}</SheetTitle>
          <SheetDescription>
            Original rows as captured from the source, and the search entries built from them.
          </SheetDescription>
          <div className="flex gap-1.5 pt-1">
            <Button
              size="sm"
              variant={view === "entries" ? "secondary" : "ghost"}
              className="h-8"
              onClick={() => setView("entries")}
            >
              <SearchIcon className="size-3.5 mr-1" /> Originals
            </Button>
            <Button
              size="sm"
              variant={view === "companions" ? "secondary" : "ghost"}
              className="h-8"
              onClick={() => setView("companions")}
            >
              <TableIcon className="size-3.5 mr-1" /> Companion tables
            </Button>
          </div>
        </SheetHeader>

        {origin && view === "companions" && (
          <div className="flex-1 overflow-auto p-4">
            <CompanionTablesView origin={origin} />
          </div>
        )}

        {origin && view === "entries" && (
          <div className="flex-1 min-h-0 grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div className={cn("flex flex-col min-h-0 border-b md:border-b-0 md:border-r", selected && "hidden md:flex")}>
              <div className="p-3 space-y-2 border-b">
                <div className="flex gap-2">
                  <Select value={field} onValueChange={(v) => setField(v as RawSearchField)}>
                    <SelectTrigger className="h-9 w-28 shrink-0" aria-label="Search in">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headword">Headword</SelectItem>
                      <SelectItem value="key">Key</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={FIELD_HINT[field]}
                    className="h-9"
                    aria-label={FIELD_HINT[field]}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {query ? FIELD_HINT[field] : "Showing every original in dictionary order"}
                </p>
              </div>
              <ul className="flex-1 overflow-auto divide-y" aria-label="Originals">
                {results.isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <li key={i} className="p-3">
                      <Skeleton className="h-10 w-full" />
                    </li>
                  ))}
                {results.error && (
                  <li className="p-3 text-sm text-destructive">{(results.error as Error).message}</li>
                )}
                {!results.isLoading && !results.error && items.length === 0 && (
                  <li className="p-6 text-sm text-muted-foreground text-center">
                    {query ? "No originals match." : "No originals captured yet."}
                  </li>
                )}
                {items.map((it) => (
                  <li key={it.key}>
                    <button
                      type="button"
                      onClick={() => setSelected(it.key)}
                      className={cn(
                        "w-full text-left p-3 hover:bg-muted/60 focus-visible:bg-muted/60 outline-none",
                        selected === it.key && "bg-muted",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium truncate">{it.headword || "—"}</span>
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">{it.key}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{it.preview}</p>
                    </button>
                  </li>
                ))}
                {results.hasNextPage && (
                  <li className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={results.isFetchingNextPage}
                      onClick={() => results.fetchNextPage()}
                    >
                      {results.isFetchingNextPage && <Loader2Icon className="size-4 mr-1 animate-spin" />}
                      Load more
                    </Button>
                  </li>
                )}
              </ul>
            </div>
            <div className={cn("min-h-0 overflow-auto p-4", !selected && "hidden md:block")}>
              {selected ? (
                <div className="space-y-3">
                  <Button variant="ghost" size="sm" className="md:hidden -ml-2" onClick={() => setSelected(null)}>
                    ← Back to list
                  </Button>
                  <OriginalDetailView origin={origin} entryKey={selected} isAdmin={isAdmin} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Pick an original to see it in full.</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
