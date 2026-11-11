"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import {
  ChevronRight,
  Loader2,
  Route,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { AskSource } from "@/lib/ai/ask";
import type {
  UniverseGraph,
  UniverseNode,
  UniverseNodeKind,
} from "@/lib/ai/rag/universe";
import {
  buildAdjacency,
  type Emphasis,
  induced,
  LINK_FAMILY,
  LINK_FAMILY_LABEL,
  LINK_VERB,
  type LinkFamily,
  neighbourhood,
  pathEmphasis,
  type PathStep,
  resolveSources,
  shortestPath,
} from "@/lib/ai/rag/graph-utils";
import AskAIChat from "@/components/features/ai/AskAIChat";
import RagIndexTrigger from "@/components/features/ai/RagIndexTrigger";
import UniverseInspector from "./UniverseInspector";
import UniverseNodePicker, { pickerEntries } from "./UniverseNodePicker";
import {
  categoricalColor,
  KIND_LABEL,
  kindColor,
  NEUTRAL,
  NODE_KINDS,
} from "./palette";

const UniverseGraph3D = dynamic(() => import("./UniverseGraph3D"), {
  ssr: false,
  loading: () => <CanvasNote>Preparing the graph…</CanvasNote>,
});

function CanvasNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <div className="flex max-w-sm flex-col items-center gap-3">
        {children}
      </div>
    </div>
  );
}

type ColorBy = "kind" | "section" | "community";
const COLOR_BY_LABEL: Record<ColorBy, string> = {
  kind: "Type",
  section: "Section",
  community: "Cluster",
};

/** Deterministic random numbers, so cluster colours do not change between visits. */
const seededRandom = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const universeUrl = (scopeId: string | null) =>
  scopeId ? `/universe?scope=${scopeId}` : "/universe";

/**
 * The library as a graph you can walk through: books and chapters, the
 * verses inside them, and the characters, concepts, places and states of
 * mind the knowledge index found. Select a point to see what it touches,
 * trace a path between two ideas, or ask a question and watch where the
 * answer comes from.
 */
