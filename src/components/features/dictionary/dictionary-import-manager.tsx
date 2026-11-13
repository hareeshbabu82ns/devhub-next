/**
 * Dictionary data manager (Scraper → Dictionaries)
 *
 * - Import from SQLite in batches with real progress, ETA and cancel.
 *   "Replace" stages the new entries and swaps them in only when complete;
 *   "Add missing" keeps what is there and adds entries not yet imported.
 * - Coverage per dictionary (imported entries vs. rows in the source file),
 *   so partial imports stand out.
 * - Upload / replace SQLite source files (streamed, with progress).
 * - Export any dictionary, or all, as a restorable backup or as CSV, and
 *   restore a backup.
 */

"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DictionaryName } from "@/lib/dictionary/dictionary-constants";
import { getDictionaryInfo } from "@/lib/dictionary/dictionary-catalog";
import {
  DictionaryOverviewRow,
  cancelDictionaryImport,
  deleteDictionaryOrigin,
  getDictionaryOverview,
} from "@/app/actions/dictionary-transfer-actions";
import { reprocessDictionaryWords } from "@/app/actions/dictionary-import-actions";
import {
  DownloadIcon,
  FileDownIcon,
  FileUpIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { SqliteFileUpload, uploadWithProgress } from "./sqlite-file-upload";
import {
  ImportSettings,
  RunState,
  runEta,
  useDictionaryImportRunner,
} from "./use-dictionary-import-runner";

type StatusFilter = "all" | "imported" | "partial" | "empty" | "nofile";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "imported", label: "Imported" },
  { value: "partial", label: "Partial" },
  { value: "empty", label: "Not imported" },
  { value: "nofile", label: "No source file" },
];

