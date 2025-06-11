# Enhanced LexiconHTMLParser - Handler-Based System

## Overview

The `LexiconHTMLParser` has been enhanced with a powerful handler-based system that allows for complete customization of how HTML tags are converted to markdown. This enhancement maintains full backward compatibility while providing extensive flexibility for custom tag processing.

## Key Enhancements

### 1. Handler-Based Architecture

The parser now uses a modular handler system where each HTML tag is processed by dedicated handler functions. This replaces the previous switch-case system with a more flexible and extensible approach.

### 2. Three Types of Custom Handlers

#### String Replacement Handlers

Simple string-based replacements for opening and closing tags:

```typescript
const customHandlers = {
  h1: "__", // Replaces <h1>content</h1> with __content__
  h2: "~~", // Replaces <h2>content</h2> with ~~content~~
};
```

#### Object-Based Handlers

More control with separate open/close strings:

```typescript
const customHandlers = {
  h1: {
    open: "=== ",
    close: " ===\n",
  },
  blockquote: {
    open: "\n> 💡 ",
    close: "\n\n",
  },
};
```

#### Function Handlers

Complete control with custom processing functions:

```typescript
const customHandlers = {
  h1: ($, element, parser) => {
    const text = element.text();
    parser.addToMarkdown(`🎯 **${text.toUpperCase()}**\n\n`);
  },
  ul: ($, element, parser) => {
    parser.addToMarkdown("\n📋 **List:**\n");
    element.find("li").each((index, li) => {
      const $li = $(li);
      parser.addToMarkdown(`  • ${$li.text()}\n`);
    });
  },
};
```

### 3. Enhanced Default Handlers

All default HTML tag processing has been converted to use the handler system, making it:

- More modular and maintainable
- Easier to extend or override
- Consistent in behavior

### 4. Public API Methods

The parser now exposes several public methods for use by custom handlers:

- `addToMarkdown(content: string)`: Add content to the markdown output
- `processElement($, element)`: Process child elements recursively
- `shouldTransliterate(tagName: string)`: Check if transliteration should be applied
- `transliterateText(text: string)`: Apply transliteration to text
- `getDefaultHandler(tagName: string)`: Get the default handler for a tag
- `setDefaultHandler(tagName: string, handler)`: Override a default handler

## Usage Examples

### Basic String Replacement

```typescript
import { convertLexiconHtmlToMarkdown } from "@/lib/dictionary/lexicon-utils";

const customHandlers = {
  h1: "__",
  h2: "==",
  strong: "***",
};

const html = "<h1>Title</h1><h2>Subtitle</h2><strong>Bold</strong>";
const markdown = convertLexiconHtmlToMarkdown(
  "mw",
  html,
  "",
  "devanagari",
  customHandlers,
);
// Result: "__Title____Subtitle__***Bold***"
```

### Object-Based Configuration

````typescript
const customHandlers = {
  h1: {
    open: "# 🎯 ",
    close: "\n\n",
  },
  code: {
    open: "```\n",
    close: "\n```\n",
  },
};

const html = "<h1>Important</h1><code>console.log('test');</code>";
const markdown = convertLexiconHtmlToMarkdown(
  "test",
  html,
  "",
  "devanagari",
  customHandlers,
);
// Result: "# 🎯 Important\n\n```\nconsole.log('test');\n```\n"
````

### Advanced Function Handlers

```typescript
const customHandlers = {
  // Smart paragraph handler
  p: ($, element, parser) => {
    const text = element.text();
    const wordCount = text.split(/\s+/).length;

    if (wordCount < 5) {
      parser.addToMarkdown(`\n💡 **${text}**\n\n`);
    } else if (wordCount > 50) {
      parser.addToMarkdown(`\n📖 **Long Description:**\n> ${text}\n\n`);
    } else {
      parser.addToMarkdown(`\n${text}\n\n`);
    }
  },

  // Custom table handler
  table: ($, element, parser) => {
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
  },
};
```

### Sanskrit Dictionary Customization

```typescript
const sanskritHandlers = {
  // Custom Sanskrit word formatting
  s: ($, element, parser) => {
    const text = element.text();
    parser.addToMarkdown(`🕉️ **${text}** 🕉️`);
  },

  // Enhanced italic Sanskrit words
  i: ($, element, parser) => {
    const text = element.text().trim();
    if (parser.shouldTransliterate("i")) {
      const transliterated = parser.transliterateText(text);
      parser.addToMarkdown(`✨ *${transliterated}* ✨`);
    } else {
      parser.addToMarkdown("*");
      parser.processElement($, element);
      parser.addToMarkdown("*");
    }
  },
};

const html = "<s>dharma</s> means <i>righteousness</i>";
const markdown = convertLexiconHtmlToMarkdown(
  "mw",
  html,
  "",
  "devanagari",
  sanskritHandlers,
);
```

