"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FolderInput,
  ListMusic,
  Loader2,
  Pencil,
  RefreshCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AssetItem,
  ASSET_KIND_LABELS,
  assetDownloadUrl,
  assetVersionedUrl,
  formatBytes,
} from "@/lib/assets/shared";
import { cn } from "@/lib/utils";
import { AssetKindIcon } from "./asset-icons";
import { useAssetUsage } from "./AssetDialogs";
import { AssetItemHandlers } from "./AssetTile";

/** How much of a text file is loaded for preview. */
const TEXT_PREVIEW_BYTES = 200_000;

function TextPreview({ item }: { item: AssetItem }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["assets", "text", item.path, item.mtime],
    queryFn: async () => {
      const res = await fetch(assetVersionedUrl(item), {
        headers: { Range: `bytes=0-${TEXT_PREVIEW_BYTES - 1}` },
      });
      if (!res.ok) throw new Error(`Could not load the file (${res.status})`);
      return res.text();
    },
  });
  if (isPending) return <Loader2 className="size-6 animate-spin text-muted-foreground" />;
  if (error) return <p className="p-4 text-sm text-destructive">{error.message}</p>;
  return (
    <div className="size-full overflow-auto bg-background">
      <pre className="whitespace-pre-wrap break-words p-4 text-xs leading-relaxed">
        {data}
      </pre>
      {item.size > TEXT_PREVIEW_BYTES && (
        <p className="border-t p-3 text-xs text-muted-foreground">
          Showing the first {formatBytes(TEXT_PREVIEW_BYTES)} of{" "}
          {formatBytes(item.size)}. Download the file to see all of it.
        </p>
      )}
    </div>
  );
}

function ImagePreview({ item }: { item: AssetItem }) {
  const [zoom, setZoom] = useState(1);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setZoom(1);
    setLoaded(false);
  }, [item.path]);

  return (
    <div className="relative size-full">
      {/* zoomed images pan with ordinary scrolling, which also works by touch */}
      <div
        className={cn(
          "size-full",
          zoom > 1 ? "overflow-auto" : "flex items-center justify-center",
        )}
      >
        {!loaded && (
          <Loader2 className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assetVersionedUrl(item)}
          alt={item.name}
          onLoad={() => setLoaded(true)}
          onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
          style={zoom > 1 ? { width: `${zoom * 100}%`, maxWidth: "none" } : undefined}
          className={cn(
            "select-none",
            zoom > 1 ? "block h-auto" : "max-h-full max-w-full object-contain",
          )}
        />
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background/90 p-1 shadow backdrop-blur">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="rounded-full"
          disabled={zoom <= 1}
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          aria-label="Zoom out"
        >
          <ZoomOut />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="rounded-full"
          disabled={zoom >= 4}
          onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          aria-label="Zoom in"
        >
          <ZoomIn />
        </Button>
      </div>
    </div>
  );
}

function PreviewBody({ item }: { item: AssetItem }) {
  const src = assetVersionedUrl(item);
  switch (item.kind) {
    case "image":
      return <ImagePreview item={item} />;
    case "audio":
      return (
        <div className="flex w-full max-w-md flex-col items-center gap-6 p-6">
          <AssetKindIcon kind="audio" className="size-20" strokeWidth={1.25} />
          <audio key={src} src={src} controls preload="metadata" className="w-full" />
        </div>
      );
    case "video":
      return (
        <video
          key={src}
          src={src}
          controls
          playsInline
          preload="metadata"
          className="max-h-full max-w-full"
        />
      );
    case "pdf":
      return (
        <div className="flex size-full flex-col">
          <iframe key={src} src={src} title={item.name} className="w-full flex-1 bg-white" />
          {/* phones and tablets often show only the first page inline */}
          <p className="border-t bg-background p-2 text-center text-xs text-muted-foreground md:hidden">
            Seeing only one page?{" "}
            <a href={src} target="_blank" rel="noreferrer" className="underline">
              Open the PDF in a new tab
            </a>
          </p>
        </div>
      );
    case "text":
      return <TextPreview item={item} />;
    default:
      return (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <AssetKindIcon kind={item.kind} className="size-20" strokeWidth={1.25} />
          <p className="text-sm text-muted-foreground">
            No preview for this type of file.
          </p>
        </div>
      );
  }
}

