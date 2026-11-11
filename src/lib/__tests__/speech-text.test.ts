import { speechLangFor, splitForSpeech, toSpeakable } from "../speech-text";

describe("toSpeakable", () => {
  it("drops citations, links and formatting", () => {
    expect(
      toSpeakable(
        "## Answer\n\n**Hanuman** finds [Sita](/entities/1) in Lanka [3].\n\n- He gives the *ring* [1, 2]",
      ),
    ).toBe("Answer\nHanuman finds Sita in Lanka.\nHe gives the ring");
  });

  it("removes code blocks", () => {
    expect(toSpeakable("Before\n```js\nx()\n```\nafter")).toBe("Before\nafter");
  });
});

describe("splitForSpeech", () => {
  it("groups short sentences up to the limit", () => {
    expect(splitForSpeech("One. Two. Three.", 10)).toEqual([
      "One. Two.",
      "Three.",
    ]);
  });

  it("splits at Devanagari full stops", () => {
    expect(splitForSpeech("राम। सीता॥", 5)).toEqual(["राम।", "सीता॥"]);
  });

  it("breaks very long sentences at spaces", () => {
    const pieces = splitForSpeech("word ".repeat(100).trim(), 50);
    expect(pieces.every((p) => p.length <= 50)).toBe(true);
    expect(pieces.join(" ")).toBe("word ".repeat(100).trim());
  });
});

describe("speechLangFor", () => {
  it("detects the script", () => {
    expect(speechLangFor("Who is Rama?")).toBe("en");
    expect(speechLangFor("रामो विग्रहवान् धर्मः")).toBe("hi-IN");
    expect(speechLangFor("శ్రీ రామ జయం")).toBe("te-IN");
  });
});
