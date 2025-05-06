# Copilot Instructions for DevHub - Home for Deveotional contents and Dictionaries

## Introduction

DevHub is a modern, full-stack web application built on Next.js that serves as a comprehensive platform for devotional content and multilingual dictionaries. The application offers:

## Project Overview

- Entity management for hierarchical devotional content
- Support for multiple languages with customizable text and meanings
- Dictionary functionality with phonetic representations and word origins
- Rich content organization with parent-child relationships between entities
- Bookmarking and attribute tagging for enhanced content discovery
- User authentication and role-based access control
- Responsive design for all device types

The platform is designed with internationalization at its core, supporting multiple languages with customizable text directions and localized content. DevHub utilizes MongoDB as its database with Prisma as the ORM layer.

### Data Models

The application is built around several key data models:

- **Entity**: Core content elements that can be organized hierarchically
- **EntityType**: Classification system for different types of entities
- **Language**: Supported languages with ISO codes and text directions
- **DictionaryWord**: Dictionary entries with phonetics, origins, and descriptions
- **User**: User accounts with authentication support including WebAuthn

The system is built with a strong focus on type safety, performance, and accessibility.

Basic next app created using command

```sh
npx create-next-app@latest . --typescript --tailwind --eslint --app --use-pnpm
```

## Technical Stack

### Core Technologies

- **Frontend Framework**: NextJS 15+ with App Router architecture
- **Language**: TypeScript 5.0+ (strict mode enabled)
- **Styling**: Tailwind CSS 4+ with custom configuration
- **Database ORM**: Prisma with MongoDB
- **Form Management**: react-hook-form v7+ with zod validation
- **Theme Management**: next-themes for dark/light mode support
- **UI Component Library**: Shadcn for React components
- **State Management**: React Context API and React Query v5+
- **Server Actions**: using TanStack Query and Mutation for server actions with async function call with type safety and error handling

## Architecture

### Folder Structure

```
devhub/
├── app/                    # App Router routes
│   ├── api/                # API routes
│   ├── auth/               # Authentication routes
│   ├── dashboard/          # Dashboard routes
│   ├── devotional/         # Devotional content routes
│   ├── dictionary/         # Dictionary routes
│   ├── entity/             # Entity management routes
│   ├── actions/            # Server Actions
│   └── ...
├── components/             # React components
│   ├── ui/                 # Reusable UI components
│   └── features/           # Feature-specific components
│       ├── auth/           # Authentication components
│       ├── devotional/     # Devotional content components
│       ├── dictionary/     # Dictionary components
│       ├── entity/         # Entity management components
│       └── ...
├── lib/                    # Utility functions and shared code
├── types/                  # TypeScript type definitions
├── hooks/                  # Custom React hooks
├── config/                 # App configuration
├── prisma/                 # Prisma schema and migrations
└── public/                 # Static assets
```

### Development Requirements

#### Code Quality & Style

