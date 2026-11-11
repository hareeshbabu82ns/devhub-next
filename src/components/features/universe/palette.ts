import type { UniverseNode, UniverseNodeKind } from "@/lib/ai/rag/universe";

/**
 * Colours and labels of the Universe view. The hues are one categorical
 * set, stepped per theme so they stay distinct on both backgrounds; kind is
 * also carried by size and position, never by colour alone.
 */

export const NODE_KINDS: UniverseNodeKind[] = [
  "container",
  "verse",
  "character",
  "concept",
  "state",
  "place",
  "event",
];

export const KIND_LABEL: Record<UniverseNodeKind, string> = {
  container: "Books & chapters",
  verse: "Verses",
  character: "Characters",
  concept: "Concepts",
  state: "States of mind",
  place: "Places",
  event: "Events",
};

export const KIND_NAME: Record<UniverseNodeKind, string> = {
  container: "Section",
  verse: "Verse",
  character: "Character",
  concept: "Concept",
  state: "State of mind",
  place: "Place",
  event: "Event",
};

const KIND_HEX: Record<"dark" | "light", Record<UniverseNodeKind, string>> = {
  dark: {
    container: "#e3a44b",
    verse: "#8d95a3",
    character: "#3987e5",
    concept: "#199e70",
    state: "#d55181",
    place: "#9085e9",
    event: "#d95926",
  },
  light: {
    container: "#b4690e",
    verse: "#7b8494",
    character: "#2a78d6",
    concept: "#12936a",
    state: "#d1467a",
    place: "#6250d6",
    event: "#d95926",
  },
};

export const kindColor = (kind: UniverseNodeKind, dark: boolean) =>
  KIND_HEX[dark ? "dark" : "light"][kind];

const CATEGORICAL = {
  dark: [
    "#3987e5",
    "#d95926",
    "#199e70",
    "#c98500",
    "#d55181",
    "#4caf50",
    "#9085e9",
    "#e66767",
  ],
  light: [
    "#2a78d6",
    "#eb6834",
    "#12936a",
    "#c98500",
    "#d1467a",
    "#2e8b2e",
    "#6250d6",
    "#e34948",
  ],
};
export const NEUTRAL = { dark: "#6f7682", light: "#9aa1ad" };

/** The n-th categorical hue; past the eighth everything shares a neutral tone. */
export const categoricalColor = (index: number | undefined, dark: boolean) => {
  const theme = dark ? "dark" : "light";
  return index !== undefined && index >= 0 && index < CATEGORICAL[theme].length
    ? CATEGORICAL[theme][index]
    : NEUTRAL[theme];
};

/** Relative size of a node's sphere (its volume). */
export const nodeSize = (node: UniverseNode) => {
  switch (node.kind) {
    case "container":
      return node.depth === 0 ? 60 : node.depth === 1 ? 22 : 9;
    case "verse":
      return 1.4;
    default:
      return Math.min(40, 4 + Math.sqrt(node.count ?? 1) * 2.2);
  }
};

export const isConceptKind = (kind: UniverseNodeKind) =>
  kind !== "container" && kind !== "verse";
