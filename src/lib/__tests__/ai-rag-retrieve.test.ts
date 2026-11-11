jest.mock("../db", () => ({ db: {} }));

import { formatConcepts, formatPassages } from "../ai/ask";
import { mergeRelations } from "../ai/rag/retrieve";

describe("mergeRelations", () => {
  it("keeps one relation per pair, worded the way it was stated most often", () => {
    const merged = mergeRelations([
      { from: "character:krishna", to: "character:arjuna", label: "teaches" },
      { from: "character:krishna", to: "character:arjuna", label: "advises" },
      { from: "character:krishna", to: "character:arjuna", label: "teaches" },
      { from: "character:arjuna", to: "character:krishna", label: "pupil of" },
      { from: "concept:krodha", to: "concept:rajas", label: "born of" },
    ]);
    expect(merged[0]).toEqual({
      from: "character:krishna",
      to: "character:arjuna",
      label: "teaches",
      weight: 3,
    });
    // direction matters: the reverse pair is its own relation
    expect(merged).toHaveLength(3);
  });
});

describe("knowledge-graph context", () => {
  const concept = (key: string, label: string, description = "") => ({
    key,
    kind: key.split(":")[0],
    label,
    original: "",
    description,
    count: 1,
    names: [],
    score: 1,
    reasons: [],
  });

  it("numbers concepts on from the passages and names the relations", () => {
    const text = formatConcepts(
      {
        concepts: [
          concept("state:krodha", "Krodha", "Anger"),
          concept("concept:rajas", "Rajas"),
        ],
        relations: [
          { from: "state:krodha", to: "concept:rajas", label: "born of" },
        ],
      },
      17,
    );
    expect(text).toContain("[17] State of mind: Krodha — Anger");
    expect(text).toContain("[18] Concept: Rajas");
    expect(text).toContain("- Krodha born of Rajas");
  });

  it("is empty without concepts", () => {
    expect(formatConcepts({ concepts: [], relations: [] }, 1)).toBe("");
  });

  it("tells the model why a passage was retrieved", () => {
    const passage = {
      id: "a",
      type: "SLOKAM",
      parentId: "p",
      reference: "Gita › 2 › 62",
      text: "ध्यायतो विषयान्",
      meaning: "",
      notes: [],
    };
    const text = formatPassages(
      [passage],
      new Map([
        ["a", ["close in meaning", "depicts Krodha: anger arises from desire"]],
      ]),
    );
    expect(text).toContain(
      "Why retrieved: close in meaning; depicts Krodha: anger arises from desire",
    );
    expect(formatPassages([passage])).not.toContain("Why retrieved");
  });
});
