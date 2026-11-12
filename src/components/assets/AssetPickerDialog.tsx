"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AssetItem,
  AssetKind,
  ASSET_KIND_LABELS,
  assetPathFromUrl,
  parentAssetPath,
} from "@/lib/assets/shared";
import AssetBrowser from "./AssetBrowser";

export interface AssetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** kinds of file that may be chosen (default: any) */
  accept?: AssetKind[];
  /** URL currently in the field; the picker opens in its folder */
  value?: string;
  /** folder to open when the field has no asset yet */
  defaultFolder?: string;
  onSelect: (item: AssetItem) => void;
}

/** Full-screen on phones, a large dialog elsewhere. */
export default function AssetPickerDialog({
  open,
  onOpenChange,
  title = "Choose a file",
  accept,
  value,
  defaultFolder = "",
  onSelect,
}: AssetPickerDialogProps) {
  const [path, setPath] = useState(defaultFolder);

  // each time it opens, start where the current file lives
  useEffect(() => {
    if (!open) return;
    const current = assetPathFromUrl(value);
    setPath(current !== null ? parentAssetPath(current) : defaultFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-dvh max-h-dvh w-full max-w-none flex-col gap-3 p-3 sm:h-[90dvh] sm:max-w-[min(64rem,94vw)] sm:p-5">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {accept?.length
              ? `Showing ${accept.map((k) => ASSET_KIND_LABELS[k].toLowerCase()).join(", ")}. `
              : ""}
            Pick an existing file or upload a new one.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <AssetBrowser
            mode="pick"
            scroll="contained"
            path={path}
            onPathChange={setPath}
            accept={accept}
            currentUrl={value}
            onPick={(item) => {
              onSelect(item);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
