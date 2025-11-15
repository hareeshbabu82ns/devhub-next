# DevHub Constitution

## Core Principles

### I. Type-Safe Data Layer (NON-NEGOTIABLE)

**Custom Prisma Client Location**: All database access must use the custom Prisma client generated at `src/app/generated/prisma`. Never import from `@prisma/client`.

**Enforcement**:

- ✅ `import { PrismaClient } from "@/app/generated/prisma"`
- ❌ `import { PrismaClient } from "@prisma/client"`
- Use the singleton `db` instance from `@/lib/db` for all database operations
- Run `pnpm db:gen` after any schema changes to regenerate the client

**Rationale**: Custom output path maintains project organization and ensures consistent imports across the codebase.

### II. Discriminated Union Response Pattern (NON-NEGOTIABLE)

**Server Actions Contract**: All server actions must return discriminated unions for type-safe error handling.

**Required Pattern**:

```typescript
export type ActionResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

export async function myAction(): Promise<ActionResponse<ReturnType>> {
  try {
    // Action logic
    return { status: "success", data: result };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}
```

**Client-Side Consumption**:

```typescript
const mutation = useMutation({
  mutationFn: myAction,
  onSuccess: (response) => {
    if (response.status === "success") {
      // TypeScript knows response.data exists
    } else {
      // TypeScript knows response.error exists
    }
  },
});
```

**Rationale**: Enables exhaustive type checking, eliminates runtime errors from uncaught exceptions, and provides clear success/failure states for UI components.

### III. Multilingual Data First

**Embedded Language Arrays**: All user-facing content must support multilingual data using the `LanguageValueType[]` pattern.

**Required Structure**:

```typescript
type LanguageValueType = { language: string; value: string };
type AttributeValueType = { key: string; value: string };

// Example usage in Entity model
{
  text: [
    { language: "sa", value: "ॐ नमः शिवाय" },
    { language: "en", value: "Om Namah Shivaya" }
  ],
  meaning: [{ language: "en", value: "Salutations to Shiva" }],
  attributes: [{ key: "deity", value: "Shiva" }]
}
```

**Helper Functions Required**:

- Create utility functions like `getTextByLanguage(array, lang)` to access translations
- Never directly access array indices without language filtering
- Use `@indic-transliteration/sanscript` for Sanskrit/Telugu conversions

**Rationale**: Core requirement for devotional content management across multiple Indian languages with proper phonetic support.

### IV. Component Organization Standard

**Strict Directory Structure**: Components must be organized by purpose, not arbitrarily grouped.

**Required Structure**:

```
src/components/
├── ui/           # Shadcn primitives only (Button, Card, Dialog, etc.)
├── features/     # Domain-specific (dictionary/, panchangam/, auth/, entities/)
├── layout/       # Navigation, sidebars, headers, footers
└── blocks/       # Reusable composite components (search bars, data tables)
```

**Rules**:

- UI components must remain pure Shadcn primitives without business logic
- Feature components contain domain-specific logic (e.g., dictionary search, entity hierarchy)
- Layout components handle application structure
- Block components are reusable composites without domain coupling

**Rationale**: Maintains clear separation of concerns and enables easier refactoring and testing.

### V. Form Validation Trinity (NON-NEGOTIABLE)

**Required Stack**: All forms must use the trinity of `react-hook-form` + `zod` + `zodResolver`.

**Mandatory Pattern**:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { email: "", password: "" },
});
```

**Rationale**: Provides type-safe validation, runtime safety, and consistent form behavior across the application.

### VI. Authentication & Authorization Pattern

**Session-Based Security**: All protected routes and actions must verify authentication via NextAuth.js session checks.

**Required Patterns**:

```typescript
// In Server Components/Actions
import { auth } from "@/lib/auth";

const session = await auth();
if (!session?.user) throw new Error("Unauthorized");

