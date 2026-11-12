"use client";

import {
  Check,
  Copy,
  Download,
  Eye,
  FolderInput,
  FolderOpen,
  ListMusic,
  MoreVertical,
  Pencil,
  RefreshCcw,
  SquareCheck,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AssetItem,
  assetDownloadUrl,
  formatBytes,
  parentAssetPath,
} from "@/lib/assets/shared";
import { cn } from "@/lib/utils";
import { AssetKindIcon } from "./asset-icons";

export interface AssetItemHandlers {
  /** tap on the tile: open folder, preview/pick file, or toggle selection */
  onOpen: (item: AssetItem) => void;
  /** double click: in pick mode confirms the choice */
  onActivate?: (item: AssetItem) => void;
  onPreview: (item: AssetItem) => void;
  onCopyUrl: (item: AssetItem) => void;
  onAddToPlaylist: (item: AssetItem) => void;
  onRename: (item: AssetItem) => void;
  onReplace: (item: AssetItem) => void;
  onMove: (item: AssetItem) => void;
  onDelete: (item: AssetItem) => void;
  /** undefined when multi-select is not offered */
  onToggleSelect?: (item: AssetItem) => void;
  /** search results only: jump to the folder holding the item */
  onReveal?: (item: AssetItem) => void;
}

export interface AssetItemProps extends AssetItemHandlers {
  item: AssetItem;
  /** part of the multi-selection */
  selected?: boolean;
  /** multi-select is on: show checkboxes on every item */
  selecting?: boolean;
  /** the file chosen in a picker */
  picked?: boolean;
  /** the file the form field currently points to */
  current?: boolean;
  /** show the containing folder (search results) */
  showFolder?: boolean;
}

/** Small, cache-safe preview image for an image asset. */
export function assetThumbUrl(item: AssetItem, width: number) {
  return `${item.url}?w=${width}&v=${Math.round(item.mtime)}`;
}

function metaLine(item: AssetItem) {
  if (item.isDirectory) {
    const n = item.childCount ?? 0;
    return n === 1 ? "1 item" : `${n} items`;
  }
  return [item.ext.toUpperCase(), formatBytes(item.size)]
    .filter(Boolean)
    .join(" · ");
}

export function AssetActionsMenu({
  item,
  className,
  ...h
}: AssetItemProps & { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-9 shrink-0", className)}
          aria-label={`Actions for ${item.name}`}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {item.isDirectory ? (
          <DropdownMenuItem onSelect={() => h.onPreview(item)}>
            <FolderOpen /> Open
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => h.onPreview(item)}>
            <Eye /> Preview & details
          </DropdownMenuItem>
        )}
        {h.onReveal && (
          <DropdownMenuItem onSelect={() => h.onReveal!(item)}>
            <FolderOpen /> Show in folder
          </DropdownMenuItem>
        )}
        {h.onToggleSelect && (
          <DropdownMenuItem onSelect={() => h.onToggleSelect!(item)}>
            <SquareCheck /> {h.selected ? "Deselect" : "Select"}
          </DropdownMenuItem>
        )}
        {!item.isDirectory && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => h.onCopyUrl(item)}>
              <Copy /> Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={assetDownloadUrl(item.url)} download={item.name}>
                <Download /> Download
              </a>
            </DropdownMenuItem>
            {item.kind === "audio" && (
              <DropdownMenuItem onSelect={() => h.onAddToPlaylist(item)}>
                <ListMusic /> Add to playlist
              </DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => h.onRename(item)}>
          <Pencil /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => h.onMove(item)}>
          <FolderInput /> Move to…
        </DropdownMenuItem>
        {!item.isDirectory && (
          <DropdownMenuItem onSelect={() => h.onReplace(item)}>
            <RefreshCcw /> Replace file…
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => h.onDelete(item)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SelectBox({
  item,
  selected,
  onToggleSelect,
  className,
}: Pick<AssetItemProps, "item" | "selected" | "onToggleSelect"> & {
  className?: string;
}) {
  if (!onToggleSelect) return null;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!selected}
      aria-label={`Select ${item.name}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect(item);
      }}
      className={cn(
        "flex size-7 items-center justify-center rounded-md border bg-background/90 shadow-sm backdrop-blur-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary bg-primary text-primary-foreground",
        className,
      )}
    >
      {selected && <Check className="size-4" />}
    </button>
  );
}

export function AssetGridTile(props: AssetItemProps) {
  const { item, selected, selecting, picked, current } = props;
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md",
        (selected || picked) && "border-primary ring-2 ring-primary",
      )}
    >
      <button
        type="button"
        onClick={() => props.onOpen(item)}
        onDoubleClick={() => props.onActivate?.(item)}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={item.isDirectory ? `Open folder ${item.name}` : item.name}
      >
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted/40">
          {item.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetThumbUrl(item, 384)}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <AssetKindIcon kind={item.kind} className="size-12" strokeWidth={1.5} />
          )}
          {current && (
            <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              Current
            </span>
          )}
        </div>
        <div className="py-1.5 pl-2.5 pr-10">
          <div className="truncate text-sm font-medium" title={item.name}>
            {item.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {metaLine(item)}
          </div>
        </div>
      </button>
      <SelectBox
        {...props}
        className={cn(
          "absolute left-1.5 top-1.5",
          !selecting &&
            !selected &&
            "opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden",
        )}
      />
      <AssetActionsMenu {...props} className="absolute bottom-1 right-0.5" />
    </div>
  );
}

export function AssetListRow(props: AssetItemProps) {
  const { item, selected, selecting, picked, current, showFolder } = props;
  const folder = parentAssetPath(item.path);
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border bg-card pr-1",
        (selected || picked) && "border-primary ring-1 ring-primary",
      )}
    >
      {(selecting || selected) && (
        <SelectBox {...props} className="ml-2 shrink-0" />
      )}
      <button
        type="button"
        onClick={() => props.onOpen(item)}
        onDoubleClick={() => props.onActivate?.(item)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/40">
          {item.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetThumbUrl(item, 96)}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <AssetKindIcon kind={item.kind} className="size-6" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{item.name}</span>
            {current && (
              <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Current
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {metaLine(item)}
            <span className="max-sm:hidden">
              {" · "}
              {format(item.mtime, "d MMM yyyy, HH:mm")}
            </span>
            {showFolder && ` · in /${folder}`}
          </span>
        </span>
      </button>
      <AssetActionsMenu {...props} />
    </div>
  );
}
