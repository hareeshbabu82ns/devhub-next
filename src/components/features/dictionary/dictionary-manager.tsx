/**
 * Dictionary manager (Scraper → Dictionaries)
 *
 * Each dictionary moves through three stages:
 *
 *   Source file  ──capture──▶  Originals  ──build──▶  Search entries
 *   (SQLite)                   every row, verbatim     what lookups use
 *
 * Capturing keeps the source rows untouched in the database, so entries can
 * be rebuilt any time (new processing rules, a fix) without the file, and a
 * re-capture reports exactly what changed. Building swaps the new entries in
 * only when complete and keeps entries edited by hand.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  DatabaseIcon,
  FileDownIcon,
  FileIcon,
  FileUpIcon,
  HammerIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  ShieldAlertIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UndoIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { getDictionaryInfo } from "@/lib/dictionary/dictionary-catalog";
import type { PipelineRow } from "@/lib/dictionary/dictionary-pipeline";
import {
  type PipelineOverview,
  deleteDictionaryData,
  discardStaging,
  fixSearchIndexes,
  getPipelineOverview,
  recoverSwap,
} from "@/app/actions/dictionary-pipeline-actions";
import { SqliteFileUpload, uploadWithProgress } from "./sqlite-file-upload";
import {
  JobState,
  RunSettings,
  STEP_LABEL,
  StepKind,
  jobEta,
  useDictionaryPipelineRunner,
} from "./use-dictionary-pipeline-runner";
import { DictionaryInspector } from "./dictionary-inspector";

// ---------------------------------------------------------------------------
// State of a dictionary
// ---------------------------------------------------------------------------

type Health = "ok" | "warn" | "missing" | "none";

interface RowState {
  file: { health: Health; label: string; detail?: string };
  originals: { health: Health; label: string; detail?: string };
  entries: { health: Health; label: string; detail?: string };
  /** The one thing to do next, if anything */
  next: { steps: StepKind[]; label: string } | null;
  attention: boolean;
}

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

const ago = (iso: string | null) =>
  iso ? `${formatDistanceToNow(new Date(iso))} ago` : undefined;

function rowState(r: PipelineRow, processorVersion: number): RowState {
  const fileUsable = !!r.file?.exists && !r.file.error;
  const fromFile = r.originals.sourceFile !== null && r.originals.sourceFile !== "(existing entries)";

  const file: RowState["file"] = !r.file
    ? { health: "none", label: "No source definition" }
    : !r.file.exists
      ? { health: "missing", label: "No file", detail: r.file.file }
      : r.file.error
        ? { health: "warn", label: "Unreadable", detail: r.file.error }
        : {
            health: "ok",
            label: `${(r.file.rows ?? 0).toLocaleString()} rows`,
            detail: [r.file.file, formatBytes(r.file.size)].filter(Boolean).join(" · "),
          };

  const partial =
    fromFile && fileUsable && r.file!.rows !== undefined && r.originals.count < r.file!.rows!;
  const originals: RowState["originals"] =
    r.originals.count === 0
      ? { health: "missing", label: "Not captured" }
      : r.originals.sourceChanged
        ? {
            health: "warn",
            label: `${r.originals.count.toLocaleString()} · file changed`,
            detail: "The source file differs from the one captured",
          }
        : partial
          ? {
              health: "warn",
              label: `${r.originals.count.toLocaleString()} of ${r.file!.rows!.toLocaleString()}`,
              detail: "Partly captured",
            }
          : {
              health: "ok",
              label: r.originals.count.toLocaleString(),
              detail: [
                fromFile ? undefined : "from existing entries",
                ago(r.originals.capturedAt) && `captured ${ago(r.originals.capturedAt)}`,
              ]
                .filter(Boolean)
                .join(" · "),
            };

  const e = r.entries;
  const legacy = e.count > 0 && e.linked === 0;
  const short = r.originals.count > 0 && e.count > 0 && e.count < r.originals.count;
  const entries: RowState["entries"] =
    e.count === 0
      ? { health: "missing", label: "Not built" }
      : legacy
        ? {
            health: "warn",
            label: `${e.count.toLocaleString()} · old import`,
            detail: "Not built from originals; meanings only partly searchable",
          }
        : e.outdated
          ? {
              health: "warn",
              label: `${e.count.toLocaleString()} · v${e.builtVersion ?? 1}`,
              detail: `Processing rules are now v${processorVersion}`,
            }
          : short
            ? {
                health: "warn",
                label: `${e.count.toLocaleString()} of ${r.originals.count.toLocaleString()}`,
                detail: "Fewer entries than originals",
              }
            : {
                health: "ok",
                label: e.count.toLocaleString(),
                detail: ago(e.builtAt) && `built ${ago(e.builtAt)}`,
              };

  let next: RowState["next"] = null;
  if (r.dictionary) {
    if (fileUsable && (r.originals.count === 0 || r.originals.sourceChanged || partial)) {
      next = { steps: ["capture", "build"], label: "Capture & build" };
    } else if (r.originals.count === 0 && legacy) {
      next = { steps: ["adopt", "build"], label: "Keep originals & rebuild" };
    } else if (r.originals.count > 0 && (e.count === 0 || legacy || e.outdated || short)) {
      next = { steps: ["build"], label: e.count === 0 ? "Build entries" : "Rebuild entries" };
    }
  }

  const attention =
    next !== null || e.staged > 0 || e.parked > 0 || !!r.lastError || file.health === "warn";
  return { file, originals, entries, next, attention };
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

const HEALTH_DOT: Record<Health, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  missing: "bg-muted-foreground/40",
  none: "bg-transparent border border-muted-foreground/40",
};

