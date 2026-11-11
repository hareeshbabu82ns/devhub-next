"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import WebIMEIde from "@/app/(app)/sanscript/_components/WebIMEIde";
import {
  LANGUAGE_TO_TRANSLITERATION_DDLB,
  LANGUAGES_DDLB,
} from "@/lib/constants";
import { entityTypeLabel } from "@/lib/entity-types";
import { isSyncScriptLanguage } from "@/lib/entity-text";
import { EntityWithRelations, LanguageValueInput } from "@/lib/types";
import {
  useLanguageAtomValue,
  useMeaningLanguageAtomValue,
} from "@/hooks/use-config";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";
import { moveEntity, readEntity, updateEntityContent } from "../actions";

interface EntityQuickEditProps {
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edits the text, meaning and position of one entity in place, without
 * leaving the list it is shown in.
 */
export default function EntityQuickEdit({
  entityId,
  open,
  onOpenChange,
}: EntityQuickEditProps) {
  const language = useLanguageAtomValue();

  const { data: entity, isLoading, error } = useQuery({
    queryKey: ["entity", entityId, language, "quick-edit"],
    queryFn: () => readEntity(entityId, language),
    enabled: open && !!entityId,
    staleTime: 0,
    gcTime: 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {entity ? entityTypeLabel(entity.type) : ""}
          </DialogTitle>
          <DialogDescription>
            Change the text, its meaning or its position.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <Loader />}
        {error && <SimpleAlert title={error.message} />}
        {entity && (
          <QuickEditForm
            key={entity.id}
            entity={entity}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const valueFor = (data: LanguageValueInput[] | undefined, language: string) =>
  data?.find((t) => t.language === language)?.value ?? "";

/** The display language if the entity has it, otherwise one it does have. */
const initialLanguage = (
  data: LanguageValueInput[] | undefined,
  preferred: string,
) =>
  valueFor(data, preferred) || !data?.length ? preferred : data[0].language;

function LanguageSelect({
  value,
  onChange,
  data,
  label,
}: {
  value: string;
  onChange: (language: string) => void;
  data?: LanguageValueInput[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES_DDLB.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
            {valueFor(data, l.value) ? " •" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function QuickEditForm({
  entity,
  onDone,
}: {
  entity: EntityWithRelations;
  onDone: () => void;
}) {
  const displayLanguage = useLanguageAtomValue();
  const displayMeaningLanguage = useMeaningLanguageAtomValue();
  const invalidateEntities = useInvalidateEntities();

  const [textLanguage, setTextLanguage] = useState(() =>
    initialLanguage(entity.textData, displayLanguage),
  );
  const [text, setText] = useState(() =>
    valueFor(entity.textData, textLanguage),
  );
  const [meaningLanguage, setMeaningLanguage] = useState(() =>
    initialLanguage(entity.meaningData, displayMeaningLanguage || "ENG"),
  );
  const [meaning, setMeaning] = useState(() =>
    valueFor(entity.meaningData, meaningLanguage),
  );
  const [syncOtherScripts, setSyncOtherScripts] = useState(true);
  const currentPosition = (entity.order ?? 0) + 1;
  const [position, setPosition] = useState(String(currentPosition));

  const textChanged = text !== valueFor(entity.textData, textLanguage);
  const meaningChanged =
    meaning !== valueFor(entity.meaningData, meaningLanguage);
  const newPosition = Number.parseInt(position, 10);
  const positionValid = Number.isInteger(newPosition) && newPosition >= 1;
  const positionChanged = positionValid && newPosition !== currentPosition;
  const hasParent = (entity.parentsCount ?? 0) > 0;
  const canSave =
    (textChanged || meaningChanged || positionChanged) &&
    positionValid &&
    text.trim().length > 0;

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      if (textChanged || meaningChanged) {
        const res = await updateEntityContent(entity.id, {
          text: textChanged
            ? { language: textLanguage, value: text }
            : undefined,
          meaning: meaningChanged
            ? { language: meaningLanguage, value: meaning }
            : undefined,
          syncScripts: syncOtherScripts,
        });
        if (res.status === "error") return res;
      }
      if (positionChanged) {
        const res = await moveEntity(entity.id, newPosition - 1);
        if (res.status === "error") return res;
      }
      return { status: "success" as const };
    },
    onSuccess: async (res) => {
      // a partial save (text saved, move failed) must still refresh the list
      await invalidateEntities();
      if (res.status === "error") {
        toast.error(res.error);
        return;
      }
      toast.success("Saved");
      onDone();
    },
    onError: () => toast.error("Could not save"),
  });

  const usesIme = textLanguage in LANGUAGE_TO_TRANSLITERATION_DDLB;

  return (
    <div
      className="flex flex-col gap-4"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && (e.key === "Enter" || e.key === "s")) {
          e.preventDefault();
          if (canSave && !isPending) save();
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="quick-edit-text">Text</Label>
          <LanguageSelect
            label="Text language"
            value={textLanguage}
            data={entity.textData}
            onChange={(l) => {
              setTextLanguage(l);
              setText(valueFor(entity.textData, l));
            }}
          />
        </div>
        {usesIme ? (
          <WebIMEIde
            key={`quick-edit-ime-${textLanguage}`}
            id="quick-edit-text"
            className="min-h-40"
            language={textLanguage}
            enablePersistence={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        ) : (
          <Textarea
            id="quick-edit-text"
            className="min-h-40"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}
        {isSyncScriptLanguage(textLanguage) && (
          <div className="flex items-center gap-2">
            <Switch
              id="quick-edit-sync"
              checked={syncOtherScripts}
              onCheckedChange={setSyncOtherScripts}
            />
            <Label htmlFor="quick-edit-sync" className="font-normal">
              Update the other scripts (Sanskrit, Telugu, IAST, SLP1, ITRANS)
              from this text
            </Label>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="quick-edit-meaning">Meaning</Label>
          <LanguageSelect
            label="Meaning language"
            value={meaningLanguage}
            data={entity.meaningData}
            onChange={(l) => {
              setMeaningLanguage(l);
              setMeaning(valueFor(entity.meaningData, l));
            }}
          />
        </div>
        <Textarea
          id="quick-edit-meaning"
          className="min-h-28"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        {hasParent ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-edit-position">Position</Label>
            <Input
              id="quick-edit-position"
              type="number"
              min={1}
              className="w-28"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              aria-invalid={!positionValid}
            />
          </div>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="link" asChild>
            <Link href={`/entities/${entity.id}/edit`}>All fields</Link>
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave || isPending}
            onClick={() => save()}
            title="Ctrl/⌘ + S"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