- **ESLint Configuration**:

  - Use `typescript-eslint` plugin with strict type checking rules
  - Enable React hooks rules (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`)
  - Configure import sorting and organization rules
  - Example config:
    ```json
    {
      "extends": [
        "next/core-web-vitals",
        "plugin:@typescript-eslint/recommended",
        "prettier"
      ],
      "plugins": ["@typescript-eslint", "react-hooks"],
      "rules": {
        "@typescript-eslint/no-unused-vars": [
          "error",
          { "argsIgnorePattern": "^_" }
        ],
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn"
      }
    }
    ```

- **Prettier Integration**:
  - Consistent 2-space indentation
  - 100-character line length limit
  - Single quotes for strings
  - Semi-colons required
  - Example `.prettierrc`:
    ```json
    {
      "semi": true,
      "singleQuote": true,
      "printWidth": 100,
      "tabWidth": 2,
      "trailingComma": "es5"
    }
    ```

#### Component Architecture

- **Component Structure**:

  - Prefer small, focused components (< 150 lines)
  - Use logical component composition patterns
  - Maintain clear separation between UI components and business logic
  - Implement component/container pattern for data-fetching separation

- **Code Organization**:
  - Co-locate related files (component, hooks, utils)
  - Use barrel exports (`index.ts`) for component directories
  - Follow feature folder structures for complex features

#### Testing Requirements

- **Jest Configuration**:

  - Configure Jest with TypeScript support
  - Set up path aliases matching tsconfig
  - Mock static assets and styles

- **React Testing Library**:
  - Focus on user-centric testing methodology
  - Test component behaviors, not implementation details
  - Use data-testid attributes for test selectors
  - Example pattern:
    ```typescript
    test('renders dictionary entry with pronunciation', () => {
      render(<DictionaryEntry word="example" pronunciation="/ɪɡˈzæmpəl/" />);
      expect(screen.getByText(/example/i)).toBeInTheDocument();
      expect(screen.getByText(/\/ɪɡˈzæmpəl\//)).toBeInTheDocument();
    });
    ```

## TypeScript Best Practices

### Type Safety

- Use `strict: true` in tsconfig.json
- Avoid `any` type instead use `unknown` when type is uncertain
- Leverage TypeScript utility types: `Partial<T>`, `Pick<T>`, `Omit<T>`, `Record<K,T>`
- Create type guards for runtime type checking:
  ```typescript
  function isEntityType(value: unknown): value is EntityType {
    return (
      value !== null &&
      typeof value === "object" &&
      "code" in value &&
      "name" in value
    );
  }
  ```
- Always create functions with typesafe parameters:
  ```typescript
  interface EntityCardParams {
    entity: Entity;
    showMeaning: boolean;
    onBookmark: (id: string) => void;
  }
  function EntityCard({ entity, showMeaning, onBookmark }: EntityCardParams) {
    // Component implementation
  }
  ```
- Use discriminated unions for state management:

  ```typescript
  type DictionarySearchState =
    | { status: "idle" }
    | { status: "searching" }
    | { status: "error"; error: string }
    | { status: "success"; data: DictionaryWord[] };
  ```

  ### Server Actions using TanStack Query

  - Define server actions in dedicated files within the `app/actions` directory
  - Use TypeScript for type-safe server actions and response types
  - Implement TanStack Query's `useMutation` for client-side interaction
  - Follow this pattern for type-safe server actions:

    ```typescript
    // app/actions/entity-actions.ts
    "use server";

    import { z } from "zod";
    import { db } from "@/lib/db";
    import { getCurrentUser } from "@/lib/session";
    import { revalidatePath } from "next/cache";

    // Define response types using discriminated unions
    export type EntityActionResponse<T = unknown> =
      | { status: "success"; data: T }
      | { status: "error"; error: string };

    // Define validation schema
    const EntitySchema = z.object({
      id: z.string().optional(),
      type: z.string(),
      text: z.array(
        z.object({
          language: z.string(),
          value: z.string().min(1, "Text value cannot be empty"),
        }),
      ),
      meaning: z
        .array(
          z.object({
            language: z.string(),
            value: z.string(),
          }),
        )
        .optional(),
      order: z.number().int().default(0),
      parents: z.array(z.string()).optional(),
      bookmarked: z.boolean().default(false),
      attributes: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        )
        .optional(),
      notes: z.string().optional(),
    });

    // Type-safe server action
    export async function createOrUpdateEntity(
      data: z.infer<typeof EntitySchema>,
    ): Promise<EntityActionResponse<Entity>> {
      try {
        const user = await getCurrentUser();

        if (!user) {
          return { status: "error", error: "Unauthorized" };
        }

        // Validate input
        const validated = EntitySchema.parse(data);

        // Create or update entity
        const entity = validated.id
          ? await db.entity.update({
              where: { id: validated.id },
              data: {
                type: validated.type,
                text: validated.text,
                meaning: validated.meaning || [],
                order: validated.order,
                bookmarked: validated.bookmarked,
                attributes: validated.attributes || [],
                notes: validated.notes || "",
                parentsRel: validated.parents?.length
                  ? { connect: validated.parents.map((id) => ({ id })) }
                  : undefined,
              },
            })
          : await db.entity.create({
              data: {
                type: validated.type,
                text: validated.text,
                meaning: validated.meaning || [],
                order: validated.order,
                bookmarked: validated.bookmarked,
                attributes: validated.attributes || [],
                notes: validated.notes || "",
                parentsRel: validated.parents?.length
                  ? { connect: validated.parents.map((id) => ({ id })) }
                  : undefined,
              },
            });

        // Revalidate cache for entities
        revalidatePath("/entity");
        revalidatePath(`/entity/${entity.id}`);

        return { status: "success", data: entity };
      } catch (error) {
        console.error("Entity operation failed:", error);

        if (error instanceof z.ZodError) {
          return {
            status: "error",
            error: `Validation error: ${error.errors
              .map((e) => e.message)
              .join(", ")}`,
          };
        }

        return { status: "error", error: "Failed to save entity" };
      }
    }
    ```

  - Client-side implementation with TanStack Query:

    ```typescript
    // components/features/entity/entity-form.tsx
    "use client";

    import { useMutation, useQueryClient } from "@tanstack/react-query";
    import { createOrUpdateEntity } from "@/app/actions/entity-actions";
    import { useForm } from "react-hook-form";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { z } from "zod";
    import { toast } from "@/components/ui/use-toast";
    import { useRouter } from "next/navigation";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Textarea } from "@/components/ui/textarea";
    import { useEntityTypes } from "@/hooks/use-entity-types";
    import { useLanguages } from "@/hooks/use-languages";

    // Match the schema used in server action
    const formSchema = z.object({
      id: z.string().optional(),
      type: z.string(),
      text: z.array(z.object({
        language: z.string(),
        value: z.string().min(1, "Text value cannot be empty")
      })).min(1, "At least one language text is required"),
      meaning: z.array(z.object({
        language: z.string(),
        value: z.string()
      })).optional(),
      order: z.number().int().default(0),
      parents: z.array(z.string()).optional(),
      bookmarked: z.boolean().default(false),
      notes: z.string().optional(),
    });

    type FormValues = z.infer<typeof formSchema>;

    interface EntityFormProps {
      initialData?: FormValues;
      parentId?: string;
    }

    export function EntityForm({ initialData, parentId }: EntityFormProps) {
      const router = useRouter();
      const queryClient = useQueryClient();
      const { data: entityTypes } = useEntityTypes();
      const { data: languages } = useLanguages();

      const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData || {
          type: "verse",
          text: [{ language: "en", value: "" }],
          meaning: [{ language: "en", value: "" }],
          order: 0,
          parents: parentId ? [parentId] : [],
          bookmarked: false,
          notes: "",
        },
      });

      // Setup mutation with proper typing
      const mutation = useMutation({
        mutationFn: createOrUpdateEntity,
        onSuccess: (data) => {
          if (data.status === "success") {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ["entities"] });
            if (parentId) {
              queryClient.invalidateQueries({ queryKey: ["entity", parentId] });
            }
            toast({
              title: "Success",
              description: initialData
                ? "Entity updated successfully"
                : "New entity created successfully",
            });
            router.push(`/entity/${data.data.id}`);
          } else {
            // Handle validation or other expected errors
            toast({
              title: "Error",
              description: data.error,
              variant: "destructive",
            });
          }
        },
        onError: (error: Error) => {
          // Handle unexpected errors
          console.error("Entity operation error:", error);
          toast({
            title: "Error",
            description: "An unexpected error occurred",
            variant: "destructive",
          });
        },
      });

      const onSubmit = (values: FormValues) => {
        mutation.mutate(values);
      };

      return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Form fields implementation */}
          <div className="space-y-4">
            {/* Entity type select field */}
            {/* Text inputs for different languages */}
            {/* Meaning inputs for different languages */}
            {/* Order, notes, and other fields */}
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : initialData ? "Update Entity" : "Create Entity"}
          </Button>

          {mutation.isError && (
            <div className="text-red-500 mt-2">
              {mutation.error.message || "An error occurred"}
            </div>
          )}
        </form>
      );
    }
    ```

  - Type guard for response handling as client side utility:

    ```typescript
    // lib/response-utils.ts
    import type { EntityActionResponse } from "@/app/actions/entity-actions";

    // Type guard to check successful response
    export function isSuccessResponse<T>(
      response: EntityActionResponse<T>,
    ): response is { status: "success"; data: T } {
      return response.status === "success";
    }

    // Type guard for error responses
    export function isErrorResponse<T>(
      response: EntityActionResponse<T>,
    ): response is { status: "error"; error: string } {
      return response.status === "error";
    }

    // Usage example in a component or hook
    import { isSuccessResponse } from "@/lib/response-utils";
    import { toggleBookmark } from "@/app/actions/entity-actions";

    const handleBookmark = async (entityId: string) => {
      const result = await toggleBookmark(entityId);

      if (isSuccessResponse(result)) {
        // TypeScript knows result.data is available here
        toast.success("Bookmark updated");
        queryClient.invalidateQueries({ queryKey: ["entity", entityId] });
      } else {
        // TypeScript knows result.error is available here
        toast.error(result.error);
      }
    };
    ```

  - Error handling with TanStack Query's error boundaries:

    ```typescript
    // app/entity/[id]/page.tsx
    "use client";

    import { QueryErrorResetBoundary } from "@tanstack/react-query";
    import { ErrorBoundary } from "react-error-boundary";
    import { EntityDetailView } from "@/components/features/entity/entity-detail-view";
    import { Button } from "@/components/ui/button";

    export default function EntityPage({ params }: { params: { id: string } }) {
      return (
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ error, resetErrorBoundary }) => (
                <div className="error-container p-6 bg-red-50 border border-red-200 rounded-lg">
                  <h2 className="text-xl font-semibold text-red-700">
                    Error Loading Entity
                  </h2>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-sm">
                    {error.message}
                  </pre>
                  <Button
                    onClick={() => resetErrorBoundary()}
                    variant="outline"
                    className="mt-4"
                  >
                    Try again
                  </Button>
                </div>
              )}
            >
              <EntityDetailView entityId={params.id} />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      );
    }
    ```

### Form Implementation

- Use `react-hook-form` with zod validation for entity and dictionary forms
- Implement controlled inputs with immediate feedback for form validation
- Support multilingual input fields with language selection
- Add auto-save functionality for entity editing sessions
- Example pattern for entity form:

  ```typescript
  interface EntityFormValues {
    id?: string;
    type: string;
    text: Array<{ language: string; value: string }>;
    meaning: Array<{ language: string; value: string }>;
    order: number;
    parents?: string[];
    bookmarked: boolean;
    attributes?: Array<{ key: string; value: string }>;
    notes?: string;
  }

  const entityFormSchema = z.object({
    id: z.string().optional(),
    type: z.string().min(1, "Entity type is required"),
    text: z
      .array(
        z.object({
          language: z.string().min(1, "Language code is required"),
          value: z.string().min(1, "Text value cannot be empty"),
        }),
      )
      .min(1, "At least one text entry is required"),
    meaning: z
      .array(
        z.object({
          language: z.string().min(1, "Language code is required"),
          value: z.string(),
        }),
      )
      .optional(),
    order: z.number().int().min(0).default(0),
    parents: z.array(z.string()).optional(),
    bookmarked: z.boolean().default(false),
    attributes: z
      .array(
        z.object({
          key: z.string().min(1, "Attribute key is required"),
          value: z.string(),
        }),
      )
      .optional(),
    notes: z.string().optional(),
  });

  export function EntityForm({ initialData, parentId }: EntityFormProps) {
    const { data: languages } = useLanguages();
    const { data: entityTypes } = useEntityTypes();

    const form = useForm<EntityFormValues>({
      resolver: zodResolver(entityFormSchema),
      defaultValues: initialData || {
        type: "verse",
        text: [{ language: "en", value: "" }],
        meaning: [{ language: "en", value: "" }],
        order: 0,
        bookmarked: false,
        parents: parentId ? [parentId] : [],
      },
    });

    // Form implementation with multilingual field arrays
    const { fields: textFields, append: appendText } = useFieldArray({
      name: "text",
      control: form.control,
    });

    // Auto-save functionality with debounce
    const debouncedFormValues = useDebounce(form.watch(), 2000);

    useEffect(() => {
      if (form.formState.isDirty && initialData?.id) {
        autoSaveEntity(debouncedFormValues);
      }
    }, [debouncedFormValues, initialData?.id]);

    // Form rendering and submission logic
  }
  ```

### React/NextJS Performance Optimization

- Avoid unnecessary re-renders in entity lists and dictionary views:

  ```typescript
  // Use memo for expensive calculations in entity processing
  const sortedEntities = useMemo(
    () => entities.sort((a, b) => a.order - b.order),
    [entities],
  );

  // Use useCallback for entity operations
  const handleEntityBookmark = useCallback(
    (id: string) => {
      toggleEntityBookmark(id);
    },
    [toggleEntityBookmark],
  );

  // Use memo for entity components that render often
  const MemoizedEntityCard = memo(EntityCard, (prev, next) => {
    return (
      prev.entity.id === next.entity.id &&
      prev.entity.updatedAt === next.entity.updatedAt
    );
  });
  ```

- Implement proper key strategies for entity and dictionary lists:

  ```typescript
  // Good: Using entity IDs for devotional content lists
  {
    entities.map((entity) => <EntityCard key={entity.id} entity={entity} />);
  }

  // Good: Using combined keys for dictionary entries when needed
  {
    dictionaryWords.map((word) => (
      <DictionaryEntry
        key={`${word.origin}-${word.wordIndex}`}
        word={word}
      />
    ));
  }
  ```

- Implement debouncing for dictionary search and entity filtering:

  ```typescript
  export function useDictionarySearch() {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const { data, isLoading } = useQuery({
      queryKey: ["dictionary", "search", debouncedSearchTerm],
      queryFn: () => searchDictionaryWords(debouncedSearchTerm),
      enabled: debouncedSearchTerm.length > 1,
    });

    return {
      searchTerm,
      setSearchTerm,
      results: data || [],
      isLoading,
    };
  }
  ```

- Implement virtualization for large entity and dictionary lists:

  ```typescript
  import { useVirtualizer } from '@tanstack/react-virtual';

  export function VirtualizedEntityList({ entities }: { entities: Entity[] }) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
      count: entities.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 100,
    });

    return (
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={entities[virtualItem.index].id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <EntityCard entity={entities[virtualItem.index]} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  ```

### Responsive Design Specifications

- Mobile-first approach using Tailwind breakpoints
- Layouts:
  - Mobile (< 640px): Single column, collapsible sections
  - Tablet (640px - 1024px): Two columns, sidebar navigation
  - Desktop (> 1024px): Three columns, full dashboard view
- Touch targets minimum 44×44 pixels on mobile
- Swipe gestures for common actions on mobile

### Error Handling

- Form validation errors with field-level feedback
- API error responses with typed error objects:

  ```typescript
  // Define error types
  type ApiError =
    | { code: "UNAUTHORIZED"; message: string }
    | {
        code: "VALIDATION_ERROR";
        message: string;
        fields: Record<string, string>;
      }
    | { code: "SERVER_ERROR"; message: string };

  // Type-safe error handling
  try {
    const data = await apiCall();
    // Handle success
  } catch (error) {
    if (isApiError(error)) {
      switch (error.code) {
        case "UNAUTHORIZED":
          // Handle unauthorized
          break;
        case "VALIDATION_ERROR":
          // Handle validation errors with field specificity
          break;
        case "SERVER_ERROR":
          // Handle server error
          break;
      }
    }
  }
  ```

- Global error boundary components
- Fallback UI components for each major feature
- Offline detection and data synchronization

### Accessibility Requirements

- WCAG 2.1 AA compliance target
- Semantic HTML structure throughout
- ARIA attributes for all interactive elements
- Focus management for modals and dialogs
- Keyboard navigation support (tab order, shortcuts)
- Minimum contrast ratio of 4.5:1 for all text
- Screen reader compatible components

## Performance Optimization

- Component code splitting with dynamic imports
- Image optimization with Next/Image
- Incremental Static Regeneration where applicable
- Memoization of expensive calculations
- Virtualized lists for large datasets
- Optimistic UI updates for immediate feedback
- Minimum contrast ratio of 4.5:1 for text
