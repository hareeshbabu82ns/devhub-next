/**
 * FilterService - Filter Management Layer
 * 
 * Tasks: T010, T120-T123
 * Purpose: Pure static methods for filter validation, serialization, and query building
 * Pattern: Static utility class (no state)
 * Testing: 100% pure functions
 */

import { z } from "zod";
import { UserFilter, FilterValidationResult } from "./types";
import { RepositoryQuery } from "./dictionary-repository";

/**
 * Zod schema for filter validation
 */
export const UserFilterSchema = z.object({
  origins: z.array(z.string()).default([]),
  language: z.string().nullable().default(null),
  wordLengthMin: z.number().int().positive().nullable().default(null),
  wordLengthMax: z.number().int().positive().nullable().default(null),
  hasAudio: z.boolean().nullable().default(null),
  hasAttributes: z.boolean().nullable().default(null),
  dateRange: z
    .object({
      start: z.date().nullable().default(null),
      end: z.date().nullable().default(null),
    })
    .default({ start: null, end: null }),
});

/**
 * FilterService provides pure functions for filter operations
 * All methods are static - no state or dependencies
 */
export class FilterService {
  /**
   * T120: Validate filters using Zod schema
   * Returns validation result with errors
   */
  static validateFilters(filters: unknown): FilterValidationResult {
    try {
      const result = UserFilterSchema.safeParse(filters);

      if (!result.success) {
        const errors = result.error.issues.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );
        return { isValid: false, errors };
      }

      const validatedFilters = result.data;
      const warnings: string[] = [];

      // Logical validation: wordLengthMin <= wordLengthMax
      if (
        validatedFilters.wordLengthMin !== null &&
        validatedFilters.wordLengthMax !== null &&
        validatedFilters.wordLengthMin > validatedFilters.wordLengthMax
      ) {
        return {
          isValid: false,
          errors: ["Word length minimum cannot be greater than maximum"],
        };
      }

      // Logical validation: date range start <= end
      if (
        validatedFilters.dateRange.start &&
        validatedFilters.dateRange.end &&
        validatedFilters.dateRange.start > validatedFilters.dateRange.end
      ) {
        return {
          isValid: false,
          errors: ["Date range start cannot be after end"],
        };
      }

      // Warning: No filters applied
      if (
        validatedFilters.origins.length === 0 &&
        validatedFilters.language === null &&
        validatedFilters.wordLengthMin === null &&
        validatedFilters.wordLengthMax === null &&
        validatedFilters.hasAudio === null &&
        validatedFilters.hasAttributes === null &&
        !validatedFilters.dateRange.start &&
        !validatedFilters.dateRange.end
      ) {
        warnings.push("No filters applied - showing all results");
      }

      return { isValid: true, errors: [], warnings };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          error instanceof Error ? error.message : "Unknown validation error",
        ],
      };
    }
  }

  /**
   * T121: Convert UserFilter to RepositoryQuery
   * Maps user-facing filter structure to database query structure
   */
  static buildQuery(
    filters: UserFilter,
    pagination: { limit: number; offset: number },
    sorting: { sortBy: string; sortOrder: "asc" | "desc" }
  ): Omit<RepositoryQuery, "queryText"> {
    return {
      origins: filters.origins,
      wordLengthMin: filters.wordLengthMin ?? undefined,
      wordLengthMax: filters.wordLengthMax ?? undefined,
      hasAudio: filters.hasAudio ?? undefined,
      hasAttributes: filters.hasAttributes ?? undefined,
      dateRange:
        filters.dateRange.start || filters.dateRange.end
          ? {
              start: filters.dateRange.start ?? undefined,
              end: filters.dateRange.end ?? undefined,
            }
          : undefined,
      limit: pagination.limit,
      offset: pagination.offset,
      sortBy: sorting.sortBy as "wordIndex" | "phonetic" | "relevance",
      sortOrder: sorting.sortOrder,
    };
  }

  /**
   * T122: Serialize filters to URL parameter encoding
   * Format: origins=mw,ap90&wordLengthMin=5&hasAudio=true
   */
  static serializeFilters(filters: UserFilter): string {
    const params = new URLSearchParams();

    if (filters.origins.length > 0) {
      params.set("origins", filters.origins.join(","));
    }

    if (filters.language) {
      params.set("language", filters.language);
    }

    if (filters.wordLengthMin !== null) {
      params.set("wordLengthMin", filters.wordLengthMin.toString());
    }

    if (filters.wordLengthMax !== null) {
      params.set("wordLengthMax", filters.wordLengthMax.toString());
    }

    if (filters.hasAudio !== null) {
      params.set("hasAudio", filters.hasAudio.toString());
    }

    if (filters.hasAttributes !== null) {
      params.set("hasAttributes", filters.hasAttributes.toString());
    }

    if (filters.dateRange.start) {
      params.set("dateStart", filters.dateRange.start.toISOString());
    }

    if (filters.dateRange.end) {
      params.set("dateEnd", filters.dateRange.end.toISOString());
    }

    return params.toString();
  }

  /**
   * T123: Deserialize filters from URL params
   * Restores UserFilter from URL parameter string
   */
  static deserializeFromUrl(
    searchParams: URLSearchParams | string
  ): UserFilter {
    const params =
      typeof searchParams === "string"
        ? new URLSearchParams(searchParams)
        : searchParams;

    const filters: UserFilter = {
      origins: [],
      language: null,
      wordLengthMin: null,
      wordLengthMax: null,
      hasAudio: null,
      hasAttributes: null,
      dateRange: {
        start: null,
        end: null,
      },
    };

    // Parse origins
    const originsParam = params.get("origins");
    if (originsParam) {
      filters.origins = originsParam.split(",").filter(Boolean);
    }

    // Parse language
    filters.language = params.get("language");

    // Parse word length
    const wordLengthMinParam = params.get("wordLengthMin");
    if (wordLengthMinParam) {
      const parsed = parseInt(wordLengthMinParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        filters.wordLengthMin = parsed;
      }
    }

    const wordLengthMaxParam = params.get("wordLengthMax");
    if (wordLengthMaxParam) {
      const parsed = parseInt(wordLengthMaxParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        filters.wordLengthMax = parsed;
      }
    }

    // Parse boolean flags
    const hasAudioParam = params.get("hasAudio");
    if (hasAudioParam !== null) {
      filters.hasAudio = hasAudioParam === "true";
    }

    const hasAttributesParam = params.get("hasAttributes");
    if (hasAttributesParam !== null) {
      filters.hasAttributes = hasAttributesParam === "true";
    }

    // Parse date range
    const dateStartParam = params.get("dateStart");
    if (dateStartParam) {
      try {
        const date = new Date(dateStartParam);
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          filters.dateRange.start = date;
        }
      } catch {
        // Invalid date, ignore
      }
    }

    const dateEndParam = params.get("dateEnd");
    if (dateEndParam) {
      try {
        const date = new Date(dateEndParam);
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          filters.dateRange.end = date;
        }
      } catch {
        // Invalid date, ignore
      }
    }

    return filters;
  }

  /**
   * Helper: Create empty filter state
   */
  static createEmptyFilter(): UserFilter {
    return {
      origins: [],
      language: null,
      wordLengthMin: null,
      wordLengthMax: null,
      hasAudio: null,
      hasAttributes: null,
      dateRange: {
        start: null,
        end: null,
      },
    };
  }

  /**
   * Helper: Check if filter is empty (no filters applied)
   */
  static isEmptyFilter(filters: UserFilter): boolean {
    return (
      filters.origins.length === 0 &&
      filters.language === null &&
      filters.wordLengthMin === null &&
      filters.wordLengthMax === null &&
      filters.hasAudio === null &&
      filters.hasAttributes === null &&
      filters.dateRange.start === null &&
      filters.dateRange.end === null
    );
  }

  /**
   * Helper: Merge filters (for updating partial filters)
   */
  static mergeFilters(base: UserFilter, updates: Partial<UserFilter>): UserFilter {
    return {
      origins: updates.origins ?? base.origins,
      language: updates.language ?? base.language,
      wordLengthMin: updates.wordLengthMin ?? base.wordLengthMin,
      wordLengthMax: updates.wordLengthMax ?? base.wordLengthMax,
      hasAudio: updates.hasAudio ?? base.hasAudio,
      hasAttributes: updates.hasAttributes ?? base.hasAttributes,
      dateRange: updates.dateRange ?? base.dateRange,
    };
  }
}
