/**
 * Usage examples for enhanced LexiconHTMLParser with custom tag handlers
 */

import {
  convertLexiconHtmlToMarkdown,
  LexiconHTMLParser,
  TRANSLITERATION_SCHEMES,
  type TagHandler,
  type CustomTagReplacement,
} from "./lexicon-utils";

// Example 1: Simple string replacements
export function exampleStringReplacements() {
  const customHandlers = {
    h1: "__",
    h2: "~~",
    h3: "==",
  };

  const html = `
    <h1>Main Title</h1>
    <h2>Subtitle</h2>
    <h3>Section Header</h3>
  `;

  const result = convertLexiconHtmlToMarkdown(
    "mw",
    html,
    "",
    TRANSLITERATION_SCHEMES.DEVANAGARI,
    customHandlers,
  );

  console.log("String replacement result:", result);
  // Output: __Main Title____Subtitle____Section Header__
}

// Example 2: Object-based replacements with open/close
export function exampleObjectReplacements() {
  const customHandlers: Record<string, CustomTagReplacement> = {
    h1: {
      open: "=== ",
      close: " ===\n",
    },
    blockquote: {
      open: "\n> 💡 ",
      close: "\n\n",
    },
    code: {
      open: "```\n",
      close: "\n```\n",
    },
  };

  const html = `
    <h1>Important Note</h1>
    <blockquote>This is a highlighted quote</blockquote>
    <code>console.log('hello world');</code>
  `;

  const result = convertLexiconHtmlToMarkdown(
    "mw",
    html,
    "",
    TRANSLITERATION_SCHEMES.DEVANAGARI,
    customHandlers,
  );

  console.log("Object replacement result:", result);
}

// Example 3: Function-based custom handlers
export function exampleFunctionHandlers() {
  // Custom handler for headers with numbering
  const headerHandler: TagHandler = ($, element, parser) => {
    const text = element.text();
    const level = element.prop("tagName")?.toLowerCase();
    const emoji = level === "h1" ? "🎯" : level === "h2" ? "📌" : "📍";

    parser.addToMarkdown(`\n${emoji} **${text.toUpperCase()}**\n\n`);
  };

  // Custom handler for lists with styled bullets
  const listHandler: TagHandler = ($, element, parser) => {
    parser.addToMarkdown("\n📋 **List:**\n");

    element.find("li").each((index, li) => {
      const $li = $(li);
      const bullet = index % 2 === 0 ? "▶️" : "🔸";
      parser.addToMarkdown(`${bullet} ${$li.text()}\n`);
    });

    parser.addToMarkdown("\n");
  };

  // Custom handler for emphasis with context
  const emphasisHandler: TagHandler = ($, element, parser) => {
    const text = element.text();

    if (text.length > 20) {
      parser.addToMarkdown(`\n> 📖 *${text}*\n\n`);
    } else {
      parser.addToMarkdown(`✨ *${text}* ✨`);
    }
  };

  const customHandlers = {
    h1: headerHandler,
    h2: headerHandler,
    h3: headerHandler,
    ul: listHandler,
    ol: listHandler,
    em: emphasisHandler,
    i: emphasisHandler,
  };

  const html = `
    <h1>Main Documentation</h1>
    <h2>Features</h2>
    <ul>
      <li>Custom tag handlers</li>
      <li>Function-based processing</li>
      <li>Flexible configuration</li>
    </ul>
    <em>Short note</em>
    <i>This is a much longer emphasized text that will be displayed differently</i>
  `;

  const result = convertLexiconHtmlToMarkdown(
    "mw",
    html,
    "",
    TRANSLITERATION_SCHEMES.DEVANAGARI,
    customHandlers,
  );

  console.log("Function handler result:", result);
}

// Example 4: Sanskrit dictionary with custom transliteration
export function exampleSanskritCustomHandlers() {
  // Custom handler for Sanskrit words with additional formatting
  const sanskritWordHandler: TagHandler = ($, element, parser) => {
    const text = element.text();
    // Apply transliteration and add decorative elements
    parser.addToMarkdown(`🕉️ **${text}** 🕉️`);
  };

  // Custom handler for definitions with structured formatting
  const definitionHandler: TagHandler = ($, element, parser) => {
    const text = element.text();
    parser.addToMarkdown(`\n📚 Definition: *${text}*\n\n`);
  };

  const customHandlers = {
    s: sanskritWordHandler, // Sanskrit words
    i: sanskritWordHandler, // Italic Sanskrit words
    div: definitionHandler, // Definitions
  };

  const html = `
    <s>dharma</s> - <div>righteousness, duty, law</div>
    <i>karma</i> - <div>action, deed, fate</div>
  `;

  const result = convertLexiconHtmlToMarkdown(
    "mw", // Monier-Williams dictionary
    html,
    "",
    TRANSLITERATION_SCHEMES.DEVANAGARI,
    customHandlers,
  );

  console.log("Sanskrit custom handler result:", result);
}

