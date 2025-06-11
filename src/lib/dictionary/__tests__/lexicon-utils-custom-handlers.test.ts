/**
 * Tests for LexiconHTMLParser custom tag handlers
 */

import {
  LexiconHTMLParser,
  convertLexiconHtmlToMarkdown,
  type TagHandler,
  type CustomTagReplacement,
} from "@/lib/dictionary/lexicon-utils";
import { TRANSLITERATION_SCHEMES } from "../dictionary-constants";

describe("LexiconHTMLParser Custom Tag Handlers", () => {
  let parser: LexiconHTMLParser;

  beforeEach(() => {
    parser = new LexiconHTMLParser();
  });

  describe("String replacement handlers", () => {
    it("should override h1 with custom string replacement", () => {
      const customHandlers = {
        h1: "__",
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed("<h1>Test Header</h1>");

      expect(parser.markDown).toBe("__Test Header__");
    });

    it("should override multiple tags with string replacements", () => {
      const customHandlers = {
        h1: "__",
        h2: "~~",
        strong: "***",
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed(
        "<h1>Header 1</h1><h2>Header 2</h2><strong>Bold Text</strong>",
      );

      expect(parser.markDown).toBe("__Header 1__~~Header 2~~***Bold Text***");
    });
  });

  describe("Object replacement handlers", () => {
    it("should handle open/close replacement configuration", () => {
      const customHandlers: Record<string, CustomTagReplacement> = {
        h1: {
          open: "=== ",
          close: " ===",
        },
        blockquote: {
          open: ">>> ",
          close: " <<<",
        },
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed(
        "<h1>Custom Header</h1><blockquote>Custom Quote</blockquote>",
      );

      expect(parser.markDown).toBe("=== Custom Header ===>>> Custom Quote <<<");
    });

    it("should handle only open replacement", () => {
      const customHandlers: Record<string, CustomTagReplacement> = {
        br: {
          open: " | ",
        },
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed("Line 1<br>Line 2<br>Line 3");

      expect(parser.markDown).toBe("Line 1 | Line 2 | Line 3");
    });
  });

  describe("Function handlers", () => {
    it("should handle custom function for tag processing", () => {
      const h1Handler: TagHandler = ($, element, parser) => {
        const text = element.text();
        parser.addToMarkdown(`🎯 ${text.toUpperCase()} 🎯`);
      };

      const customHandlers = {
        h1: h1Handler,
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed("<h1>Important Header</h1>");

      expect(parser.markDown).toBe("🎯 IMPORTANT HEADER 🎯");
    });

    it("should handle complex function with nested processing", () => {
      const listHandler: TagHandler = ($, element, parser) => {
        parser.addToMarkdown("\n📋 **List Items:**\n");

        element.find("li").each((index, li) => {
          const $li = $(li);
          parser.addToMarkdown(`  ${index + 1}. ${$li.text()}\n`);
        });

        parser.addToMarkdown("\n");
      };

      const customHandlers = {
        ul: listHandler,
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed(
        "<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>",
      );

      expect(parser.markDown).toBe(
        "📋 **List Items:**\n  1. First item\n  2. Second item\n  3. Third item",
      );
    });

    it("should handle function with conditional logic", () => {
      const conditionalHandler: TagHandler = ($, element, parser) => {
        const text = element.text();

        if (text.length > 10) {
          parser.addToMarkdown(`🔥 **${text}** 🔥`);
        } else {
          parser.addToMarkdown(`✨ ${text} ✨`);
        }
      };

      const customHandlers = {
        span: conditionalHandler,
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed(
        "<span>Short</span><span>This is a very long text that exceeds ten characters</span>",
      );

      expect(parser.markDown).toBe(
        "✨ Short ✨🔥 **This is a very long text that exceeds ten characters** 🔥",
      );
    });
  });

  describe("Object handlers with custom functions", () => {
    it("should handle object with custom handler function", () => {
      const customHandler: TagHandler = ($, element, parser) => {
        const text = element.text();
        parser.addToMarkdown(`[CUSTOM: ${text}]`);
      };

      const customHandlers: Record<string, CustomTagReplacement> = {
        code: {
          handler: customHandler,
        },
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed("<code>function test() { return 42; }</code>");

      expect(parser.markDown).toBe("[CUSTOM: function test() { return 42; }]");
    });
  });

  describe("Integration with convertLexiconHtmlToMarkdown", () => {
    it("should work with the main conversion function", () => {
      const customHandlers = {
        h1: "=== ",
        h2: { open: "## ", close: " ##" },
        strong: (($: any, element: any, parser: any) => {
          parser.addToMarkdown(`**${element.text().toUpperCase()}**`);
        }) as TagHandler,
      };

      const html =
        "<h1>Header</h1><h2>Subheader</h2><strong>bold text</strong>";

      const result = convertLexiconHtmlToMarkdown(
        "ae",
        html,
        "",
        TRANSLITERATION_SCHEMES.DEVANAGARI,
        customHandlers,
      );

      expect(result).toBe("=== Header=== ## Subheader ##**BOLD TEXT**");
    });

    it("should maintain default behavior for non-custom tags", () => {
      const customHandlers = {
        h1: "__",
      };

      const html = "<h1>Custom</h1><h2>Default</h2><strong>Bold</strong>";

      const result = convertLexiconHtmlToMarkdown(
        "ae",
        html,
        "",
        TRANSLITERATION_SCHEMES.DEVANAGARI,
        customHandlers,
      );

      // h1 uses custom handler, h2 and strong use default behavior
      expect(result).toContain("__Custom__");
      expect(result).toContain("## Default");
      expect(result).toContain("**Bold**");
    });
  });

  describe("Priority and fallback behavior", () => {
    it("should prioritize custom handlers over default behavior", () => {
      const customHandlers = {
        strong: "~~~",
        b: "***",
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed(
        "<strong>Strong Text</strong><b>Bold Text</b><em>Italic Text</em>",
      );

      // strong and b should use custom handlers, em should use default
      expect(parser.markDown).toBe(
        "~~~Strong Text~~~***Bold Text****Italic Text*",
      );
    });

    it("should handle custom handlers for unrecognized tags", () => {
      const customHandlers = {
        customtag: "[[[ ",
        anothertag: { open: ">>> ", close: " <<<" },
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed(
        "<customtag>Custom Content</customtag><anothertag>Another Content</anothertag>",
      );

      expect(parser.markDown).toBe(
        "[[[ Custom Content[[[ >>> Another Content <<<",
      );
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle empty custom handlers gracefully", () => {
      parser.init({
        dictionary: "ae",
        customTagHandlers: {},
      });

      parser.feed("<h1>Normal Header</h1>");

      // Should fall back to default behavior
      expect(parser.markDown).toContain("# Normal Header");
    });

    it("should handle null/undefined custom handlers", () => {
      parser.init({
        dictionary: "ae",
        customTagHandlers: undefined,
      });

      parser.feed("<h1>Normal Header</h1>");

      // Should fall back to default behavior
      expect(parser.markDown).toContain("# Normal Header");
    });

    it("should handle invalid custom handler types gracefully", () => {
      const customHandlers = {
        h1: null as any,
        h2: 123 as any,
        h3: [] as any,
      };

      parser.init({
        dictionary: "ae",
        customTagHandlers: customHandlers,
      });

      parser.feed("<h1>Header 1</h1><h2>Header 2</h2><h3>Header 3</h3>");

      // Should fall back to default behavior for invalid handlers
      expect(parser.markDown).toContain("# Header 1");
      expect(parser.markDown).toContain("## Header 2");
      expect(parser.markDown).toContain("Header 3"); // h3 falls back but may not have ### due to invalid handler
    });
  });
});
