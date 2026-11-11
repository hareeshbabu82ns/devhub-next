jest.mock("../db", () => ({ db: {} }));

import { formatPassages, naiveKeywords, parseKeywordReply } from "../ai/ask";

describe("parseKeywordReply", () => {
  it("reads a bare JSON array", () => {
    expect(parseKeywordReply('["Hanuman", "sītā"]')).toEqual(["Hanuman", "sītā"]);
  });

  it("reads an array wrapped in prose or a code fence", () => {
    expect(
      parseKeywordReply('Sure!\n```json\n["हनुमान्", "ring"]\n```\nHope it helps'),
    ).toEqual(["हनुमान्", "ring"]);
  });

  it("returns nothing for unusable replies", () => {
    expect(parseKeywordReply("I cannot help with that")).toEqual([]);
    expect(parseKeywordReply("[not json]")).toEqual([]);
    expect(parseKeywordReply('[1, "ok", null]')).toEqual(["ok"]);
  });
});

describe("naiveKeywords", () => {
  it("keeps meaningful words in any script and drops filler", () => {
    expect(naiveKeywords("Where does Hanuman meet सीता in the forest?")).toEqual([
      "Hanuman",
      "meet",
      "सीता",
      "forest",
    ]);
  });
});

describe("formatPassages", () => {
  it("numbers passages and includes meaning and notes", () => {
    const out = formatPassages([
      {
        id: "1",
        type: "SLOKAM",
        parentId: "p",
        reference: "Book › Chapter › 1",
        text: "रामः",
        meaning: "Rama",
        notes: ["Commentary (X): note"],
      },
      {
        id: "2",
        type: "SLOKAM",
        parentId: "p",
        reference: "Book › Chapter › 2",
        text: "सीता",
        meaning: "",
        notes: [],
      },
    ]);
    expect(out).toBe(
      "[1] Book › Chapter › 1\nरामः\nMeaning: Rama\nCommentary (X): note\n\n[2] Book › Chapter › 2\nसीता",
    );
  });
});
