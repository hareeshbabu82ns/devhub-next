/**
 * Lexicon HTML to Markdown Utilities for DevHub
 *
 * This module provides utilities for converting HTML content from lexicon dictionaries
 * to markdown format with proper Sanskrit transliteration support.
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
}

/**
 * Class for parsing lexicon HTML content to markdown
 */
export class LexiconHTMLParser {
  private config: LexiconParserConfig;
  private markdown: string[] = [];
  private unhandledTags: Set<string> = new Set();

  constructor() {
    this.config = {
      dictionary: "",
      sansWordTag: "s",
      keyFromLang: TRANSLITERATION_SCHEMES.SLP1,
      keyToLang: TRANSLITERATION_SCHEMES.DEVANAGARI,
      keyWord: "",
      fromLang: TRANSLITERATION_SCHEMES.SLP1,
      toLang: TRANSLITERATION_SCHEMES.DEVANAGARI,
    };
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
   * Parse HTML content and convert to markdown
   */
  feed(htmlContent: string): void {
    const $ = cheerio.load(htmlContent, {
      xml: false,
    });

    // Process the HTML content
    this.processElement($, $.root());
  }

  /**
   * Process HTML elements recursively
   */
  private processElement(
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

        switch (tagName) {
          case "p":
            this.markdown.push("\n\n");
            this.processElement($, $node);
            this.markdown.push("\n\n");
            break;

          case "br":
            this.markdown.push("  \n");
            break;

          case "b":
          case "strong":
            this.markdown.push("**");
            this.processElement($, $node);
            this.markdown.push("**");
            break;

          case "i":
          case "em":
            // Handle Sanskrit transliteration for italic tags
            const text = $node.text().trim();
            if (this.shouldTransliterate(tagName)) {
              const transliterated = this.transliterateText(text);
              this.markdown.push(`*${transliterated}*`);
            } else {
              this.markdown.push("*");
              this.processElement($, $node);
              this.markdown.push("*");
            }
            break;

          case "u":
            this.markdown.push("_");
            this.processElement($, $node);
            this.markdown.push("_");
            break;

          case "h1":
            this.markdown.push("\n# ");
            this.processElement($, $node);
            this.markdown.push("\n\n");
            break;

          case "h2":
            this.markdown.push("\n## ");
            this.processElement($, $node);
            this.markdown.push("\n\n");
            break;

          case "h3":
            this.markdown.push("\n### ");
            this.processElement($, $node);
            this.markdown.push("\n\n");
            break;

          case "ul":
            this.markdown.push("\n");
            this.processElement($, $node);
            this.markdown.push("\n");
            break;

          case "ol":
            this.markdown.push("\n");
            this.processElement($, $node);
            this.markdown.push("\n");
            break;

          case "li":
            this.markdown.push("- ");
            this.processElement($, $node);
            this.markdown.push("\n");
            break;

          case "a":
            const href = $node.attr("href");
            if (href) {
              this.markdown.push("[");
              this.processElement($, $node);
              this.markdown.push(`](${href})`);
            } else {
              this.processElement($, $node);
            }
            break;

          case "blockquote":
            this.markdown.push("\n> ");
            const beforeLength = this.markdown.length;
            this.processElement($, $node);
            // Ensure the blockquote content is properly formatted
            if (this.markdown.length > beforeLength) {
              // Remove any trailing whitespace from the last added content
              const lastIndex = this.markdown.length - 1;
              if (typeof this.markdown[lastIndex] === "string") {
                this.markdown[lastIndex] = this.markdown[lastIndex].trimEnd();
              }
            }
            this.markdown.push("\n\n");
            break;

          case "code":
            this.markdown.push("`");
            this.processElement($, $node);
            this.markdown.push("`");
            break;

          case "pre":
            this.markdown.push("\n```\n");
            this.processElement($, $node);
            this.markdown.push("\n```\n\n");
            break;

          case "s":
            // Special handling for Sanskrit words with 's' tag
            const sText = $node.text().trim();
            if (this.shouldTransliterate("s")) {
              const transliterated = this.transliterateText(sText);
              this.markdown.push(transliterated);
            } else {
              this.processElement($, $node);
            }
            break;

          case "div":
          case "span":
            // Process content without adding markdown syntax, but add space separation
            this.processElement($, $node);
            // Add a space after div/span content to prevent concatenation
            if (
              this.markdown.length > 0 &&
              !this.markdown[this.markdown.length - 1].endsWith(" ")
            ) {
              this.markdown.push(" ");
            }
            break;

          default:
            // Track unhandled tags for debugging
            this.unhandledTags.add(tagName);
            this.processElement($, $node);
            break;
        }
      }
    });
  }

  /**
   * Check if text should be transliterated based on tag and configuration
   */
  private shouldTransliterate(tagName: string): boolean {
    const isInSanskritDict = LEXICON_SAN_DICT_LIST.includes(
      this.config.dictionary,
    );
    const isSansTag = tagName === this.config.sansWordTag;
    return isInSanskritDict && isSansTag;
  }

  /**
   * Transliterate text using the configured schemes
   */
  private transliterateText(text: string): string {
    try {
      // Convert from the source language to the target language
      return sanscript.t(text, this.config.fromLang, this.config.toLang);
    } catch (error) {
      console.warn("Transliteration failed:", error);
      return text; // Return original text if transliteration fails
    }
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
 * @returns Converted markdown content
 */
export function convertLexiconHtmlToMarkdown(
  dictionary: string,
  content: string,
  keyWord: string = "",
  toLang: string = TRANSLITERATION_SCHEMES.DEVANAGARI,
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
    });
  } else {
    parser.init({
      dictionary,
      keyFromLang: TRANSLITERATION_SCHEMES.SLP1,
      keyToLang: TRANSLITERATION_SCHEMES.SLP1,
      keyWord,
      toLang,
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
