# Copilot Instructions for DevHub

## Project Overview

DevHub is a Next.js 15+ full-stack application for managing multilingual devotional content (entities), Sanskrit dictionaries, and Panchangam (Hindu calendar). Built with TypeScript, MongoDB, Prisma, TanStack Query, and Tailwind CSS.

**Core Features:**

- **Hierarchical Entities**: Parent-child relationships for devotional content (Stotrams, Shlokas)
- **Multilingual Dictionary**: Sanskrit/Telugu word lookups with phonetics and transliteration via `@indic-transliteration/sanscript`
- **Panchangam**: Web scraping & caching of daily Hindu calendar data from drikpanchang.com
- **Authentication**: NextAuth.js with TOTP 2FA, credentials, OAuth (Google/GitHub), and magic links

## Critical Architecture Patterns

### 1. Prisma Client Location

**IMPORTANT**: Prisma client generates to `src/app/generated/prisma` (not default location):

```typescript
// Always import from:
import { PrismaClient } from "@/app/generated/prisma";

// Database singleton pattern (see src/lib/db/index.ts):
export const db = global.prisma || new PrismaClient({ log: [...] });
```

**Reason**: Custom output path in `prisma/schema.prisma` for better organization.

### 2. Server Actions with Discriminated Union Responses

All server actions in `src/app/actions/` follow this pattern:

```typescript
// Define typed response with discriminated unions
export type AdminActionResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// Server action example
export async function getAppSettings(): Promise<AdminActionResponse<{...}>> {
  try {
    await requireAdmin(); // Auth check
    const data = await db.appSettings.findFirst();
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}
```

**Client-side consumption** with TanStack Query:

```typescript
const mutation = useMutation({
  mutationFn: getAppSettings,
  onSuccess: (response) => {
    if (response.status === "success") {
      // TypeScript knows response.data exists
      toast({ title: "Success" });
    } else {
      // TypeScript knows response.error exists
      toast({ title: "Error", description: response.error });
    }
  },
});
```

### 3. Multilingual Data Structure

Entities and dictionaries use embedded arrays for translations:

```typescript
// Prisma types (auto-generated)
type LanguageValueType = { language: string; value: string; };
type AttributeValueType = { key: string; value: string; };

// Entity example
{
  text: [
    { language: "sa", value: "ॐ नमः शिवाय" },
    { language: "en", value: "Om Namah Shivaya" }
  ],
  meaning: [{ language: "en", value: "Salutations to Shiva" }],
  attributes: [{ key: "deity", value: "Shiva" }]
}
```

**Access pattern**: Find text by language using array methods or MongoDB queries.

## Development Workflows

### Essential Commands

```bash
pnpm dev                  # Dev server with Turbopack
pnpm db:gen               # Generate Prisma client (run after schema changes)
pnpm db:studio            # Open Prisma Studio GUI

# Dictionary imports (SQLite → MongoDB)
pnpm dict:import          # Import all dictionaries
pnpm dict:import:single   # Import single dictionary
pnpm dict:test           # Run dictionary tests

# Testing
pnpm test                 # Run Jest tests
pnpm test:coverage       # With coverage report

# Releases
pnpm release:patch       # Bump version, commit, push tags
```

### Working with Entities

1. **Creating entities**: Use server actions in `src/app/actions/` (not implemented yet - search codebase for examples)
2. **Hierarchy**: Entities reference parents via `parents: String[] @db.ObjectId` and `parentsRel` relation
3. **Ordering**: Use `order: Int` field for sorting within entity type

### Dictionary Import System

**Architecture**: Modular SQLite → MongoDB pipeline (see `src/lib/dictionary/README.md`)

```typescript
// Key modules:
dictionary-processor.ts      // Core conversion logic (testable without DB)
dictionary-database.ts       // Multiple DB implementations (Prisma, in-memory)
dictionary-import-orchestrator.ts  // High-level import coordination
sqlite-database.ts           // SQLite reader

// Usage from admin UI:
import { importSingleDictionary } from "@/app/actions/dictionary-import-actions";
// See DictionaryImportManager component for full example
```

**Data flow**: SQLite → Row processor → Transliteration → Chunked bulk insert to MongoDB

### Panchangam (Hindu Calendar)

**Unique pattern**: Server-side web scraping with file-based caching

```typescript
// src/lib/panchangam/actions.ts
export async function getDayPanchangam(params: GetPanchangamParams) {
  // 1. Check file cache in /data/ directory
  // 2. If expired/missing, fetch from drikpanchang.com
  // 3. Parse HTML with Cheerio
  // 4. Save to cache file
  // 5. Return structured data
}
```

**Client usage**: `usePanchangam()` hook wraps TanStack Query with place/date state

## Project-Specific Conventions

### 1. Path Aliases

```typescript
"@/*"; // Maps to src/*
// Examples:
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
```

### 2. Component Organization

```
src/components/
├── ui/              # Shadcn primitives (Button, Card, etc.)
├── features/        # Feature-specific (dictionary/, panchangam/, auth/)
├── layout/          # Navigation, sidebars
├── blocks/          # Reusable composite components
└── utils/           # Shared utilities (icons, etc.)
```

### 3. Form Validation Pattern

Always use `react-hook-form` + `zod` + `zodResolver`:

```typescript
const formSchema = z.object({
  email: z.string().email(),
  // ... other fields
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { ... }
});
```