function UsedBy({ item }: { item: AssetItem }) {
  const { data, isPending, error } = useAssetUsage([item.path]);
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Used by
      </dt>
      <dd className="mt-1 text-sm">
        {isPending ? (
          <span className="text-muted-foreground">Checking…</span>
        ) : error ? (
          <span className="text-destructive">{error.message}</span>
        ) : data.total === 0 ? (
          <span className="text-muted-foreground">Nothing yet</span>
        ) : (
          <ul className="space-y-1">
            {data.refs.map((r) => (
              <li key={`${r.model}-${r.id}-${r.field}`} className="truncate">
                {r.model === "entity" ? (
                  <Link
                    href={`/entities/${r.id}`}
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    {r.title}
                  </Link>
                ) : (
                  r.title
                )}
              </li>
            ))}
            {data.total > data.refs.length && (
              <li className="text-muted-foreground">
                and {data.total - data.refs.length} more
              </li>
            )}
          </ul>
        )}
      </dd>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-all text-sm">{children}</dd>
    </div>
  );
}

export interface AssetPreviewProps
  extends Pick<
    AssetItemHandlers,
    | "onCopyUrl"
    | "onAddToPlaylist"
    | "onRename"
    | "onReplace"
    | "onMove"
    | "onDelete"
  > {
  /** files that can be stepped through, in display order */
  items: AssetItem[];
  /** path of the file being shown; null closes the preview */
  path: string | null;
  onPathChange: (path: string | null) => void;
  /** picker: label and handler for choosing the shown file */
  onUse?: (item: AssetItem) => void;
}

export default function AssetPreview({
  items,
  path,
  onPathChange,
  onUse,
  ...h
}: AssetPreviewProps) {
  const index = path === null ? -1 : items.findIndex((i) => i.path === path);
  const item = index >= 0 ? items[index] : null;
  const prev = index > 0 ? items[index - 1] : null;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;

  // the file was deleted, renamed or filtered away while open
  useEffect(() => {
    if (path !== null && index === -1) onPathChange(null);
  }, [path, index, onPathChange]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // leave the keys alone while typing or scrubbing a player
      if (target?.closest("input, textarea, audio, video, [role=dialog] [role=dialog]")) {
        return;
      }
      if (e.key === "ArrowLeft" && prev) onPathChange(prev.path);
      if (e.key === "ArrowRight" && next) onPathChange(next.path);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, prev, next, onPathChange]);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onPathChange(null)}>
      <DialogContent className="flex h-dvh max-h-dvh w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:h-[92dvh] sm:max-w-[min(76rem,96vw)]">
        {item && (
          <>
            <div className="flex items-center gap-2 border-b py-2 pl-3 pr-12">
              <AssetKindIcon kind={item.kind} className="size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base font-semibold leading-tight">
                  {item.name}
                </DialogTitle>
                <DialogDescription className="truncate text-xs">
                  {ASSET_KIND_LABELS[item.kind]} · {formatBytes(item.size)}
                  {items.length > 1 && ` · ${index + 1} of ${items.length}`}
                </DialogDescription>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/40">
                <PreviewBody item={item} />
                {prev && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-1/2 size-10 -translate-y-1/2 rounded-full opacity-80 shadow hover:opacity-100"
                    onClick={() => onPathChange(prev.path)}
                    aria-label="Previous file"
                  >
                    <ChevronLeft />
                  </Button>
                )}
                {next && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-1/2 size-10 -translate-y-1/2 rounded-full opacity-80 shadow hover:opacity-100"
                    onClick={() => onPathChange(next.path)}
                    aria-label="Next file"
                  >
                    <ChevronRight />
                  </Button>
                )}
              </div>

              <aside className="flex max-h-[42%] shrink-0 flex-col border-t md:max-h-none md:w-80 md:border-l md:border-t-0">
                <div className="flex flex-wrap gap-2 border-b p-3">
                  {onUse && (
                    <Button type="button" className="w-full" onClick={() => onUse(item)}>
                      <Check /> Use this file
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={assetDownloadUrl(item.url)} download={item.name}>
                      <Download /> Download
                    </a>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => h.onCopyUrl(item)}>
                    <Copy /> Copy URL
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <ExternalLink /> Open
                    </a>
                  </Button>
                  {item.kind === "audio" && (
                    <Button type="button" variant="outline" size="sm" onClick={() => h.onAddToPlaylist(item)}>
                      <ListMusic /> Playlist
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => h.onRename(item)}>
                    <Pencil /> Rename
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => h.onMove(item)}>
                    <FolderInput /> Move
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => h.onReplace(item)}>
                    <RefreshCcw /> Replace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => h.onDelete(item)}
                  >
                    <Trash2 /> Delete
                  </Button>
                </div>
                <dl className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                  <Detail label="Location">/{item.path}</Detail>
                  <Detail label="Modified">
                    {format(item.mtime, "d MMM yyyy, HH:mm")}
                  </Detail>
                  <Detail label="URL">
                    <code className="text-xs">{item.url}</code>
                  </Detail>
                  <UsedBy item={item} />
                </dl>
              </aside>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
