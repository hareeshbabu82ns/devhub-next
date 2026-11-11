"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES_DDLB } from "@/lib/constants";
import { entityChildTypes, entityTypeLabel } from "@/lib/entity-types";
import {
  splitVerses,
  stripVerseNumbers,
  VerseSplitMode,
} from "@/lib/entity-text";
import {
  useLanguageAtomValue,
  useMeaningLanguageAtomValue,
} from "@/hooks/use-config";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";
import { addChildEntities } from "../actions";

const SPLIT_MODES: { value: VerseSplitMode; label: string }[] = [
  { value: "auto", label: "Auto detect" },
  { value: "blank-line", label: "Blank line between items" },
  { value: "verse-end", label: "After each ॥ / ||" },
  { value: "line", label: "One item per line" },
  { value: "none", label: "Single item" },
];

const PREVIEW_LIMIT = 200;

interface EntityQuickAddProps {
  parent: { id: string; type: string; title?: string };
  /** Number of children the parent already has; used to number the preview. */
  existingCount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Adds many children to an entity from one pasted block of text — a whole
 * stotram becomes its verses in a single step.
 */
export default function EntityQuickAdd({
  parent,
  existingCount = 0,
  open,
  onOpenChange,
}: EntityQuickAddProps) {
  const displayLanguage = useLanguageAtomValue();
  const displayMeaningLanguage = useMeaningLanguageAtomValue();
  const invalidateEntities = useInvalidateEntities();

  const childTypes = entityChildTypes(parent.type);
  const [type, setType] = useState<string>(childTypes[0] ?? "");
  const [language, setLanguage] = useState(displayLanguage);
  const [raw, setRaw] = useState("");
  // Containers (chapters, stotrams under a deity) are usually pasted as a
  // list of titles; leaf content (verses) is detected from its separators.
  const isLeafType = entityChildTypes(type).length === 0;
  const [splitModeChoice, setSplitModeChoice] = useState<VerseSplitMode | null>(
    null,
  );
  const splitMode: VerseSplitMode =
    splitModeChoice ?? (isLeafType ? "auto" : "line");
  const [stripNumbers, setStripNumbers] = useState(false);
  const [withMeanings, setWithMeanings] = useState(false);
  const [meaningRaw, setMeaningRaw] = useState("");
  const [meaningLanguage, setMeaningLanguage] = useState(
    displayMeaningLanguage || "ENG",
  );

  const items = useMemo(() => {
    const verses = splitVerses(raw, splitMode);
    return stripNumbers ? verses.map(stripVerseNumbers) : verses;
  }, [raw, splitMode, stripNumbers]);

  const meanings = useMemo(
    () => (withMeanings ? splitVerses(meaningRaw, splitMode) : []),
    [withMeanings, meaningRaw, splitMode],
  );
  const meaningMismatch =
    meanings.length > 0 && meanings.length !== items.length;

  const { mutate: addItems, isPending } = useMutation({
    mutationFn: () =>
      addChildEntities({
        parentId: parent.id,
        type,
        language,
        meaningLanguage,
        items: items.map((text, i) => ({ text, meaning: meanings[i] })),
      }),
    onSuccess: async (res) => {
      if (res.status === "error") {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Added ${res.data.created} ${entityTypeLabel(type)}${res.data.created > 1 ? " items" : ""}`,
      );
      setRaw("");
      setMeaningRaw("");
      await invalidateEntities();
      onOpenChange(false);
    },
    onError: () => toast.error("Could not add the content"),
  });

  const canSubmit =
    !!type && items.length > 0 && !meaningMismatch && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl max-h-[92vh] overflow-y-auto"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
            e.preventDefault();
            addItems();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            Add content{parent.title ? ` to ${parent.title}` : ""}
          </DialogTitle>
          <DialogDescription>
            Paste or type the text in one language. It is split into items and
            the other scripts are generated automatically.
          </DialogDescription>
        </DialogHeader>

        {childTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {entityTypeLabel(parent.type)} cannot contain other content.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 min-w-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quick-add-type">Add as</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="quick-add-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {childTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {entityTypeLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quick-add-language">Text is in</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="quick-add-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES_DDLB.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quick-add-text">Text</Label>
                <Textarea
                  id="quick-add-text"
                  autoFocus
                  className="min-h-56 font-mono"
                  placeholder={
                    isLeafType
                      ? "Paste all the verses here…"
                      : "One title per line…"
                  }
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quick-add-split">Split</Label>
                  <Select
                    value={splitMode}
                    onValueChange={(v) =>
                      setSplitModeChoice(v as VerseSplitMode)
                    }
                  >
                    <SelectTrigger id="quick-add-split">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPLIT_MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    id="quick-add-strip"
                    checked={stripNumbers}
                    onCheckedChange={setStripNumbers}
                  />
                  <Label htmlFor="quick-add-strip">Remove verse numbers</Label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="quick-add-meanings"
                  checked={withMeanings}
                  onCheckedChange={setWithMeanings}
                />
                <Label htmlFor="quick-add-meanings">Add meanings too</Label>
              </div>
              {withMeanings && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="quick-add-meaning-text">
                      Meanings, in the same order
                    </Label>
                    <Select
                      value={meaningLanguage}
                      onValueChange={setMeaningLanguage}
                    >
                      <SelectTrigger
                        className="w-36"
                        aria-label="Meaning language"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES_DDLB.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    id="quick-add-meaning-text"
                    className="min-h-32"
                    placeholder="Paste the meanings, separated the same way as the text…"
                    value={meaningRaw}
                    onChange={(e) => setMeaningRaw(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center justify-between">
                <Label>Preview</Label>
                <span className="text-sm text-muted-foreground">
                  {items.length === 0
                    ? "Nothing to add yet"
                    : `${items.length} item${items.length > 1 ? "s" : ""}, numbered from ${existingCount + 1}`}
                </span>
              </div>
              {meaningMismatch && (
                <p className="text-sm text-destructive" role="alert">
                  {items.length} text items but {meanings.length} meanings.
                  They must match one to one — check the separators.
                </p>
              )}
              <ol className="flex-1 min-h-40 max-h-[55vh] overflow-y-auto rounded-md border divide-y">
                {items.slice(0, PREVIEW_LIMIT).map((item, i) => (
                  <li key={i} className="flex gap-3 px-3 py-2 text-sm">
                    <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
                      {existingCount + i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap break-words">
                        {item.replace(/ {2}\n/g, "\n")}
                      </p>
                      {meanings[i] && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                          {meanings[i].replace(/ {2}\n/g, "\n")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
                {items.length > PREVIEW_LIMIT && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    …and {items.length - PREVIEW_LIMIT} more
                  </li>
                )}
              </ol>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="link" className="px-0" asChild>
            <Link href={`/entities/new?parent=${parent.id}`}>
              Use the full form instead
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={() => addItems()}
              title="Ctrl/⌘ + Enter"
            >
              {isPending
                ? "Adding…"
                : items.length > 0
                  ? `Add ${items.length}`
                  : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
