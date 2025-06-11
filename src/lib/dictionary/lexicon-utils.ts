/**
 * Lexicon HTML to Markdown Utilities for DevHub - Enhanced Version
 *
 * This module provides utilities for converting HTML content from lexicon dictionaries
 * to markdown format with proper Sanskrit transliteration support and customizable tag handlers.
 */

import * as cheerio from "cheerio";
import sanscript from "@indic-transliteration/sanscript";

/**
 * Sanskrit word tag mappings for different dictionaries
 */
export const SANS_WORD_TAG: Record<string, string> = {
  ben: "i", // has both i and s
  bhs: "b",
  ieg: "i",
  inm: "i",
  lan: "b",
  mci: "i",
  mw72: "i", // has both i and s
  pgn: "i",
  pui: "i",
  snp: "i",
  vei: "b",
  default: "s",
};

/**
 * Sanskrit word language mappings for different dictionaries
 */
export const SANS_WORD_LANG: Record<string, string> = {
  ben: "iast",
  bhs: "iast",
  inm: "iast",
  lan: "iast",
  mci: "iast",
  mw72: "iast",
  pgn: "iast",
  pui: "iast",
  snp: "iast",
  vei: "iast",
  default: "slp1",
};

/**
 * List of Sanskrit dictionaries
 */
export const LEXICON_SAN_DICT_LIST = [
  "acc",
  "ap90",
  "armh",
  "ben",
  "bhs",
  "cae",
  "gst",
  "ieg",
  "inm",
  "krm",
  "lan",
  "mci",
  "md",
  "mw",
  "mw72",
  "pe",
  "pgn",
  "pui",
  "shs",
  "skd",
  "snp",
  "vcp",
  "vei",
  "wil",
  "yat",
];

/**
 * Transliteration scheme mappings
 */
export const TRANSLITERATION_SCHEMES = {
  DEVANAGARI: "devanagari",
  IAST: "iast",
  SLP1: "slp1",
  ITRANS: "itrans",
} as const;

/**
 * Custom tag handler function type
 */
export type TagHandler = (
  $: cheerio.CheerioAPI,
  element: cheerio.Cheerio<any>,
  parser: LexiconHTMLParser,
) => void;

/**
 * Custom tag replacement configuration
 */
export interface CustomTagReplacement {
  open?: string;
  close?: string;
  handler?: TagHandler;
}

/**
 * Configuration for lexicon HTML parsing
 */
export interface LexiconParserConfig {
  dictionary: string;
  sansWordTag: string;
  keyFromLang: string;
  keyToLang: string;
  keyWord: string;
  fromLang: string;
  toLang: string;
  customTagHandlers?: Record<
    string,
    string | CustomTagReplacement | TagHandler
  >;
}

/**
 * Enhanced class for parsing lexicon HTML content to markdown with handler-based system
 */
export class LexiconHTMLParser {
  private config: LexiconParserConfig;
  private markdown: string[] = [];
  private unhandledTags: Set<string> = new Set();
  private defaultHandlers: Record<string, TagHandler>;

  constructor() {
    this.config = {
      dictionary: "",
      sansWordTag: "s",
      keyFromLang: TRANSLITERATION_SCHEMES.SLP1,
      keyToLang: TRANSLITERATION_SCHEMES.DEVANAGARI,
      keyWord: "",
      fromLang: TRANSLITERATION_SCHEMES.SLP1,
      toLang: TRANSLITERATION_SCHEMES.DEVANAGARI,
      customTagHandlers: {},
    };

    this.defaultHandlers = this.createDefaultHandlers();
  }