### 4. Transliteration

Use `@indic-transliteration/sanscript` for Sanskrit/Telugu conversions:

```typescript
import sanscript from "@indic-transliteration/sanscript";

const devanagari = sanscript.t(text, "itrans", "devanagari");
const telugu = sanscript.t(text, "devanagari", "telugu");
```

**Common schemes**: `devanagari`, `telugu`, `itrans`, `iast`, `slp1`

## Testing Strategy

### Current Setup (Jest + Node)

**Important**: Tests run in Node environment (NOT React Testing Library by default):

```javascript
// jest.config.js
testEnvironment: "node";
testMatch: ["src/**/__tests__/**/*.(test|spec).{ts,tsx}"];
testPathIgnorePatterns: ["src/app/"]; // App Router excluded
```

**Test target**: Utility functions in `src/lib/`, `src/hooks/`, `src/config/`
**Example**: Dictionary processor tests in `src/lib/dictionary/__tests__/`

```typescript
// Pattern: Pure function testing without database
import { processDictionaryRow } from "../dictionary-processor";

describe("processDictionaryRow", () => {
  it("converts SQLite row to document format", () => {
    const result = processDictionaryRow(mockRow, "mw");
    expect(result.origin).toBe("mw");
  });
});
```

### Coverage

```bash
pnpm test:coverage  # Generates coverage/ directory with HTML reports
```

## Authentication & Security

### NextAuth.js Configuration

**Location**: `src/lib/auth/index.ts` (exports `authOptions`)

**Key features**:

- **Providers**: Credentials (password), OAuth (Google/GitHub), Resend (magic links)
- **TOTP 2FA**: Server actions in `src/app/actions/totp-actions.ts`
  - `setupTOTP()` → QR code generation
  - `enableTOTP()` → Verify and enable with backup codes
  - `verifyUserTOTP()` → Login verification
- **Admin restrictions**: `restrictSignup` flag in `AppSettings` model

**Auth helpers**:

```typescript
import { auth } from "@/lib/auth";

// In Server Components/Actions
const session = await auth();
if (!session?.user) throw new Error("Unauthorized");

// Check admin role
if (session.user.role !== "ADMIN") throw new Error("Admin required");
```

## Data Models & Relationships

### Key Prisma Models

**Entity** (devotional content):

```prisma
model Entity {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  type           String   // "STOTRAM", "SHLOKA", etc.
  order          Int      @default(0)
  text           LanguageValueType[]  // Multilingual content
  meaning        LanguageValueType[]
  attributes     AttributeValueType[]
  bookmarked     Boolean  @default(false)

  // Hierarchical relationships
  parentsRel     Entity[] @relation("EntityRels", fields: [parents])
  parents        String[] @db.ObjectId
  childrenRel    Entity[] @relation("EntityRels", fields: [children])
  children       String[] @db.ObjectId
}
```

**DictionaryWord**:

```prisma
model DictionaryWord {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  origin      String   // "mw", "ap90", "eng2te", etc.
  wordIndex   Int      // Sequential within origin
  word        LanguageValueType[]
  phonetic    String
  description LanguageValueType[]

  @@unique([wordIndex, origin])
  @@index([origin, wordIndex])
  @@fulltext([phonetic, word])  // MongoDB full-text search
}
```

### Indexes for Performance

- Entities: Compound indexes on `[type, bookmarked, updatedAt]`, `[parents]`
- DictionaryWords: Origin + wordIndex for pagination, fulltext for search

## Environment Variables

**.env.local** (required):

```bash
DATABASE_URL="mongodb://..."
AUTH_SECRET="..."              # NextAuth secret
AUTH_TRUST_HOST=true

# OAuth providers
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_GITHUB_ID="..."
AUTH_GITHUB_SECRET="..."

# Email (Resend)
SMTP_FROM="..."
RESEND_API_KEY="..."

# App config
NEXT_PUBLIC_APP_VERSION="1.4.2"  # Auto-set from package.json
```

## Common Pitfalls & Solutions

### 1. Prisma Client Import Errors

❌ `import { PrismaClient } from "@prisma/client"`
✅ `import { PrismaClient } from "@/app/generated/prisma"`

**Fix**: Always use the custom output path or import via `@/lib/db`

### 2. Server Action Type Safety

❌ Returning plain objects without type guards
✅ Use discriminated unions with `status: "success" | "error"`

**Why**: Enables exhaustive type checking in client components

### 3. Multilingual Field Access

❌ `entity.text` (returns array, not string)
✅ `entity.text.find(t => t.language === "en")?.value`

**Pattern**: Create helper function `getTextByLanguage()`

### 4. File-Based Caching (Panchangam)

**Issue**: Cache files in `/data/` directory are gitignored
**Solution**: Implement cleanup logic (see `src/lib/panchangam/actions.ts` for deletion of old files)

## Next.js 15 Specifics

### App Router Patterns

- **Server Components by default**: No `"use client"` needed unless using hooks/state
- **Server Actions**: Must have `"use server"` directive at top of file
- **Dynamic rendering**: Panchangam uses `fetch()` without caching for real-time data

### Image Optimization

```typescript
// next.config.ts
images: {
  localPatterns: [{ pathname: "**/assets/**" }],
  remotePatterns: [{ protocol: "https", hostname: "*" }],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
}
```

**Usage**: Prefer `<Image>` from `next/image` for all images