### Working with the Parser Directly

```typescript
import { LexiconHTMLParser } from "@/lib/dictionary/lexicon-utils";

const parser = new LexiconHTMLParser();

// Override default handlers
parser.setDefaultHandler("h1", ($, element, parser) => {
  parser.addToMarkdown(`# 🎯 ${element.text().toUpperCase()}\n\n`);
});

// Get and modify existing handlers
const defaultH2Handler = parser.getDefaultHandler("h2");
if (defaultH2Handler) {
  parser.setDefaultHandler("h2", ($, element, parser) => {
    parser.addToMarkdown("## 📌 ");
    parser.processElement($, element);
    parser.addToMarkdown("\n\n");
  });
}

parser.init({
  dictionary: "mw",
  customTagHandlers: {
    custom: ">>> ",
  },
});

parser.feed("<h1>Test</h1><h2>Subtitle</h2><custom>Special</custom>");
console.log(parser.markDown);
```

## Migration Guide

### From Previous Version

The enhanced version is fully backward compatible. Existing code will continue to work without changes:

```typescript
// This still works exactly as before
const markdown = convertLexiconHtmlToMarkdown("mw", htmlContent);
```

### Adding Custom Handlers

To add custom tag handling to existing code:

```typescript
// Before
const markdown = convertLexiconHtmlToMarkdown("mw", htmlContent);

// After - with custom handlers
const customHandlers = {
  h1: "=== ",
  blockquote: { open: "> 💡 ", close: "\n\n" },
};
const markdown = convertLexiconHtmlToMarkdown(
  "mw",
  htmlContent,
  "",
  "devanagari",
  customHandlers,
);
```

## Advanced Features

### Handler Priority

1. **Custom handlers** (highest priority) - defined in `customTagHandlers`
2. **Default handlers** - built-in tag processing
3. **Fallback** - content processing without tag formatting

### Error Handling

The system gracefully handles invalid handlers:

```typescript
const invalidHandlers = {
  h1: null, // Will fall back to default handler
  h2: 123, // Will fall back to default handler
  h3: [], // Will fall back to default handler
};
```

### Performance Considerations

- Handlers are cached and reused
- Default handlers are created once during initialization
- Custom handlers are validated only when needed
- Memory usage is optimized for repeated parsing

## Best Practices

### 1. Handler Design

```typescript
// Good: Focused, single responsibility
const headerHandler = ($, element, parser) => {
  const level = element.prop("tagName").toLowerCase();
  const emoji = level === "h1" ? "🎯" : "📌";
  parser.addToMarkdown(`${emoji} **${element.text()}**\n\n`);
};

// Avoid: Complex, multiple responsibilities
const complexHandler = ($, element, parser) => {
  // Don't do everything in one handler
};
```

### 2. Reusable Handlers

```typescript
// Create reusable handler functions
const createEmojiWrapper = (emoji: string) => ($, element, parser) => {
  parser.addToMarkdown(`${emoji} `);
  parser.processElement($, element);
  parser.addToMarkdown(` ${emoji}`);
};

const customHandlers = {
  important: createEmojiWrapper("🔥"),
  note: createEmojiWrapper("📝"),
  warning: createEmojiWrapper("⚠️"),
};
```

### 3. Conditional Processing

```typescript
const smartHandler = ($, element, parser) => {
  const className = element.attr("class");
  const text = element.text();

  if (className === "highlight") {
    parser.addToMarkdown(`🎨 **${text}** 🎨`);
  } else if (text.length > 100) {
    parser.addToMarkdown(`\n> ${text}\n\n`);
  } else {
    parser.processElement($, element);
  }
};
```

## Extended Tag Support

The enhanced system supports many more HTML tags than the original:

- **Headers**: h1, h2, h3, h4, h5, h6
- **Text formatting**: b, strong, i, em, u, sup, sub, del, strike
- **Lists**: ul, ol, li
- **Tables**: table, thead, tbody, tr, td, th
- **Structure**: div, span, p, br, hr
- **Special**: blockquote, code, pre, a
- **Definition lists**: dl, dt, dd
- **Sanskrit specific**: s (customizable per dictionary)

## Debugging and Development

### Unhandled Tags

The parser tracks unhandled tags for debugging:

```typescript
const parser = new LexiconHTMLParser();
parser.feed(htmlContent);

console.log("Unhandled tags:", parser.unhandledTagsList);
// Shows which tags don't have handlers
```

### Testing Custom Handlers

```typescript
// Test custom handlers
const testHandler = jest.fn();
const customHandlers = { test: testHandler };

const parser = new LexiconHTMLParser();
parser.init({ customTagHandlers: customHandlers });
parser.feed("<test>content</test>");

expect(testHandler).toHaveBeenCalled();
```

This enhanced system provides maximum flexibility while maintaining the simplicity and reliability of the original parser.