  /**
   * Create default tag handlers using the handler system
   */
  private createDefaultHandlers(): Record<string, TagHandler> {
    return {
      p: ($, element, parser) => {
        parser.addToMarkdown("\n\n");
        parser.processElement($, element);
        parser.addToMarkdown("\n\n");
      },

      br: ($, element, parser) => {
        parser.addToMarkdown("  \n");
      },

      b: ($, element, parser) => {
        const text = element.text().trim();
        if (parser.shouldTransliterate("b")) {
          const transliterated = parser.transliterateText(text);
          parser.addToMarkdown(`__${transliterated}__`);
        } else {
          parser.addToMarkdown("**");
          parser.processElement($, element);
          parser.addToMarkdown("**");
        }
      },

      strong: ($, element, parser) => {
        parser.addToMarkdown("**");
        parser.processElement($, element);
        parser.addToMarkdown("**");
      },

      i: ($, element, parser) => {
        const text = element.text().trim();
        if (parser.shouldTransliterate("i")) {
          const transliterated = parser.transliterateText(text);
          parser.addToMarkdown(`__${transliterated}__`);
        } else {
          parser.addToMarkdown("*");
          parser.processElement($, element);
          parser.addToMarkdown("*");
        }
      },
      s: ($, element, parser) => {
        const text = element.text().trim();
        if (parser.shouldTransliterate("s")) {
          const transliterated = parser.transliterateText(text);
          parser.addToMarkdown(`__${transliterated}__`);
        } else {
          parser.addToMarkdown("*");
          parser.processElement($, element);
          parser.addToMarkdown("*");
        }
      },
      em: ($, element, parser) => {
        const text = element.text().trim();
        if (parser.shouldTransliterate("em")) {
          const transliterated = parser.transliterateText(text);
          parser.addToMarkdown(`*${transliterated}*`);
        } else {
          parser.addToMarkdown("*");
          parser.processElement($, element);
          parser.addToMarkdown("*");
        }
      },

      u: ($, element, parser) => {
        parser.addToMarkdown("_");
        parser.processElement($, element);
        parser.addToMarkdown("_");
      },

      h1: ($, element, parser) => {
        parser.addToMarkdown("\n# ");
        parser.processElement($, element);
        parser.addToMarkdown("\n\n");
      },

      h2: ($, element, parser) => {
        parser.addToMarkdown("\n## ");
        parser.processElement($, element);
        parser.addToMarkdown("\n\n");
      },

      h3: ($, element, parser) => {
        parser.addToMarkdown("\n### ");
        parser.processElement($, element);
        parser.addToMarkdown("\n\n");
      },

      h4: ($, element, parser) => {
        parser.addToMarkdown("\n#### ");
        parser.processElement($, element);
        parser.addToMarkdown("\n\n");
      },

      h5: ($, element, parser) => {
        parser.addToMarkdown("\n##### ");
        parser.processElement($, element);
        parser.addToMarkdown("\n\n");
      },

      h6: ($, element, parser) => {
        parser.addToMarkdown("\n###### ");
        parser.processElement($, element);
        parser.addToMarkdown("\n\n");
      },

      ul: ($, element, parser) => {
        parser.addToMarkdown("\n");
        parser.processElement($, element);
        parser.addToMarkdown("\n");
      },

      ol: ($, element, parser) => {
        parser.addToMarkdown("\n");
        parser.processElement($, element);
        parser.addToMarkdown("\n");
      },

      li: ($, element, parser) => {
        parser.addToMarkdown("- ");
        parser.processElement($, element);
        parser.addToMarkdown("\n");
      },

      a: ($, element, parser) => {
        const href = element.attr("href");
        if (href) {
          parser.addToMarkdown("[");
          parser.processElement($, element);
          parser.addToMarkdown(`](${href})`);
        } else {
          parser.processElement($, element);
        }
      },

      blockquote: ($, element, parser) => {
        parser.addToMarkdown("\n> ");
        const beforeLength = parser.markdown.length;
        parser.processElement($, element);
        // Ensure the blockquote content is properly formatted
        if (parser.markdown.length > beforeLength) {
          // Remove any trailing whitespace from the last added content
          const lastIndex = parser.markdown.length - 1;
          if (typeof parser.markdown[lastIndex] === "string") {
            parser.markdown[lastIndex] = parser.markdown[lastIndex].trimEnd();
          }
        }
        parser.addToMarkdown("\n\n");
      },

      code: ($, element, parser) => {
        parser.addToMarkdown("`");
        parser.processElement($, element);
        parser.addToMarkdown("`");
      },

      pre: ($, element, parser) => {
        parser.addToMarkdown("\n```\n");
        parser.processElement($, element);
        parser.addToMarkdown("\n```\n\n");
      },

      div: ($, element, parser) => {
        parser.processElement($, element);
        // Add a space after div content to prevent concatenation
        if (
          parser.markdown.length > 0 &&
          !parser.markdown[parser.markdown.length - 1].endsWith(" ")
        ) {
          parser.addToMarkdown(" ");
        }
      },

      span: ($, element, parser) => {
        parser.processElement($, element);
        // Add a space after span content to prevent concatenation
        if (
          parser.markdown.length > 0 &&
          !parser.markdown[parser.markdown.length - 1].endsWith(" ")
        ) {
          parser.addToMarkdown(" ");
        }
      },

      // Table elements
      table: ($, element, parser) => {
        parser.addToMarkdown("\n");
        parser.processElement($, element);
        parser.addToMarkdown("\n");
      },

      thead: ($, element, parser) => {
        parser.processElement($, element);
      },

      tbody: ($, element, parser) => {
        parser.processElement($, element);
      },

      tr: ($, element, parser) => {
        parser.addToMarkdown("| ");
        const cells = element.find("td, th");
        cells.each((index, cell) => {
          const $cell = $(cell);
          parser.processElement($, $cell);
          if (index < cells.length - 1) {
            parser.addToMarkdown(" | ");
          }
        });
        parser.addToMarkdown(" |\n");
      },

      td: ($, element, parser) => {
        // Processing is handled by tr handler
      },

      th: ($, element, parser) => {
        // Processing is handled by tr handler
      },

      // Text formatting
      sup: ($, element, parser) => {
        parser.addToMarkdown("^");
        parser.processElement($, element);
        parser.addToMarkdown("^");
      },

      sub: ($, element, parser) => {
        parser.addToMarkdown("~");
        parser.processElement($, element);
        parser.addToMarkdown("~");
      },

      del: ($, element, parser) => {
        parser.addToMarkdown("~~");
        parser.processElement($, element);
        parser.addToMarkdown("~~");
      },

      strike: ($, element, parser) => {
        parser.addToMarkdown("~~");
        parser.processElement($, element);
        parser.addToMarkdown("~~");
      },

      hr: ($, element, parser) => {
        parser.addToMarkdown("\n\n---\n\n");
      },

      // Definition lists
      dl: ($, element, parser) => {
        parser.addToMarkdown("\n");
        parser.processElement($, element);
        parser.addToMarkdown("\n");
      },

      dt: ($, element, parser) => {
        parser.addToMarkdown("**");
        parser.processElement($, element);
        parser.addToMarkdown("**\n");
      },

      dd: ($, element, parser) => {
        parser.addToMarkdown(": ");
        parser.processElement($, element);
        parser.addToMarkdown("\n");
      },
    };
  }

