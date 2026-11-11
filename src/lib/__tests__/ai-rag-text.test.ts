import {
  chunkText,
  conceptKey,
  conceptSlug,
  fold,
  fromBytes,
  parseExtraction,
  quantize,
  toBytes,
  topMatches,
} from "../ai/rag/text";

describe("conceptSlug", () => {
  it("gives every spelling of a name the same slug", () => {
    expect(conceptSlug("Śrī Rāma")).toBe("rama");
    expect(conceptSlug("Lord Rama")).toBe("rama");
    expect(conceptSlug("Niṣkāma Karma")).toBe("nishkama-karma");
    expect(conceptSlug("Kṛṣṇa (Vāsudeva)")).toBe("krishna");
  });

  it("never strips a name down to nothing", () => {
    expect(conceptSlug("Devi")).toBe("devi");
    expect(conceptKey("character", "  ")).toBe("");
  });
});

describe("fold", () => {
  it("removes diacritics the way names are usually typed", () => {
    expect(fold("Dhṛtarāṣṭra")).toBe("dhritarashtra");
    expect(fold("Śaṅkara")).toBe("shankara");
  });
});

describe("chunkText", () => {
  it("puts the meaning before the verse and drops markdown", () => {
    const text = chunkText({
      reference: "Gita › 2 › 47",
      text: "कर्मण्येवाधिकारस्ते  \n मा फलेषु कदाचन ॥",
      meaning: "**Sivananda**:  \n\nYour right is to work only.\n\n---\n",
    });
    expect(text.split("\n")).toEqual([
      "Gita › 2 › 47",
      "Sivananda: Your right is to work only.",
      "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ॥",
    ]);
  });
});

describe("vectors", () => {
  it("survive storage and keep their cosine order", () => {
    const a = quantize([1, 0, 0]);
    const b = quantize([0.6, 0.8, 0]);
    const c = quantize([0, 0, 1]);
    expect(Array.from(fromBytes(toBytes(b)))).toEqual(Array.from(b));

    const matrix = new Int8Array([...a, ...b, ...c]);
    const hits = topMatches(matrix, 3, quantize([0.9, 0.1, 0]), 2);
    expect(hits.map((h) => h.index)).toEqual([0, 1]);
    expect(hits[0].score).toBeGreaterThan(0.95);
  });

  it("re-normalises a truncated vector", () => {
    const cut = quantize([0.5, 0.5, 0.5, 0.5], 2);
    expect(cut.length).toBe(2);
    expect(cut[0]).toBe(90); // 1/√2 × 127
  });

  it("ignores a query of another dimension and honours the minimum score", () => {
    const matrix = new Int8Array([...quantize([1, 0]), ...quantize([0, 1])]);
    expect(topMatches(matrix, 2, quantize([1, 0, 0]), 5)).toEqual([]);
    expect(topMatches(matrix, 2, quantize([1, 0]), 5, 0.5)).toHaveLength(1);
  });
});

describe("parseExtraction", () => {
  const reply = `<think>let me see</think>
Here you go:
\`\`\`json
{"entities":[
  {"name":"Hanumān","kind":"character","original":"हनुमान्","description":"Son of Vayu"},
  {"name":"Bhakti","kind":"teaching","description":"Devotion"},
  {"name":"Grief","kind":"emotion"},
  {"name":"Thing","kind":"nonsense"}],
 "passages":[
  {"n":1,"mentions":[{"name":"Hanuman","rel":"spoken_by","why":"he speaks"},{"name":"Unknown","rel":"MENTIONS"}]},
  {"n":2,"mentions":[{"name":"Bhakti","rel":"TEACHES"},{"name":"bhakti","rel":"DEFINES"}]},
  {"n":9,"mentions":[{"name":"Grief","rel":"DEPICTS"}]}],
 "relations":[
  {"from":"Hanuman","to":"Bhakti","label":"Embodies","n":1},
  {"from":"Hanuman","to":"Hanuman","label":"is"},
  {"from":"Hanuman","to":"Nobody","label":"knows"}]}
\`\`\``;

  it("keeps what resolves and drops everything else", () => {
    const result = parseExtraction(reply, 2);
    expect(result.concepts.map((c) => c.key)).toEqual([
      "character:hanuman",
      "concept:bhakti",
      "state:grief",
    ]);
    expect(result.mentions.get(1)).toEqual([
      { key: "character:hanuman", rel: "SPOKEN_BY", why: "he speaks" },
    ]);
    // an unknown relation falls back to MENTIONS; a repeated name is kept once
    expect(result.mentions.get(2)).toEqual([
      { key: "concept:bhakti", rel: "MENTIONS", why: "" },
    ]);
    // passage 9 does not exist in a group of 2
    expect(result.mentions.has(9)).toBe(false);
    expect(result.relations).toEqual([
      {
        from: "character:hanuman",
        to: "concept:bhakti",
        label: "embodies",
        why: "",
        passage: 1,
      },
    ]);
  });

  it("returns an empty extraction for unusable replies", () => {
    for (const bad of ["", "I cannot do that", "{not json}", "[1,2]"]) {
      const result = parseExtraction(bad, 3);
      expect(result.concepts).toEqual([]);
      expect(result.mentions.size).toBe(0);
    }
  });
});
