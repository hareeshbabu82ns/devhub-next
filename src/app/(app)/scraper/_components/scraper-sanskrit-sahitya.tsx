/**
 * Sanskrit Sahitya manager (Scraper → Sanskrit Sahitya)
 *
 * Every work in data/sanskritsahitya-com-data moves through two stages:
 *
 *   Source JSON ──capture──▶ Originals ──build──▶ Entities (+ annotations)
 *
 * Capturing keeps every book, chapter and verse untouched in the database,
 * so the entities can be rebuilt any time (new processing rules, new fields
 * in the source) without the files, and a re-capture reports exactly what
 * changed upstream. Building updates entities in place, so bookmarks, notes,
 * audio and your own annotations stay; entities edited by hand are kept.
 * See src/lib/sahitya/README.md.
 */

"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  HammerIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlayIcon,
  RefreshCwIcon,
  SquareIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ENTITY_TYPES_DDLB, ENTITY_TYPES_PARENTS } from "@/lib/constants";
import EntitySearchDlgTrigger from "@/app/(app)/entities/_components/EntitySearchDlgTrigger";
import type { BuildBatchResult, WorkRow } from "@/lib/sahitya/sahitya-pipeline";
import type { RowKeyState } from "@/lib/sahitya/sahitya-format";
import {
  beginSahityaBuild,
  beginSahityaCapture,
  buildSahityaBatch,
  captureSahityaFile,
  deleteLegacySahityaImport,
  deleteSahityaEntities,
  deleteSahityaOriginals,
  finishSahityaBuild,
  finishSahityaCapture,
  getSahityaOverview,
  previewSahityaWork,
} from "@/app/actions/sahitya-pipeline-actions";

type Res<T> = { status: "success"; data: T } | { status: "error"; error: string };
const unwrap = <T,>(r: Res<T>): T => {
  if (r.status === "error") throw new Error(r.error);
  return r.data;
};

const ago = (iso: string | null) =>
  iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "";

interface BuildSettings {
  entityType: string;
  parentId: string | null;
  bookmarkAll: boolean;
  overwriteEdited: boolean;
  batchSize: number;
}

interface Job {
  work: string;
  step: "capture" | "build";
  label: string;
  done: number;
  total: number;
  log: string[];
}

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */

