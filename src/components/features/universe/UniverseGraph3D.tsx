"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import type { UniverseLink, UniverseNode } from "@/lib/ai/rag/universe";
import {
  type Emphasis,
  LINK_FAMILY,
  type LinkFamily,
  linkKey,
} from "@/lib/ai/rag/graph-utils";
import { isConceptKind, KIND_NAME, nodeSize } from "./palette";

type NodeData = { id: string; data: UniverseNode };
type LinkData = {
  key: string;
  type: UniverseLink["type"];
  family: LinkFamily;
  weight: number;
};
type GNode = NodeObject<NodeData>;
type GLink = LinkObject<NodeData, LinkData>;

const REL_SIZE = 3.2;
const radiusOf = (node: UniverseNode) => Math.cbrt(nodeSize(node)) * REL_SIZE;

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

const withAlpha = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/** Distance and pull of each kind of link in the force layout. */
const linkDistance = (link: GLink) => {
  switch (link.family) {
    case "structure": {
      const target = (link.target as GNode).data ?? null;
      return target?.kind === "verse" ? 16 : 70;
    }
    case "reading":
      return 7;
    case "relations":
      return 45;
    default:
      return 80;
  }
};

export interface UniverseGraph3DProps {
  nodes: UniverseNode[];
  links: UniverseLink[];
  colorOf: (node: UniverseNode) => string;
  emphasis: Emphasis | null;
  selectedId: string | null;
  /** fly the camera to this node; `at` makes a repeated request distinct */
  flyTo: { id: string; at: number } | null;
  dark: boolean;
  onSelect: (id: string | null) => void;
}

/**
 * The 3D canvas: a force-directed layout where chapters gather their
 * verses, and characters and concepts are pulled between the chapters that
 * mention them. Rotate by dragging, zoom by pinching or scrolling, select
 * by tapping.
 */
