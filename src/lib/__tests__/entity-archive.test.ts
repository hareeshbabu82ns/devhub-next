import {
  ARCHIVE_FORMAT_VERSION,
  ArchiveEntity,
  ArchiveError,
  STRUCTURE_FILE,
  buildArchive,
  parseArchive,
  planImport,
} from "../entity-archive/format";

const entity = (
  id: string,
  type: string,
  order: number,
  childrenIds: string[] = [],
  extra: Partial<ArchiveEntity> = {},
): ArchiveEntity => ({
  id,
  type,
  order,
  text: [
    { language: "SAN", value: `पाठ ${id}` },
    { language: "IAST", value: `pāṭha ${id}` },
  ],
  meaning: [{ language: "ENG", value: `meaning ${id}` }],
  attributes: [{ key: "source", value: "test" }],
  imageThumbnail: `/api/assets/uploads/img/${id}.png`,
  audio: "",
  notes: `notes ${id}`,
  bookmarked: order % 2 === 0,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-02-01T00:00:00.000Z",
  childrenIds,
  annotations: [],
  playgrounds: [],
  ...extra,
});

/** book -> 2 chapters -> verses; one verse also annotated / playground */
const library = () => {
  const list = [
    entity("book", "PURANAM", 0, ["ch2", "ch1"]),
    entity("ch1", "ADHYAAYAM", 0, ["v1", "v2"]),
    entity("ch2", "ADHYAAYAM", 1, ["v3"]),
    entity("v1", "SLOKAM", 0, [], {
      annotations: [
        {
          kind: "COMMENTARY",
          language: "SAN",
          title: "Śaṅkara",
          text: "**bhāṣya**",
          order: 0,
          userId: "u1",
        },
      ],
      playgrounds: [
        {
          title: "split",
          nodes: [{ id: "n1", data: { x: 1 } }],
          edges: [],
          userId: "u2",
        },
      ],
    }),
    entity("v2", "SLOKAM", 1),
    entity("v3", "SLOKAM", 0),
  ];
  return new Map(list.map((e) => [e.id, e]));
};

const filesOf = (built: { files: Map<string, string> }) =>
  [...built.files].map(([name, content]) => ({ name, content }));

describe("entity archive round trip", () => {
  it("keeps every entity, field, link, annotation and playground", () => {
    const source = library();
    const built = buildArchive("book", source);
    expect(built.structure.formatVersion).toBe(ARCHIVE_FORMAT_VERSION);
    expect(built.structure.stats.totalEntities).toBe(6);
    expect(built.structure.stats.totalAnnotations).toBe(1);
    expect(built.structure.stats.totalPlaygrounds).toBe(1);
    expect([...built.files.keys()][0]).toBe(STRUCTURE_FILE);

    const parsed = parseArchive(filesOf(built));
    expect(parsed.warnings).toEqual([]);
    expect(parsed.rootId).toBe("book");
    expect(parsed.entities).toHaveLength(6);
    for (const e of parsed.entities) {
      expect(e).toEqual(source.get(e.id));
    }
  });

  it("keeps the parent's own child ordering", () => {
    const parsed = parseArchive(filesOf(buildArchive("book", library())));
    const book = parsed.entities.find((e) => e.id === "book")!;
    expect(book.childrenIds).toEqual(["ch2", "ch1"]);
  });

  it("stores an entity with two parents once and links it twice", () => {
    const source = library();
    source.get("ch2")!.childrenIds.push("v1");
    const built = buildArchive("book", source);
    expect(built.structure.stats.totalEntities).toBe(6);
    const parsed = parseArchive(filesOf(built));
    expect(parsed.entities).toHaveLength(6);
    expect(parsed.entities.find((e) => e.id === "ch2")!.childrenIds).toEqual([
      "v3",
      "v1",
    ]);

    const plan = planImport(parsed, {
      newId: counter(),
      importerId: "me",
    });
    const v1 = plan.entities.find((e) => e.text[0].value.endsWith("v1"))!;
    expect(v1.parents).toHaveLength(2);
  });

  it("survives cycles and dangling children on export", () => {
    const source = library();
    source.get("v3")!.childrenIds.push("book", "gone");
    const built = buildArchive("book", source);
    expect(built.warnings[0]).toMatch(/1 child reference/);
    const parsed = parseArchive(filesOf(built));
    expect(parsed.entities).toHaveLength(6);
  });

  it("gives files with the same title distinct names", () => {
    const source = library();
    for (const e of source.values()) e.text = [{ language: "ENG", value: "Same" }];
    const built = buildArchive("book", source);
    expect(parseArchive(filesOf(built)).entities).toHaveLength(6);
  });
});