function formatBytes(n?: number) {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function coverage(row: DictionaryOverviewRow): "full" | "partial" | "empty" | "unknown" {
  if (row.wordCount === 0) return "empty";
  if (!row.sqlite.rows) return "unknown";
  return row.wordCount >= row.sqlite.rows ? "full" : "partial";
}

function exportHref(origins: string[], format: "backup" | "csv", opts: { source?: boolean } = {}) {
  const p = new URLSearchParams({ format });
  if (origins.length) p.set("origins", origins.join(","));
  if (opts.source) p.set("source", "1");
  return `/api/dictionary/export?${p.toString()}`;
}

function ExportMenu({
  origins,
  label,
  disabled,
}: {
  origins: string[];
  label: string;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9" disabled={disabled}>
          <FileDownIcon className="size-4 mr-1.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Downloads start immediately and stream
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={exportHref(origins, "backup")} download>
            <div>
              <div className="font-medium">Backup (.jsonl.gz)</div>
              <div className="text-xs text-muted-foreground">Restorable here or on another server</div>
            </div>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={exportHref(origins, "backup", { source: true })} download>
            <div>
              <div className="font-medium">Backup with source rows</div>
              <div className="text-xs text-muted-foreground">Larger; keeps data for re-processing</div>
            </div>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={exportHref(origins, "csv")} download>
            <div>
              <div className="font-medium">Spreadsheet (.csv)</div>
              <div className="text-xs text-muted-foreground">Headword in every script + meaning</div>
            </div>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RestoreButton({
  disabled,
  onDone,
  origin,
  label = "Restore backup",
}: {
  disabled?: boolean;
  onDone: () => void;
  /** Restore only this dictionary's entries from the file */
  origin?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [progress, setProgress] = useState<number | null>(null);
  const [pickOpen, setPickOpen] = useState(false);

  const restore = async (file: File) => {
    setProgress(0);
    try {
      const qs = new URLSearchParams({ mode });
      if (origin) qs.set("only", origin);
      const r = await uploadWithProgress(`/api/dictionary/restore?${qs}`, file, setProgress);
      const parts = (r?.dictionaries ?? []).map(
        (d: { origin: string; written: number; skipped: number }) =>
          `${d.origin} ${d.written.toLocaleString()}${d.skipped ? ` (+${d.skipped.toLocaleString()} kept)` : ""}`,
      );
      toast.success(`Restored: ${parts.join(", ") || "nothing"}`, {
        description:
          [
            r?.invalid ? `${r.invalid} invalid lines skipped` : "",
            r?.ignored
              ? `${r.ignored.toLocaleString()} entries of other dictionaries (${(r.ignoredOrigins ?? []).join(", ")}) left out`
              : "",
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
      });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".gz,.jsonl,.json,application/gzip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void restore(f);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        disabled={disabled || progress !== null}
        onClick={() => setPickOpen(true)}
      >
        {progress !== null ? (
          <>
            <Loader2Icon className="size-4 mr-1.5 animate-spin" />
            {progress < 1 ? `Uploading ${Math.round(progress * 100)}%` : "Restoring…"}
          </>
        ) : (
          <>
            <FileUpIcon className="size-4 mr-1.5" /> {label}
          </>
        )}
      </Button>
      <AlertDialog open={pickOpen} onOpenChange={setPickOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {origin
                ? `Restore ${getDictionaryInfo(origin).short} from a backup`
                : "Restore from a backup"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {origin
                ? `Pick a backup file made with Export → Backup (.jsonl.gz or .jsonl). Only its ${origin} entries are loaded; any other dictionaries in the file are left out.`
                : "Pick a backup file made with Export → Backup (.jsonl.gz or .jsonl). Every dictionary in the file is loaded."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            {(
              [
                ["replace", "Replace", origin ? "The backup replaces the current entries. They stay until the whole file has loaded." : "Each dictionary in the file replaces the current one. The current entries stay until the whole file has loaded."],
                ["merge", "Add missing only", "Keep current entries; add the ones not there yet."],
              ] as const
            ).map(([value, title, hint]) => (
              <label
                key={value}
                className={cn(
                  "flex gap-3 rounded-lg border p-3 cursor-pointer",
                  mode === value && "border-primary/60 bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  name="restore-mode"
                  className="mt-1"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                <span>
                  <span className="block font-medium text-sm">{title}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => inputRef.current?.click()}>
              Choose file…
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RunProgress({ run, onCancel, onDismiss }: { run: RunState; onCancel: () => void; onDismiss: () => void }) {
  const pct = run.total > 0 ? (run.done / run.total) * 100 : 0;
  const eta = runEta(run);
  const active = ["queued", "running", "finishing"].includes(run.status);
  return (
    <div
      className={cn(
        "rounded-md border p-2.5 space-y-1.5 text-xs",
        run.status === "failed" && "border-destructive/50 bg-destructive/5",
        run.status === "done" && "border-emerald-500/40 bg-emerald-500/5",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {run.status === "queued" && "Waiting…"}
          {run.status === "running" &&
            `Importing ${run.done.toLocaleString()} / ${run.total.toLocaleString()}`}
          {run.status === "finishing" && "Swapping in the new entries…"}
          {run.status === "done" &&
            `Imported ${run.written.toLocaleString()} entries${run.skipped ? `, kept ${run.skipped.toLocaleString()}` : ""}${run.finishedAt && run.startedAt ? ` in ${formatDuration(run.finishedAt - run.startedAt)}` : ""}`}
          {run.status === "failed" && `Failed: ${run.error}`}
          {run.status === "cancelled" && "Cancelled — nothing was changed"}
        </span>
        {active ? (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss} aria-label="Dismiss">
            <XIcon className="size-3.5" />
          </Button>
        )}
      </div>
      {active && <Progress value={run.status === "finishing" ? 100 : pct} className="h-1.5" />}
      {run.status === "running" && (
        <div className="text-muted-foreground">
          {pct.toFixed(1)}%{eta !== null && ` · about ${formatDuration(eta)} left`}
          {run.settings.mode === "merge" && run.skipped > 0 && ` · ${run.skipped.toLocaleString()} already there`}
        </div>
      )}
      {run.invalid > 0 && (
        <details className="text-muted-foreground">
          <summary className="cursor-pointer">{run.invalid.toLocaleString()} rows skipped</summary>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {run.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function DictionaryImportManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<DictionaryOverviewRow | null>(null);
  const [busyOrigin, setBusyOrigin] = useState<string | null>(null);
  const [settings, setSettings] = useState<ImportSettings>({
    mode: "replace",
    limitRows: undefined,
    batchSize: 2000,
    validate: false,
  });

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["dictionary-overview"],
    queryFn: async () => {
      const r = await getDictionaryOverview();
      if (r.status === "error") throw new Error(r.error);
      return r.data;
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dictionary-overview"] });

  const runner = useDictionaryImportRunner((run) => {
    if (run.status === "done") {
      toast.success(`${getDictionaryInfo(run.origin).short}: import finished`);
    } else if (run.status === "failed") {
      toast.error(`${getDictionaryInfo(run.origin).short}: ${run.error}`);
    }
    refresh();
  });

  const rows = data?.rows ?? [];
  const isAdmin = data?.isAdmin ?? false;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const info = getDictionaryInfo(r.origin);
      if (q && !`${r.origin} ${info.name} ${r.dictionary ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      const c = coverage(r);
      switch (filter) {
        case "imported":
          return r.wordCount > 0;
        case "partial":
          return c === "partial";
        case "empty":
          return r.wordCount === 0;
        case "nofile":
          return !r.sqlite.exists && r.dictionary !== null;
        default:
          return true;
      }
    });
  }, [rows, filter, search]);

  const summary = useMemo(() => {
    const imported = rows.filter((r) => r.wordCount > 0).length;
    const partial = rows.filter((r) => coverage(r) === "partial").length;
    const entries = rows.reduce((s, r) => s + r.wordCount, 0);
    return { imported, partial, entries };
  }, [rows]);

  const importable = (r: DictionaryOverviewRow) =>
    r.dictionary !== null && r.sqlite.exists && !r.sqlite.error;

  const startImport = (targets: DictionaryOverviewRow[]) => {
    const items = targets
      .filter(importable)
      .map((r) => ({ dictionary: r.dictionary as DictionaryName, origin: r.origin }));
    if (items.length === 0) {
      toast.info("Nothing to import — the selected dictionaries have no usable source file");
      return;
    }
    runner.start(items, settings);
    setSelected(new Set());
  };

  const selectedRows = rows.filter((r) => selected.has(r.origin));

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        Could not load the dictionaries: {error instanceof Error ? error.message : "unknown error"}
        <Button variant="outline" size="sm" className="ml-3" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0">
      {/* Header */}
      <section className="rounded-xl border bg-background/60 p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dictionaries</h2>
            <p className="text-sm text-muted-foreground">
              {summary.imported} of {rows.length} imported ·{" "}
              {summary.entries.toLocaleString()} entries
              {summary.partial > 0 && ` · ${summary.partial} partial`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportMenu origins={[]} label="Export all" disabled={summary.entries === 0} />
            {isAdmin && (
              <RestoreButton
                disabled={runner.active}
                onDone={refresh}
                label="Restore from backup"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => refetch()}
              aria-label="Refresh"
            >
              <RefreshCwIcon className={cn("size-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
        {!isAdmin && (
          <p className="text-xs text-muted-foreground">
            You can export dictionaries. Importing, restoring and deleting need an administrator account.
          </p>
        )}
      </section>

      {/* Import settings */}
      {isAdmin && (
        <section className="rounded-xl border bg-background/60 p-4 space-y-4" aria-labelledby="imp-settings">
          <h3 id="imp-settings" className="font-medium">
            Import settings
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label>When entries already exist</Label>
              <Select
                value={settings.mode}
                onValueChange={(v) => setSettings((s) => ({ ...s, mode: v as ImportSettings["mode"] }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace">Replace (safe swap)</SelectItem>
                  <SelectItem value="merge">Add missing only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.mode === "replace"
                  ? "Current entries stay until the new ones are all in."
                  : "Resume a partial import or top up without touching existing entries."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imp-limit">Rows to import</Label>
              <Input
                id="imp-limit"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="All rows"
                className="h-10"
                value={settings.limitRows ?? ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setSettings((s) => ({ ...s, limitRows: n > 0 ? n : undefined }));
                }}
              />
              {settings.limitRows && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex gap-1">
                  <TriangleAlertIcon className="size-3.5 shrink-0 mt-px" />
                  Only the first {settings.limitRows.toLocaleString()} rows
                  {settings.mode === "replace" ? " — the rest of the dictionary will be removed" : ""}.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Batch size</Label>
              <Select
                value={String(settings.batchSize)}
                onValueChange={(v) => setSettings((s) => ({ ...s, batchSize: parseInt(v, 10) }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[500, 1000, 2000, 5000].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n.toLocaleString()} rows per request
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imp-validate">Checks</Label>
              <label className="flex items-center gap-2 h-10">
                <Switch
                  id="imp-validate"
                  checked={settings.validate}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, validate: v }))}
                />
                <span className="text-sm">Skip invalid rows</span>
              </label>
            </div>
          </div>
        </section>
      )}

      {/* Filter + bulk bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a dictionary…"
            className="h-10 pl-9"
            aria-label="Find a dictionary"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "secondary" : "ghost"}
              size="sm"
              className="h-9 shrink-0 rounded-full"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 backdrop-blur p-2 shadow-sm">
          <span className="text-sm px-1">{selected.size} selected</span>
          {isAdmin && (
            <Button size="sm" className="h-9" onClick={() => startImport(selectedRows)}>
              <PlayIcon className="size-4 mr-1.5" /> Import
            </Button>
          )}
          <ExportMenu origins={selectedRows.filter((r) => r.wordCount > 0).map((r) => r.origin)} label="Export" />
          <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Dictionaries */}
      <ul className="grid gap-3 lg:grid-cols-2">
        {visible.map((row) => {
          const info = getDictionaryInfo(row.origin);
          const run = row.dictionary ? runner.runs[row.dictionary] : undefined;
          const running = run && ["queued", "running", "finishing"].includes(run.status);
          const cov = coverage(row);
          const pct =
            row.sqlite.rows && row.sqlite.rows > 0
              ? Math.min(100, (row.wordCount / row.sqlite.rows) * 100)
              : row.wordCount > 0
                ? 100
                : 0;
          return (
            <li key={row.origin} className="rounded-xl border bg-background/60 p-3 sm:p-4 space-y-3 min-w-0">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selected.has(row.origin)}
                  onCheckedChange={(v) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (v === true) next.add(row.origin);
                      else next.delete(row.origin);
                      return next;
                    })
                  }
                  className="mt-1 size-5"
                  aria-label={`Select ${info.name}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium leading-tight">{info.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{row.origin}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {cov === "full" && <Badge>{row.wordCount.toLocaleString()} entries</Badge>}
                    {cov === "unknown" && <Badge>{row.wordCount.toLocaleString()} entries</Badge>}
                    {cov === "partial" && (
                      <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-300">
                        Partial: {row.wordCount.toLocaleString()} of {row.sqlite.rows!.toLocaleString()}
                      </Badge>
                    )}
                    {cov === "empty" && <Badge variant="secondary">Not imported</Badge>}
                    {row.dictionary && !row.sqlite.exists && (
                      <Badge variant="outline" className="text-muted-foreground">No source file</Badge>
                    )}
                    {row.dictionary === null && (
                      <Badge variant="outline" className="text-muted-foreground">Restored · no SQLite source</Badge>
                    )}
                    {row.sqlite.error && (
                      <Badge variant="destructive" title={row.sqlite.error}>Source file unreadable</Badge>
                    )}
                  </div>
                </div>
              </div>

              {row.sqlite.exists && row.sqlite.rows !== undefined && (
                <div className="space-y-1">
                  <Progress value={pct} className="h-1.5" aria-label="Imported share of the source file" />
                  <p className="text-xs text-muted-foreground">
                    Source: {row.sqlite.rows.toLocaleString()} rows · {formatBytes(row.sqlite.size)}
                    {row.sqlite.modifiedAt &&
                      ` · file ${formatDistanceToNow(new Date(row.sqlite.modifiedAt))} old`}
                    {row.lastImported &&
                      ` · imported ${formatDistanceToNow(new Date(row.lastImported))} ago`}
                  </p>
                </div>
              )}

              {row.stagedCount > 0 && !running && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
                  <TriangleAlertIcon className="size-4 text-amber-600 shrink-0" />
                  <span className="flex-1">
                    An import stopped part-way ({row.stagedCount.toLocaleString()} staged entries, not live).
                  </span>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={busyOrigin === row.origin}
                      onClick={async () => {
                        setBusyOrigin(row.origin);
                        const r = await cancelDictionaryImport({ origin: row.origin });
                        setBusyOrigin(null);
                        if (r.status === "error") toast.error(r.error);
                        refresh();
                      }}
                    >
                      Discard
                    </Button>
                  )}
                </div>
              )}

              {run && (
                <RunProgress
                  run={run}
                  onCancel={() => runner.cancel(run.dictionary)}
                  onDismiss={() => runner.dismiss(run.dictionary)}
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && row.dictionary && row.sqlite.exists && (
                  <Button
                    size="sm"
                    className="h-9"
                    disabled={!!running || !!row.sqlite.error}
                    onClick={() => startImport([row])}
                  >
                    <PlayIcon className="size-4 mr-1.5" />
                    {row.wordCount > 0
                      ? settings.mode === "merge"
                        ? "Add missing"
                        : "Re-import"
                      : "Import"}
                  </Button>
                )}
                {isAdmin && (
                  <RestoreButton
                    origin={row.origin}
                    disabled={!!running}
                    onDone={refresh}
                  />
                )}
                {isAdmin && row.dictionary && (
                  <SqliteFileUpload
                    dictionary={row.dictionary}
                    replace={row.sqlite.exists}
                    disabled={!!running}
                    onUploadSuccess={refresh}
                  />
                )}
                <ExportMenu origins={[row.origin]} label="Export" disabled={row.wordCount === 0} />
                {isAdmin && row.wordCount > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 ml-auto" aria-label="More actions">
                        {busyOrigin === row.origin ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <MoreHorizontalIcon className="size-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {row.dictionary && (
                        <DropdownMenuItem
                          disabled={!!running || busyOrigin !== null}
                          onClick={async () => {
                            setBusyOrigin(row.origin);
                            toast.info(`Re-processing ${info.short}… this can take a while`);
                            const r = await reprocessDictionaryWords({ dictionary: row.dictionary! });
                            setBusyOrigin(null);
                            if (r.status === "error") toast.error(r.error);
                            else toast.success(`${info.short}: ${r.data.updatedCount.toLocaleString()} entries re-processed`);
                            refresh();
                          }}
                        >
                          <RefreshCwIcon className="size-4 mr-2" />
                          Re-process stored entries
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <a href={`/dictionary?origins=${row.origin}`}>
                          <DownloadIcon className="size-4 mr-2 rotate-180" />
                          Browse in dictionary
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={!!running}
                        onClick={() => setConfirmDelete(row)}
                      >
                        <Trash2Icon className="size-4 mr-2" />
                        Delete all entries
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No dictionaries match.</p>
      )}

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete && getDictionaryInfo(confirmDelete.origin).name}?</AlertDialogTitle>
            <AlertDialogDescription>
              All {confirmDelete?.wordCount.toLocaleString()} entries are removed from the database.
              The SQLite source file is kept, so you can import again. Export a backup first if you
              have edited entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const row = confirmDelete;
                if (!row) return;
                setBusyOrigin(row.origin);
                const r = await deleteDictionaryOrigin({ origin: row.origin });
                setBusyOrigin(null);
                setConfirmDelete(null);
                if (r.status === "error") toast.error(r.error);
                else toast.success(`Deleted ${r.data.deleted.toLocaleString()} entries`);
                refresh();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DictionaryImportManager;
