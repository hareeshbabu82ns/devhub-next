import type { Edge, Node } from "@xyflow/react";
import {
  LAYOUT,
  findClearOffset,
  layoutAll,
  layoutResults,
  sizeOf,
  type Point,
  type Rect,
} from "../layout";
import {
  buildItemResults,
  buildParseResults,
  buildSplitResults,
  type SansPlayData,
} from "../results";

const tool = (id: string, x = 0, y = 0): Node => ({
  id,
  type: "sentenceParse",
  position: { x, y },
  data: {},
  measured: { width: 300, height: 200 },
});

const rects = (nodes: Node[], positions: Map<string, Point>): Rect[] =>
  nodes.map((n) => ({ ...(positions.get(n.id) ?? n.position), ...sizeOf(n) }));

const anyOverlap = (all: Rect[]) =>
  all.some((a, i) =>
    all.some(
      (b, j) =>
        i < j &&
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height,
    ),
  );

const data = (node: Node) => node.data as SansPlayData;

const parse = [
  {
    analysis: [
      {
        graph: [
          { node: { pada: "gacchati", root: "gam", tags: ["v"] } },
          {
            node: { pada: "rāmaḥ", root: "rāma", tags: ["m", "1"] },
            predecessor: { pada: "gacchati", root: "gam", tags: ["v"] },
            relation: "kartā",
          },
          {
            node: { pada: "vanam", root: "vana", tags: ["n", "2"] },
            predecessor: { pada: "gacchati", root: "gam", tags: ["v"] },
            relation: "karma",
          },
        ],
      },
    ],
  },
];

describe("result builders", () => {
  it("hangs a single split's words off the tool, in order", () => {
    const graph = buildSplitResults("t", [["a", "b", "c"]]);
    expect(graph.nodes.map((n) => data(n).label)).toEqual(["a", "b", "c"]);
    expect(graph.nodes.map((n) => data(n).index)).toEqual([1, 2, 3]);
    expect(graph.edges.every((e) => e.source === "t")).toBe(true);
  });

  it("gives each of several splits a heading that feeds the whole split", () => {
    const graph = buildSplitResults("t", [["a", "b"], ["ab"]]);
    const groups = graph.nodes.filter((n) => data(n).kind === "group");
    expect(groups.map((n) => data(n).text)).toEqual(["a b", "ab"]);
    expect(graph.nodes).toHaveLength(5);
    expect(new Set(graph.nodes.map((n) => n.id)).size).toBe(5);
  });

  it("builds a dependency tree with the relation on the edge", () => {
    const graph = buildParseResults("t", parse);
    const id = (pada: string) => graph.nodes.find((n) => data(n).label === pada)!.id;
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toContainEqual(
      expect.objectContaining({ source: "t", target: id("gacchati") }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        source: id("gacchati"),
        target: id("vanam"),
        data: { label: "karma" },
      }),
    );
    expect(data(graph.nodes[1]).root).toBe("rāma");
  });

  it("keeps a word that occurs twice with different readings apart", () => {
    const graph = buildParseResults("t", [
      {
        analysis: [
          {
            graph: [
              { node: { pada: "ca", root: "ca", tags: ["a"] } },
              { node: { pada: "ca", root: "ca", tags: ["b"] } },
              // exact repeat of the first line: dropped
              { node: { pada: "ca", root: "ca", tags: ["a"] } },
            ],
          },
        ],
      },
    ]);
    expect(graph.nodes).toHaveLength(2);
  });

  it("separates several parses under headings and skips empty ones", () => {
    const graph = buildParseResults("t", [
      { analysis: [parse[0].analysis[0], { graph: [] }, parse[0].analysis[0]] },
    ]);
    const groups = graph.nodes.filter((n) => data(n).kind === "group");
    expect(groups.map((n) => data(n).label)).toEqual(["Parse 1", "Parse 3"]);
    expect(graph.nodes).toHaveLength(8);
  });

  it("marks every result with its owner and script", () => {
    const graph = buildItemResults("t", [{ label: "x" }, { label: "" }], "IAST" as never);
    expect(graph.nodes).toHaveLength(1);
    expect(data(graph.nodes[0])).toMatchObject({ ownerId: "t", scheme: "IAST", kind: "word" });
  });
});