function useRunner(onFinished: () => void) {
  const [job, setJob] = useState<Job | null>(null);
  const stop = useRef(false);

  const update = (patch: Partial<Job>, line?: string) =>
    setJob((j) => (j ? { ...j, ...patch, log: line ? [...j.log, line] : j.log } : j));

  async function capture(work: string) {
    setJob({ work, step: "capture", label: "Reading source files", done: 0, total: 1, log: [] });
    const begin = unwrap(await beginSahityaCapture(work));
    update({ total: begin.files.length });
    let state: RowKeyState | undefined;
    const sum = { added: 0, changed: 0, unchanged: 0 };
    for (let i = 0; i < begin.files.length; i++) {
      if (stop.current) throw new Error("Stopped");
      update({ label: `Capturing ${begin.files[i]}` });
      const r = unwrap(
        await captureSahityaFile({ work, runId: begin.runId, fileIndex: i, state }),
      );
      state = r.state;
      sum.added += r.added;
      sum.changed += r.changed;
      sum.unchanged += r.unchanged;
      update(
        { done: i + 1 },
        `${r.file}: ${r.rows} rows — ${r.added} new, ${r.changed} changed, ${r.unchanged} same`,
      );
    }
    const fin = unwrap(
      await finishSahityaCapture({ work, runId: begin.runId, signature: begin.signature }),
    );
    update(
      { label: "Captured" },
      `Originals: ${fin.total} (${sum.added} new, ${sum.changed} changed, ${fin.removed} no longer in the source)`,
    );
  }

  async function build(work: string, s: BuildSettings) {
    setJob({ work, step: "build", label: "Preparing", done: 0, total: 1, log: [] });
    const begin = unwrap(
      await beginSahityaBuild({
        work,
        entityType: s.entityType,
        parentId: s.parentId,
        bookmarkAll: s.bookmarkAll,
      }),
    );
    update(
      { total: begin.total, label: "Building entities" },
      `${begin.rootCreated ? "Created" : "Updated"} the work's entity; ${begin.total} originals to build`,
    );
    let afterSeq: number | null = null;
    let done = 0;
    const sum = { created: 0, updated: 0, unchanged: 0, kept: 0, annotations: 0 };
    for (;;) {
      if (stop.current) throw new Error("Stopped (run the build again to finish it)");
      const r: BuildBatchResult = unwrap(
        await buildSahityaBatch({
          work,
          afterSeq,
          size: s.batchSize,
          overwriteEdited: s.overwriteEdited,
        }),
      );
      if (r.done === 0) break;
      done += r.done;
      afterSeq = r.lastSeq;
      for (const k of Object.keys(sum) as (keyof typeof sum)[]) sum[k] += r[k];
      update({ done });
    }
    update({ label: "Linking chapters and verses" });
    const fin = unwrap(await finishSahityaBuild({ work }));
    update(
      { label: "Built", done: begin.total },
      `${sum.created} created, ${sum.updated} updated, ${sum.unchanged} unchanged, ${sum.kept} kept (edited by hand), ${sum.annotations} annotations; ${fin.removedEntities} removed`,
    );
  }

  async function run(fn: () => Promise<void>) {
    stop.current = false;
    try {
      await fn();
      toast.success("Done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setJob((j) => (j ? { ...j, label: "Failed", log: [...j.log, msg] } : j));
      toast.error(msg);
    } finally {
      onFinished();
    }
  }

  return {
    job,
    busy: !!job && !["Built", "Captured", "Failed"].includes(job.label),
    clear: () => setJob(null),
    stop: () => (stop.current = true),
    capture: (work: string) => run(() => capture(work)),
    build: (work: string, s: BuildSettings) => run(() => build(work, s)),
    captureAndBuild: (work: string, s: BuildSettings) =>
      run(async () => {
        await capture(work);
        await build(work, s);
      }),
  };
}

/* ------------------------------------------------------------------ */
/* Manager                                                             */
/* ------------------------------------------------------------------ */

export function ScraperSanskritSahitya() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["sahitya-overview"],
    queryFn: async () => unwrap(await getSahityaOverview()),
  });
  const runner = useRunner(() => queryClient.invalidateQueries({ queryKey: ["sahitya-overview"] }));
  const [settingsFor, setSettingsFor] = useState<{ row: WorkRow; mode: "build" | "both" } | null>(null);
  const [previewFor, setPreviewFor] = useState<WorkRow | null>(null);
  const [showReference, setShowReference] = useState(false);

  const rows = (data?.rows ?? []).filter((r) => showReference || r.kind === "work");
  const isAdmin = !!data?.isAdmin;

  const confirmRun = async (message: string, fn: () => Promise<Res<number>>) => {
    if (!window.confirm(message)) return;
    try {
      const n = unwrap(await fn());
      toast.success(`Removed ${n}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    queryClient.invalidateQueries({ queryKey: ["sahitya-overview"] });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Sanskrit Sahitya</h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Works from <code>data/sanskritsahitya-com-data</code>. <b>Capture</b> stores every
            book, chapter and verse as it is in the source; <b>Build</b> turns them into
            entities (translations as meaning; commentaries, anvaya, padaccheda and word
            analysis as annotations). Rebuilding updates entities in place and keeps your
            bookmarks, notes and annotations. Processor v{data?.processorVersion ?? "…"}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="ss-ref" checked={showReference} onCheckedChange={setShowReference} />
            <Label htmlFor="ss-ref" className="text-sm">Reference data</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCwIcon className={isFetching ? "size-4 animate-spin" : "size-4"} /> Refresh
          </Button>
        </div>
      </div>

      {runner.job && (
        <JobPanel job={runner.job} busy={runner.busy} onStop={runner.stop} onClose={runner.clear} />
      )}

      {error && <p className="text-sm text-destructive">{String((error as Error).message)}</p>}
      {isLoading && <Skeleton className="h-64 w-full" />}

      <div className="divide-y rounded-md border">
        {rows.map((row) => (
          <WorkRowView
            key={row.work}
            row={row}
            isAdmin={isAdmin}
            busy={runner.busy}
            processorVersion={data?.processorVersion ?? 0}
            onPreview={() => setPreviewFor(row)}
            onCapture={() => runner.capture(row.work)}
            onBuild={() => setSettingsFor({ row, mode: "build" })}
            onCaptureAndBuild={() => setSettingsFor({ row, mode: "both" })}
            onDeleteEntities={() =>
              confirmRun(
                `Delete the ${row.entityCount} entities built for ${row.work}, with every note, annotation and playground on them? The originals stay, so it can be built again.`,
                () => deleteSahityaEntities(row.work),
              )
            }
            onDeleteOriginals={() =>
              confirmRun(`Delete the stored originals of ${row.work}?`, () =>
                deleteSahityaOriginals(row.work),
              )
            }
            onDeleteLegacy={(id) =>
              confirmRun(
                `Delete the earlier import of ${row.title} (entity ${id}) and everything under it, including any notes or annotations added to it?`,
                () => deleteLegacySahityaImport(id),
              )
            }
          />
        ))}
      </div>

      {settingsFor && (
        <BuildSettingsDialog
          row={settingsFor.row}
          mode={settingsFor.mode}
          onClose={() => setSettingsFor(null)}
          onRun={(s) => {
            const { row, mode } = settingsFor;
            setSettingsFor(null);
            if (mode === "both") runner.captureAndBuild(row.work, s);
            else runner.build(row.work, s);
          }}
        />
      )}
      {previewFor && <PreviewDialog row={previewFor} onClose={() => setPreviewFor(null)} />}
    </div>
  );
}

function JobPanel({
  job,
  busy,
  onStop,
  onClose,
}: {
  job: Job;
  busy: boolean;
  onStop: () => void;
  onClose: () => void;
}) {
  const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
  return (
    <div className="rounded-md border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium flex items-center gap-2">
          {busy && <Loader2Icon className="size-4 animate-spin" />}
          {job.work} · {job.step} · {job.label}
          <span className="text-muted-foreground font-normal">
            {job.done}/{job.total}
          </span>
        </div>
        {busy ? (
          <Button size="sm" variant="outline" onClick={onStop}>
            <SquareIcon className="size-4" /> Stop
          </Button>
        ) : (
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <XIcon className="size-4" />
          </Button>
        )}
      </div>
      <Progress value={pct} />
      {job.log.length > 0 && (
        <ul className="text-xs text-muted-foreground list-disc pl-5 max-h-40 overflow-auto">
          {job.log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorkRowView({
  row,
  isAdmin,
  busy,
  processorVersion,
  onPreview,
  onCapture,
  onBuild,
  onCaptureAndBuild,
  onDeleteEntities,
  onDeleteOriginals,
  onDeleteLegacy,
}: {
  row: WorkRow;
  isAdmin: boolean;
  busy: boolean;
  processorVersion: number;
  onPreview: () => void;
  onCapture: () => void;
  onBuild: () => void;
  onCaptureAndBuild: () => void;
  onDeleteEntities: () => void;
  onDeleteOriginals: () => void;
  onDeleteLegacy: (id: string) => void;
}) {
  const reference = row.kind === "reference";
  const captured = !!row.capturedAt;
  const built = !!row.builtAt;
  const next: "capture" | "build" | null = reference
    ? null
    : !captured || row.sourceChanged
      ? "capture"
      : row.needsBuild
        ? "build"
        : null;

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{row.title ?? row.work}</span>
            {row.title && <span className="text-xs text-muted-foreground">{row.work}</span>}
            <span className="text-xs text-muted-foreground">
              {row.files.length} file{row.files.length === 1 ? "" : "s"}
            </span>
            {reference && <Badge variant="outline">reference data</Badge>}
          </div>
          {reference && <span className="text-xs text-muted-foreground">{row.note}</span>}
        </div>
        {!reference && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onPreview}>
              <EyeIcon className="size-4" /> Preview
            </Button>
            {isAdmin && (
              <>
                {next === "capture" && (
                  <Button size="sm" disabled={busy} onClick={onCaptureAndBuild}>
                    <PlayIcon className="size-4" /> {captured ? "Re-capture & build" : "Capture & build"}
                  </Button>
                )}
                {next === "build" && (
                  <Button size="sm" disabled={busy} onClick={onBuild}>
                    <HammerIcon className="size-4" /> {built ? "Rebuild" : "Build"}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" disabled={busy} aria-label="More">
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onCapture}>Capture only</DropdownMenuItem>
                    <DropdownMenuItem disabled={!captured} onClick={onBuild}>
                      Build / rebuild…
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onCaptureAndBuild}>Capture & build…</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled={!built} onClick={onDeleteEntities}>
                      <Trash2Icon className="size-4" /> Delete built entities
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!captured || built} onClick={onDeleteOriginals}>
                      <Trash2Icon className="size-4" /> Delete originals
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )}
      </div>

      {!reference && (
        <div className="flex flex-wrap gap-2 text-xs">
          {captured ? (
            <Badge variant="secondary" title={row.sourceRevision ?? undefined}>
              {row.rawCount} originals · captured {ago(row.capturedAt)}
            </Badge>
          ) : (
            <Badge variant="outline">not captured</Badge>
          )}
          {row.sourceChanged && <Badge variant="destructive">source changed since capture</Badge>}
          {built ? (
            <Badge variant="secondary">
              {row.entityCount} entities · built {ago(row.builtAt)}
              {row.options?.entityType ? ` · ${row.options.entityType}` : ""}
            </Badge>
          ) : (
            captured && <Badge variant="outline">not built</Badge>
          )}
          {built && row.builtVersion !== processorVersion && (
            <Badge variant="destructive">built by processor v{row.builtVersion}</Badge>
          )}
          {built && row.needsBuild && row.builtVersion === processorVersion && (
            <Badge variant="destructive">captured again since the build</Badge>
          )}
          {row.legacy.map((l) => (
            <Badge key={l.id} variant="outline" className="gap-1">
              <TriangleAlertIcon className="size-3" /> earlier import {l.id.slice(-6)}
              {isAdmin && (
                <button
                  className="underline ml-1"
                  onClick={() => onDeleteLegacy(l.id)}
                  disabled={busy}
                >
                  delete
                </button>
              )}
            </Badge>
          ))}
          {row.lastError && (
            <span className="text-destructive" title={row.lastError}>
              last error: {row.lastError.slice(0, 120)}
            </span>
          )}
        </div>
      )}

      {row.unhandledFields.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Fields without a rule (kept in the originals
          {row.unhandledFields.some((f) => !f.field.includes(".")) ? "; plain values as src.* attributes" : ""}
          ):{" "}
          {row.unhandledFields.map((f) => (
            <code key={f.field} className="mr-2">
              {f.field}×{f.count}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Build settings                                                      */
/* ------------------------------------------------------------------ */

function BuildSettingsDialog({
  row,
  mode,
  onClose,
  onRun,
}: {
  row: WorkRow;
  mode: "build" | "both";
  onClose: () => void;
  onRun: (s: BuildSettings) => void;
}) {
  const [s, setS] = useState<BuildSettings>({
    entityType: row.options?.entityType ?? row.suggestedType,
    parentId: row.options?.parentId ?? null,
    bookmarkAll: row.options?.bookmarkAll ?? false,
    overwriteEdited: false,
    batchSize: 500,
  });
  const [pickParent, setPickParent] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "both" ? "Capture & build" : "Build"} {row.title ?? row.work}
          </DialogTitle>
          <DialogDescription>
            {row.builtAt
              ? "Entities are updated in place; bookmarks, notes, audio and annotations you added stay."
              : "Creates an entity for the work, its books and chapters, and every verse."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Type of the work</Label>
            <Select value={s.entityType} onValueChange={(v) => setS({ ...s, entityType: v })}>
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
          <div className="flex flex-col gap-1">
            <Label>Place under (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                value={s.parentId ?? ""}
                placeholder="parent entity id"
                onChange={(e) => setS({ ...s, parentId: e.target.value.trim() || null })}
              />
              <EntitySearchDlgTrigger
                open={pickParent}
                onOpenChange={setPickParent}
                forTypes={ENTITY_TYPES_PARENTS[s.entityType] ?? []}
                onClick={(entity) => {
                  setS({ ...s, parentId: entity.id });
                  setPickParent(false);
                }}
              />
              {s.parentId && (
                <Button size="icon" variant="ghost" onClick={() => setS({ ...s, parentId: null })}>
                  <XIcon className="size-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ss-bm">Bookmark new entities</Label>
            <Switch
              id="ss-bm"
              checked={s.bookmarkAll}
              onCheckedChange={(v) => setS({ ...s, bookmarkAll: v })}
            />
          </div>
          {row.builtAt && (
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="ss-ow" className="leading-snug">
                Overwrite entities edited by hand
                <span className="block text-xs text-muted-foreground font-normal">
                  Off: text, meaning and attributes you changed are kept.
                </span>
              </Label>
              <Switch
                id="ss-ow"
                checked={s.overwriteEdited}
                onCheckedChange={(v) => setS({ ...s, overwriteEdited: v })}
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="ss-bs">Entities per request</Label>
            <Input
              id="ss-bs"
              type="number"
              className="w-28"
              min={50}
              max={2000}
              value={s.batchSize}
              onChange={(e) =>
                setS({ ...s, batchSize: Math.min(2000, Math.max(50, Number(e.target.value) || 500)) })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onRun(s)}>
            <PlayIcon className="size-4" /> Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

const PAGE = 10;

function PreviewDialog({ row, onClose }: { row: WorkRow; onClose: () => void }) {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["sahitya-preview", row.work, offset, query],
    queryFn: async () =>
      unwrap(
        await previewSahityaWork({
          work: row.work,
          offset,
          limit: PAGE,
          search: query || undefined,
        }),
      ),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview — {data?.title ?? row.work}</DialogTitle>
          <DialogDescription>
            What the current processor builds from{" "}
            {row.capturedAt ? "the stored originals" : "the first source file (not captured yet)"}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            placeholder="key or chapter, e.g. v:1.1:4 or 1.1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setOffset(0);
                setQuery(search.trim());
              }
            }}
          />
          <Button
            size="icon"
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {data ? `${offset + 1}–${Math.min(offset + PAGE, data.total)} of ${data.total}` : "…"}
          </span>
          <Button
            size="icon"
            variant="outline"
            disabled={!data || offset + PAGE >= data.total}
            onClick={() => setOffset(offset + PAGE)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto flex flex-col gap-3">
          {isLoading && <Skeleton className="h-40 w-full" />}
          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
          {data?.items.map((item) => (
            <div key={item.key} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                <code>{item.key}</code>
                <Badge variant="outline">{item.built.type}</Badge>
                <span>under {item.parentKey || "the work"}</span>
                <span>order {item.built.order}</span>
              </div>
              <Tabs defaultValue="built">
                <TabsList>
                  <TabsTrigger value="built">Entity</TabsTrigger>
                  <TabsTrigger value="annotations">
                    Annotations ({item.built.annotations.length})
                  </TabsTrigger>
                  <TabsTrigger value="source">Source</TabsTrigger>
                </TabsList>
                <TabsContent value="built" className="flex flex-col gap-2 text-sm">
                  <div className="markdown-content font-shobhika">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {item.built.text.find((t) => t.language === "SAN")?.value ?? ""}
                    </Markdown>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.built.text
                      .filter((t) => t.language !== "SAN")
                      .map((t) => t.language)
                      .join(", ")}
                  </div>
                  {item.built.meaning.map((m) => (
                    <div key={m.language} className="markdown-content border-l-2 pl-2">
                      <div className="text-xs text-muted-foreground">meaning · {m.language}</div>
                      <Markdown remarkPlugins={[remarkGfm]}>{m.value}</Markdown>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-1">
                    {item.built.attributes.map((a, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">
                        {a.key}: {a.value.length > 60 ? `${a.value.slice(0, 60)}…` : a.value}
                      </Badge>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="annotations" className="flex flex-col gap-3 text-sm">
                  {item.built.annotations.length === 0 && (
                    <span className="text-muted-foreground">None</span>
                  )}
                  {item.built.annotations.map((a, i) => (
                    <div key={i} className="markdown-content">
                      <div className="text-xs text-muted-foreground">
                        {a.kind} · {a.language} · {a.title}
                      </div>
                      <Markdown remarkPlugins={[remarkGfm]}>{a.text}</Markdown>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="source">
                  <pre className="text-xs whitespace-pre-wrap break-all max-h-80 overflow-auto bg-muted p-2 rounded">
                    {JSON.stringify(item.row, null, 1)}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
