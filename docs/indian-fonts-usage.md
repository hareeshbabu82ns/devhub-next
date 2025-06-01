# Indian Fonts Usage in DevHub

This document describes how to use the Telugu and Sanskrit fonts in the DevHub application.

## Available Fonts

DevHub includes the following fonts:

- **Inter**: Default sans-serif font for Latin text
- **Mandali**: Google font optimized for Telugu script
- **Shobhika**: Special font for Sanskrit and Telugu scripts with proper ligatures
- **JetBrains Mono**: Monospace font for code snippets

## Using the Telugu Font (Mandali)

There are several ways to use the Telugu font in your components:

### 1. Using the TeluguText Component

The simplest way is to use the `TeluguText` component:

```tsx
import { TeluguText } from "@/components/ui/telugu-text";

export default function MyComponent() {
  return (
    <div>
      <h1>My Component</h1>
      <TeluguText>నమస్కారం (Hello)</TeluguText>
    </div>
  );
}
```

The `TeluguText` component accepts all standard HTML attributes for a `span` element, including `className` for additional styling.

### 2. Using the Tailwind CSS Class

You can also use the `font-telugu` Tailwind class directly:

```tsx
export default function MyComponent() {
  return (
    <div>
      <h1>My Component</h1>
      <p className="font-telugu">నమస్కారం (Hello)</p>
    </div>
  );
}
```

This approach gives you more flexibility in terms of HTML elements.

## Using the Shobhika Font

Shobhika is a special font designed for Sanskrit texts with proper Devanagari rendering. It also works well for Telugu. It supports correct ligatures and special characters in both scripts.

### 1. Using the ShobhikaText Component

```tsx
import { ShobhikaText } from "@/components/ui/shobhika-text";

export default function MyComponent() {
  return (
    <div>
      <h1>My Component</h1>
      <ShobhikaText>नमस्कारः (Hello in Sanskrit)</ShobhikaText>

      {/* With bold text */}
      <ShobhikaText bold>वेदाहमेतं पुरुषं महान्तम्</ShobhikaText>

      {/* Telugu text with Shobhika */}
      <ShobhikaText>నమస్కారం</ShobhikaText>
    </div>
  );
}
```

The `ShobhikaText` component includes an optional `bold` prop to use the bold variant of the font.

### 2. Using the Tailwind CSS Class

```tsx
export default function MyComponent() {
  return (
    <div>
      <h1>My Component</h1>
      <p className="font-shobhika">नमस्कारः (Hello in Sanskrit)</p>

      {/* With bold styling */}
      <p className="font-shobhika font-bold">वेदाहमेतं पुरुषं महान्तम्</p>
    </div>
  );
}
```

## When to Use Each Font

- **Mandali (Telugu Font)**: Best for Telugu content that doesn't need complex ligatures. Lighter weight.
- **Shobhika**: Ideal for Sanskrit texts with complex ligatures and when you need proper rendering of conjunct consonants. Also excellent for Telugu texts that require more traditional typography.

## Example

Visit the Indian Fonts example page at [/examples/indian-fonts](/examples/indian-fonts) to see both fonts in action.

## Font Configuration

The fonts are configured in the following files:

- `src/lib/fonts.ts`: Font definitions and loading
- `tailwind.config.ts`: Tailwind configuration for font families
- `src/app/layout.tsx`: Application of font variables to the document
- `src/app/globals.css`: CSS utility classes

## Technical Details

- The Telugu font (Mandali) is loaded using Next.js's built-in Google Fonts integration
- The Shobhika font is loaded as a local font using Next.js's `next/font/local` API
- Both fonts are set up with CSS variables that can be accessed via Tailwind CSS classes

## Installing Shobhika Font

- https://github.com/Sandhi-IITBombay/Shobhika/releases/download/v1.05/Shobhika-1.05.zip

```sh
mkdir -p ./public/fonts/shobhika
cd ./public/fonts/shobhika
curl -L -o Shobhika-Regular.otf "https://github.com/Sandhi-IITBombay/Shobhika/raw/master/Fonts/Shobhika-Regular.otf"
curl -L -o Shobhika-Bold.otf "https://github.com/Sandhi-IITBombay/Shobhika/raw/master/Fonts/Shobhika-Bold.otf"
```