  getConfig(): LexiconParserConfig {
    return this.config;
  }

  /**
   * Initialize the parser with configuration
   */
  init(config: Partial<LexiconParserConfig>): void {
    this.config = { ...this.config, ...config };
    this.markdown = [];
    this.unhandledTags.clear();
  }

  /**
   * Add markdown content to the output - public for use by handlers
   */
  addToMarkdown(content: string): void {
    this.markdown.push(content);
  }

  /**
   * Process HTML elements recursively - public for use by handlers
   */
  processElement($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>): void {
    this.processElementInternal($, element);
  }

  /**
   * Check if text should be transliterated - public for use by handlers
   */
  shouldTransliterate(tagName: string): boolean {
    // const isInSanskritDict = LEXICON_SAN_DICT_LIST.includes(
    //   this.config.dictionary,
    // );
    const isSansTag = tagName === this.config.sansWordTag;
    return isSansTag;
  }

  /**
   * Transliterate text using the configured schemes - public for use by handlers
   */
  transliterateText(text: string): string {
    try {
      // Convert from the source language to the target language
      return sanscript.t(text, this.config.fromLang, this.config.toLang);
    } catch (error) {
      console.warn("Transliteration failed:", error);
      return text; // Return original text if transliteration fails
    }
  }

  /**
   * Get the default handler for a tag - public for extending functionality
   */
  getDefaultHandler(tagName: string): TagHandler | undefined {
    return this.defaultHandlers[tagName];
  }

  /**
   * Set or override a default handler - public for extending functionality
   */
  setDefaultHandler(tagName: string, handler: TagHandler): void {
    this.defaultHandlers[tagName] = handler;
  }

  /**
   * Parse HTML content and convert to markdown
   */
  feed(htmlContent: string): void {
    const $ = cheerio.load(htmlContent, {
      xml: false,
    });

    // Process the HTML content
    this.processElementInternal($, $.root());
  }

