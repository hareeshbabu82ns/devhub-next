"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UniverseNode } from "@/lib/ai/rag/universe";
import { fold } from "@/lib/ai/rag/text";
import { KIND_NAME } from "./palette";

export type PickerEntry = { node: UniverseNode; title: string; search: string };

/** Display titles and search text for every node ("Chapter 2 · 47" for a verse). */
export const pickerEntries = (nodes: UniverseNode[]): PickerEntry[] => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return nodes.map((node) => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const title =
      node.kind === "verse"
        ? `${parent?.label ?? "Verse"} · ${node.label}`
        : node.label;
    return {
      node,
      title,
      search: fold(`${title} ${node.original ?? ""} ${node.description ?? ""}`),
    };
  });
};

interface UniverseNodePickerProps {
  entries: PickerEntry[];
  onPick: (id: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  colorOf: (node: UniverseNode) => string;
}

/** A search box over the nodes of the graph, opened from any button. */
export default function UniverseNodePicker({
  entries,
  onPick,
  children,
  placeholder = "Find a character, concept, chapter…",
  colorOf,
}: UniverseNodePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = fold(query.trim());
    const pool = q
      ? entries.filter((e) => e.search.includes(q))
      : // before typing: the most mentioned ideas, then the outline
        entries.filter((e) => e.node.kind !== "verse");
    return pool
      .map((e) => ({
        e,
        rank:
          (q && fold(e.title).startsWith(q) ? 1000 : 0) +
          (e.node.count ?? 0) +
          (e.node.kind === "container" ? 5 - (e.node.depth ?? 0) : 0),
      }))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 40)
      .map((r) => r.e);
  }, [entries, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex max-h-[min(60dvh,26rem)] w-[min(92vw,22rem)] flex-col gap-2 p-2"
      >
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 text-base md:text-sm"
        />
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {results.length === 0 && (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nothing on this graph matches.
            </li>
          )}
          {results.map(({ node, title }) => (
            <li key={node.id}>
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-11 w-full justify-start gap-2 whitespace-normal px-2 py-1.5 text-left"
                onClick={() => {
                  onPick(node.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorOf(node) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {KIND_NAME[node.kind]}
                    {node.count ? ` · ${node.count} mentions` : ""}
                  </span>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