// Admin-only actions
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
  return session.user;
}
```

**Authentication Features**:

- TOTP 2FA support with backup codes
- OAuth providers (Google, GitHub)
- Magic link email authentication (Resend)
- Role-based access control (USER, ADMIN, MEMBER)

**Rationale**: Ensures consistent security across all protected resources and enables fine-grained access control.

### VII. Testing Pure Functions

**Node Environment Focus**: Tests run in Node environment targeting pure utility functions in `src/lib/`, `src/hooks/`, and `src/config/`.

**Testing Strategy**:

```javascript
// jest.config.js
testEnvironment: "node";
testMatch: ["src/**/__tests__/**/*.(test|spec).{ts,tsx}"];
testPathIgnorePatterns: ["src/app/"]; // App Router excluded
```

**Priority Targets**:

- Dictionary processing logic (no database)
- Transliteration utilities
- Data transformation functions
- Validation helpers
- Configuration parsers

**Commands**:

- `pnpm test` - Run all tests
- `pnpm test:watch` - Watch mode for TDD
- `pnpm test:coverage` - Generate coverage reports
- `pnpm dict:test` - Dictionary-specific tests

**Rationale**: Focus on testable pure functions without complex React/Next.js setup. Integration tests deferred until more sophisticated testing infrastructure is needed.

## Technology Stack Requirements

### Framework & Language

- **Next.js 15+** with App Router (Server Components by default)
- **TypeScript** in strict mode (no `any` types without justification)
- **React 19** with React Server Components pattern

### Database & ORM

- **MongoDB** as primary database
- **Prisma ORM** with custom client output path
- Full-text search indexes for content discovery
- Compound indexes for performance-critical queries

### State Management & Data Fetching

- **TanStack Query v5** for server state management
- No client-side state management library needed (use Server Components)
- React hooks for local UI state only

### UI & Styling

- **Tailwind CSS** for styling
- **Shadcn UI** for component primitives
- **Radix UI** as underlying primitive library
- **Lucide React** for icons

### Authentication & Security

- **NextAuth.js v5** (beta) for authentication
- **OTPAuth** for TOTP 2FA generation
- **bcryptjs** for password hashing
- **Resend** for transactional emails

### Specialized Libraries

- **@indic-transliteration/sanscript** for Sanskrit/Telugu transliteration
- **Cheerio** for web scraping (Panchangam data)
- **date-fns** for date manipulation
- **Zod** for runtime validation

## Critical Architecture Rules

### Import Path Aliases

**Required**: Use `@/*` path aliases for all imports mapping to `src/*`.

```typescript
// ✅ Correct
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

// ❌ Incorrect
import { db } from "../../lib/db";
import { Button } from "../../../components/ui/button";
```

### Server Actions Directive

**Required**: All server actions must have `"use server"` directive at the top of the file.

```typescript
"use server";

import { z } from "zod";
import { db } from "@/lib/db";

export async function myAction() {
  // Implementation
}
```

### Client Component Directive

**Required**: Use `"use client"` only when necessary (hooks, state, browser APIs).

```typescript
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
```

**Default**: Server Components don't need any directive.

### Data Models & Relationships

**Entity Hierarchy Pattern**:

```typescript
model Entity {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  type        String   // "STOTRAM", "SHLOKA", etc.
  order       Int      @default(0)

  // Self-referential many-to-many for hierarchy
  parentsRel  Entity[] @relation("EntityRels", fields: [parents])
  parents     String[] @db.ObjectId
  childrenRel Entity[] @relation("EntityRels", fields: [children])
  children    String[] @db.ObjectId
}
```

**Dictionary Word Pattern**:

```typescript
model DictionaryWord {
  id          String               @id @default(auto()) @map("_id") @db.ObjectId
  origin      String               // "mw", "ap90", "eng2te"
  wordIndex   Int                  // Sequential within origin
  word        LanguageValueType[]  // Multilingual
  description LanguageValueType[]
  phonetic    String               // For search

  @@unique([wordIndex, origin])
  @@index([origin, wordIndex])
  @@fulltext([phonetic, word])
}
```

### File-Based Caching Pattern

**Panchangam System**: Uses file-based caching in `/data/` directory for web-scraped content.

**Pattern**:

```typescript
// 1. Check file cache
const cacheFile = `/data/0_panchangam_${geonameId}_${day}_${month}_${year}.html`;

// 2. If expired/missing, fetch from source
const response = await fetch(url);

// 3. Parse HTML with Cheerio
const $ = cheerio.load(html);

// 4. Save to cache file
await fs.writeFile(cacheFile, html);

// 5. Return structured data
return parsedData;
```

**Cache Management**:

- Automatic cleanup of previous day files
- Gitignored cache directory
- No database storage for cached HTML

## Development Workflow

### Essential Commands

```bash
pnpm dev                  # Dev server with Turbopack
pnpm build                # Production build
pnpm lint                 # ESLint check
pnpm test                 # Run Jest tests
pnpm test:coverage        # Test coverage report

# Database
pnpm db:gen               # Generate Prisma client (after schema changes)
pnpm db:push              # Push schema to database
pnpm db:studio            # Open Prisma Studio GUI

# Dictionary
pnpm dict:import          # Import all dictionaries
pnpm dict:import:single   # Import single dictionary
pnpm dict:test            # Run dictionary tests

# Releases
pnpm release:patch        # Bump patch version, commit, push tags
pnpm release:minor        # Bump minor version
pnpm release:major        # Bump major version
```

### Environment Variables Required

**.env.local**:

```bash
DATABASE_URL="mongodb://..."
AUTH_SECRET="..."              # NextAuth secret (openssl rand -base64 32)
AUTH_TRUST_HOST=true

# OAuth Providers
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_GITHUB_ID="..."
AUTH_GITHUB_SECRET="..."

# Email (Resend)
SMTP_FROM="..."
RESEND_API_KEY="..."

# Auto-set from package.json
NEXT_PUBLIC_APP_VERSION="1.4.2"
```

### Code Review Checklist

**Before Submission**:

- [ ] Uses custom Prisma client from `@/app/generated/prisma`
- [ ] Server actions return discriminated unions
- [ ] Forms use `react-hook-form` + `zod` + `zodResolver`
- [ ] Components placed in correct directory (ui/features/layout/blocks)
- [ ] Path aliases (`@/*`) used consistently
- [ ] Authentication checks in place for protected actions
- [ ] Multilingual data uses `LanguageValueType[]` pattern
- [ ] Tests written for pure functions
- [ ] No TypeScript `any` types without justification
- [ ] Environment variables documented

**Quality Gates**:

- TypeScript must compile with zero errors
- ESLint must pass with zero errors
- Tests must pass for modified code
- No breaking changes to existing discriminated union types

### Git Workflow

**Branch Strategy**:

- `main` - Production-ready code
- Feature branches: `feature/description`
- Bugfix branches: `fix/description`

**Commit Convention**:

```bash
feat: Add Sanskrit dictionary import
fix: Resolve TOTP verification issue
refactor: Extract multilingual helper functions
docs: Update authentication setup guide
test: Add coverage for dictionary processor
```

**Commit Signing**: Disabled for local project

```bash
git config --local commit.gpgsign false
git config --local user.email hareeshbabu82ns@gmail.com
```

## Common Pitfalls & Solutions

### 1. Prisma Client Import Errors

**Problem**: Importing from default Prisma location

```typescript
❌ import { PrismaClient } from "@prisma/client"
```

**Solution**: Always use custom output path

```typescript
✅ import { PrismaClient } from "@/app/generated/prisma"
✅ import { db } from "@/lib/db"  // Preferred singleton
```

### 2. Server Action Type Safety

**Problem**: Returning plain objects without type guards

```typescript
❌ export async function getUser() {
  const user = await db.user.findFirst();
  return user; // No error handling
}
```

**Solution**: Use discriminated unions

```typescript
✅ export async function getUser(): Promise<AdminActionResponse<User>> {
  try {
    const user = await db.user.findFirst();
    return { status: "success", data: user };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}
```

### 3. Multilingual Field Access

**Problem**: Directly accessing array without language filtering

```typescript
❌ const text = entity.text[0].value; // Assumes first is desired language
```

**Solution**: Create helper function

```typescript
✅ function getTextByLanguage(
  array: LanguageValueType[],
  language: string
): string | undefined {
  return array.find(item => item.language === language)?.value;
}

const text = getTextByLanguage(entity.text, "en");
```

### 4. Missing "use server" Directive

**Problem**: Server action without directive causes client-side execution

```typescript
❌ // No directive
export async function myAction() {
  const data = await db.user.findMany(); // Fails in browser
}
```

**Solution**: Add directive at top of file

```typescript
✅ "use server";

export async function myAction() {
  const data = await db.user.findMany();
  return { status: "success", data };
}
```

### 5. Unnecessary "use client" Directives

**Problem**: Adding "use client" to Server Components

```typescript
❌ "use client"; // Unnecessary, no hooks/browser APIs

export default function DataDisplay() {
  return <div>Static content</div>;
}
```

**Solution**: Use Server Components by default

```typescript
✅ // No directive needed
export default function DataDisplay() {
  return <div>Static content</div>;
}
```

### 6. File-Based Cache Issues

**Problem**: Panchangam cache files grow without cleanup
**Solution**: Implement automatic deletion of previous day files (already in codebase)

### 7. Form Validation Inconsistency

**Problem**: Using different validation libraries or manual validation
**Solution**: Always use the trinity: `react-hook-form` + `zod` + `zodResolver`

## Next.js 15 Specific Patterns

### Server Components by Default

- No `"use client"` needed unless using hooks, state, or browser APIs
- Fetch data directly in components with `async/await`
- Pass data as props to client components

### Server Actions

- Must have `"use server"` directive
- Can be colocated in files or separate actions files
- Return serializable data only (no functions, classes)

### Dynamic Rendering

- Panchangam uses `fetch()` without caching for real-time data
- Use `revalidatePath()` for cache invalidation after mutations

### Image Optimization

```typescript
// next.config.ts
images: {
  localPatterns: [{ pathname: "**/assets/**" }],
  remotePatterns: [{ protocol: "https", hostname: "*" }],
}
```

**Usage**: Prefer `<Image>` from `next/image` for all images

## Governance

### Constitution Authority

This constitution supersedes all other development practices and guidelines. When conflicts arise between this document and other documentation, this constitution takes precedence.

### Amendment Process

1. **Proposal**: Document proposed change with rationale
2. **Discussion**: Team review and feedback period
3. **Approval**: Consensus required for constitutional changes
4. **Migration**: Create migration plan for affected code
5. **Documentation**: Update this document with new version number

### Compliance Enforcement

- All pull requests must verify compliance with constitutional principles
- Non-negotiable principles (I, II, V, VI) cannot be bypassed
- Deviations from other principles require documented justification
- Code reviews must explicitly check discriminated union usage, Prisma imports, and form validation patterns

### Continuous Improvement

- Review constitution quarterly for relevance
- Gather feedback from development pain points
- Update based on Next.js/React ecosystem changes
- Maintain `CHANGELOG.md` for constitutional amendments

### Related Documentation

- Runtime development guidance: `.github/copilot-instructions.md`
- Testing framework: `docs/testing-framework-complete.md`
- Authentication details: `docs/AUTH_IMPLEMENTATION_PROMPT.md`
- Panchangam architecture: `docs/panchangam-architecture.md`
- Dictionary system: `src/lib/dictionary/README.md`

**Version**: 1.0.0 | **Ratified**: 2025-11-15 | **Last Amended**: 2025-11-15
