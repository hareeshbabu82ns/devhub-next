import {
  CONVERTER_SCHEMES,
  composeImeWord,
  convertMixedText,
  convertText,
  convertTextSmart,
  detectScheme,
  safeTransliterate,
} from "../transliteration";

describe("safeTransliterate", () => {
  it("returns the text untouched for unknown schemes instead of throwing", () => {
    expect(safeTransliterate("rAma", "itrans_dravidian", "none")).toBe("rAma");
    expect(safeTransliterate("rAma", "nope", "telugu")).toBe("rAma");
  });

  it("handles decomposed (NFD) roman input", () => {
    expect(safeTransliterate("rāmaḥ śiva".normalize("NFD"), "iast", "telugu")).toBe(
      "రామః శివ",
    );
  });

  it("round trips Dravidian short vowels through IAST", () => {
    const telugu = "తెలుగు ఎవరు ఒక ఏమి ఓం కృష్ణ";
    const iast = safeTransliterate(telugu, "telugu", "iast");
    expect(safeTransliterate(iast, "iast", "telugu")).toBe(telugu);
  });

  it("keeps plain IAST working", () => {
    expect(safeTransliterate("Rāmaḥ kṛṣṇa", "iast", "devanagari")).toBe(
      "रामः कृष्ण",
    );
  });
});

describe("convertText", () => {
  const sample = "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः । ज्ञानं ऋषिः १२";

  it("round trips Devanagari through every lossless scheme", () => {
    for (const scheme of CONVERTER_SCHEMES) {
      if (scheme.lossy || scheme.value === "SAN") continue;
      const there = convertText(sample, "SAN", scheme.value);
      expect([scheme.value, convertText(there, scheme.value, "SAN")]).toEqual([
        scheme.value,
        sample,
      ]);
    }
  });

  it("ignores unknown codes such as ENG", () => {
    expect(convertText("hello", "ENG", "TEL")).toBe("hello");
    expect(convertText("hello", "IAST", "ENG")).toBe("hello");
  });
});

describe("detectScheme", () => {
  it("detects scripts and diacritic romanisations", () => {
    expect(detectScheme("రామః")).toBe("TEL");
    expect(detectScheme("रामः ।")).toBe("SAN");
    expect(detectScheme("ராம")).toBe("TAM");
    expect(detectScheme("ರಾಮ")).toBe("KAN");
    expect(detectScheme("rāmaḥ")).toBe("IAST");
    expect(detectScheme("ēmi ōṁ")).toBe("ISO");
  });

  it("does not guess for ambiguous or empty text", () => {
    expect(detectScheme("")).toBeUndefined();
    expect(detectScheme("hello world")).toBeUndefined();
    expect(detectScheme("। ॥")).toBeUndefined();
  });
});

describe("convertMixedText", () => {
  it("converts each script run and leaves Latin text alone", () => {
    expect(convertMixedText("రామః and कृष्णः ।\nhello", "IAST")).toBe(
      "rāmaḥ and kṛṣṇaḥ ।\nhello",
    );
  });

  it("converts Latin text only when told what it is", () => {
    expect(convertMixedText("rAma రామ", "SAN", { romanFrom: "ITRANS" })).toBe(
      "राम राम",
    );
  });

  it("keeps joiners inside the word", () => {
    expect(convertMixedText("క్‌ష", "SAN")).toBe("क्‌ष");
  });
});

describe("convertTextSmart", () => {
  it("reads pure Latin text as a romanisation", () => {
    expect(convertTextSmart("rāmaḥ", "TEL")).toBe("రామః");
    expect(convertTextSmart("rAmaH", "TEL")).toBe("రామః");
  });

  it("leaves Latin words alone when the text has a script", () => {
    expect(convertTextSmart("రామః note", "SAN")).toBe("रामः note");
  });
});

describe("composeImeWord", () => {
  it("joins script letters with newly typed Latin letters", () => {
    expect(composeImeWord("రామya", "telugu")).toBe("rAmaya");
    expect(composeImeWord("రామ్a", "telugu")).toBe("rAma");
  });

  it("leaves pure words alone", () => {
    expect(composeImeWord("rAma", "telugu")).toBe("rAma");
    expect(composeImeWord("రామ", "telugu")).toBe("రామ");
  });
});
