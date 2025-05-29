# DevHub Scraper Components

This directory contains the components for the DevHub scraper functionality, which allows extracting content from websites and converting it to database entities.

## Component Structure

The scraper has been refactored into a modular architecture:

### Core Components

- `scraper-context.tsx`: Context provider with shared state and logic
- `generic-scraper.tsx`: Main component that orchestrates the steps
- `index.ts`: Exports all components for easy importing

### Step Components

- `scraper-step-one.tsx`: Step 1 - Scraping HTML content
- `scraper-step-two.tsx`: Step 2 - Processing and editing JSON
- `scraper-step-three.tsx`: Step 3 - Creating and uploading entities

### UI Components

- `scraper-ui-components.tsx`: Reusable UI elements (alerts, progress, etc.)
- `selector-list.tsx`: Component for managing CSS selectors
- `json-editor.tsx`: Component for editing JSON content
- `entity-type-config.tsx`: Configuration for entity type and parent

### Legacy Components

- `generic-scraper.tsx`: Original monolithic implementation (kept for backward compatibility)

## How to Use

The refactored scraper can be used as a drop-in replacement for the original:

```tsx
import { GenericScraper } from "@/components/scraper/generic-scraper";

export function MyScraperComponent() {
  return (
    <GenericScraper
      title="My Custom Scraper"
      description="Custom scraper description"
      scraperFunction={customScraperFunction}
      saveJsonFunction={customSaveFunction}
      convertFunction={customConvertFunction}
      uploadFunction={customUploadFunction}
      additionalFields={<MyCustomFields />}
      onSuccess={(data) => console.log("Success", data)}
      onError={(error) => console.error("Error", error)}
    />
  );
}
```

## Context API

You can also use the context directly in custom components:

```tsx
import { useScraperContext } from "@/components/scraper/scraper-context";

function MyCustomStepComponent() {
  const { status, form, onScrape } = useScraperContext();

  return (
    <div>
      <Button onClick={form.handleSubmit(onScrape)}>Start Scraping</Button>
    </div>
  );
}
```

## Adding New Features

To add new features, either:

1. Extend the context with additional state and functions
2. Create new custom step components
3. Use the `additionalFields` prop to inject custom UI elements

## TypeScript Support

All components are fully typed with TypeScript for better developer experience and type safety.
