"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Edge, Node } from "@xyflow/react";
import { CopyPlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  deleteEntityPlayground,
  listEntityPlaygrounds,
  readEntityPlayground,
  saveEntityPlayground,
} from "@/app/(app)/entities/playground-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GraphData } from "./results";
import SanscriptPlayGraph from "./sans-play-graph";
import { createSansPlayStore, SansPlayStoreContext } from "./sans-play-store";

const NEW = "new";

/** The verse as one line of text, ready to be fed to a tool */
const seedGraph = (text: string): GraphData => {
  const line = text.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!line) return { nodes: [], edges: [] };
  return {
    nodes: [
      {
        id: "entity-text",
        type: "textInput",
        position: { x: 0, y: 0 },
        data: { text: line },
        // selected, so the first tool added from the toolbar is fed by it
        selected: true,
      },
    ],
    edges: [],
  };
};

/**
 * The playground for one entity (normally a verse). Each line of analysis can
 * be saved as a named variation, reopened, changed and deleted.
 */
export default function EntityPlaygroundDialog({
  open,
  onOpenChange,
  entityId,
  text,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  /** Text of the entity, in the script the reader is using */
  text: string;
}) {
  // its own canvas: nothing here touches the Sanskrit utils page
  const [store] = useState(createSansPlayStore);
  const queryClient = useQueryClient();
  const queryKey = ["entityPlaygrounds", entityId];

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [graphKey, setGraphKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Canvas and title as last loaded or saved, to tell unsaved changes */
  const saved = useRef({ graph: "", title: "" });
  const started = useRef(false);

  const { data: variations, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await listEntityPlaygrounds(entityId);
      if (res.status === "error") throw new Error(res.error);
      return res.data;
    },
    enabled: open,
  });

  const canvas = useCallback(
    () => JSON.stringify(store.getState().snapshot()),
    [store],
  );
  const isDirty = () =>
    canvas() !== saved.current.graph || title !== saved.current.title;

  const show = useCallback(
    (graph: GraphData, id: string | null, name: string) => {
      store.getState().loadGraph(graph);
      saved.current = { graph: canvas(), title: name };
      setCurrentId(id);
      setTitle(name);
      setConfirmDelete(false);
      // a fresh canvas component, so the view fits what was loaded
      setGraphKey((key) => key + 1);
    },
    [store, canvas],
  );

  const startNew = useCallback(
    (count: number) => show(seedGraph(text), null, `Variation ${count + 1}`),
    [show, text],
  );

  const openVariation = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const res = await readEntityPlayground(id);
        if (res.status === "error") {
          toast.error(res.error);
          return false;
        }
        show(
          { nodes: res.data.nodes as Node[], edges: res.data.edges as Edge[] },
          res.data.id,
          res.data.title,
        );
        return true;
      } catch {
        toast.error("Could not open the variation");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [show],
  );

  // First time it opens: carry on with the latest variation, if there is one
  useEffect(() => {
    if (!open || started.current || !variations) return;
    started.current = true;
    if (variations.length === 0) {
      startNew(0);
      return;
    }
    openVariation(variations[0].id).then((opened) => {
      if (!opened) startNew(variations.length);
    });
  }, [open, variations, startNew, openVariation]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (asNew: boolean) =>
      saveEntityPlayground({
        id: asNew ? undefined : (currentId ?? undefined),
        entityId,
        title,
        ...store.getState().snapshot(),
      }),
    onSuccess: (res) => {
      if (res.status === "error") {
        toast.error(res.error);
        return;
      }
      saved.current = { graph: canvas(), title: res.data.title };
      setCurrentId(res.data.id);
      setTitle(res.data.title);
      toast.success(`Saved “${res.data.title}”`);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Could not save"),
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (id: string) => deleteEntityPlayground(id),
    onSuccess: (res) => {
      if (res.status === "error") {
        toast.error(res.error);
        setConfirmDelete(false);
        return;
      }
      toast.success("Variation deleted");
      const left = (variations ?? []).filter((v) => v.id !== res.data.id);
      startNew(left.length);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Could not delete"),
  });

  const switchTo = (value: string) => {
    if (
      isDirty() &&
      !window.confirm("Discard the unsaved changes to this variation?")
    ) {
      return;
    }
    if (value === NEW) startNew(variations?.length ?? 0);
    else openVariation(value);
  };

  const busy = loading || saving || removing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-dvh w-screen max-w-none flex-col gap-0 p-0 sm:rounded-none"
        // typing in a node must not be taken for a dialog shortcut
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Sanskrit playground</DialogTitle>
        <div className="flex flex-wrap items-center gap-2 border-b p-2 pr-12">
          <Select value={currentId ?? NEW} onValueChange={switchTo}>
            <SelectTrigger
              className="w-40 sm:w-52"
              aria-label="Saved variations"
              disabled={busy}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={NEW}>New variation</SelectItem>
              {variations && variations.length > 0 && <SelectSeparator />}
              {variations?.map((variation) => (
                <SelectItem key={variation.id} value={variation.id}>
                  {variation.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Name of this variation"
            aria-label="Name of this variation"
            maxLength={120}
            className="min-w-[8rem] flex-1 sm:max-w-xs"
          />
          <Button
            size="sm"
            onClick={() => save(false)}
            disabled={busy || !title.trim()}
            title={currentId ? "Save the changes" : "Save as a variation"}
          >
            <SaveIcon />
            Save
          </Button>
          {currentId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => save(true)}
                disabled={busy || !title.trim()}
                title="Save a copy as another variation"
              >
                <CopyPlusIcon />
                <span className="hidden sm:inline">Save as new</span>
              </Button>
              <Button
                variant={confirmDelete ? "destructive" : "outline"}
                size="sm"
                onClick={() =>
                  confirmDelete ? remove(currentId) : setConfirmDelete(true)
                }
                onBlur={() => setConfirmDelete(false)}
                disabled={busy}
                title="Delete this variation"
              >
                <Trash2Icon />
                <span className={confirmDelete ? "" : "hidden sm:inline"}>
                  {confirmDelete ? "Really delete?" : "Delete"}
                </span>
              </Button>
            </>
          )}
          {error && (
            <span className="text-xs text-destructive">{error.message}</span>
          )}
          {loading && (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
        </div>
        <SansPlayStoreContext.Provider value={store}>
          <SanscriptPlayGraph key={graphKey} className="min-h-0 flex-1" />
        </SansPlayStoreContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