export default function UniverseView() {
  const router = useRouter();
  const params = useSearchParams();
  const scopeId = params.get("scope");
  const nodeParam = params.get("node");
  const highlightParam = params.get("hl");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  const isWide = useMediaQuery("(min-width: 1024px)");

  const {
    data: graph,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["universe", scopeId ?? "library"],
    queryFn: async () => {
      const response = await fetch(
        `/api/ai/universe${scopeId ? `?scopeId=${scopeId}` : ""}`,
      );
      const json = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(json?.error ?? "Could not load the graph");
      return json as UniverseGraph;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [kinds, setKinds] = useState<Record<UniverseNodeKind, boolean>>(
    () =>
      Object.fromEntries(NODE_KINDS.map((k) => [k, true])) as Record<
        UniverseNodeKind,
        boolean
      >,
  );
  const [families, setFamilies] = useState<Record<LinkFamily, boolean>>({
    structure: true,
    reading: false,
    mentions: true,
    relations: true,
  });
  const [colorBy, setColorBy] = useState<ColorBy>("kind");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ id: string; at: number } | null>(null);
  const [highlight, setHighlight] = useState<{
    ids: string[];
    label: string;
  } | null>(null);
  const [pathEnds, setPathEnds] = useState<{
    from: string | null;
    to: string | null;
  }>({
    from: null,
    to: null,
  });
  const [pathOpen, setPathOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState<{ text: string; at: number } | null>(null);

  // ── what is drawn ───────────────────────────────────────────────────────
  const nodes = useMemo(
    () => (graph?.nodes ?? []).filter((n) => kinds[n.kind]),
    [graph, kinds],
  );
  const links = useMemo(() => {
    const visible = new Set(nodes.map((n) => n.id));
    return (graph?.links ?? []).filter(
      (l) =>
        families[LINK_FAMILY[l.type]] &&
        visible.has(l.source) &&
        visible.has(l.target),
    );
  }, [graph, nodes, families]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const adjacency = useMemo(() => buildAdjacency(links), [links]);
  const entries = useMemo(() => pickerEntries(nodes), [nodes]);
  const kindCounts = useMemo(() => {
    const counts = new Map<UniverseNodeKind, number>();
    for (const n of graph?.nodes ?? [])
      counts.set(n.kind, (counts.get(n.kind) ?? 0) + 1);
    return counts;
  }, [graph]);

  // ── colour ──────────────────────────────────────────────────────────────
  const sectionIndex = useMemo(() => {
    const index = new Map<string, number>();
    for (const n of graph?.nodes ?? []) {
      if (n.group && !index.has(n.group)) index.set(n.group, index.size);
    }
    return index;
  }, [graph]);
  const communityIndex = useMemo(() => {
    if (colorBy !== "community" || nodes.length === 0) return null;
    const g = new Graph({ type: "undirected", multi: false });
    for (const n of nodes) g.addNode(n.id);
    for (const l of links) {
      if (l.type === "NEXT" || l.source === l.target) continue;
      if (g.hasEdge(l.source, l.target)) continue;
      g.addEdge(l.source, l.target, {
        weight: l.type === "CONTAINS" ? 0.5 : 1 + Math.log2(l.weight),
      });
    }
    const of = louvain(g, {
      getEdgeWeight: "weight",
      resolution: 1.1,
      rng: seededRandom(108),
    });
    const sizes = new Map<number, number>();
    for (const c of Object.values(of)) sizes.set(c, (sizes.get(c) ?? 0) + 1);
    const rank = new Map(
      [...sizes.entries()].sort((a, b) => b[1] - a[1]).map(([c], i) => [c, i]),
    );
    return new Map(
      Object.entries(of).map(([id, c]) => [id, rank.get(c) ?? 99]),
    );
  }, [colorBy, nodes, links]);

  const colorOf = useCallback(
    (node: UniverseNode) => {
      if (colorBy === "community" && communityIndex) {
        return categoricalColor(communityIndex.get(node.id), dark);
      }
      if (colorBy === "section") {
        return node.group
          ? categoricalColor(sectionIndex.get(node.group)! % 8, dark)
          : NEUTRAL[dark ? "dark" : "light"];
      }
      return kindColor(node.kind, dark);
    },
    [colorBy, communityIndex, sectionIndex, dark],
  );

  // ── emphasis: a path, else the selection, else an answer's sources ──────
  const path: PathStep[] | null = useMemo(
    () =>
      pathEnds.from &&
      pathEnds.to &&
      nodeById.has(pathEnds.from) &&
      nodeById.has(pathEnds.to)
        ? shortestPath(adjacency, pathEnds.from, pathEnds.to)
        : null,
    [pathEnds, adjacency, nodeById],
  );
  const emphasis: Emphasis | null = useMemo(() => {
    if (path) return pathEmphasis(path);
    if (selectedId && nodeById.has(selectedId))
      return neighbourhood(adjacency, selectedId);
    if (highlight && highlight.ids.length > 0)
      return induced(links, highlight.ids);
    return null;
  }, [path, selectedId, highlight, adjacency, links, nodeById]);

  const select = useCallback((id: string | null, fly = true) => {
    setSelectedId(id);
    if (id && fly) setFlyTo({ id, at: Date.now() });
  }, []);

  // arriving on a verse, a concept link or an answer's sources
  useEffect(() => {
    if (!graph) return;
    setSelectedId(null);
    setPathEnds({ from: null, to: null });
    const present = new Set(graph.nodes.map((n) => n.id));
    const target = [graph.focus, nodeParam].find(
      (id): id is string => !!id && present.has(id),
    );
    if (highlightParam) {
      const sources = highlightParam.split(",").map((entry) => {
        const [id, parentId] = entry.split("~");
        return { id, parentId };
      });
      const ids = resolveSources(graph, sources);
      setHighlight(
        ids.length > 0 ? { ids, label: "Sources of the answer" } : null,
      );
    } else {
      setHighlight(null);
    }
    if (!target) return;
    setSelectedId(target);
    // the layout needs a moment before the node has a place to fly to
    const timer = setTimeout(
      () => setFlyTo({ id: target, at: Date.now() }),
      2500,
    );
    return () => clearTimeout(timer);
  }, [graph, nodeParam, highlightParam]);

  const showSources = useCallback(
    (sources: AskSource[], byUser: boolean) => {
      if (!graph) return;
      const ids = resolveSources(graph, sources);
      setHighlight(
        ids.length > 0 ? { ids, label: "Sources of the answer" } : null,
      );
      setSelectedId(null);
      setPathEnds({ from: null, to: null });
      // on a phone the chat covers the graph: step aside when asked to show it
      if (byUser && !isWide) setChatOpen(false);
    },
    [graph, isWide],
  );

  const ask = (text: string) => {
    setDraft({ text, at: Date.now() });
    setChatOpen(true);
  };

  const explainPath = () => {
    if (!path) return;
    const title = (id: string) =>
      entries.find((e) => e.node.id === id)?.title ?? id;
    const hops = path
      .map((step, i) => {
        if (i === 0 || !step.via) return title(step.id);
        const verb =
          step.via.type === "RELATED"
            ? (step.via.label ?? "related to")
            : LINK_VERB[step.via.type][step.outgoing ? 0 : 1];
        return `—${verb}→ ${title(step.id)}`;
      })
      .join(" ");
    ask(
      `Explain how ${title(path[0].id)} leads to ${title(path[path.length - 1].id)} along this path: ${hops}`,
    );
  };

  const selected = selectedId ? nodeById.get(selectedId) : undefined;
  const scopeTitle = graph?.scope?.title ?? "Entire library";
  const hasConcepts = (graph?.stats.concepts ?? 0) > 0;

  const chat = (
    <AskAIChat
      scopeId={graph?.scope?.id ?? scopeId}
      scopeLabel={graph?.scope ? scopeTitle : undefined}
      onShowSources={showSources}
      draft={draft}
    />
  );

  return (
    <div className="flex h-[calc(100dvh_-_theme(spacing.24))] w-full min-w-0 flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <nav
          aria-label="Scope"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm"
        >
          <Link
            href="/universe"
            className={cn(
              "shrink-0 rounded px-1 py-2 hover:underline",
              !graph?.scope && "font-semibold",
            )}
          >
            Library
          </Link>
          {graph?.path.map((p) => (
            <span key={p.id} className="flex shrink-0 items-center gap-1">
              <ChevronRight
                className="size-3 text-muted-foreground"
                aria-hidden
              />
              <Link
                href={universeUrl(p.id)}
                className="rounded px-1 py-2 hover:underline"
              >
                {p.title}
              </Link>
            </span>
          ))}
          {graph?.scope && (
            <span className="flex shrink-0 items-center gap-1">
              <ChevronRight
                className="size-3 text-muted-foreground"
                aria-hidden
              />
              <span className="px-1 font-semibold">{scopeTitle}</span>
            </span>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <UniverseNodePicker
            entries={entries}
            colorOf={colorOf}
            onPick={(id) => {
              setPathEnds({ from: null, to: null });
              select(id);
            }}
          >
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-10"
              title="Find on the graph"
              aria-label="Find on the graph"
              disabled={!graph}
            >
              <Search className="size-4" />
            </Button>
          </UniverseNodePicker>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-10"
                title="Display"
                aria-label="Display"
                disabled={!graph}
              >
                <SlidersHorizontal className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="flex max-h-[70dvh] w-[min(92vw,20rem)] flex-col gap-4 overflow-y-auto text-sm"
            >
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Show
                </legend>
                {NODE_KINDS.filter((k) => kindCounts.has(k)).map((kind) => (
                  <label
                    key={kind}
                    className="flex min-h-10 items-center gap-3"
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: kindColor(kind, dark) }}
                      aria-hidden
                    />
                    <span className="flex-1">
                      {KIND_LABEL[kind]}
                      <span className="ml-1 text-muted-foreground">
                        {kindCounts.get(kind)}
                      </span>
                    </span>
                    <Switch
                      checked={kinds[kind]}
                      onCheckedChange={(on) =>
                        setKinds((k) => ({ ...k, [kind]: on }))
                      }
                      aria-label={`Show ${KIND_LABEL[kind]}`}
                    />
                  </label>
                ))}
              </fieldset>
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Connections
                </legend>
                {(Object.keys(LINK_FAMILY_LABEL) as LinkFamily[]).map(
                  (family) => (
                    <label
                      key={family}
                      className="flex min-h-10 items-center gap-3"
                    >
                      <span className="flex-1">
                        {LINK_FAMILY_LABEL[family]}
                      </span>
                      <Switch
                        checked={families[family]}
                        onCheckedChange={(on) =>
                          setFamilies((f) => ({ ...f, [family]: on }))
                        }
                        aria-label={`Show ${LINK_FAMILY_LABEL[family]}`}
                      />
                    </label>
                  ),
                )}
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Colour by
                </legend>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(COLOR_BY_LABEL) as ColorBy[]).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={colorBy === mode ? "secondary" : "outline"}
                      className="h-10"
                      aria-pressed={colorBy === mode}
                      onClick={() => setColorBy(mode)}
                    >
                      {COLOR_BY_LABEL[mode]}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {colorBy === "kind"
                    ? "Each kind of thing has its own colour."
                    : colorBy === "section"
                      ? "Chapters and verses take the colour of the part of the book they belong to."
                      : "Things that are closely connected share a colour, whatever their kind."}
                </p>
              </fieldset>
            </PopoverContent>
          </Popover>

          <Popover open={pathOpen} onOpenChange={setPathOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant={path ? "secondary" : "outline"}
                className="size-10"
                title="Find a path between two points"
                aria-label="Find a path between two points"
                disabled={!graph}
              >
                <Route className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="flex max-h-[70dvh] w-[min(92vw,22rem)] flex-col gap-3 overflow-y-auto text-sm"
            >
              <p className="text-muted-foreground">
                How does one idea lead to another? Pick two points and the
                shortest chain of connections between them is traced.
              </p>
              {(["from", "to"] as const).map((end) => {
                const id = pathEnds[end];
                const entry = id
                  ? entries.find((e) => e.node.id === id)
                  : undefined;
                return (
                  <UniverseNodePicker
                    key={end}
                    entries={entries}
                    colorOf={colorOf}
                    onPick={(picked) =>
                      setPathEnds((p) => ({ ...p, [end]: picked }))
                    }
                    placeholder={end === "from" ? "Start from…" : "Lead to…"}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 justify-start gap-2"
                    >
                      <span className="w-10 shrink-0 text-left text-xs uppercase text-muted-foreground">
                        {end}
                      </span>
                      <span className="truncate">
                        {entry?.title ?? "Choose…"}
                      </span>
                    </Button>
                  </UniverseNodePicker>
                );
              })}
              {pathEnds.from && pathEnds.to && !path && (
                <p role="status">
                  These two are not connected through what is shown. Turn on
                  more connections under Display, or build the knowledge graph
                  for more of the book.
                </p>
              )}
              {path && (
                <>
                  <ol className="flex flex-col">
                    {path.map((step, i) => {
                      const entry = entries.find((e) => e.node.id === step.id);
                      return (
                        <li key={step.id}>
                          {step.via && (
                            <p className="py-0.5 pl-5 text-xs text-muted-foreground">
                              ↓{" "}
                              {step.via.type === "RELATED"
                                ? (step.via.label ?? "related to")
                                : LINK_VERB[step.via.type][
                                    step.outgoing ? 0 : 1
                                  ]}
                            </p>
                          )}
                          <button
                            type="button"
                            className="flex min-h-10 w-full items-center gap-2 rounded-md px-1 text-left hover:bg-accent"
                            onClick={() =>
                              setFlyTo({ id: step.id, at: Date.now() })
                            }
                          >
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: entry
                                  ? colorOf(entry.node)
                                  : undefined,
                              }}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 break-words">
                              {i + 1}. {entry?.title ?? step.id}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                  <Button
                    type="button"
                    className="h-11"
                    onClick={() => {
                      setPathOpen(false);
                      explainPath();
                    }}
                  >
                    <Sparkles className="size-4" />
                    Ask AI to explain this path
                  </Button>
                </>
              )}
              {(pathEnds.from || pathEnds.to) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10"
                  onClick={() => setPathEnds({ from: null, to: null })}
                >
                  Clear
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <RagIndexTrigger
            scopeId={graph?.scope?.id ?? scopeId}
            scopeLabel={graph?.scope ? scopeTitle : undefined}
          />

          <Button
            type="button"
            variant={chatOpen ? "secondary" : "default"}
            className="h-10"
            aria-pressed={chatOpen}
            onClick={() => setChatOpen((open) => !open)}
          >
            <Sparkles className="size-4" />
            Ask
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border">
          {isLoading && (
            <CanvasNote>
              <Loader2 className="size-5 animate-spin" />
              Gathering {scopeId ? "this part of the library" : "the library"}…
            </CanvasNote>
          )}
          {error && (
            <CanvasNote>
              <p className="text-destructive" role="alert">
                {error.message}
              </p>
            </CanvasNote>
          )}
          {graph && nodes.length === 0 && (
            <CanvasNote>
              {graph.nodes.length === 0
                ? "There is nothing here to draw yet."
                : "Everything is hidden. Turn something back on under Display."}
            </CanvasNote>
          )}
          {graph && nodes.length > 0 && (
            <UniverseGraph3D
              key={graph.scope?.id ?? "library"}
              nodes={nodes}
              links={links}
              colorOf={colorOf}
              emphasis={emphasis}
              selectedId={selectedId}
              flyTo={flyTo}
              dark={dark}
              onSelect={(id) => select(id)}
            />
          )}

          {graph && (
            <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-col items-start gap-2">
              {(path || (highlight && !selectedId)) && (
                <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border bg-background/95 py-1 pl-3 pr-1 text-sm shadow backdrop-blur">
                  <span className="truncate">
                    {path
                      ? `Path · ${path.length - 1} step${path.length === 2 ? "" : "s"}`
                      : `${highlight!.label} · ${highlight!.ids.length} lit`}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-full"
                    aria-label="Clear the highlight"
                    onClick={() =>
                      path
                        ? setPathEnds({ from: null, to: null })
                        : setHighlight(null)
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}
              {!hasConcepts && (
                <p className="pointer-events-auto max-w-md rounded-lg border bg-background/95 p-3 text-sm shadow backdrop-blur">
                  Only the outline of{" "}
                  {graph.scope ? "this text" : "the library"} is shown. Build
                  its knowledge graph with the index button above to see its
                  characters and concepts and how they connect.
                </p>
              )}
              {hasConcepts &&
                graph.detail === "containers" &&
                !selected &&
                !emphasis && (
                  <p className="pointer-events-auto max-w-md rounded-lg border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow backdrop-blur">
                    {graph.stats.verses.toLocaleString()} verses are too many to
                    draw at once, so each chapter stands for its verses. Select
                    a chapter and choose “Explore inside” to see them.
                  </p>
                )}
            </div>
          )}

          {selected && (
            <UniverseInspector
              key={selected.id}
              node={selected}
              neighbours={adjacency.get(selected.id) ?? []}
              nodeById={nodeById}
              scopeId={graph?.scope?.id ?? null}
              colorOf={colorOf}
              onSelect={(id) => select(id)}
              onExplore={(id) => router.push(universeUrl(id))}
              onAsk={ask}
              onPathFrom={(id) => {
                setPathEnds({ from: id, to: null });
                setPathOpen(true);
              }}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>

        {isWide && chatOpen && (
          <aside
            aria-label="Ask AI"
            className="flex w-[26rem] shrink-0 flex-col rounded-lg border p-3"
          >
            {chat}
          </aside>
        )}
      </div>

      {!isWide && (
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-3 sm:max-w-xl"
          >
            <SheetHeader>
              <SheetTitle>Ask AI</SheetTitle>
              <SheetDescription className="sr-only">
                Ask a question; the passages and ideas behind the answer are lit
                up on the graph
              </SheetDescription>
            </SheetHeader>
            {chat}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
