"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { useLocalStorage } from "usehooks-ts";
import { toast } from "sonner";
import {
  ArrowDownAZ,
  Check,
  ChevronRight,
  CornerLeftUp,
  Eye,
  FolderInput,
  FolderPlus,
  Home,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  Search,
  SquareCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createAssetFolder,
  deleteAssets,
  listAssets,
  moveAssets,
  renameAsset,
  searchAssets,
} from "@/app/(app)/assets/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useDebounce } from "@/hooks/use-debounce";
import { useAudioQueueDispatch } from "@/hooks/use-audio-queue";
import {
  AssetItem,
  AssetKind,
  ASSET_KIND_LABELS,
  acceptAttribute,
  assetExt,
  assetKindFromName,
  assetPathFromUrl,
  formatBytes,
  normalizeAssetPath,
  parentAssetPath,
} from "@/lib/assets/shared";
import { cn } from "@/lib/utils";
import {
  AssetDeleteDialog,
  AssetMoveDialog,
  AssetNameDialog,
} from "./AssetDialogs";
import AssetPreview from "./AssetPreview";
import { AssetGridTile, AssetItemHandlers, AssetListRow } from "./AssetTile";
import { useAssetUpload } from "./use-asset-upload";

type SortKey = "name" | "mtime" | "size" | "kind";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "list";

const FILTERS: { key: string; label: string; kinds: AssetKind[] | null }[] = [
  { key: "all", label: "All", kinds: null },
  { key: "image", label: "Images", kinds: ["image"] },
  { key: "audio", label: "Audio", kinds: ["audio"] },
  { key: "video", label: "Video", kinds: ["video"] },
  { key: "docs", label: "Documents", kinds: ["pdf", "text"] },
  { key: "other", label: "Other", kinds: ["archive", "other"] },
];

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  mtime: "Date modified",
  size: "Size",
  kind: "Type",
};

/** How many items are rendered before "Show more". */
const PAGE_SIZE = 120;

const byName = (a: AssetItem, b: AssetItem) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

export interface AssetBrowserProps {
  /** folder being shown, relative to the uploads root */
  path: string;
  onPathChange: (path: string) => void;
  /** "manage": the Assets page. "pick": choosing a file for a form field. */
  mode?: "manage" | "pick";
  /** pick mode: kinds of file that may be chosen (default: any) */
  accept?: AssetKind[];
  /** pick mode: URL currently stored in the field */
  currentUrl?: string;
  onPick?: (item: AssetItem) => void;
  /**
   * "page": the page scrolls and the toolbar sticks to the top.
   * "contained": the file area scrolls inside a fixed-height parent.
   */
  scroll?: "page" | "contained";
  className?: string;
}