describe("layoutResults", () => {
  it("puts results in left-aligned columns right of the tool, centred on it", () => {
    const owner = tool("t", 100, 100);
    const graph = buildParseResults("t", parse);
    const positions = layoutResults(owner, graph.nodes, graph.edges, []);

    const [verb, subject, object] = graph.nodes.map((n) => positions.get(n.id)!);
    expect(verb.x).toBe(100 + 300 + LAYOUT.columnGap);
    // dependents share a column, with room for the relation label
    expect(subject.x).toBe(object.x);
    expect(subject.x).toBe(verb.x + sizeOf(graph.nodes[0]).width + LAYOUT.labelledColumnGap);
    expect(subject.y).toBeLessThan(object.y);

    // the verb is centred on its dependents, and the tree on the tool
    const mid = (i: number, p: Point) => p.y + sizeOf(graph.nodes[i]).height / 2;
    expect(mid(0, verb)).toBeCloseTo((subject.y + object.y + sizeOf(graph.nodes[2]).height) / 2);
    expect(mid(0, verb)).toBeCloseTo(100 + 200 / 2);

    expect(anyOverlap(rects([owner, ...graph.nodes], positions))).toBe(false);
  });

  it("never overlaps siblings, whatever their sizes", () => {
    const owner = tool("t");
    const graph = buildSplitResults("t", [
      ["a", "b".repeat(80), "c"],
      ["d", "e"],
      ["f"],
    ]);
    const positions = layoutResults(owner, graph.nodes, graph.edges, []);
    expect(positions.size).toBe(graph.nodes.length);
    expect(anyOverlap(rects([owner, ...graph.nodes], positions))).toBe(false);
  });

  it("slides the results clear of other nodes", () => {
    const owner = tool("t");
    const graph = buildSplitResults("t", [["a", "b", "c"]]);
    const other = tool("other", 300 + LAYOUT.columnGap, 60);
    const positions = layoutResults(owner, graph.nodes, graph.edges, [other]);
    expect(anyOverlap(rects([owner, other, ...graph.nodes], positions))).toBe(false);
  });

  it("still places results whose edges are missing or cyclic", () => {
    const owner = tool("t");
    const graph = buildSplitResults("t", [["a", "b"]]);
    const [a, b] = graph.nodes;
    const edges: Edge[] = [
      { id: "1", source: a.id, target: b.id },
      { id: "2", source: b.id, target: a.id },
    ];
    const positions = layoutResults(owner, graph.nodes, edges, []);
    expect(positions.size).toBe(2);
    expect(anyOverlap(rects([owner, a, b], positions))).toBe(false);
  });
});

describe("findClearOffset", () => {
  const block = { x: 0, y: 0, width: 100, height: 100 };
  it("stays put when nothing is in the way", () => {
    expect(findClearOffset(block, [{ x: 500, y: 0, width: 10, height: 10 }])).toBe(0);
  });
  it("takes the shorter way out", () => {
    const low = { x: 0, y: 80, width: 100, height: 100 };
    expect(findClearOffset(block, [low], "nearest", 10)).toBe(-30);
    expect(findClearOffset(block, [low], "down", 10)).toBe(190);
  });
});

describe("layoutAll", () => {
  it("chains tools after the results that feed them and stacks the rest", () => {
    const first = tool("first", 50, 400);
    const graph = buildSplitResults("first", [["a", "b"]]);
    const fed = tool("fed", 0, 0);
    const alone = tool("alone", -200, 900);
    const nodes = [fed, alone, first, ...graph.nodes];
    const edges = [...graph.edges, { id: "feed", source: graph.nodes[0].id, target: "fed" }];

    const positions = layoutAll(nodes, edges);
    expect(positions.size).toBe(nodes.length);
    expect(anyOverlap(rects(nodes, positions))).toBe(false);
    // roots share the left edge; the fed tool sits right of its source
    expect(positions.get("first")!.x).toBe(0);
    expect(positions.get("alone")!.x).toBe(0);
    expect(positions.get("fed")!.x).toBeGreaterThan(positions.get(graph.nodes[0].id)!.x);
    // trees keep their top-to-bottom order
    expect(positions.get("alone")!.y).toBeGreaterThan(positions.get("first")!.y);
  });
});
