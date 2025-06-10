/**
 * Tests for Lexicon HTML to Markdown Utilities
 */

import {
  convertLexiconHtmlToMarkdown,
  cleanHtmlContent,
  LexiconHTMLParser,
  SANS_WORD_TAG,
  SANS_WORD_LANG,
  LEXICON_SAN_DICT_LIST,
  TRANSLITERATION_SCHEMES,
} from "@/lib/dictionary/lexicon-utils";
import { cleanText, generatePhoneticString } from "../dictionary/word-utils";

describe("Lexicon HTML to Markdown Utilities", () => {
  describe("convertLexiconHtmlToMarkdown", () => {
    it("should convert simple HTML to markdown", () => {
      const html =
        "<p>This is a <b>bold</b> text with <i>italic</i> words.</p>";
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("**bold**");
      expect(result).toContain("*italic*");
      expect(result).toContain("This is a");
    });

    it("should handle empty content", () => {
      const result = convertLexiconHtmlToMarkdown("test", "");
      expect(result).toBe("");
    });

    it("should handle content with only whitespace", () => {
      const result = convertLexiconHtmlToMarkdown("test", "   \n\t   ");
      expect(result).toBe("");
    });

    it("should convert headings correctly", () => {
      const html = "<h1>Main Title</h1><h2>Subtitle</h2><h3>Section</h3>";
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("# Main Title");
      expect(result).toContain("## Subtitle");
      expect(result).toContain("### Section");
    });

    it("should convert lists correctly", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("- Item 1");
      expect(result).toContain("- Item 2");
    });

    it("should convert links correctly", () => {
      const html = '<a href="https://example.com">Example Link</a>';
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("[Example Link](https://example.com)");
    });

    it("should handle links without href", () => {
      const html = "<a>Just text</a>";
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("Just text");
      expect(result).not.toContain("[");
      expect(result).not.toContain("]");
    });

    it("should convert blockquotes correctly", () => {
      const html = "<blockquote>This is a quote</blockquote>";
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("> This is a quote");
    });

    it("should convert code elements correctly", () => {
      const html = '<code>console.log("hello")</code>';
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain('`console.log("hello")`');
    });

    it("should convert pre elements correctly", () => {
      const html = "<pre>function test() {\n  return true;\n}</pre>";
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("```");
      expect(result).toContain("function test()");
    });

    it("should handle line breaks correctly", () => {
      const html = "Line 1<br>Line 2<br/>Line 3";
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("Line 1  \nLine 2  \nLine 3");
    });

    it("should handle nested elements", () => {
      const html = "<p>This is <b>bold with <i>italic</i> inside</b> text.</p>";
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("**bold with *italic* inside**");
      expect(result).toContain("This is");
      expect(result).toContain("text.");
    });

    it("should handle div and span elements without adding markdown syntax", () => {
      const html = "<div>Content in div</div><span>Content in span</span>";
      const result = convertLexiconHtmlToMarkdown("test", html);

      expect(result).toContain("Content in div");
      expect(result).toContain("Content in span");
      // Check that the actual tag names are not in the output
      expect(result).not.toMatch(/<\/?div>/);
      expect(result).not.toMatch(/<\/?span>/);
    });
  });

  describe("Sanskrit dictionary handling", () => {
    it("should handle Sanskrit dictionaries with transliteration", () => {
      const html = "<i>ganesha</i> is a <b>deity</b>";
      const result = convertLexiconHtmlToMarkdown(
        "dhatu_pata",
        html,
        "ganesha",
      );

      // Should contain transliterated content for Bengali dictionary
      expect(result).toContain("**deity**");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle non-Sanskrit dictionaries without transliteration", () => {
      const html = "<i>english</i> word";
      const result = convertLexiconHtmlToMarkdown("eng2te", html);

      expect(result).toContain("*english*");
      expect(result).toContain("word");
    });

    it("should use correct word tags for different dictionaries", () => {
      // Test that different dictionaries use their specific tags
      expect(SANS_WORD_TAG.ben).toBe("i");
      expect(SANS_WORD_TAG.bhs).toBe("b");
      expect(SANS_WORD_TAG.default).toBe("s");
    });

    it("should handle s tag for Sanskrit words", () => {
      const html = "<s>sanskrit_word</s> in context";
      const result = convertLexiconHtmlToMarkdown("mw", html);

      expect(result).toContain("in context");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("cleanHtmlContent", () => {
    it("should replace non-breaking spaces with regular spaces", () => {
      const content = "text&nbsp;with&nbsp;spaces";
      const result = cleanHtmlContent(content);

      expect(result).toBe("text with spaces");
    });

    it("should normalize multiple whitespace characters", () => {
      const content = "text   with\n\tmultiple\r\nspaces";
      const result = cleanHtmlContent(content);

      expect(result).toBe("text with multiple spaces");
    });

    it("should trim leading and trailing whitespace", () => {
      const content = "   text with spaces   ";
      const result = cleanHtmlContent(content);

      expect(result).toBe("text with spaces");
    });

    it("should handle empty content", () => {
      const result = cleanHtmlContent("");
      expect(result).toBe("");
    });

    it("should handle content with only whitespace", () => {
      const content = "   \n\t   ";
      const result = cleanHtmlContent(content);

      expect(result).toBe("");
    });
  });

  describe("LexiconHTMLParser class", () => {
    let parser: LexiconHTMLParser;

    beforeEach(() => {
      parser = new LexiconHTMLParser();
    });

    it("should initialize with default configuration", () => {
      parser.init({ dictionary: "test" });

      expect(parser.unhandledTagsList).toEqual([]);
    });

    it("should track unhandled HTML tags", () => {
      const html =
        "<custom-tag>Content</custom-tag><another-tag>More</another-tag>";
      parser.init({ dictionary: "test" });
      parser.feed(html);

      const unhandledTags = parser.unhandledTagsList;
      expect(unhandledTags).toContain("custom-tag");
      expect(unhandledTags).toContain("another-tag");
    });

    it("should generate clean markdown output", () => {
      const html = "<p>Paragraph 1</p>\n\n\n<p>Paragraph 2</p>";
      parser.init({ dictionary: "test" });
      parser.feed(html);

      const result = parser.markDown;
      expect(result).not.toMatch(/\n{3,}/); // Should not have more than 2 consecutive newlines
    });

    it("should handle complex nested HTML structures", () => {
      const html = `
        <div>
          <h2>Section Title</h2>
          <p>This is a paragraph with <b>bold</b> and <i>italic</i> text.</p>
          <ul>
            <li>First item</li>
            <li>Second item with <a href="https://example.com">link</a></li>
          </ul>
          <blockquote>
            This is a quote with <code>inline code</code>.
          </blockquote>
        </div>
      `;

      parser.init({ dictionary: "test" });
      parser.feed(html);

      const result = parser.markDown;
      expect(result).toContain("## Section Title");
      expect(result).toContain("**bold**");
      expect(result).toContain("*italic*");
      expect(result).toContain("- First item");
      expect(result).toContain("[link](https://example.com)");
      expect(result).toContain("> This is a quote");
      expect(result).toContain("`inline code`");
    });

    it("should handle malformed HTML gracefully", () => {
      const html =
        "<p>Unclosed paragraph<b>Bold without close<i>Nested italic</p>";
      parser.init({ dictionary: "test" });

      expect(() => {
        parser.feed(html);
      }).not.toThrow();

      const result = parser.markDown;
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Constants and configurations", () => {
    it("should have correct Sanskrit word tags", () => {
      expect(SANS_WORD_TAG.ben).toBe("i");
      expect(SANS_WORD_TAG.bhs).toBe("b");
      expect(SANS_WORD_TAG.mw72).toBe("i");
      expect(SANS_WORD_TAG.default).toBe("s");
    });

    it("should have correct Sanskrit word languages", () => {
      expect(SANS_WORD_LANG.ben).toBe("iast");
      expect(SANS_WORD_LANG.bhs).toBe("iast");
      expect(SANS_WORD_LANG.default).toBe("slp1");
    });

    it("should include known Sanskrit dictionaries", () => {
      expect(LEXICON_SAN_DICT_LIST).toContain("mw");
      expect(LEXICON_SAN_DICT_LIST).toContain("ap90");
      expect(LEXICON_SAN_DICT_LIST).toContain("ben");
      expect(LEXICON_SAN_DICT_LIST.length).toBeGreaterThan(20);
    });

    it("should have correct transliteration schemes", () => {
      expect(TRANSLITERATION_SCHEMES.DEVANAGARI).toBe("devanagari");
      expect(TRANSLITERATION_SCHEMES.IAST).toBe("iast");
      expect(TRANSLITERATION_SCHEMES.SLP1).toBe("slp1");
      expect(TRANSLITERATION_SCHEMES.ITRANS).toBe("itrans");
    });
  });

  describe("Error handling", () => {
    it("should handle invalid HTML gracefully", () => {
      const invalidHtml = "<<>>invalid<<html>>";

      expect(() => {
        convertLexiconHtmlToMarkdown("test", invalidHtml);
      }).not.toThrow();
    });

    it("should handle unknown dictionary gracefully", () => {
      const html = "<p>Test content</p>";

      expect(() => {
        convertLexiconHtmlToMarkdown("unknown_dict", html);
      }).not.toThrow();

      const result = convertLexiconHtmlToMarkdown("unknown_dict", html);
      expect(result).toContain("Test content");
    });

    it("should handle transliteration errors gracefully", () => {
      // Test with potentially problematic text that might cause transliteration to fail
      const html = "<i>invalid_sanskrit_text_123</i>";

      expect(() => {
        convertLexiconHtmlToMarkdown("mw", html);
      }).not.toThrow();
    });
  });

  describe("Integration with existing word-utils", () => {
    it("should work alongside existing cleanText function", () => {
      const html = "<p>Test <b>content</b> with <i>markup</i></p>";
      const markdown = convertLexiconHtmlToMarkdown("test", html);
      const cleaned = cleanText(markdown);

      expect(cleaned).toBeTruthy();
      expect(typeof cleaned).toBe("string");
    });

    it("should complement existing generatePhoneticString function", () => {
      const html = "<p>Sanskrit <i>गणेश</i> word</p>";
      const markdown = convertLexiconHtmlToMarkdown("mw", html);

      const wordArray = [{ language: "ENG", value: markdown }];
      const phonetic = generatePhoneticString(wordArray, []);

      expect(phonetic).toBeTruthy();
      expect(typeof phonetic).toBe("string");
    });
  });

  describe("Performance considerations", () => {
    it("should handle large HTML content efficiently", () => {
      // Create a large HTML string
      const largeHtml = Array(1000)
        .fill(
          "<p>This is a paragraph with <b>bold</b> and <i>italic</i> text.</p>",
        )
        .join("\n");

      const startTime = Date.now();
      const result = convertLexiconHtmlToMarkdown("test", largeHtml);
      const endTime = Date.now();

      expect(result.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should not cause memory leaks with repeated parsing", () => {
      const html = "<p>Test <b>content</b> with <i>markup</i></p>";

      // Run the function many times to check for memory leaks
      for (let i = 0; i < 100; i++) {
        convertLexiconHtmlToMarkdown("test", html);
      }

      // If we reach here without running out of memory, the test passes
      expect(true).toBe(true);
    });
  });
});