function StageCell({
  icon: Icon,
  title,
  stage,
}: {
  icon: typeof FileIcon;
  title: string;
  stage: { health: Health; label: string; detail?: string };
}) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border bg-muted/20 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
        <span className={cn("ml-auto size-2 rounded-full shrink-0", HEALTH_DOT[stage.health])} aria-hidden />
      </div>
      <div className="text-sm font-medium truncate mt-0.5" title={stage.label}>
        {stage.label}
      </div>
      {stage.detail && (
        <div className="text-[11px] text-muted-foreground truncate" title={stage.detail}>
          {stage.detail}
        </div>
      )}
    </div>
  );
}

function exportHref(origins: string[], format: "originals" | "backup" | "csv") {
  const p = new URLSearchParams({ format });
  if (origins.length) p.set("origins", origins.join(","));
  return `/api/dictionary/export?${p.toString()}`;
}

function ExportMenu({
  origins,
  label,
  hasOriginals,
  hasEntries,
  compact,
}: {
  origins: string[];
  label: string;
  hasOriginals: boolean;
  hasEntries: boolean;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          disabled={!hasOriginals && !hasEntries}
          aria-label={compact ? label : undefined}
        >
          <FileDownIcon className={cn("size-4", !compact && "mr-1.5")} />
          {!compact && label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Downloads stream straight away
        </DropdownMenuLabel>
        <DropdownMenuItem asChild disabled={!hasOriginals}>
          <a href={exportHref(origins, "originals")} download>
            <div>
              <div className="font-medium">Originals (.jsonl.gz)</div>
              <div className="text-xs text-muted-foreground">
                Every source row as captured, with companion tables. Restore, then rebuild.
              </div>
            </div>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild disabled={!hasEntries}>
          <a href={exportHref(origins, "backup")} download>
            <div>
              <div className="font-medium">Search entries (.jsonl.gz)</div>
              <div className="text-xs text-muted-foreground">
                Entries as they are now, hand edits included
              </div>
            </div>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild disabled={!hasEntries}>
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

/** One file picker for both backup kinds; the server tells them apart */
function RestoreDialog({
  open,
  onOpenChange,
  origin,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  origin?: string;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [progress, setProgress] = useState<number | null>(null);

  const restore = async (file: File) => {
    setProgress(0);
    try {
      const qs = new URLSearchParams({ mode });
      if (origin) qs.set("only", origin);
      const r = await uploadWithProgress(`/api/dictionary/restore?${qs}`, file, setProgress);
      const parts = (r?.dictionaries ?? []).map(
        (d: { origin: string; written: number; skipped: number }) =>
          `${d.origin} ${d.written.toLocaleString()}${d.skipped ? ` (+${d.skipped.toLocaleString()} unchanged)` : ""}`,
      );
      toast.success(
        `${r?.kind === "originals" ? "Originals" : "Entries"} restored: ${parts.join(", ") || "nothing"}`,
        {
          description:
            [
              r?.kind === "originals" ? "Build the entries to make them searchable" : "",
              r?.invalid ? `${r.invalid} invalid lines skipped` : "",
              r?.ignored
                ? `${r.ignored.toLocaleString()} rows of other dictionaries (${(r.ignoredOrigins ?? []).join(", ")}) left out`
                : "",
            ]
              .filter(Boolean)
              .join(" · ") || undefined,
        },
      );
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setProgress(null);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => progress === null && onOpenChange(o)}>
      <AlertDialogContent>
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
        <AlertDialogHeader>
          <AlertDialogTitle>
            {origin ? `Restore ${getDictionaryInfo(origin).short}` : "Restore from a backup"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Pick an <b>Originals</b> or <b>Search entries</b> backup (.jsonl.gz or .jsonl).
            {origin
              ? ` Only its ${origin} rows are loaded.`
              : " Every dictionary in the file is loaded."}{" "}
            Originals only refill the originals; build afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          {(
            [
              [
                "replace",
                "Replace",
                "The file becomes the dictionary's content. Current entries stay until the whole file has loaded.",
              ],
              ["merge", "Add and update only", "Keep what is not in the file."],
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
        {progress !== null && (
          <div className="space-y-1">
            <Progress value={Math.min(progress, 1) * 100} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {progress < 1 ? `Uploading ${Math.round(progress * 100)}%` : "Restoring…"}
            </p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={progress !== null}>Cancel</AlertDialogCancel>
          <Button disabled={progress !== null} onClick={() => inputRef.current?.click()}>
            <FileUpIcon className="size-4 mr-1.5" /> Choose file…
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function JobProgress({
  job,
  onCancel,
  onDismiss,
}: {
  job: JobState;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const active = ["queued", "running", "finishing"].includes(job.status);
  const step = job.steps[job.step];
  const pct = job.total > 0 ? (job.done / job.total) * 100 : 0;
  const eta = jobEta(job);
  const s = job.stats;
  const summary = [
    s.added && `${s.added.toLocaleString()} new`,
    s.changed && `${s.changed.toLocaleString()} changed`,
    s.unchanged && `${s.unchanged.toLocaleString()} unchanged`,
    s.removed && `${s.removed.toLocaleString()} removed`,
    s.written && `${s.written.toLocaleString()} entries built`,
    s.kept && `${s.kept.toLocaleString()} hand edits kept`,
    s.failed && `${s.failed.toLocaleString()} rows skipped`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className={cn(
        "rounded-md border p-2.5 space-y-1.5 text-xs",
        job.status === "failed" && "border-destructive/50 bg-destructive/5",
        job.status === "done" && "border-emerald-500/40 bg-emerald-500/5",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {job.status === "queued" && "Waiting…"}
          {job.status === "running" &&
            `${STEP_LABEL[step]}${job.steps.length > 1 ? ` (${job.step + 1}/${job.steps.length})` : ""} · ${job.done.toLocaleString()} / ${job.total.toLocaleString()}`}
          {job.status === "finishing" &&
            (step === "build" ? "Swapping in the new entries…" : "Tidying up…")}
          {job.status === "done" &&
            `Done${job.finishedAt && job.startedAt ? ` in ${formatDuration(job.finishedAt - job.startedAt)}` : ""}`}
          {job.status === "failed" && `Failed: ${job.error}`}
          {job.status === "cancelled" && "Cancelled — the live entries were not changed"}
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
      {active && <Progress value={job.status === "finishing" ? 100 : pct} className="h-1.5" />}
      {(summary || job.status === "running") && (
        <div className="text-muted-foreground">
          {job.status === "running" && `${pct.toFixed(1)}%`}
          {eta !== null && ` · about ${formatDuration(eta)} left`}
          {summary && `${job.status === "running" ? " · " : ""}${summary}`}
        </div>
      )}
      {job.errors.length > 0 && (
        <details className="text-muted-foreground">
          <summary className="cursor-pointer">Problems ({job.errors.length})</summary>
          <ul className="mt-1 list-disc pl-4 space-y-0.5 break-all">
            {job.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Filter = "all" | "attention" | "ready" | "empty";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "ready", label: "Up to date" },
  { value: "empty", label: "Empty" },
];

type DeleteWhat = "entries" | "originals" | "both";

export function DictionaryManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [restoreFor, setRestoreFor] = useState<string | null | undefined>(undefined);
  const [inspect, setInspect] = useState<string | null>(null);
  const [inspectKey, setInspectKey] = useState<string | null>(null);
  // Deep link from an entry: ?inspect=MW&key=827
  const searchParams = useSearchParams();
  useEffect(() => {
    const origin = searchParams.get("inspect");
    if (origin && /^[A-Z0-9_]{1,32}$/.test(origin)) {
      setInspect(origin);
      setInspectKey(searchParams.get("key"));
    }
  }, [searchParams]);
  const [toDelete, setToDelete] = useState<{ row: PipelineRow; what: DeleteWhat } | null>(null);
  const [fixingIndexes, setFixingIndexes] = useState(false);
  const [settings, setSettings] = useState<RunSettings>({
    batchSize: 2000,
    limitRows: undefined,
    keepEdits: true,
    resume: true,
  });

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["dictionary-pipeline"],
    queryFn: async (): Promise<PipelineOverview> => {
      const r = await getPipelineOverview();
      if (r.status === "error") throw new Error(r.error);
      return r.data;
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dictionary-pipeline"] });

  const runner = useDictionaryPipelineRunner((job) => {
    const name = getDictionaryInfo(job.origin).short;
    if (job.status === "done") toast.success(`${name}: done`);
    else if (job.status === "failed") toast.error(`${name}: ${job.error}`);
    refresh();
  });

  const rows = data?.rows ?? [];
  const isAdmin = data?.isAdmin ?? false;
  const version = data?.processorVersion ?? 0;
  const states = useMemo(
    () => new Map(rows.map((r) => [r.origin, rowState(r, version)])),
    [rows, version],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const info = getDictionaryInfo(r.origin);
      if (q && !`${r.origin} ${info.name} ${r.dictionary ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      const st = states.get(r.origin)!;
      switch (filter) {
        case "attention":
          return st.attention;
        case "ready":
          return !st.attention && r.entries.count > 0;
        case "empty":
          return r.entries.count === 0 && r.originals.count === 0;
        default:
          return true;
      }
    });
  }, [rows, filter, search, states]);

  const summary = useMemo(() => {
    let entries = 0;
    let originals = 0;
    let attention = 0;
    let ready = 0;
    for (const r of rows) {
      entries += r.entries.count;
      originals += r.originals.count;
      const st = states.get(r.origin)!;
      if (st.attention) attention++;
      else if (r.entries.count > 0) ready++;
    }
    return { entries, originals, attention, ready };
  }, [rows, states]);

  const run = (targets: PipelineRow[], steps: StepKind[] | "next") => {
    const groups = new Map<string, { steps: StepKind[]; items: PipelineRow[] }>();
    for (const r of targets) {
      if (!r.dictionary) continue;
      const s = steps === "next" ? states.get(r.origin)?.next?.steps : steps;
      if (!s?.length) continue;
      const k = s.join(">");
      const g = groups.get(k) ?? { steps: s, items: [] };
      g.items.push(r);
      groups.set(k, g);
    }
    let started = 0;
    for (const g of groups.values()) {
      started += runner.start(
        g.items.map((r) => ({ origin: r.origin, dictionary: r.dictionary })),
        g.steps,
        settings,
      );
    }
    if (started === 0) toast.info("Nothing to run for the selected dictionaries");
    setSelected(new Set());
  };

  const simple = async (key: string, fn: () => Promise<{ status: string; error?: string }>, ok: string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r.status === "error") toast.error(r.error);
      else toast.success(ok);
    } finally {
      setBusy(null);
      refresh();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
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

  const selectedRows = rows.filter((r) => selected.has(r.origin));

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0">
      {/* Header */}
      <section className="rounded-xl border bg-background/60 p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Dictionaries</h2>
            <p className="text-sm text-muted-foreground">
              {summary.entries.toLocaleString()} search entries ·{" "}
              {summary.originals.toLocaleString()} originals kept · processing rules v{version}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="secondary">{summary.ready} up to date</Badge>
              {summary.attention > 0 && (
                <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-300">
                  {summary.attention} need attention
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && summary.attention > 0 && (
              <Button
                size="sm"
                className="h-9"
                onClick={() => run(rows.filter((r) => states.get(r.origin)?.next), "next")}
              >
                <PlayIcon className="size-4 mr-1.5" /> Bring all up to date
              </Button>
            )}
            <ExportMenu
              origins={[]}
              label="Export all"
              hasOriginals={summary.originals > 0}
              hasEntries={summary.entries > 0}
            />
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={runner.active}
                onClick={() => setRestoreFor(null)}
              >
                <FileUpIcon className="size-4 mr-1.5" /> Restore
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-9" onClick={() => refetch()} aria-label="Refresh">
              <RefreshCwIcon className={cn("size-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground" aria-label="How it works">
          <li className="flex items-center gap-1"><FileIcon className="size-3.5" /> Source file</li>
          <ArrowRightIcon className="size-3" aria-hidden />
          <li className="flex items-center gap-1"><DatabaseIcon className="size-3.5" /> Originals: every row kept as-is</li>
          <ArrowRightIcon className="size-3" aria-hidden />
          <li className="flex items-center gap-1"><SearchIcon className="size-3.5" /> Search entries: what lookups, the popup and the playground read</li>
        </ol>

        {!data.indexes.ok && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-sm">
            <ShieldAlertIcon className="size-4 text-amber-600 shrink-0" />
            <span className="flex-1 min-w-48">
              Search indexes need attention
              {data.indexes.missing.length > 0 && ` · missing ${data.indexes.missing.join(", ")}`}
              {data.indexes.conflicting.length > 0 &&
                ` · old full-text index ${data.indexes.conflicting.join(", ")} will be replaced`}
              . Lookups work but are slower, and meaning search may miss text.
            </span>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={fixingIndexes}
                onClick={async () => {
                  setFixingIndexes(true);
                  toast.info("Creating indexes… on a large collection this takes a few minutes");
                  try {
                    const r = await fixSearchIndexes();
                    if (r.status === "error") toast.error(r.error);
                    else if (r.data.ok) toast.success("Search indexes are ready");
                    else toast.warning(`Still missing: ${r.data.missing.join(", ")}`);
                  } finally {
                    setFixingIndexes(false);
                    refresh();
                  }
                }}
              >
                {fixingIndexes && <Loader2Icon className="size-3.5 mr-1 animate-spin" />}
                Create indexes
              </Button>
            )}
          </div>
        )}
        {!isAdmin && (
          <p className="text-xs text-muted-foreground">
            You can look through and export dictionaries. Changing them needs an administrator account.
          </p>
        )}
      </section>

      {/* Run settings */}
      {isAdmin && (
        <Collapsible className="rounded-xl border bg-background/60">
          <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3 text-sm font-medium">
            <SettingsIcon className="size-4 text-muted-foreground" />
            Run settings
            <span className="text-xs font-normal text-muted-foreground truncate">
              {settings.batchSize.toLocaleString()} rows per request
              {settings.keepEdits ? " · keep hand edits" : " · overwrite hand edits"}
              {settings.limitRows ? ` · first ${settings.limitRows.toLocaleString()} rows only` : ""}
            </span>
            <ChevronDownIcon className="size-4 ml-auto transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-4 border-t p-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <Label htmlFor="run-limit">Rows to capture</Label>
              <Input
                id="run-limit"
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
                  For trying things out: originals beyond the first{" "}
                  {settings.limitRows.toLocaleString()} rows are left as they are.
                </p>
              )}
            </div>
            <label className="flex items-start gap-2 pt-6">
              <Switch
                checked={settings.keepEdits}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, keepEdits: v }))}
              />
              <span className="text-sm">
                Keep hand edits
                <span className="block text-xs text-muted-foreground">
                  Rebuilds leave entries edited or added by hand alone
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 pt-6">
              <Switch
                checked={settings.resume}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, resume: v }))}
              />
              <span className="text-sm">
                Resume stopped builds
                <span className="block text-xs text-muted-foreground">
                  Carry on where a failed build stopped instead of starting over
                </span>
              </span>
            </label>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filter */}
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
            <>
              <Button size="sm" className="h-9" onClick={() => run(selectedRows, ["capture", "build"])}>
                <PlayIcon className="size-4 mr-1.5" /> Capture & build
              </Button>
              <Button size="sm" variant="outline" className="h-9" onClick={() => run(selectedRows, ["build"])}>
                <HammerIcon className="size-4 mr-1.5" /> Rebuild
              </Button>
            </>
          )}
          <ExportMenu
            origins={selectedRows.map((r) => r.origin)}
            label="Export"
            hasOriginals={selectedRows.some((r) => r.originals.count > 0)}
            hasEntries={selectedRows.some((r) => r.entries.count > 0)}
          />
          <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Dictionaries */}
      <ul className="grid gap-3 xl:grid-cols-2">
        {visible.map((row) => {
          const info = getDictionaryInfo(row.origin);
          const st = states.get(row.origin)!;
          const job = runner.jobs[row.origin];
          const running = !!job && ["queued", "running", "finishing"].includes(job.status);
          const isBusy = busy?.startsWith(row.origin) ?? false;
          const disabled = running || isBusy;
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
                    {row.originals.keyColumn && (
                      <span className="text-[11px] text-muted-foreground">keyed by {row.originals.keyColumn}</span>
                    )}
                  </div>
                  {row.originals.companions.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      Also kept:{" "}
                      {row.originals.companions.map((c) => `${c.table} (${c.rows} ${c.role})`).join(", ")}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 -mt-1" aria-label="More actions">
                      {isBusy ? <Loader2Icon className="size-4 animate-spin" /> : <MoreHorizontalIcon className="size-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuItem
                      disabled={row.originals.count === 0}
                      onClick={() => {
                        setInspectKey(null);
                        setInspect(row.origin);
                      }}
                    >
                      <SearchIcon className="size-4 mr-2" /> Look through originals
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild disabled={row.entries.count === 0}>
                      <a href={`/dictionary?origins=${row.origin}`}>
                        <ArrowRightIcon className="size-4 mr-2" /> Browse in dictionary
                      </a>
                    </DropdownMenuItem>
                    {isAdmin && row.dictionary && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={disabled || !row.file?.exists || !!row.file?.error}
                          onClick={() => run([row], ["capture"])}
                        >
                          <DatabaseIcon className="size-4 mr-2" /> Capture originals from file
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={disabled || row.entries.count === 0}
                          onClick={() => run([row], ["adopt"])}
                        >
                          <DatabaseIcon className="size-4 mr-2" /> Keep originals from entries
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={disabled || row.originals.count === 0}
                          onClick={() => run([row], ["build"])}
                        >
                          <HammerIcon className="size-4 mr-2" /> Rebuild search entries
                        </DropdownMenuItem>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={disabled} onClick={() => setRestoreFor(row.origin)}>
                          <FileUpIcon className="size-4 mr-2" /> Restore from backup
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={disabled || row.entries.count === 0}
                          onClick={() => setToDelete({ row, what: "entries" })}
                        >
                          <Trash2Icon className="size-4 mr-2" /> Delete search entries
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={disabled || row.originals.count === 0}
                          onClick={() => setToDelete({ row, what: "originals" })}
                        >
                          <Trash2Icon className="size-4 mr-2" /> Delete originals
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
                <StageCell icon={FileIcon} title="Source file" stage={st.file} />
                <ArrowRightIcon className="hidden sm:block size-4 self-center text-muted-foreground shrink-0" aria-hidden />
                <StageCell icon={DatabaseIcon} title="Originals" stage={st.originals} />
                <ArrowRightIcon className="hidden sm:block size-4 self-center text-muted-foreground shrink-0" aria-hidden />
                <StageCell icon={SearchIcon} title="Search entries" stage={st.entries} />
              </div>

              {row.lastError && !running && (
                <p className="text-xs text-destructive break-words">Last run: {row.lastError}</p>
              )}

              {(row.entries.staged > 0 || row.entries.parked > 0) && !running && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
                  <TriangleAlertIcon className="size-4 text-amber-600 shrink-0" />
                  <span className="flex-1 min-w-40">
                    {row.entries.parked > 0
                      ? `A swap was interrupted (${row.entries.parked.toLocaleString()} previous entries set aside).`
                      : `A build stopped part-way (${row.entries.staged.toLocaleString()} entries ready, not live).`}
                  </span>
                  {isAdmin && row.entries.parked > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={isBusy}
                      onClick={() =>
                        simple(`${row.origin}:recover`, () => recoverSwap({ origin: row.origin }), "Previous entries are back")
                      }
                    >
                      <UndoIcon className="size-3.5 mr-1" /> Recover
                    </Button>
                  )}
                  {isAdmin && row.entries.staged > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={isBusy || row.originals.count === 0}
                        onClick={() => run([row], ["build"])}
                      >
                        {settings.resume ? "Resume" : "Restart"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        disabled={isBusy}
                        onClick={() =>
                          simple(`${row.origin}:discard`, () => discardStaging({ origin: row.origin }), "Discarded")
                        }
                      >
                        Discard
                      </Button>
                    </>
                  )}
                </div>
              )}

              {job && (
                <JobProgress
                  job={job}
                  onCancel={() => runner.cancel(row.origin)}
                  onDismiss={() => runner.dismiss(row.origin)}
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && st.next && (
                  <Button size="sm" className="h-9" disabled={disabled} onClick={() => run([row], st.next!.steps)}>
                    <PlayIcon className="size-4 mr-1.5" />
                    {st.next.label}
                  </Button>
                )}
                {!st.next && row.entries.count > 0 && !st.attention && (
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 px-1">Up to date</span>
                )}
                {isAdmin && row.dictionary && (
                  <SqliteFileUpload
                    dictionary={row.dictionary}
                    replace={!!row.file?.exists}
                    disabled={disabled}
                    onUploadSuccess={refresh}
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={row.originals.count === 0}
                  onClick={() => setInspect(row.origin)}
                >
                  <SearchIcon className="size-4 mr-1.5" /> Inspect
                </Button>
                <div className="ml-auto">
                  <ExportMenu
                    origins={[row.origin]}
                    label="Export"
                    compact
                    hasOriginals={row.originals.count > 0}
                    hasEntries={row.entries.count > 0}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No dictionaries match.</p>
      )}

      <RestoreDialog
        open={restoreFor !== undefined}
        onOpenChange={(o) => !o && setRestoreFor(undefined)}
        origin={restoreFor ?? undefined}
        onDone={refresh}
      />

      <DictionaryInspector
        origin={inspect}
        initialKey={inspectKey}
        open={inspect !== null}
        onOpenChange={(o) => {
          if (!o) {
            setInspect(null);
            setInspectKey(null);
          }
        }}
        isAdmin={isAdmin}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {toDelete?.what === "originals" ? "the originals" : "the search entries"} of{" "}
              {toDelete && getDictionaryInfo(toDelete.row.origin).name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.what === "originals"
                ? `All ${toDelete.row.originals.count.toLocaleString()} original rows and the kept companion tables are removed. The search entries stay, but can no longer be rebuilt without capturing again.`
                : `All ${toDelete?.row.entries.count.toLocaleString()} search entries are removed, including any edited by hand. The originals stay, so you can build again. Export the entries first if you have edited them.`}{" "}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const t = toDelete;
                setToDelete(null);
                if (!t) return;
                await simple(
                  `${t.row.origin}:delete`,
                  () => deleteDictionaryData({ origin: t.row.origin, what: t.what }),
                  "Deleted",
                );
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

export default DictionaryManager;