// Example 5: Conditional processing based on content
export function exampleConditionalHandlers() {
  // Smart paragraph handler that adapts based on content
  const smartParagraphHandler: TagHandler = ($, element, parser) => {
    const text = element.text();
    const wordCount = text.split(/\s+/).length;

    if (wordCount < 5) {
      // Short paragraphs as highlighted notes
      parser.addToMarkdown(`\n💡 **${text}**\n\n`);
    } else if (wordCount > 50) {
      // Long paragraphs with special formatting
      parser.addToMarkdown(`\n📖 **Long Description:**\n> ${text}\n\n`);
    } else {
      // Regular paragraphs
      parser.addToMarkdown(`\n${text}\n\n`);
    }
  };

  // Smart link handler that processes internal vs external links differently
  const smartLinkHandler: TagHandler = ($, element, parser) => {
    const href = element.attr("href");
    const text = element.text();

    if (!href) {
      parser.addToMarkdown(text);
      return;
    }

    if (href.startsWith("http")) {
      // External link with icon
      parser.addToMarkdown(`🔗 [${text}](${href})`);
    } else if (href.startsWith("#")) {
      // Internal anchor with icon
      parser.addToMarkdown(`📍 [${text}](${href})`);
    } else {
      // Regular relative link
      parser.addToMarkdown(`[${text}](${href})`);
    }
  };

  const customHandlers = {
    p: smartParagraphHandler,
    a: smartLinkHandler,
  };

  const html = `
    <p>Brief note</p>
    <p>This is a medium-length paragraph with some interesting content that provides context.</p>
    <p>This is a very long paragraph that contains extensive information about the topic at hand. It goes into great detail and provides comprehensive coverage of the subject matter. Such paragraphs typically require special formatting to improve readability and help users digest the large amount of information presented.</p>
    <a href="https://example.com">External Link</a>
    <a href="#section1">Internal Section</a>
    <a href="/relative/path">Relative Link</a>
  `;

  const result = convertLexiconHtmlToMarkdown(
    "test",
    html,
    "",
    TRANSLITERATION_SCHEMES.DEVANAGARI,
    customHandlers,
  );

  console.log("Conditional handler result:", result);
}

// Example 6: Mixed handler types
export function exampleMixedHandlers() {
  // Combine different types of handlers
  const tableHandler: TagHandler = ($, element, parser) => {
    parser.addToMarkdown("\n📊 **Table Data:**\n\n");

    element.find("tr").each((rowIndex, row) => {
      const $row = $(row);
      const cells: string[] = [];

      $row.find("td, th").each((_, cell) => {
        cells.push($(cell).text());
      });

      if (cells.length > 0) {
        parser.addToMarkdown(`| ${cells.join(" | ")} |\n`);
      }
    });

    parser.addToMarkdown("\n");
  };

  const customHandlers = {
    // String replacement
    strong: "**STRONG:",

    // Object replacement
    em: {
      open: "_EMPHASIS: ",
      close: "_",
    },

    // Function handler
    table: tableHandler,

    // Object with function
    span: {
      handler: ($, element, parser) => {
        const className = element.attr("class");
        const text = element.text();

        if (className === "highlight") {
          parser.addToMarkdown(`🎨 ${text} 🎨`);
        } else {
          parser.addToMarkdown(text);
        }
      },
    } as CustomTagReplacement,
  };

  const html = `
    <strong>Important</strong>
    <em>emphasized text</em>
    <span class="highlight">highlighted content</span>
    <span>normal content</span>
    <table>
      <tr><th>Header 1</th><th>Header 2</th></tr>
      <tr><td>Cell 1</td><td>Cell 2</td></tr>
      <tr><td>Cell 3</td><td>Cell 4</td></tr>
    </table>
  `;

  const result = convertLexiconHtmlToMarkdown(
    "test",
    html,
    "",
    TRANSLITERATION_SCHEMES.DEVANAGARI,
    customHandlers,
  );

  console.log("Mixed handler result:", result);
}

// Example usage function
export function runAllExamples() {
  console.log("=== LexiconHTMLParser Custom Handler Examples ===\n");

  exampleStringReplacements();
  console.log("\n" + "=".repeat(50) + "\n");

  exampleObjectReplacements();
  console.log("\n" + "=".repeat(50) + "\n");

  exampleFunctionHandlers();
  console.log("\n" + "=".repeat(50) + "\n");

  exampleSanskritCustomHandlers();
  console.log("\n" + "=".repeat(50) + "\n");

  exampleConditionalHandlers();
  console.log("\n" + "=".repeat(50) + "\n");

  exampleMixedHandlers();
}

// Utility function to create a parser with common custom handlers
export function createParserWithCommonHandlers(): LexiconHTMLParser {
  const parser = new LexiconHTMLParser();

  const commonHandlers = {
    // Headers with emoji indicators
    h1: "🎯 ",
    h2: "📌 ",
    h3: "📍 ",

    // Special formatting for quotes
    blockquote: {
      open: "\n> 💭 ",
      close: "\n\n",
    } as CustomTagReplacement,

    // Code with syntax highlighting indicator
    code: {
      open: "```\n",
      close: "\n```\n",
    } as CustomTagReplacement,

    // Custom list formatting
    ul: (($, element, parser) => {
      parser.addToMarkdown("\n📋 **List:**\n");
      element.find("li").each((index, li) => {
        const $li = $(li);
        parser.addToMarkdown(`  • ${$li.text()}\n`);
      });
      parser.addToMarkdown("\n");
    }) as TagHandler,
  };

  parser.init({
    dictionary: "common",
    customTagHandlers: commonHandlers,
  });

  return parser;
}