export default function AssetBrowser({
  path: rawPath,
  onPathChange,
  mode = "manage",
  accept,
  currentUrl,
  onPick,
  scroll = "page",
  className,
}: AssetBrowserProps) {
  const path = normalizeAssetPath(rawPath);
  const picking = mode === "pick";
  const queryClient = useQueryClient();
  const dispatchPlaylist = useAudioQueueDispatch();

  const [view, setView] = useLocalStorage<ViewMode>("assets.view", "grid", {
    initializeWithValue: false,
  });
  const [sort, setSort] = useLocalStorage<{ key: SortKey; dir: SortDir }>(
    "assets.sort",
    { key: "name", dir: "asc" },
    { initializeWithValue: false },
  );

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);
  const searching = debouncedQuery.length >= 2;
  const [filterKey, setFilterKey] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<AssetItem | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const [nameDialog, setNameDialog] = useState<
    { type: "create" } | { type: "rename"; item: AssetItem } | null
  >(null);
  const [moveItems, setMoveItems] = useState<AssetItem[] | null>(null);
  const [deleteItems, setDeleteItems] = useState<AssetItem[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<AssetItem | null>(null);
  const crumbsRef = useRef<HTMLDivElement>(null);

  const uploads = useAssetUpload();

  //********** Data **********//

  const listQuery = useQuery({
    queryKey: ["assets", "list", path],
    queryFn: async () => {
      const res = await listAssets(path);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const searchQuery = useQuery({
    queryKey: ["assets", "search", path, debouncedQuery],
    enabled: searching,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await searchAssets(path, debouncedQuery);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
    [queryClient],
  );

  // a new folder or search starts from a clean slate
  useEffect(() => {
    setLimit(PAGE_SIZE);
    setSelected(new Set());
    setSelecting(false);
  }, [path, debouncedQuery]);

  useEffect(() => {
    setPicked(null);
    setQuery("");
    const el = crumbsRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [path]);

  const allowedKinds = useMemo(() => {
    if (picking && accept?.length) return new Set<AssetKind>(accept);
    const kinds = FILTERS.find((f) => f.key === filterKey)?.kinds;
    return kinds ? new Set<AssetKind>(kinds) : null;
  }, [picking, accept, filterKey]);

  const source = searching ? searchQuery.data?.items : listQuery.data?.items;
  const items = useMemo(() => {
    const dirFactor = sort.dir === "asc" ? 1 : -1;
    return (source ?? [])
      .filter((i) => i.isDirectory || !allowedKinds || allowedKinds.has(i.kind))
      .sort((a, b) => {
        // folders always come first
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        let cmp = 0;
        if (sort.key === "mtime") cmp = a.mtime - b.mtime;
        else if (sort.key === "size") cmp = a.size - b.size;
        else if (sort.key === "kind") cmp = a.ext.localeCompare(b.ext);
        return (cmp || byName(a, b)) * dirFactor;
      });
  }, [source, allowedKinds, sort]);

  const files = useMemo(() => items.filter((i) => !i.isDirectory), [items]);
  const visible = items.slice(0, limit);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const selectedItems = items.filter((i) => selected.has(i.path));
  const currentPath = assetPathFromUrl(currentUrl);

  const loading = searching
    ? searchQuery.isPending
    : listQuery.isPending;
  const error = searching ? searchQuery.error : listQuery.error;
  const fetching = listQuery.isFetching || searchQuery.isFetching;

  //********** Uploading **********//

  const startUpload = useCallback(
    (incoming: File[]) => {
      let accepted = incoming;
      if (picking && accept?.length) {
        accepted = incoming.filter((f) => accept.includes(assetKindFromName(f.name)));
        const rejected = incoming.length - accepted.length;
        if (rejected) {
          toast.error(
            `${rejected} file${rejected === 1 ? "" : "s"} skipped: only ${accept
              .map((k) => ASSET_KIND_LABELS[k].toLowerCase())
              .join(", ")} can be chosen here`,
          );
        }
      }
      if (accepted.length === 0) return;
      uploads.upload(accepted, path).then((stored) => {
        // in a picker, a single fresh upload is almost always the one wanted
        if (picking && stored.length === 1) setPicked(stored[0]);
      });
    },
    [picking, accept, uploads, path],
  );

  const { getRootProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: startUpload,
  });

  const onPaste = (e: React.ClipboardEvent) => {
    const pasted = Array.from(e.clipboardData.files);
    if (pasted.length === 0) return;
    e.preventDefault();
    startUpload(pasted);
  };

  const onReplaceChosen = async (file: File | undefined) => {
    const target = replaceTarget.current;
    if (!file || !target) return;
    if (assetExt(file.name) !== target.ext) {
      toast.error(
        `Choose a .${target.ext || "?"} file: replacing keeps the name "${target.name}"`,
      );
      return;
    }
    const renamed = new File([file], target.name, { type: file.type });
    const stored = await uploads.upload([renamed], parentAssetPath(target.path), {
      overwrite: true,
    });
    if (stored.length) toast.success(`Replaced "${target.name}"`);
  };

  //********** Item actions **********//

  const navigate = useCallback(
    (to: string) => onPathChange(normalizeAssetPath(to)),
    [onPathChange],
  );

  const toggleSelect = useCallback((item: AssetItem) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(item.path)) next.add(item.path);
      return next;
    });
  }, []);

  const handlers: AssetItemHandlers = {
    onOpen: (item) => {
      if (selecting || selected.size > 0) toggleSelect(item);
      else if (item.isDirectory) navigate(item.path);
      else if (picking) setPicked(item);
      else setPreviewPath(item.path);
    },
    onActivate: (item) => {
      if (picking && !item.isDirectory) onPick?.(item);
    },
    onPreview: (item) => {
      if (item.isDirectory) navigate(item.path);
      else setPreviewPath(item.path);
    },
    onCopyUrl: async (item) => {
      try {
        await navigator.clipboard.writeText(item.url);
        toast.success("URL copied");
      } catch {
        toast.error("Could not copy. The URL is shown in the file details.");
      }
    },
    onAddToPlaylist: (item) => {
      dispatchPlaylist({
        type: "enqueue",
        tracks: [
          {
            id: item.path,
            title: item.name,
            subtitle: parentAssetPath(item.path) || undefined,
            src: item.url,
          },
        ],
      });
      toast.success("Added to the queue");
    },
    onRename: (item) => setNameDialog({ type: "rename", item }),
    onReplace: (item) => {
      replaceTarget.current = item;
      replaceInputRef.current?.click();
    },
    onMove: (item) => setMoveItems([item]),
    onDelete: (item) => setDeleteItems([item]),
    onToggleSelect: picking ? undefined : toggleSelect,
    onReveal: searching
      ? (item) => {
          setQuery("");
          navigate(parentAssetPath(item.path));
        }
      : undefined,
  };

  const relinkedNote = (n: number) =>
    n > 0 ? ` · ${n} reference${n === 1 ? "" : "s"} updated` : "";

  const submitName = async (name: string): Promise<string | null> => {
    if (!nameDialog) return null;
    if (nameDialog.type === "create") {
      const res = await createAssetFolder(path, name);
      if (!res.ok) return res.error;
      toast.success(`Folder "${name}" created`);
    } else {
      const res = await renameAsset(nameDialog.item.path, name);
      if (!res.ok) return res.error;
      toast.success(`Renamed to "${name}"${relinkedNote(res.data.relinked)}`);
      if (picked?.path === nameDialog.item.path) setPicked(res.data.item);
    }
    await refresh();
    return null;
  };

  const reportBulk = (
    verb: string,
    outcome: { done: number; relinked: number; failed: { path: string; error: string }[] },
  ) => {
    if (outcome.done) {
      toast.success(
        `${verb} ${outcome.done} item${outcome.done === 1 ? "" : "s"}${relinkedNote(outcome.relinked)}`,
      );
    }
    for (const f of outcome.failed.slice(0, 3)) {
      toast.error(`${f.path.split("/").pop()}: ${f.error}`);
    }
    if (outcome.failed.length > 3) {
      toast.error(`${outcome.failed.length - 3} more could not be changed`);
    }
  };

  const submitMove = async (destination: string) => {
    if (!moveItems) return;
    const res = await moveAssets(
      moveItems.map((i) => i.path),
      destination,
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    reportBulk("Moved", res.data);
    setMoveItems(null);
    setSelected(new Set());
    setSelecting(false);
    setPicked(null);
    await refresh();
  };

  const submitDelete = async () => {
    if (!deleteItems) return;
    const res = await deleteAssets(deleteItems.map((i) => i.path));
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    reportBulk("Deleted", res.data);
    setDeleteItems(null);
    setSelected(new Set());
    setSelecting(false);
    setPicked(null);
    await refresh();
  };

  //********** Render **********//

  const segments = path ? path.split("/") : [];
  const contained = scroll === "contained";
  const itemProps = (item: AssetItem) => ({
    ...handlers,
    item,
    selecting: selecting || selected.size > 0,
    selected: selected.has(item.path),
    picked: picked?.path === item.path,
    current: !!currentPath && currentPath === item.path,
    showFolder: searching,
  });

  const pendingUploads = uploads.tasks.filter(
    (t) => t.status === "queued" || t.status === "uploading",
  ).length;

  return (
    <div
      {...getRootProps({
        onPaste,
        className: cn(
          "relative flex min-h-0 flex-1 flex-col outline-none",
          contained && "overflow-hidden",
          className,
        ),
      })}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        accept={picking ? acceptAttribute(accept) : undefined}
        onChange={(e) => {
          startUpload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        hidden
        onChange={(e) => {
          onReplaceChosen(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Toolbar */}
      <div
        className={cn(
          "z-10 flex flex-col gap-2 border-b bg-background pb-2",
          !contained && "sticky top-14 pt-2",
        )}
      >
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            disabled={!path}
            onClick={() => navigate(parentAssetPath(path))}
            aria-label="Up one folder"
          >
            <CornerLeftUp />
          </Button>
          <nav
            ref={crumbsRef}
            aria-label="Folder path"
            className="flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none]"
          >
            <button
              type="button"
              onClick={() => navigate("")}
              className={cn(
                "flex items-center gap-1.5 rounded px-1.5 py-1.5 hover:bg-accent",
                segments.length === 0 && "font-semibold",
              )}
            >
              <Home className="size-4" /> Assets
            </button>
            {segments.map((segment, i) => (
              <span key={i} className="flex items-center">
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => navigate(segments.slice(0, i + 1).join("/"))}
                  className={cn(
                    "rounded px-1.5 py-1.5 hover:bg-accent",
                    i === segments.length - 1 && "font-semibold",
                  )}
                >
                  {segment}
                </button>
              </span>
            ))}
          </nav>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
            <span className="max-sm:sr-only">Upload</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setNameDialog({ type: "create" })}
            aria-label="New folder"
            title="New folder"
          >
            <FolderPlus />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={path ? "Search this folder and below" : "Search all assets"}
              aria-label="Search assets by name"
              className="h-9 px-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label={`Sort: ${SORT_LABELS[sort.key]}`}
                title="Sort"
              >
                <ArrowDownAZ />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sort.key}
                onValueChange={(key) =>
                  setSort({
                    key: key as SortKey,
                    // newest and largest first is what people want from those
                    dir: key === "mtime" || key === "size" ? "desc" : "asc",
                  })
                }
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <DropdownMenuRadioItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sort.dir}
                onValueChange={(dir) => setSort({ ...sort, dir: dir as SortDir })}
              >
                <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            aria-label={view === "grid" ? "Show as list" : "Show as grid"}
            title={view === "grid" ? "Show as list" : "Show as grid"}
          >
            {view === "grid" ? <List /> : <LayoutGrid />}
          </Button>
          {!picking && (
            <Button
              type="button"
              variant={selecting ? "secondary" : "outline"}
              size="icon"
              className="shrink-0"
              aria-pressed={selecting}
              onClick={() => {
                setSelecting(!selecting);
                if (selecting) setSelected(new Set());
              }}
              aria-label="Select several items"
              title="Select several items"
            >
              <SquareCheck />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={refresh}
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={cn(fetching && "animate-spin")} />
          </Button>
        </div>

        {!(picking && accept?.length) && (
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filterKey === f.key}
                onClick={() => setFilterKey(f.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                  filterKey === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Uploads in progress and their results */}
      {uploads.tasks.length > 0 && (
        <div className="mt-2 rounded-md border bg-card text-sm">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
            <span className="font-medium">
              {pendingUploads > 0
                ? `Uploading ${pendingUploads} file${pendingUploads === 1 ? "" : "s"}…`
                : "Uploads"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7"
              disabled={uploads.tasks.length === pendingUploads}
              onClick={uploads.clearFinished}
            >
              Clear finished
            </Button>
          </div>
          <ul className="max-h-40 divide-y overflow-y-auto">
            {uploads.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate">{t.name}</div>
                  {t.status === "uploading" || t.status === "queued" ? (
                    <Progress value={t.progress} className="mt-1 h-1.5" />
                  ) : (
                    <div
                      className={cn(
                        "truncate text-xs",
                        t.status === "error"
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {t.status === "done" &&
                        (t.item && t.item.name !== t.name
                          ? `Saved as ${t.item.name}`
                          : `Uploaded · ${formatBytes(t.size)}`)}
                      {t.status === "error" && t.error}
                      {t.status === "cancelled" && "Cancelled"}
                    </div>
                  )}
                </div>
                {(t.status === "uploading" || t.status === "queued") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => uploads.cancel(t.id)}
                    aria-label={`Cancel upload of ${t.name}`}
                  >
                    <X />
                  </Button>
                )}
                {t.status === "done" && (
                  <Check className="size-4 shrink-0 text-emerald-600" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Files */}
      <div className={cn("flex-1 py-3", contained && "min-h-0 overflow-y-auto")}>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-destructive">{error.message}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={refresh}>
                Try again
              </Button>
              {path && (
                <Button type="button" variant="outline" size="sm" onClick={() => navigate("")}>
                  Go to Assets
                </Button>
              )}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
            {searching ? (
              <>
                <p className="font-medium">Nothing named “{debouncedQuery}”</p>
                <p className="text-sm text-muted-foreground">
                  {path
                    ? "Searched this folder and the folders inside it."
                    : "Searched all assets."}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </>
            ) : (source?.length ?? 0) > 0 ? (
              <>
                <p className="font-medium">No files of this type here</p>
                {!picking && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setFilterKey("all")}>
                    Show all files
                  </Button>
                )}
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <p className="font-medium">This folder is empty</p>
                <p className="text-sm text-muted-foreground">
                  Drop files here, paste an image, or use Upload.
                </p>
                <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload /> Upload files
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {view === "grid" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
                {visible.map((item) => (
                  <AssetGridTile key={item.path} {...itemProps(item)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {visible.map((item) => (
                  <AssetListRow key={item.path} {...itemProps(item)} />
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-col items-center gap-2 text-xs text-muted-foreground">
              {items.length > limit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLimit(limit + PAGE_SIZE)}
                >
                  Show more ({items.length - limit} left)
                </Button>
              )}
              <p>
                {items.length} item{items.length === 1 ? "" : "s"}
                {files.length > 0 && ` · ${formatBytes(totalSize)}`}
                {searching &&
                  searchQuery.data?.truncated &&
                  " · more matches exist; refine the search"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Multi-select actions */}
      {selected.size > 0 && (
        <div className={cn("z-20 pb-2", !contained && "sticky bottom-2")}>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2 shadow-lg">
            <span className="px-1 text-sm font-medium">
              {selected.size} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set(items.map((i) => i.path)))}
            >
              Select all
            </Button>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setMoveItems(selectedItems)}>
                <FolderInput /> Move
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteItems(selectedItems)}
              >
                <Trash2 /> Delete
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => {
                  setSelected(new Set());
                  setSelecting(false);
                }}
                aria-label="Clear selection"
              >
                <X />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Picker footer */}
      {picking && (
        <div className="flex items-center gap-2 border-t pt-3">
          <p className="min-w-0 flex-1 truncate text-sm">
            {picked ? (
              <span className="font-medium">{picked.name}</span>
            ) : (
              <span className="text-muted-foreground">
                Tap a file to choose it
              </span>
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={!picked}
            onClick={() => picked && setPreviewPath(picked.path)}
          >
            <Eye />
            <span className="max-sm:sr-only">Preview</span>
          </Button>
          <Button
            type="button"
            disabled={!picked}
            onClick={() => picked && onPick?.(picked)}
          >
            <Check /> Use file
          </Button>
        </div>
      )}

      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[1px]">
          <p className="rounded-md bg-background px-4 py-2 text-sm font-medium shadow">
            Drop to upload to /{path}
          </p>
        </div>
      )}

      <AssetPreview
        items={files}
        path={previewPath}
        onPathChange={setPreviewPath}
        onUse={picking ? (item) => onPick?.(item) : undefined}
        onCopyUrl={handlers.onCopyUrl}
        onAddToPlaylist={handlers.onAddToPlaylist}
        onRename={handlers.onRename}
        onReplace={handlers.onReplace}
        onMove={handlers.onMove}
        onDelete={handlers.onDelete}
      />
      <AssetNameDialog
        open={!!nameDialog}
        onOpenChange={(open) => !open && setNameDialog(null)}
        title={nameDialog?.type === "rename" ? "Rename" : "New folder"}
        description={
          nameDialog?.type === "rename"
            ? "Records that use this file are updated to the new name."
            : `In /${path}`
        }
        initialName={nameDialog?.type === "rename" ? nameDialog.item.name : "New folder"}
        submitLabel={nameDialog?.type === "rename" ? "Rename" : "Create"}
        onSubmit={submitName}
      />
      <AssetMoveDialog
        items={moveItems}
        onOpenChange={(open) => !open && setMoveItems(null)}
        onMove={submitMove}
      />
      <AssetDeleteDialog
        items={deleteItems}
        onOpenChange={(open) => !open && setDeleteItems(null)}
        onDelete={submitDelete}
      />
    </div>
  );
}