  /**
   * Handle custom tag processing
   */
  private handleCustomTag(
    $: cheerio.CheerioAPI,
    element: cheerio.Cheerio<any>,
    tagName: string,
  ): boolean {
    const customHandler = this.config.customTagHandlers?.[tagName];

    if (!customHandler) {
      return false;
    }

    // If it's a simple string replacement
    if (typeof customHandler === "string") {
      this.markdown.push(customHandler);
      this.processElementInternal($, element);
      this.markdown.push(customHandler);
      return true;
    }

    // If it's a function handler
    if (typeof customHandler === "function") {
      customHandler($, element, this);
      return true;
    }

    // If it's a replacement configuration object
    if (typeof customHandler === "object" && customHandler !== null) {
      if (customHandler.handler) {
        customHandler.handler($, element, this);
        return true;
      }

      // Handle open/close replacement
      if (customHandler.open !== undefined) {
        this.markdown.push(customHandler.open);
      }

      this.processElementInternal($, element);

      if (customHandler.close !== undefined) {
        this.markdown.push(customHandler.close);
      }

      return true;
    }

    return false;
  }

  /**
   * Process HTML elements recursively using the handler system
   */
  private processElementInternal(
    $: cheerio.CheerioAPI,
    element: cheerio.Cheerio<any>,
  ): void {
    element.contents().each((_, node) => {
      const $node = $(node);

      if (node.type === "text") {
        const text = $node.text();
        if (text) {
          // For blockquote context, trim whitespace from text nodes
          const parent = node.parent;
          if (
            parent &&
            "tagName" in parent &&
            parent.tagName?.toLowerCase() === "blockquote"
          ) {
            const trimmedText = text.trim();
            if (trimmedText) {
              this.markdown.push(trimmedText);
            }
          } else {
            this.markdown.push(text);
          }
        }
        return;
      }

      if (node.type === "tag") {
        const tagName = node.tagName.toLowerCase();

        // Check for custom tag handlers first
        if (this.handleCustomTag($, $node, tagName)) {
          return;
        }

        // Check for default handlers
        const defaultHandler = this.defaultHandlers[tagName];
        if (defaultHandler) {
          defaultHandler($, $node, this);
          return;
        }

        // If no handler is found, track as unhandled and process content
        this.unhandledTags.add(tagName);
        this.processElementInternal($, $node);
      }
    });
  }

  /**
   * Get the generated markdown content
   */
  get markDown(): string {
    return this.markdown
      .join("")
      .replace(/\n{3,}/g, "\n\n") // Replace multiple newlines with double newlines
      .trim();
  }

  /**
   * Get unhandled HTML tags for debugging
   */
  get unhandledTagsList(): string[] {
    return Array.from(this.unhandledTags);
  }
}

/**
 * Convert lexicon HTML content to markdown with Sanskrit transliteration support
 *
 * @param dictionary - Dictionary identifier (e.g., 'mw', 'ap90', etc.)
 * @param content - HTML content to convert
 * @param keyWord - Optional keyword for context
 * @param toLang - Target transliteration scheme (default: devanagari)
 * @param customTagHandlers - Custom tag handlers for overriding default behavior
 * @returns Converted markdown content
 */
export function convertLexiconHtmlToMarkdown(
  dictionary: string,
  content: string,
  keyWord: string = "",
  toLang: string = TRANSLITERATION_SCHEMES.DEVANAGARI,
  customTagHandlers?: Record<
    string,
    string | CustomTagReplacement | TagHandler
  >,
): string {
  const sansWordTag = SANS_WORD_TAG[dictionary] || SANS_WORD_TAG.default;
  const sansWordLang = ["i", "b"].includes(sansWordTag)
    ? TRANSLITERATION_SCHEMES.IAST
    : TRANSLITERATION_SCHEMES.SLP1;

  const parser = new LexiconHTMLParser();

  if (LEXICON_SAN_DICT_LIST.includes(dictionary)) {
    parser.init({
      dictionary,
      sansWordTag,
      keyFromLang: TRANSLITERATION_SCHEMES.SLP1,
      keyToLang: toLang,
      keyWord,
      fromLang: sansWordLang,
      toLang,
      customTagHandlers,
    });
  } else {
    parser.init({
      dictionary,
      keyFromLang: TRANSLITERATION_SCHEMES.SLP1,
      keyToLang: TRANSLITERATION_SCHEMES.SLP1,
      keyWord,
      toLang,
      customTagHandlers,
    });
  }

  parser.feed(content);
  return parser.markDown;
}

/**
 * Utility function to clean and normalize HTML content before processing
 */
export function cleanHtmlContent(content: string): string {
  return content
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
