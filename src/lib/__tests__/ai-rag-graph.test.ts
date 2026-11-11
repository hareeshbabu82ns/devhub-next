import {
  buildAdjacency,
  induced,
  linkKey,
  neighbourhood,
  pathEmphasis,
  resolveSources,
  shortestPath,
} from "../ai/rag/graph-utils";
import type { UniverseLink, UniverseNode } from "../ai/rag/universe";

const link = (
  source: string,
  target: string,
  type: UniverseLink["type"],
  label?: string,
): UniverseLink => ({ source, target, type, weight: 1, label });

// book ─ ch1 ─ v1 ─(mentions)─ rama ─(son of)─ dasharatha
//      └ ch2 ─ v2 ─(mentions)─ dasharatha
const links = [
  link("book", "ch1", "CONTAINS"),
  link("book", "ch2", "CONTAINS"),
  link("ch1", "v1", "CONTAINS"),
  link("ch2", "v2", "CONTAINS"),
  link("v1", "v2", "NEXT"),
  link("v1", "rama", "MENTIONS"),
  link("v2", "dasharatha", "MENTIONS"),
  link("rama", "dasharatha", "RELATED", "son of"),
];
const adjacency = buildAdjacency(links);

describe("neighbourhood", () => {
  it("is a node and what it touches directly", () => {
    const around = neighbourhood(adjacency, "rama");
    expect([...around.nodes].sort()).toEqual(["dasharatha", "rama", "v1"]);
    expect(around.links.has(linkKey(links[7]))).toBe(true);
    expect(around.path).toBe(false);
  });
});

describe("shortestPath", () => {
  it("prefers stated relations and mentions over the book's structure", () => {
    const path = shortestPath(adjacency, "v1", "v2", (f) => f !== "reading");
    expect(path?.map((s) => s.id)).toEqual(["v1", "rama", "dasharatha", "v2"]);
    expect(path?.[2].via?.label).toBe("son of");
  });

  it("uses reading order when that is the closest tie", () => {
    expect(shortestPath(adjacency, "v1", "v2")?.map((s) => s.id)).toEqual([
      "v1",
      "v2",
    ]);
  });

  it("falls back to structure, and reports when nothing connects", () => {
    const structural = shortestPath(
      adjacency,
      "v1",
      "v2",
      (f) => f === "structure",
    );
    expect(structural?.map((s) => s.id)).toEqual([
      "v1",
      "ch1",
      "book",
      "ch2",
      "v2",
    ]);
    expect(shortestPath(adjacency, "v1", "nowhere")).toBeNull();
    expect(shortestPath(adjacency, "v1", "v1")).toHaveLength(1);
  });

  it("turns into an emphasis of its nodes and links", () => {
    const path = shortestPath(adjacency, "rama", "v2", (f) => f !== "reading")!;
    const emphasis = pathEmphasis(path);
    expect(emphasis.path).toBe(true);
    expect(emphasis.nodes.size).toBe(3);
    expect(emphasis.links.size).toBe(2);
  });
});

describe("induced", () => {
  it("keeps the links between the chosen nodes, without reading order", () => {
    const sub = induced(links, ["v1", "v2", "rama"]);
    expect([...sub.links]).toEqual([linkKey(links[5])]);
  });
});

describe("resolveSources", () => {
  const node = (id: string): UniverseNode => ({
    id,
    kind: "container",
    label: id,
  });
  const graph = {
    nodes: [node("book"), node("part1"), node("character:rama")],
    rollup: { ch1: "part1" },
  };

  it("lets a chapter stand in for verses that are not drawn", () => {
    expect(
      resolveSources(graph, [
        { id: "v1", parentId: "ch1" }, // verse of a rolled-up chapter
        { id: "v9", parentId: "part1" }, // verse of a shown section
        { id: "character:rama", parentId: null },
        { id: "elsewhere", parentId: "other-book" },
      ]),
    ).toEqual(["part1", "character:rama"]);
  });
});
