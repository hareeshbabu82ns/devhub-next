"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Route, Sparkles, Telescope, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UniverseNode } from "@/lib/ai/rag/universe";
import { LINK_VERB, type Neighbour } from "@/lib/ai/rag/graph-utils";
import { entityTypeLabel } from "@/lib/entity-types";
import { isConceptKind, KIND_NAME } from "./palette";

const GROUP_PREVIEW = 6;

interface UniverseInspectorProps {
  node: UniverseNode;
  neighbours: Neighbour[];
  nodeById: Map<string, UniverseNode>;
  /** the scope currently shown, so "explore inside" is not offered for it */
  scopeId: string | null;
  colorOf: (node: UniverseNode) => string;
  onSelect: (id: string) => void;
  onExplore: (id: string) => void;
  onAsk: (question: string) => void;
  onPathFrom: (id: string) => void;
  onClose: () => void;
}

const titleOf = (node: UniverseNode, nodeById: Map<string, UniverseNode>) =>
  node.kind === "verse"
    ? `${(node.parentId && nodeById.get(node.parentId)?.label) || "Verse"} · ${node.label}`
    : node.label;

/**
 * What a selected node is and what it touches, grouped by relation. A card
 * over the bottom of the graph on phones, a side card on wider screens.
 */
export default function UniverseInspector({
  node,
  neighbours,
  nodeById,
  scopeId,
  colorOf,
  onSelect,
  onExplore,
  onAsk,
  onPathFrom,
  onClose,
}: UniverseInspectorProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const groups = useMemo(() => {
    const out = new Map<
      string,
      { other: UniverseNode; weight: number; note?: string }[]
    >();
    for (const n of neighbours) {
      const other = nodeById.get(n.id);
      if (!other || n.link.type === "NEXT") continue;
      const heading =
        n.link.type === "RELATED"
          ? n.outgoing
            ? (n.link.label ?? "related to")
            : `← ${n.link.label ?? "related to"}`
          : LINK_VERB[n.link.type][n.outgoing ? 0 : 1];
      const list = out.get(heading) ?? [];
      list.push({
        other,
        weight: n.link.weight,
        note: n.link.type === "RELATED" ? undefined : n.link.label,
      });
      out.set(heading, list);
    }
    for (const list of out.values()) {
      list.sort(
        (a, b) =>
          b.weight - a.weight || (b.other.count ?? 0) - (a.other.count ?? 0),
      );
    }
    return [...out.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [neighbours, nodeById]);

  const title = titleOf(node, nodeById);
  const isConcept = isConceptKind(node.kind);
  const kindLine =
    node.kind === "container" || node.kind === "verse"
      ? entityTypeLabel(node.entityType ?? "") || KIND_NAME[node.kind]
      : KIND_NAME[node.kind];
  const entityHref =
    node.kind === "verse" && node.parentId
      ? `/entities/${node.parentId}/child/${node.id}`
      : node.kind === "container"
        ? `/entities/${node.id}`
        : null;

  return (
    <section
      aria-label={`Details of ${title}`}
      className="absolute inset-x-2 bottom-2 z-10 flex max-h-[46%] flex-col rounded-lg border bg-background/95 shadow-lg backdrop-blur md:inset-x-auto md:bottom-3 md:left-3 md:max-h-[calc(100%-5rem)] md:w-80"
    >
      <header className="flex items-start gap-2 p-3 pb-2">
        <span
          className="mt-1.5 size-3 shrink-0 rounded-full"
          style={{ backgroundColor: colorOf(node) }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {kindLine}
            {node.count ? ` · ${node.count} mentions here` : ""}
          </p>
          <h2 className="break-words font-semibold leading-snug">
            {title}
            {isConcept && node.original && (
              <span className="ml-2 font-normal text-muted-foreground">
                {node.original}
              </span>
            )}
          </h2>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="-mr-1 -mt-1 size-10 shrink-0"
          aria-label="Close details"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 text-sm">
        {node.kind === "verse" && node.original && (
          <p className="mb-1 whitespace-pre-line">{node.original}</p>
        )}
        {node.description && (
          <p className="text-muted-foreground">{node.description}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          {entityHref && (
            <Button variant="outline" size="sm" className="h-10" asChild>
              <Link href={entityHref}>
                <ArrowUpRight className="size-4" />
                Open
              </Link>
            </Button>
          )}
          {node.kind === "container" && node.id !== scopeId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => onExplore(node.id)}
            >
              <Telescope className="size-4" />
              Explore inside
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() =>
              onAsk(
                node.kind === "verse"
                  ? `Explain ${title} and how it connects to the rest.`
                  : `What does this text say about ${node.label}?`,
              )
            }
          >
            <Sparkles className="size-4" />
            Ask
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => onPathFrom(node.id)}
          >
            <Route className="size-4" />
            Path from here
          </Button>
        </div>

        {groups.map(([heading, list]) => {
          const open = expanded === heading;
          const shown = open ? list : list.slice(0, GROUP_PREVIEW);
          return (
            <div key={heading} className="mt-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {heading} · {list.length}
              </h3>
              <ul className="mt-1 flex flex-col">
                {shown.map(({ other, weight, note }) => (
                  <li key={other.id}>
                    <button
                      type="button"
                      className="flex min-h-10 w-full items-start gap-2 rounded-md px-1 py-1.5 text-left hover:bg-accent"
                      onClick={() => onSelect(other.id)}
                    >
                      <span
                        className="mt-1.5 size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorOf(other) }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words">
                          {titleOf(other, nodeById)}
                          {weight > 1 && (
                            <span className="text-muted-foreground">
                              {" "}
                              ×{weight}
                            </span>
                          )}
                        </span>
                        {note && (
                          <span className="block break-words text-xs text-muted-foreground">
                            {note}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {list.length > GROUP_PREVIEW && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-1 text-muted-foreground"
                  onClick={() => setExpanded(open ? null : heading)}
                >
                  {open ? "Show fewer" : `Show all ${list.length}`}
                </Button>
              )}
            </div>
          );
        })}
        {groups.length === 0 && (
          <p className="mt-3 text-muted-foreground">
            Nothing is connected to this at the current filters.
          </p>
        )}
      </div>
    </section>
  );
}
