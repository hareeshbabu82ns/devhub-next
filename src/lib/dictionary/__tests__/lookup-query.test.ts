import {
  buildHeadwordQuery,
  detectInputScript,
  looseItransPattern,
  meaningSearchText,
  parseMatchMode,
} from "../lookup-query";

const loose = (q: string) => new RegExp(`^${looseItransPattern(q)}$`, "i");

function conditionFor(q: string, mode: Parameters<typeof buildHeadwordQuery>[1], lang: string) {
  const hq = buildHeadwordQuery(q, mode);
  const c = hq?.conditions.find((x) => x.languages.includes(lang));
  return c ? new RegExp(c.regex, c.caseInsensitive ? "i" : "") : null;
}

describe("detectInputScript", () => {
  it.each([
    ["धर्म", "devanagari"],
    ["ధర్మ", "telugu"],
    ["dharmaḥ", "iast"],
    ["kRRiShNa", "latin"],
    ["krishna", "latin"],
  ])("%s → %s", (text, script) => {
    expect(detectInputScript(text)).toBe(script);
  });
});

describe("looseItransPattern", () => {
  it.each([
    ["krishna", "kRRiShNa"],
    ["siva", "shiva"],
    ["shiva", "shiva"],
    ["rama", "rAma"],
    ["raama", "rAma"],
    ["gyana", "j~nAna"],
    ["jnana", "j~nAna"],
    ["sanskrit", "saMskRRita".slice(0, 9)],
    ["akaranam", "akaraNaM"],
    ["veda", "veda"],
    ["kshatriya", "kShatriya"],
  ])("%s matches ITRANS %s", (typed, itrans) => {
    expect(loose(typed).test(itrans)).toBe(true);
  });

  it("does not match unrelated words", () => {
    expect(loose("rama").test("rAmA")).toBe(true);
    expect(loose("rama").test("rAmaH")).toBe(false);
    expect(loose("dharma").test("karma")).toBe(false);
  });
});

describe("buildHeadwordQuery", () => {
  it("returns null for empty or wildcard-only input", () => {
    expect(buildHeadwordQuery("  ", "smart")).toBeNull();
    expect(buildHeadwordQuery("**", "smart")).toBeNull();
  });

  it("matches the Devanagari form for ITRANS input in prefix mode", () => {
    const re = conditionFor("dharm", "prefix", "SAN")!;
    expect(re.test("धर्म")).toBe(true);
    expect(re.test("धर्मक्षेत्र")).toBe(true);
    expect(re.test("धारणा")).toBe(false);
  });

  it("keeps the inherent vowel: dha does not match dhi", () => {
    const re = conditionFor("dha", "prefix", "SAN")!;
    expect(re.test("धन")).toBe(true);
    expect(re.test("धिक्")).toBe(false);
    expect(re.test("धा")).toBe(false);
  });

  it("anchors exact and suffix modes", () => {
    const exact = conditionFor("धर्म", "exact", "SAN")!;
    expect(exact.test("धर्म")).toBe(true);
    expect(exact.test("अधर्म")).toBe(false);
    const suffix = conditionFor("धर्म", "suffix", "SAN")!;
    expect(suffix.test("अधर्म")).toBe(true);
    expect(suffix.test("धर्मक")).toBe(false);
  });

  it("supports * and ? wildcards as whole-word patterns in smart mode", () => {
    const re = conditionFor("a*ra", "smart", "ITRANS")!;
    expect(re.test("akara")).toBe(true);
    expect(re.test("amara")).toBe(true);
    expect(re.test("akaraNa")).toBe(false);
    const q = conditionFor("ra?a", "smart", "ITRANS")!;
    expect(q.test("rAma")).toBe(true);
  });

  it("matches Telugu input against TEL and SAN forms", () => {
    expect(conditionFor("ధర్మ", "exact", "TEL")!.test("ధర్మ")).toBe(true);
    expect(conditionFor("ధర్మ", "exact", "SAN")!.test("धर्म")).toBe(true);
  });

  it("matches IAST input case-insensitively", () => {
    expect(conditionFor("Dharma", "exact", "IAST")!.test("dharma")).toBe(true);
    expect(conditionFor("dharma", "exact", "SAN")!.test("धर्म")).toBe(true);
  });

  it("does not start a loose suffix match inside an aspirate", () => {
    const re = conditionFor("hara", "suffix", "ITRANS")!;
    expect(re.test("aMshahara")).toBe(true);
    expect(re.test("achara")).toBe(false);
  });

  it("escapes regex characters in ITRANS input", () => {
    expect(() => buildHeadwordQuery("a.N(", "contains")).not.toThrow();
    const re = conditionFor("a.N", "contains", "SLP1")!;
    expect(re.test("a.N")).toBe(true);
    expect(re.test("abN")).toBe(false);
  });

  it("lists strict exact values in several scripts", () => {
    const hq = buildHeadwordQuery("dharma", "smart")!;
    expect(hq.exactValues).toEqual(expect.arrayContaining(["dharma", "धर्म"]));
  });
});

describe("meaningSearchText", () => {
  it("adds an ITRANS form for Indic input", () => {
    expect(meaningSearchText("धर्म")).toBe("धर्म dharma");
  });
  it("keeps quoted phrases intact", () => {
    expect(meaningSearchText('"supreme spirit"')).toBe('"supreme spirit"');
  });
});

describe("parseMatchMode", () => {
  it("maps legacy URL values", () => {
    expect(parseMatchMode("key-exact")).toBe("exact");
    expect(parseMatchMode("key-prefix")).toBe("prefix");
    expect(parseMatchMode(null)).toBe("smart");
    expect(parseMatchMode("meaning")).toBe("meaning");
  });
});
