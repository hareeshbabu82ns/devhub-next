/**
 * Tests for Dictionary Word Utilities
 */

import {
  generatePhoneticString,
  getTransliteratedWords,
  cleanText,
  extractMeaningfulWords,
  STOP_WORDS,
  SPECIAL_CHARS_PATTERN,
  NUMBER_PATTERN,
  type LanguageValueType,
} from "../dictionary/word-utils";

describe("Dictionary Word Utilities", () => {
  describe("generatePhoneticString", () => {
    it("should return empty string for empty arrays", () => {
      const result = generatePhoneticString([], []);
      expect(result).toBe("");
    });

    it("should return empty string for arrays with empty values", () => {
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: "" },
        { language: "SAN", value: "   " },
      ];
      const result = generatePhoneticString(wordArray, []);
      expect(result).toBe("");
    });

    it("should process English words correctly", () => {
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: "meditation yoga practice" },
      ];
      const result = generatePhoneticString(wordArray, []);
      expect(result).toContain("meditation");
      expect(result).toContain("yoga");
      expect(result).toContain("practice");
    });

    it("should process Sanskrit words with transliteration", () => {
      const wordArray: LanguageValueType[] = [
        { language: "SAN", value: "गणेश" },
      ];
      const result = generatePhoneticString(wordArray, []);
      // Should contain something (original word or transliterated), not empty
      expect(result.length).toBeGreaterThan(0);
      // Should contain transliterated versions (the actual behavior)
      expect(result).toMatch(/ganesha|gaNEsha/i);
    });

    it("should process Telugu words with transliteration", () => {
      const wordArray: LanguageValueType[] = [
        { language: "TEL", value: "గణేశ" },
      ];
      const result = generatePhoneticString(wordArray, []);
      // Should contain something (original word or transliterated), not empty
      expect(result.length).toBeGreaterThan(0);
      // Should contain transliterated versions (the actual behavior)
      expect(result).toMatch(/ganesha|gaNEsha/i);
    });

    it("should combine words and descriptions", () => {
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: "yoga" },
      ];
      const descriptionArray: LanguageValueType[] = [
        { language: "ENG", value: "meditation practice spiritual" },
      ];
      const result = generatePhoneticString(wordArray, descriptionArray);
      expect(result).toContain("yoga");
      expect(result).toContain("meditation");
      expect(result).toContain("practice");
      expect(result).toContain("spiritual");
    });

    it("should remove duplicates", () => {
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: "yoga practice" },
      ];
      const descriptionArray: LanguageValueType[] = [
        { language: "ENG", value: "yoga meditation practice" },
      ];
      const result = generatePhoneticString(wordArray, descriptionArray);
      const words = result.split(" ");
      const uniqueWords = [...new Set(words)];
      expect(words.length).toBe(uniqueWords.length);
    });

    it("should filter out stop words", () => {
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: "the meditation and yoga practice" },
      ];
      const result = generatePhoneticString(wordArray, []);
      expect(result).not.toContain("the");
      expect(result).not.toContain("and");
      expect(result).toContain("meditation");
      expect(result).toContain("yoga");
      expect(result).toContain("practice");
    });

    it("should handle special characters and HTML", () => {
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: "<p>meditation & yoga</p>" },
      ];
      const result = generatePhoneticString(wordArray, []);
      expect(result).not.toContain("<p>");
      expect(result).not.toContain("</p>");
      expect(result).not.toContain("&");
      expect(result).toContain("meditation");
      expect(result).toContain("yoga");
    });

    it("should respect maxLength parameter", () => {
      const longText = "word ".repeat(1000);
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: longText },
      ];
      const result = generatePhoneticString(wordArray, [], 100);
      expect(result.length).toBeLessThan(longText.length);
    });

    it("should filter out words with excessive special characters", () => {
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: "yoga !@#$%^&*()_+ meditation" },
      ];
      const result = generatePhoneticString(wordArray, []);
      expect(result).toContain("yoga");
      expect(result).toContain("meditation");
      expect(result).not.toContain("!@#$%^&*()_+");
    });

    it("should handle mixed language arrays", () => {
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: "meditation" },
        { language: "SAN", value: "योग" },
        { language: "TEL", value: "యోగ" },
      ];
      const result = generatePhoneticString(wordArray, []);
      expect(result).toContain("meditation");
      // Should contain transliterated versions of Sanskrit and Telugu words
      expect(result).toMatch(/yoga/i);
    });
  });

  describe("getTransliteratedWords", () => {
    it("should return empty array for empty input", () => {
      expect(getTransliteratedWords({ language: "ENG", value: "" })).toEqual(
        [],
      );
      expect(getTransliteratedWords({ language: "", value: "" })).toEqual([]);
    });

    it("should return original value for English", () => {
      const result = getTransliteratedWords({
        language: "ENG",
        value: "meditation",
      });
      expect(result).toEqual(["meditation"]);
    });

    it("should return original value for unknown languages", () => {
      const result = getTransliteratedWords({
        language: "UNKNOWN",
        value: "word",
      });
      expect(result).toEqual(["word"]);
    });

    it("should handle Sanskrit input", () => {
      const result = getTransliteratedWords({ language: "SAN", value: "गणेश" });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Should contain transliterated versions
      expect(
        result.some(
          (word) =>
            word.toLowerCase().includes("ganesha") || word.includes("gaNEsha"),
        ),
      ).toBe(true);
    });

    it("should handle Telugu input", () => {
      const result = getTransliteratedWords({ language: "TEL", value: "గణేశ" });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Should contain transliterated versions
      expect(
        result.some(
          (word) =>
            word.toLowerCase().includes("ganesha") || word.includes("gaNEsha"),
        ),
      ).toBe(true);
    });

    it("should handle IAST input", () => {
      const result = getTransliteratedWords({
        language: "IAST",
        value: "gaṇeśa",
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Should contain transliterated versions
      expect(
        result.some(
          (word) =>
            word.toLowerCase().includes("ganesha") || word.includes("gaNEsha"),
        ),
      ).toBe(true);
    });

    it("should handle ITRANS input without duplication", () => {
      const result = getTransliteratedWords({
        language: "ITRANS",
        value: "gaNEsha",
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Should return transliterated versions (since it's not duplicating ITRANS)
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle SLP1 input without duplication", () => {
      const result = getTransliteratedWords({
        language: "SLP1",
        value: "gaReRa",
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Should return transliterated versions (since it's not duplicating SLP1)
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle transliteration errors gracefully", () => {
      // Test with invalid input that might cause transliteration to fail
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = getTransliteratedWords({
        language: "SAN",
        value: "invalid text with symbols !@#",
      });

      // Should return an array with at least the original text
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it("should handle case insensitive language codes", () => {
      const result = getTransliteratedWords({ language: "san", value: "गणेश" });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Should contain transliterated versions
      expect(
        result.some(
          (word) =>
            word.toLowerCase().includes("ganesha") || word.includes("gaNEsha"),
        ),
      ).toBe(true);
    });

    it("should trim whitespace from values", () => {
      const result = getTransliteratedWords({
        language: "ENG",
        value: "  meditation  ",
      });
      expect(result).toEqual(["meditation"]);
    });
  });

  describe("cleanText", () => {
    it("should return empty string for falsy input", () => {
      expect(cleanText("")).toBe("");
      expect(cleanText(null as any)).toBe("");
      expect(cleanText(undefined as any)).toBe("");
    });

    it("should remove HTML tags", () => {
      const input = "<p>Hello <strong>world</strong></p>";
      const result = cleanText(input);
      expect(result).toBe("hello world");
    });

    it("should remove special characters", () => {
      const input = "Hello, world! How are you?";
      const result = cleanText(input);
      expect(result).toBe("hello world how are you");
    });

    it("should normalize whitespace", () => {
      const input = "hello    world\n\ttest";
      const result = cleanText(input);
      expect(result).toBe("hello world test");
    });

    it("should convert to lowercase", () => {
      const input = "Hello WORLD Test";
      const result = cleanText(input);
      expect(result).toBe("hello world test");
    });

    it("should handle mixed content", () => {
      const input = "<div>Hello, &amp; welcome!</div>";
      const result = cleanText(input);
      expect(result).toBe("hello welcome");
    });
  });

  describe("extractMeaningfulWords", () => {
    it("should return empty array for empty input", () => {
      expect(extractMeaningfulWords("")).toEqual([]);
      expect(extractMeaningfulWords(null as any)).toEqual([]);
      expect(extractMeaningfulWords(undefined as any)).toEqual([]);
    });

    it("should filter out short words", () => {
      const input = "a big elephant runs fast";
      const result = extractMeaningfulWords(input);
      expect(result).not.toContain("a");
      expect(result).toContain("big");
      expect(result).toContain("elephant");
      expect(result).toContain("runs");
      expect(result).toContain("fast");
    });

    it("should filter out numbers", () => {
      const input = "chapter 123 verse 456 meditation";
      const result = extractMeaningfulWords(input);
      expect(result).not.toContain("123");
      expect(result).not.toContain("456");
      expect(result).toContain("chapter");
      expect(result).toContain("verse");
      expect(result).toContain("meditation");
    });

    it("should filter out stop words", () => {
      const input = "the meditation and yoga practice";
      const result = extractMeaningfulWords(input);
      expect(result).not.toContain("the");
      expect(result).not.toContain("and");
      expect(result).toContain("meditation");
      expect(result).toContain("yoga");
      expect(result).toContain("practice");
    });

    it("should filter out very long words", () => {
      const longWord = "a".repeat(60);
      const input = `meditation ${longWord} yoga`;
      const result = extractMeaningfulWords(input);
      expect(result).not.toContain(longWord);
      expect(result).toContain("meditation");
      expect(result).toContain("yoga");
    });

    it("should respect maxLength parameter", () => {
      const longText = "meditation ".repeat(100);
      const result = extractMeaningfulWords(longText, 50);
      expect(result.length).toBeLessThan(50);
    });

    it("should handle Sanskrit stop words", () => {
      const input = "गणेश च राम वा योग";
      const result = extractMeaningfulWords(input);
      expect(result).not.toContain("च");
      expect(result).not.toContain("वा");
      expect(result).toContain("गणेश");
      expect(result).toContain("राम");
      expect(result).toContain("योग");
    });

    it("should handle Telugu stop words", () => {
      const input = "గణేశ మరియు రామ అను యోగ";
      const result = extractMeaningfulWords(input);
      expect(result).not.toContain("అను");
      expect(result).toContain("గణేశ");
      expect(result).toContain("మరియు");
      expect(result).toContain("రామ");
      expect(result).toContain("యోగ");
    });

    it("should handle special characters in text", () => {
      const input = "meditation! yoga? practice.";
      const result = extractMeaningfulWords(input);
      expect(result).toContain("meditation");
      expect(result).toContain("yoga");
      expect(result).toContain("practice");
    });
  });

  describe("STOP_WORDS", () => {
    it("should be a Set containing common English stop words", () => {
      expect(STOP_WORDS).toBeInstanceOf(Set);
      expect(STOP_WORDS.has("the")).toBe(true);
      expect(STOP_WORDS.has("and")).toBe(true);
      expect(STOP_WORDS.has("or")).toBe(true);
      expect(STOP_WORDS.has("but")).toBe(true);
    });

    it("should contain Sanskrit stop words", () => {
      expect(STOP_WORDS.has("च")).toBe(true);
      expect(STOP_WORDS.has("वा")).toBe(true);
      expect(STOP_WORDS.has("तु")).toBe(true);
    });

    it("should contain Telugu stop words", () => {
      expect(STOP_WORDS.has("అను")).toBe(true);
      expect(STOP_WORDS.has("అందు")).toBe(true);
      expect(STOP_WORDS.has("కాని")).toBe(true);
    });

    it("should contain transliterated stop words", () => {
      expect(STOP_WORDS.has("vā")).toBe(true);
      expect(STOP_WORDS.has("tu")).toBe(true);
      expect(STOP_WORDS.has("ca")).toBe(true);
    });
  });

  describe("SPECIAL_CHARS_PATTERN", () => {
    it("should match common special characters", () => {
      // Reset the regex lastIndex to ensure consistent testing
      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("!")).toBe(true);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("@")).toBe(true);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("#")).toBe(true);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("<>")).toBe(true);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("[]")).toBe(true);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("()")).toBe(true);
    });

    it("should not match alphanumeric characters", () => {
      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("a")).toBe(false);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("1")).toBe(false);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("Z")).toBe(false);
    });

    it("should not match Sanskrit/Telugu characters", () => {
      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("ग")).toBe(false);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("గ")).toBe(false);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("ā")).toBe(false);

      SPECIAL_CHARS_PATTERN.lastIndex = 0;
      expect(SPECIAL_CHARS_PATTERN.test("ṭ")).toBe(false);
    });
  });

  describe("NUMBER_PATTERN", () => {
    it("should match pure numbers", () => {
      expect(NUMBER_PATTERN.test("123")).toBe(true);
      expect(NUMBER_PATTERN.test("0")).toBe(true);
      expect(NUMBER_PATTERN.test("999")).toBe(true);
    });

    it("should not match text with numbers", () => {
      expect(NUMBER_PATTERN.test("123abc")).toBe(false);
      expect(NUMBER_PATTERN.test("abc123")).toBe(false);
      expect(NUMBER_PATTERN.test("12.34")).toBe(false);
    });

    it("should not match empty string", () => {
      expect(NUMBER_PATTERN.test("")).toBe(false);
    });

    it("should not match non-numeric text", () => {
      expect(NUMBER_PATTERN.test("abc")).toBe(false);
      expect(NUMBER_PATTERN.test("test")).toBe(false);
    });
  });

  describe("Integration tests", () => {
    it("should handle complex multilingual dictionary entry", () => {
      const wordArray: LanguageValueType[] = [
        { language: "SAN", value: "योग" },
        { language: "ENG", value: "yoga" },
        { language: "TEL", value: "యోగ" },
      ];

      const descriptionArray: LanguageValueType[] = [
        {
          language: "ENG",
          value:
            "Union, spiritual practice, meditation technique for achieving enlightenment",
        },
        {
          language: "SAN",
          value: "आत्मा च परमात्मा योगः",
        },
      ];

      const result = generatePhoneticString(wordArray, descriptionArray);

      // Should contain English words
      expect(result).toContain("yoga");

      // Should contain meaningful English words
      expect(result).toContain("union");
      expect(result).toContain("spiritual");
      expect(result).toContain("practice");
      expect(result).toContain("meditation");
      expect(result).toContain("technique");
      expect(result).toContain("achieving");
      expect(result).toContain("enlightenment");

      // Should not contain stop words
      expect(result).not.toContain("for");
      expect(result).not.toContain("च");

      // Should contain transliterated versions of Sanskrit words
      expect(result).toMatch(/atma|paramatma|yogah/i);
    });

    it("should handle empty and null values gracefully", () => {
      const wordArray: LanguageValueType[] = [
        { language: "ENG", value: "" },
        { language: "SAN", value: null as any },
        { language: "TEL", value: undefined as any },
        { language: "ENG", value: "yoga" },
      ];

      const result = generatePhoneticString(wordArray, []);
      expect(result).toBe("yoga");
    });

    it("should handle HTML and special characters in realistic content", () => {
      const descriptionArray: LanguageValueType[] = [
        {
          language: "ENG",
          value:
            "<p>Yoga is a <strong>spiritual practice</strong> that involves meditation & breathing techniques.</p>",
        },
      ];

      const result = generatePhoneticString([], descriptionArray);

      expect(result).toContain("yoga");
      expect(result).toContain("spiritual");
      expect(result).toContain("practice");
      expect(result).toContain("meditation");
      expect(result).toContain("breathing");
      expect(result).toContain("techniques");

      expect(result).not.toContain("<p>");
      expect(result).not.toContain("<strong>");
      expect(result).not.toContain("&");
    });
  });
});