describe("parseArchive refuses incomplete archives", () => {
  it("fails when a listed file is missing", () => {
    const files = filesOf(buildArchive("book", library())).filter(
      (f) => !f.name.includes("adhyaayam") || f.name.startsWith("002"),
    );
    expect(() => parseArchive(files)).toThrow(/incomplete/);
  });

  it("fails when an inline child was removed", () => {
    const files = filesOf(buildArchive("book", library())).map((f) => {
      if (f.name === STRUCTURE_FILE) return f;
      const data = JSON.parse(f.content);
      if (Array.isArray(data.children) && data.children.length === 2) {
        data.children.pop();
      }
      return { ...f, content: JSON.stringify(data) };
    });
    expect(() => parseArchive(files)).toThrow(ArchiveError);
  });

  it("fails on archives from a newer format", () => {
    const files = filesOf(buildArchive("book", library())).map((f) =>
      f.name === STRUCTURE_FILE
        ? {
            ...f,
            content: JSON.stringify({
              ...JSON.parse(f.content),
              formatVersion: ARCHIVE_FORMAT_VERSION + 1,
            }),
          }
        : f,
    );
    expect(() => parseArchive(files)).toThrow(/newer version/);
  });

  it("fails on invalid JSON", () => {
    expect(() =>
      parseArchive([{ name: "x.json", content: "{ nope" }]),
    ).toThrow(/not valid JSON/);
  });
});

describe("older formats", () => {
  it("reads a v1 ZIP layout (no format version, no annotations)", () => {
    const structure = {
      stats: { totalEntities: 3, maxDepth: 1, entityCounts: {} },
      hierarchy: {
        fileName: "000_sthotram_x.json",
        childCount: 2,
        totalChildCount: 2,
      },
    };
    const root = {
      id: "s1",
      type: "STHOTRAM",
      order: 0,
      text: [{ language: "SAN", value: "स्तोत्रम्" }],
      meaning: [],
      attributes: [],
      imageThumbnail: "/default-om_256.png",
      notes: "",
      bookmarked: true,
      children: [
        { id: "a", type: "SLOKAM", order: 1, text: [{ language: "SAN", value: "b" }] },
        { id: "b", type: "SLOKAM", order: 0, text: [{ language: "SAN", value: "a" }] },
      ],
    };
    const parsed = parseArchive([
      { name: STRUCTURE_FILE, content: JSON.stringify(structure) },
      { name: "000_sthotram_x.json", content: JSON.stringify(root) },
    ]);
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.entities).toHaveLength(3);
    const s = parsed.entities[0];
    expect(s.bookmarked).toBe(true);
    expect(s.audio).toBe("");
    expect(s.childrenIds).toEqual(["a", "b"]);
  });

  it("reads a legacy single JSON tree without ids", () => {
    const tree = {
      type: "STHOTRAM",
      text: [{ language: "TEL", value: "x" }],
      children: [
        { type: "SLOKAM", order: 0, text: [{ language: "TEL", value: "1" }], children: [] },
        { type: "SLOKAM", order: 1, text: [{ language: "TEL", value: "2" }] },
      ],
    };
    const parsed = parseArchive([
      { name: "tree.json", content: "﻿" + JSON.stringify(tree) },
    ]);
    expect(parsed.entities).toHaveLength(3);
    expect(parsed.entities[0].childrenIds).toHaveLength(2);
  });

  it("reads raw database shapes and reports unknown fields", () => {
    const doc = {
      _id: { $oid: "65a000000000000000000001" },
      type: "SLOKAM",
      order: "3",
      text: [{ lang: "SAN", value: "x" }],
      meaning: { ENG: { text: "m" } },
      attributes: { source: "s" },
      createdAt: { $date: "2024-05-05T00:00:00Z" },
      futureField: 1,
    };
    const parsed = parseArchive([{ name: "a.json", content: JSON.stringify(doc) }]);
    const e = parsed.entities[0];
    expect(e.id).toBe("65a000000000000000000001");
    expect(e.order).toBe(3);
    expect(e.text).toEqual([{ language: "SAN", value: "x" }]);
    expect(e.meaning).toEqual([{ language: "ENG", value: "m" }]);
    expect(e.attributes).toEqual([{ key: "source", value: "s" }]);
    expect(e.createdAt).toBe("2024-05-05T00:00:00.000Z");
    expect(parsed.warnings.join()).toMatch(/futureField/);
  });
});

function counter() {
  let n = 0;
  return () => `new${++n}`;
}

describe("planImport", () => {
  it("assigns new ids, rewrites links and attaches under the parent", () => {
    const parsed = parseArchive(filesOf(buildArchive("book", library())));
    const plan = planImport(parsed, {
      newId: counter(),
      importerId: "me",
      knownUserIds: ["u1"],
      parentId: "parent",
      rootOrder: 7,
    });
    const ids = new Set(plan.entities.map((e) => e.id));
    expect(ids.size).toBe(6);
    const root = plan.entities.find((e) => e.id === plan.rootId)!;
    expect(root.parents).toEqual(["parent"]);
    expect(root.order).toBe(7);
    for (const e of plan.entities) {
      for (const c of e.children) {
        expect(ids.has(c)).toBe(true);
        expect(plan.entities.find((x) => x.id === c)!.parents).toContain(e.id);
      }
    }
    expect(plan.annotations[0].userId).toBe("u1");
    expect(plan.playgrounds[0].userId).toBe("me");
    expect(plan.warnings[0]).toMatch(/1 annotation/);
    expect(plan.entities.some((e) => ["book", "v1"].includes(e.id))).toBe(false);
  });
});
