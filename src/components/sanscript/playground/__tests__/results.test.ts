import type { Edge } from "@xyflow/react";
import type { SentenceParseResult } from "@/types/sanscript";
import {
  buildPairResults,
  buildParseResults,
  parseEmptyMessage,
  type SansPlayData,
} from "../results";

const labelOf = (edge: Edge) => (edge.data as { label?: string } | undefined)?.label;

const word = (index: number, pada: string) => ({ index, pada, root: pada, tags: [] });

describe("buildParseResults", () => {
  it("hangs each word from the word it depends on, found by its index", () => {
    // the same form twice: only the index tells the two apart
    const results: SentenceParseResult[] = [
      {
        status: "OK",
        analysis: [
          {
            cost: 1.5,
            graph: [
              { node: word(0, "saḥ"), predecessor: word(1, "gacchati"), relation: "kartā" },
              { node: word(1, "gacchati"), predecessor: null, relation: null },
              { node: word(2, "saḥ"), predecessor: word(3, "paśyati"), relation: "kartā" },
              { node: word(3, "paśyati"), predecessor: word(1, "gacchati"), relation: "samuccitam" },
            ],
          },
        ],
      },
    ];

    const { nodes, edges } = buildParseResults("tool", results);
    expect(nodes.map((node) => (node.data as SansPlayData).label)).toEqual([
      "saḥ",
      "gacchati",
      "saḥ",
      "paśyati",
    ]);
    const [first, main, second, other] = nodes.map((node) => node.id);
    expect(
      edges.map((edge) => [edge.source, edge.target, labelOf(edge)]),
    ).toEqual([
      [main, first, "kartā"],
      ["tool", main, undefined],
      [other, second, "kartā"],
      [main, other, "samuccitam"],
    ]);
  });

  it("gives several parses a heading that carries the cost", () => {
    const analysis = {
      cost: 2.2,
      graph: [{ node: word(0, "rāmaḥ"), predecessor: null, relation: null }],
    };
    const { nodes } = buildParseResults("tool", [
      { status: "OK", analysis: [analysis, analysis] },
    ]);
    const groups = nodes
      .map((node) => node.data as SansPlayData)
      .filter((data) => data.kind === "group");
    expect(groups.map((data) => data.label)).toEqual(["Parse 1", "Parse 2"]);
    expect(groups[0].subTitle).toBe("cost 2.2");
  });

  it("produces nothing for splits without a parse", () => {
    const results: SentenceParseResult[] = [{ status: "TIMEOUT", analysis: [] }];
    expect(buildParseResults("tool", results).nodes).toHaveLength(0);
    expect(parseEmptyMessage(results)).toMatch(/out of time/);
    expect(parseEmptyMessage([{ status: "NO_PARSE", analysis: [] }])).toMatch(
      /No parse/,
    );
  });
});

describe("buildParseResults drawing relations", () => {
  const gam = { index: 1, pada: "gacchati", root: "gam", tags: ["laṭ"] };
  const results: SentenceParseResult[] = [
    {
      split: ["grāmam", "gacchati"],
      status: "NO_PARSE",
      analysis: [],
      possibleRelations: [
        // one reading, two ways to depend on the verb
        { node: { index: 0, pada: "grāmam", root: "grāma", tags: ["2"] }, predecessor: gam, relation: "karma" },
        { node: { index: 0, pada: "grāmam", root: "grāma", tags: ["1"] }, predecessor: gam, relation: "kartā" },
        // two readings of the verb, neither governed
        { node: gam, predecessor: null, relation: null },
        { node: { index: 1, pada: "gacchati", root: "gacchat", tags: ["7"] }, predecessor: null, relation: null },
      ],
    },
  ];

  it("leaves a split without a parse out unless asked", () => {
    expect(buildParseResults("tool", results).nodes).toHaveLength(0);
  });

  it("draws the possible relations: a node per reading, an edge per governor", () => {
    const { nodes, edges } = buildParseResults("tool", results, undefined, {
      relations: true,
    });
    const [group, object, verb, participle] = nodes;
    expect(nodes.map((node) => (node.data as SansPlayData).label)).toEqual([
      "Relations",
      "grāmam",
      "gacchati",
      "gacchati",
    ]);
    expect((group.data as SansPlayData).subTitle).toBe(
      "possible relations · no parse",
    );
    expect((group.data as SansPlayData).text).toBe("grāmam gacchati");
    expect((object.data as SansPlayData).tags).toEqual(["2", "1"]);
    expect(
      edges.map((edge) => [edge.source, edge.target, labelOf(edge)]),
    ).toEqual([
      ["tool", group.id, undefined],
      [group.id, verb.id, undefined],
      [group.id, participle.id, undefined],
      [verb.id, object.id, "karma / kartā"],
    ]);
    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length);
  });

  it("draws relations for every split, parsed or not, and no parses", () => {
    const parsed: SentenceParseResult = {
      status: "OK",
      analysis: [{ graph: [{ node: word(0, "rāmaḥ"), predecessor: null, relation: null }] }],
      possibleRelations: results[0].possibleRelations,
    };
    const { nodes } = buildParseResults("tool", [parsed, results[0]], undefined, {
      relations: true,
    });
    expect(nodes.map((node) => (node.data as SansPlayData).label)).toEqual([
      "Split 1 · Relations",
      "grāmam",
      "gacchati",
      "gacchati",
      "Split 2 · Relations",
      "grāmam",
      "gacchati",
      "gacchati",
    ]);
  });
});

describe("buildPairResults", () => {
  it("heads each pair, marking the ones made of known words", () => {
    const { nodes } = buildPairResults("tool", [
      { left: "tasmin", right: "iti", valid: true },
      { left: "tasmit", right: "niti", valid: false },
    ]);
    expect(nodes.map((node) => (node.data as SansPlayData).label)).toEqual([
      "Pair 1 ✓",
      "tasmin",
      "iti",
      "Pair 2",
      "tasmit",
      "niti",
    ]);
    expect((nodes[0].data as SansPlayData).text).toBe("tasmin iti");
  });
});