export default function UniverseGraph3D({
  nodes,
  links,
  colorOf,
  emphasis,
  selectedId,
  flyTo,
  dark,
  onSelect,
}: UniverseGraph3DProps) {
  const fgRef = useRef<ForceGraphMethods<GNode, GLink> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [coarse] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
  );
  // node objects are reused across filters so the layout does not restart
  const nodeCache = useRef(new Map<string, GNode>());
  const fitted = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        w: Math.max(200, Math.floor(entry.contentRect.width)),
        h: Math.max(200, Math.floor(entry.contentRect.height)),
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const data = useMemo(() => {
    const graphNodes = nodes.map((node) => {
      let cached = nodeCache.current.get(node.id);
      if (!cached) {
        cached = { id: node.id, data: node };
        nodeCache.current.set(node.id, cached);
      }
      cached.data = node;
      return cached;
    });
    const graphLinks: GLink[] = links.map((link) => ({
      source: link.source,
      target: link.target,
      key: linkKey(link),
      type: link.type,
      family: LINK_FAMILY[link.type],
      weight: link.weight,
    }));
    return { nodes: graphNodes, links: graphLinks };
  }, [nodes, links]);

  // what carries a name: the outline of the book and its most mentioned
  // ideas; with a selection, the things it lights up instead
  const labelled = useMemo(() => {
    const ids = new Set<string>();
    if (emphasis && emphasis.nodes.size <= 60) {
      for (const node of nodes) {
        if (
          emphasis.nodes.has(node.id) &&
          (node.kind !== "verse" || emphasis.path)
        ) {
          ids.add(node.id);
        }
      }
      return ids;
    }
    const budget = coarse ? 30 : 70;
    const containers = nodes.filter((n) => n.kind === "container");
    const maxDepth = containers.length <= budget ? 99 : 1;
    for (const n of containers) if ((n.depth ?? 0) <= maxDepth) ids.add(n.id);
    nodes
      .filter((n) => isConceptKind(n.kind))
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, budget)
      .forEach((n) => ids.add(n.id));
    return ids;
  }, [nodes, emphasis, coarse]);

  // the canvas is mounted once its box has been measured
  const ready = size.w > 0;

  const maxWeight = useMemo(
    () =>
      Math.max(
        1,
        ...links.map((l) =>
          LINK_FAMILY[l.type] === "mentions" ? l.weight : 1,
        ),
      ),
    [links],
  );

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || data.nodes.length === 0) return;
    const link = fg.d3Force("link") as unknown as {
      distance: (fn: (l: GLink) => number) => {
        strength: (fn: (l: GLink) => number) => void;
      };
    };
    link?.distance(linkDistance).strength((l: GLink) => {
      switch (l.family) {
        case "structure":
          return 0.8;
        case "reading":
          return 0.25;
        case "relations":
          return 0.08;
        default:
          return 0.015 + 0.06 * Math.min(1, l.weight / maxWeight);
      }
    });
    (
      fg.d3Force("charge") as unknown as {
        strength: (n: number) => { distanceMax: (n: number) => void };
      }
    )
      ?.strength(-38)
      .distanceMax(500);
    fg.d3ReheatSimulation();
  }, [data, maxWeight, ready]);

  // high-density phone screens cost fill rate; cap the pixel ratio
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.renderer().setPixelRatio(
      Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1),
    );
  }, [coarse, ready]);

  useEffect(() => {
    if (!flyTo) return;
    const fg = fgRef.current;
    const node = nodeCache.current.get(flyTo.id);
    if (!fg || !node || node.x === undefined) return;
    const { x = 0, y = 0, z = 0 } = node;
    const distance = 90 + radiusOf(node.data) * 8;
    const length = Math.hypot(x, y, z);
    const position =
      length < 1
        ? { x: 0, y: 0, z: distance }
        : {
            x: x * (1 + distance / length),
            y: y * (1 + distance / length),
            z: z * (1 + distance / length),
          };
    fg.cameraPosition(position, { x, y, z }, 900);
  }, [flyTo]);

  const dim = dark ? 0.1 : 0.14;
  const nodeColor = useCallback(
    (node: GNode) => {
      const color = colorOf(node.data);
      if (emphasis && !emphasis.nodes.has(node.id))
        return withAlpha(color, dim);
      return color;
    },
    [colorOf, emphasis, dim],
  );

  const labelColor = dark ? "#ece8e1" : "#26231f";
  const strokeColor = dark ? "#0d0c0b" : "#f7f6f3";
  const nodeThreeObject = useCallback(
    (node: GNode) => {
      if (!labelled.has(node.id)) return undefined as unknown as SpriteText;
      const d = node.data;
      const text = d.label.length > 28 ? `${d.label.slice(0, 27)}…` : d.label;
      const height =
        d.kind === "container"
          ? d.depth === 0
            ? 9
            : d.depth === 1
              ? 6.5
              : 4.5
          : d.kind === "verse"
            ? 3
            : 5;
      const sprite = new SpriteText(
        text,
        height * (coarse ? 1.25 : 1),
        labelColor,
      );
      sprite.fontWeight =
        d.kind === "container" || node.id === selectedId ? "600" : "500";
      sprite.strokeWidth = 0.8;
      sprite.strokeColor = strokeColor;
      sprite.material.depthWrite = false;
      sprite.position.y = radiusOf(d) + height * 0.9;
      return sprite;
    },
    [labelled, labelColor, strokeColor, coarse, selectedId],
  );

  const edge = dark ? "#b9b2a6" : "#5b564e";
  const accent = dark ? "#f0b65a" : "#a85c06";
  const linkColor = useCallback(
    (link: GLink) => {
      if (emphasis) {
        return emphasis.links.has(link.key)
          ? withAlpha(accent, 0.9)
          : withAlpha(edge, 0.03);
      }
      switch (link.family) {
        case "structure":
          return withAlpha(edge, 0.3);
        case "relations":
          return withAlpha(accent, 0.55);
        case "reading":
          return withAlpha(edge, 0.18);
        default:
          return withAlpha(
            edge,
            0.05 + 0.2 * Math.min(1, link.weight / maxWeight),
          );
      }
    },
    [emphasis, accent, edge, maxWeight],
  );
  const onPath = useCallback(
    (link: GLink) => !!emphasis?.path && emphasis.links.has(link.key),
    [emphasis],
  );
  const linkWidth = useCallback(
    (link: GLink) => (onPath(link) ? 1.4 : 0),
    [onPath],
  );
  const linkParticles = useCallback(
    (link: GLink) => (onPath(link) ? 3 : 0),
    [onPath],
  );

  const nodeLabel = useCallback((node: GNode) => {
    const d = node.data;
    const kind =
      d.kind === "container" || d.kind === "verse"
        ? ""
        : `${KIND_NAME[d.kind]} · `;
    const detail =
      d.kind === "verse"
        ? d.description || d.original || ""
        : d.description || "";
    return `<div style="max-width:260px;padding:6px 8px;border-radius:6px;background:rgba(20,18,16,.92);color:#f2efe9;font:13px/1.35 system-ui">
      <strong>${escapeHtml(kind + (d.kind === "verse" ? `Verse ${d.label}` : d.label))}</strong>
      ${detail ? `<div style="opacity:.8;margin-top:2px">${escapeHtml(detail.slice(0, 140))}</div>` : ""}
    </div>`;
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none overflow-hidden">
      {ready && (
        <ForceGraph3D<NodeData, LinkData>
          ref={fgRef}
          width={size.w}
          height={size.h}
          graphData={data}
          backgroundColor={dark ? "#0d0c0b" : "#f7f6f3"}
          showNavInfo={false}
          controlType="orbit"
          rendererConfig={{
            antialias: !coarse,
            alpha: false,
            powerPreference: "default",
          }}
          enableNodeDrag={false}
          nodeRelSize={REL_SIZE}
          nodeVal={(node: GNode) => nodeSize(node.data)}
          nodeResolution={coarse ? 8 : 12}
          nodeOpacity={1}
          nodeColor={nodeColor}
          nodeLabel={coarse ? undefined : nodeLabel}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend
          linkColor={linkColor}
          linkOpacity={1}
          linkWidth={linkWidth}
          linkDirectionalParticles={linkParticles}
          linkDirectionalParticleWidth={1.6}
          linkDirectionalParticleSpeed={0.008}
          warmupTicks={coarse ? 20 : 40}
          cooldownTicks={220}
          cooldownTime={12000}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.35}
          onEngineStop={() => {
            if (fitted.current) return;
            fitted.current = true;
            fgRef.current?.zoomToFit(700, 60);
          }}
          onNodeClick={(node: GNode) => onSelect(String(node.id))}
          onBackgroundClick={() => onSelect(null)}
        />
      )}
    </div>
  );
}
