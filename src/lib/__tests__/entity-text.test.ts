import {
  detectVerseSplitMode,
  prepareTextForSave,
  setLanguageValue,
  splitVerses,
  stripVerseNumbers,
  syncScripts,
} from "../entity-text";
import {
  ENTITY_TYPES,
  ENTITY_TYPES_CHILDREN,
  ENTITY_TYPES_PARENTS,
} from "../constants";

describe("splitVerses", () => {
  it("splits on blank lines and keeps line breaks inside a verse", () => {
    const verses = splitVerses("line a\nline b\n\n\nline c\n   \nline d");
    expect(verses).toEqual(["line a  \nline b", "line c", "line d"]);
  });

  it("splits after numbered verse terminators when there are no blank lines", () => {
    const text = "रामाय रामभद्राय । रामचन्द्राय वेधसे ॥ १ ॥\nरघुनाथाय नाथाय । सीतायाः पतये नमः ॥ २ ॥";
    expect(detectVerseSplitMode(text)).toBe("verse-end");
    const verses = splitVerses(text);
    expect(verses).toHaveLength(2);
    expect(verses[0].endsWith("॥ १ ॥")).toBe(true);
    expect(verses[1].startsWith("रघुनाथाय")).toBe(true);
  });

  it("handles ASCII double bars", () => {
    expect(splitVerses("abc || 1 ||\ndef || 2 ||", "verse-end")).toEqual([
      "abc || 1 ||",
      "def || 2 ||",
    ]);
  });

  it("treats a short block without separators as one verse", () => {
    expect(splitVerses("one\ntwo")).toEqual(["one  \ntwo"]);
  });

  it("treats a long list without separators as one item per line", () => {
    const names = ["a", "b", "c", "d", "e", "f"];
    expect(splitVerses(names.join("\n"))).toEqual(names);
  });

  it("respects an explicit mode and ignores empty input", () => {
    expect(splitVerses("a\n\nb", "none")).toEqual(["a  \nb"]);
    expect(splitVerses("a\r\nb", "line")).toEqual(["a", "b"]);
    expect(splitVerses("  \n ")).toEqual([]);
  });
});

describe("stripVerseNumbers", () => {
  it("removes the number but keeps the terminator", () => {
    expect(stripVerseNumbers("नमः ॥ १२ ॥")).toBe("नमः ॥");
    expect(stripVerseNumbers("namah || 3 ||")).toBe("namah ||");
    expect(stripVerseNumbers("नमः ॥")).toBe("नमः ॥");
  });
});

describe("syncScripts", () => {
  it("regenerates the other scripts from the edited one and keeps other languages", () => {
    const result = syncScripts(
      [
        { language: "TEL", value: "రామ" },
        { language: "SAN", value: "stale" },
        { language: "ENG", value: "Rama" },
      ],
      "TEL",
    );
    const byLang = Object.fromEntries(result.map((t) => [t.language, t.value]));
    expect(byLang.TEL).toBe("రామ");
    expect(byLang.SAN).toBe("राम");
    expect(byLang.IAST).toBe("rāma");
    expect(byLang.ENG).toBe("Rama");
    expect(Object.keys(byLang).sort()).toEqual(
      ["ENG", "IAST", "ITRANS", "SAN", "SLP1", "TEL"].sort(),
    );
  });

  it("does nothing when the source is not a transliterable script", () => {
    const data = [{ language: "ENG", value: "Rama" }];
    expect(syncScripts(data, "ENG")).toBe(data);
  });
});

describe("prepareTextForSave", () => {
  it("fills missing scripts without overwriting existing ones", () => {
    const result = prepareTextForSave([
      { language: "TEL", value: "రామ" },
      { language: "ENG", value: "keep" },
    ]);
    const byLang = Object.fromEntries(result.map((t) => [t.language, t.value]));
    expect(byLang.TEL).toBe("రామ");
    expect(byLang.ENG).toBe("keep");
    expect(byLang.SAN).toBe("राम");
    expect(byLang.IAST).toBe("rāma");
    expect(byLang.SLP1).toBeDefined();
    expect(byLang.ITRANS).toBeDefined();
  });

  it("never stores an unresolved directive or an empty value", () => {
    const result = prepareTextForSave([
      { language: "ENG", value: "Title" },
      { language: "IAST", value: "$transliterateFrom=SAN|TEL" },
      { language: "TEL", value: "" },
    ]);
    expect(result).toEqual([{ language: "ENG", value: "Title" }]);
  });

  it("resolves a directive when its source is present", () => {
    const result = prepareTextForSave([
      { language: "SAN", value: "राम" },
      { language: "IAST", value: "$transliterateFrom=SAN" },
    ]);
    expect(result.find((t) => t.language === "IAST")?.value).toBe("rāma");
    expect(result.some((t) => t.value.startsWith("$"))).toBe(false);
  });

  it("returns an empty list for missing input", () => {
    expect(prepareTextForSave(undefined)).toEqual([]);
  });
});

describe("setLanguageValue", () => {
  it("replaces an existing language and appends a new one", () => {
    const data = [{ language: "TEL", value: "a" }];
    expect(setLanguageValue(data, "TEL", "b")).toEqual([
      { language: "TEL", value: "b" },
    ]);
    expect(setLanguageValue(data, "ENG", "c")).toEqual([
      { language: "TEL", value: "a" },
      { language: "ENG", value: "c" },
    ]);
  });
});

describe("entity type registry", () => {
  it("only references known types", () => {
    for (const type of ENTITY_TYPES) {
      for (const child of ENTITY_TYPES_CHILDREN[type]) {
        expect(ENTITY_TYPES).toContain(child);
      }
    }
  });

  it("derives parents as the inverse of children", () => {
    expect(ENTITY_TYPES_PARENTS.SLOKAM).toEqual(
      expect.arrayContaining(["STHOTRAM", "SARGA", "ADHYAAYAM", "SHATAKAM"]),
    );
    expect(ENTITY_TYPES_PARENTS.SHATAKAM).toEqual(
      expect.arrayContaining(["GOD", "AUTHOR"]),
    );
    expect(ENTITY_TYPES_PARENTS.GOD).toEqual([]);
  });
});
