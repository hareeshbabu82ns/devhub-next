jest.mock("../db", () => ({ db: {} }));

import {
  isAiTitle,
  parseTranslation,
  schoolAnnotation,
  wordsAnnotationTitle,
  wordsToMarkdown,
} from "../ai/fill-format";
import { parseSelectionKey, selectionKey } from "../ai/config";
import {
  isPublicHttpUrl,
  pageText,
  parseDuckDuckGoResults,
  unwrapDuckDuckGoLink,
} from "../ai/web-search";

describe("parseTranslation", () => {
  it("reads the meaning and the word list out of a wrapped reply", () => {
    const reply = `Here you go:
\`\`\`json
{"meaning": " You have a right to action alone. ",
 "words": [
   {"word": "कर्मणि", "transliteration": "karmaṇi", "meaning": "in action"},
   {"word": "एव", "transliteration": "eva", "meaning": "alone"}
 ]}
\`\`\``;
    expect(parseTranslation(reply)).toEqual({
      meaning: "You have a right to action alone.",
      words: [
        { word: "कर्मणि", transliteration: "karmaṇi", meaning: "in action" },
        { word: "एव", transliteration: "eva", meaning: "alone" },
      ],
    });
  });

  it("drops words without a meaning and survives junk", () => {
    expect(
      parseTranslation(
        '{"words": [{"word": "a"}, null, 3, {"word": "b", "meaning": "x"}]}',
      ),
    ).toEqual({
      meaning: "",
      words: [{ word: "b", transliteration: "", meaning: "x" }],
    });
    expect(parseTranslation("I cannot help with that")).toEqual({
      meaning: "",
      words: [],
    });
  });
});

describe("formatting what is saved", () => {
  it("writes one markdown line per word", () => {
    expect(
      wordsToMarkdown([
        { word: "कर्मणि", transliteration: "karmaṇi", meaning: "in action" },
        { word: "eva", transliteration: "eva", meaning: "alone" },
      ]),
    ).toBe("- **कर्मणि** (karmaṇi) — in action\n- **eva** — alone");
  });

  it("marks AI-written notes so a later run can find them", () => {
    expect(isAiTitle(wordsAnnotationTitle("OpenAI · gpt-4o"))).toBe(true);
    const note = schoolAnnotation({
      school: "Advaita",
      commentator: "Śaṅkara",
      text: "Action without attachment.",
      sources: [{ url: "https://example.org/a", title: "A [page]" }],
    });
    expect(note.title).toBe("Advaita — Śaṅkara · AI web summary");
    expect(isAiTitle(note.title)).toBe(true);
    expect(note.text).toContain("- [A page](https://example.org/a)");
  });

  it("does not mistake a person's title for an AI one", () => {
    expect(isAiTitle("Śaṅkara")).toBe(false);
    expect(isAiTitle("Sri Vaishnava view")).toBe(false);
    expect(isAiTitle("MAIN commentary")).toBe(false);
    expect(isAiTitle("")).toBe(false);
    expect(isAiTitle(null)).toBe(false);
  });
});

describe("model selection keys", () => {
  it("round-trips, including model names with colons and slashes", () => {
    const selection = { providerId: "env", model: "library/llama3.1:8b" };
    expect(parseSelectionKey(selectionKey(selection))).toEqual(selection);
    expect(parseSelectionKey("nonsense")).toBeNull();
    expect(parseSelectionKey("::model")).toBeNull();
  });
});

describe("web search", () => {
  it("unwraps DuckDuckGo result links", () => {
    expect(
      unwrapDuckDuckGoLink(
        "//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fgita%2F2%2F47&rut=abc",
      ),
    ).toBe("https://example.org/gita/2/47");
    expect(unwrapDuckDuckGoLink("https://example.org/x")).toBe(
      "https://example.org/x",
    );
  });

  it("reads results from DuckDuckGo's HTML", () => {
    const html = `<div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fa">First &amp; best</a><a class="result__snippet">About the verse</a></div>
<div class="result"><a class="result__a" href="https://duckduckgo.com/y.js?ad=1">Sponsored</a></div>`;
    expect(parseDuckDuckGoResults(html)).toEqual([
      {
        url: "https://example.org/a",
        title: "First & best",
        snippet: "About the verse",
      },
    ]);
  });

  it("only allows public web addresses to be fetched", () => {
    expect(isPublicHttpUrl("https://www.wisdomlib.org/x")).toBe(true);
    expect(isPublicHttpUrl("http://8.8.8.8/")).toBe(true);
    for (const url of [
      "http://localhost:3000/",
      "http://127.0.0.1/",
      "http://10.0.0.5/admin",
      "http://192.168.1.1/",
      "http://172.20.0.2/",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "http://nas.local/",
      "http://intranet/",
      "ftp://example.org/",
      "file:///etc/passwd",
      "https://user:pw@example.org/",
      "not a url",
    ]) {
      expect(isPublicHttpUrl(url)).toBe(false);
    }
  });

  it("keeps the readable text of a page", () => {
    const html = `<html><head><style>p{}</style></head><body><nav>Menu</nav>
<article><h1>Verse 2.47</h1><p>Śaṅkara   explains…</p><script>x()</script></article>
<footer>©</footer></body></html>`;
    expect(pageText(html)).toBe("Verse 2.47\nŚaṅkara explains…");
    expect(pageText("<body>" + "a".repeat(50) + "</body>", 10)).toBe(
      "a".repeat(10) + "…",
    );
  });
});
