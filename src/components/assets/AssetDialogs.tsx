"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, CornerLeftUp, Home, Loader2 } from "lucide-react";
import { getAssetUsage, listAssets } from "@/app/(app)/assets/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AssetItem,
  AssetUsage,
  parentAssetPath,
  validateAssetName,
} from "@/lib/assets/shared";
import { AssetKindIcon } from "./asset-icons";

/** Records that point at the given assets (or anything inside them). */
export function useAssetUsage(paths: string[], enabled = true) {
  return useQuery({
    queryKey: ["assets", "usage", paths],
    enabled: enabled && paths.length > 0,
    queryFn: async (): Promise<AssetUsage> => {
      const res = await getAssetUsage(paths);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}

//********** New folder / rename **********//

export function AssetNameDialog({
  open,
  onOpenChange,
  title,
  description,
  initialName,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  initialName: string;
  submitLabel: string;
  /** return an error message to keep the dialog open */
  onSubmit: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // the dialog may sit inside another form
    const invalid = validateAssetName(name);
    if (invalid) return setError(invalid);
    setPending(true);
    const failure = await onSubmit(name.trim());
    setPending(false);
    if (failure) setError(failure);
    else onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] rounded-lg sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription className="break-all">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-1.5">
            <Input
              autoFocus
              value={name}
              aria-label="Name"
              aria-invalid={!!error}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onFocus={(e) => {
                // preselect the name without its extension
                const dot = e.target.value.lastIndexOf(".");
                e.target.setSelectionRange(
                  0,
                  dot > 0 ? dot : e.target.value.length,
                );
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

//********** Move **********//

export function AssetMoveDialog({
  items,
  onOpenChange,
  onMove,
}: {
  /** null closes the dialog */
  items: AssetItem[] | null;
  onOpenChange: (open: boolean) => void;
  onMove: (destination: string) => Promise<void>;
}) {
  const open = !!items && items.length > 0;
  const [folder, setFolder] = useState("");
  const [pending, setPending] = useState(false);
  const sourceFolder = items?.[0] ? parentAssetPath(items[0].path) : "";

  useEffect(() => {
    if (open) setFolder(sourceFolder);
  }, [open, sourceFolder]);

  const { data, isPending, error } = useQuery({
    queryKey: ["assets", "list", folder],
    enabled: open,
    queryFn: async () => {
      const res = await listAssets(folder);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const moving = new Set(items?.map((i) => i.path));
  const folders = (data?.items ?? [])
    .filter((i) => i.isDirectory)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  // nothing to do when every item already lives in the chosen folder
  const unchanged = !!items?.every((i) => parentAssetPath(i.path) === folder);
  const label =
    items?.length === 1 ? `"${items[0].name}"` : `${items?.length} items`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] max-w-[calc(100vw-2rem)] flex-col rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {label}</DialogTitle>
          <DialogDescription className="break-all">
            To: /{folder}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-48 flex-1 flex-col gap-1 overflow-y-auto rounded-md border p-1">
          {folder && (
            <button
              type="button"
              onClick={() => setFolder(parentAssetPath(folder))}
              className="flex items-center gap-3 rounded p-2.5 text-left text-sm hover:bg-accent"
            >
              {parentAssetPath(folder) ? (
                <CornerLeftUp className="size-5 text-muted-foreground" />
              ) : (
                <Home className="size-5 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">
                Up to /{parentAssetPath(folder)}
              </span>
            </button>
          )}
          {isPending ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="p-3 text-sm text-destructive">{error.message}</p>
          ) : folders.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              No folders in here.
            </p>
          ) : (
            folders.map((f) => (
              <button
                key={f.path}
                type="button"
                disabled={moving.has(f.path)}
                onClick={() => setFolder(f.path)}
                className="flex items-center gap-3 rounded p-2.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
              >
                <AssetKindIcon kind="folder" className="size-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || unchanged || !!error}
            onClick={async () => {
              setPending(true);
              await onMove(folder);
              setPending(false);
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

//********** Delete **********//

export function AssetDeleteDialog({
  items,
  onOpenChange,
  onDelete,
}: {
  /** null closes the dialog */
  items: AssetItem[] | null;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void>;
}) {
  const open = !!items && items.length > 0;
  const [pending, setPending] = useState(false);
  const usage = useAssetUsage(items?.map((i) => i.path) ?? [], open);
  const hasFolder = !!items?.some((i) => i.isDirectory);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-lg sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete{" "}
            {items?.length === 1 ? `"${items[0].name}"` : `${items?.length} items`}
            ?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 break-words text-left text-sm text-muted-foreground">
              <p>
                {hasFolder
                  ? "Folders are deleted with everything inside them. "
                  : ""}
                This cannot be undone.
              </p>
              {usage.isPending && open && <p>Checking where it is used…</p>}
              {usage.error && (
                <p className="text-destructive">
                  Could not check where this is used: {usage.error.message}
                </p>
              )}
              {usage.data && usage.data.total > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-foreground">
                  <p className="font-medium">
                    Still used by {usage.data.total}{" "}
                    {usage.data.total === 1 ? "record" : "records"}. Their
                    image or audio will break.
                  </p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {usage.data.refs.slice(0, 5).map((r) => (
                      <li key={`${r.model}-${r.id}-${r.field}`}>{r.title}</li>
                    ))}
                    {usage.data.total > 5 && (
                      <li>and {usage.data.total - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await onDelete();
              setPending(false);
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
