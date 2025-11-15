/**
 * Unit Tests for FilterService
 * 
 * Task: T126
 * Purpose: Verify pure function behavior without dependencies
 * Coverage Target: 90%+
 */

import { FilterService } from "../filter-service";
import { UserFilter } from "../types";

describe("FilterService", () => {
  describe("validateFilters", () => {
    it("should validate correct filter structure", () => {
      const filters: UserFilter = {
        origins: ["mw", "ap90"],
        language: "sa",
        wordLengthMin: 5,
        wordLengthMax: 10,
        hasAudio: true,
        hasAttributes: false,
        dateRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-12-31"),
        },
      };

      const result = FilterService.validateFilters(filters);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject wordLengthMin > wordLengthMax", () => {
      const filters: UserFilter = {
        origins: [],
        language: null,
        wordLengthMin: 10,
        wordLengthMax: 5,
        hasAudio: null,
        hasAttributes: null,
        dateRange: { start: null, end: null },
      };

      const result = FilterService.validateFilters(filters);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("minimum cannot be greater than maximum");
    });

    it("should reject invalid date range", () => {
      const filters: UserFilter = {
        origins: [],
        language: null,
        wordLengthMin: null,
        wordLengthMax: null,
        hasAudio: null,
        hasAttributes: null,
        dateRange: {
          start: new Date("2024-12-31"),
          end: new Date("2024-01-01"),
        },
      };

      const result = FilterService.validateFilters(filters);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("start cannot be after end");
    });

    it("should warn when no filters applied", () => {
      const filters = FilterService.createEmptyFilter();

      const result = FilterService.validateFilters(filters);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.[0]).toContain("No filters applied");
    });

    it("should handle invalid input gracefully", () => {
      const invalidFilters = {
        origins: "not-an-array", // Should be array
        wordLengthMin: "invalid", // Should be number
      };

      const result = FilterService.validateFilters(invalidFilters);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should allow null values for optional fields", () => {
      const filters: UserFilter = {
        origins: ["mw"],
        language: null,
        wordLengthMin: null,
        wordLengthMax: null,
        hasAudio: null,
        hasAttributes: null,
        dateRange: { start: null, end: null },
      };

      const result = FilterService.validateFilters(filters);

      expect(result.isValid).toBe(true);
    });
  });

  describe("buildQuery", () => {
    it("should convert UserFilter to RepositoryQuery", () => {
      const filters: UserFilter = {
        origins: ["mw", "ap90"],
        language: "sa",
        wordLengthMin: 5,
        wordLengthMax: 10,
        hasAudio: true,
        hasAttributes: false,
        dateRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-12-31"),
        },
      };

      const pagination = { limit: 20, offset: 0 };
      const sorting = { sortBy: "wordIndex", sortOrder: "asc" as const };

      const query = FilterService.buildQuery(filters, pagination, sorting);

      expect(query.origins).toEqual(["mw", "ap90"]);
      expect(query.wordLengthMin).toBe(5);
      expect(query.wordLengthMax).toBe(10);
      expect(query.hasAudio).toBe(true);
      expect(query.hasAttributes).toBe(false);
      expect(query.dateRange).toBeDefined();
      expect(query.limit).toBe(20);
      expect(query.offset).toBe(0);
    });

    it("should handle empty filters", () => {
      const filters = FilterService.createEmptyFilter();
      const pagination = { limit: 10, offset: 5 };
      const sorting = { sortBy: "phonetic", sortOrder: "desc" as const };

      const query = FilterService.buildQuery(filters, pagination, sorting);

      expect(query.origins).toEqual([]);
      expect(query.wordLengthMin).toBeUndefined();
      expect(query.wordLengthMax).toBeUndefined();
      expect(query.hasAudio).toBeUndefined();
      expect(query.limit).toBe(10);
      expect(query.offset).toBe(5);
    });

    it("should omit dateRange when both dates are null", () => {
      const filters: UserFilter = {
        ...FilterService.createEmptyFilter(),
        origins: ["mw"],
      };

      const pagination = { limit: 20, offset: 0 };
      const sorting = { sortBy: "wordIndex", sortOrder: "asc" as const };

      const query = FilterService.buildQuery(filters, pagination, sorting);

      expect(query.dateRange).toBeUndefined();
    });
  });

  describe("serializeFilters", () => {
    it("should serialize filters to URL parameters", () => {
      const filters: UserFilter = {
        origins: ["mw", "ap90"],
        language: "sa",
        wordLengthMin: 5,
        wordLengthMax: 10,
        hasAudio: true,
        hasAttributes: false,
        dateRange: {
          start: new Date("2024-01-01T00:00:00.000Z"),
          end: new Date("2024-12-31T23:59:59.999Z"),
        },
      };

      const serialized = FilterService.serializeFilters(filters);

      expect(serialized).toContain("origins=mw%2Cap90");
      expect(serialized).toContain("language=sa");
      expect(serialized).toContain("wordLengthMin=5");
      expect(serialized).toContain("wordLengthMax=10");
      expect(serialized).toContain("hasAudio=true");
      expect(serialized).toContain("hasAttributes=false");
      expect(serialized).toContain("dateStart=2024-01-01");
      expect(serialized).toContain("dateEnd=2024-12-31");
    });

    it("should omit null values", () => {
      const filters: UserFilter = {
        origins: ["mw"],
        language: null,
        wordLengthMin: null,
        wordLengthMax: null,
        hasAudio: null,
        hasAttributes: null,
        dateRange: { start: null, end: null },
      };

      const serialized = FilterService.serializeFilters(filters);

      expect(serialized).toContain("origins=mw");
      expect(serialized).not.toContain("language");
      expect(serialized).not.toContain("wordLengthMin");
      expect(serialized).not.toContain("hasAudio");
      expect(serialized).not.toContain("dateStart");
    });

    it("should handle empty filters", () => {
      const filters = FilterService.createEmptyFilter();
      const serialized = FilterService.serializeFilters(filters);

      expect(serialized).toBe("");
    });
  });

  describe("deserializeFromUrl", () => {
    it("should deserialize from URLSearchParams", () => {
      const params = new URLSearchParams(
        "origins=mw,ap90&language=sa&wordLengthMin=5&wordLengthMax=10&hasAudio=true&hasAttributes=false&dateStart=2024-01-01&dateEnd=2024-12-31"
      );

      const filters = FilterService.deserializeFromUrl(params);

      expect(filters.origins).toEqual(["mw", "ap90"]);
      expect(filters.language).toBe("sa");
      expect(filters.wordLengthMin).toBe(5);
      expect(filters.wordLengthMax).toBe(10);
      expect(filters.hasAudio).toBe(true);
      expect(filters.hasAttributes).toBe(false);
      expect(filters.dateRange.start).toBeInstanceOf(Date);
      expect(filters.dateRange.end).toBeInstanceOf(Date);
    });

    it("should deserialize from string", () => {
      const paramString = "origins=mw&wordLengthMin=3&hasAudio=true";

      const filters = FilterService.deserializeFromUrl(paramString);

      expect(filters.origins).toEqual(["mw"]);
      expect(filters.wordLengthMin).toBe(3);
      expect(filters.hasAudio).toBe(true);
    });

    it("should handle missing parameters", () => {
      const params = new URLSearchParams("origins=mw");

      const filters = FilterService.deserializeFromUrl(params);

      expect(filters.origins).toEqual(["mw"]);
      expect(filters.language).toBeNull();
      expect(filters.wordLengthMin).toBeNull();
      expect(filters.hasAudio).toBeNull();
      expect(filters.dateRange.start).toBeNull();
    });

    it("should handle invalid number values", () => {
      const params = new URLSearchParams("wordLengthMin=invalid&wordLengthMax=-5");

      const filters = FilterService.deserializeFromUrl(params);

      expect(filters.wordLengthMin).toBeNull(); // Invalid string
      expect(filters.wordLengthMax).toBeNull(); // Negative number
    });

    it("should handle invalid date values", () => {
      const params = new URLSearchParams("dateStart=invalid-date");

      const filters = FilterService.deserializeFromUrl(params);

      expect(filters.dateRange.start).toBeNull();
    });

    it("should round-trip serialize/deserialize correctly", () => {
      const originalFilters: UserFilter = {
        origins: ["mw", "ap90", "eng2te"],
        language: "sa",
        wordLengthMin: 3,
        wordLengthMax: 15,
        hasAudio: true,
        hasAttributes: false,
        dateRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-12-31"),
        },
      };

      const serialized = FilterService.serializeFilters(originalFilters);
      const deserialized = FilterService.deserializeFromUrl(serialized);

      expect(deserialized.origins).toEqual(originalFilters.origins);
      expect(deserialized.language).toBe(originalFilters.language);
      expect(deserialized.wordLengthMin).toBe(originalFilters.wordLengthMin);
      expect(deserialized.wordLengthMax).toBe(originalFilters.wordLengthMax);
      expect(deserialized.hasAudio).toBe(originalFilters.hasAudio);
      expect(deserialized.hasAttributes).toBe(originalFilters.hasAttributes);
    });
  });

  describe("createEmptyFilter", () => {
    it("should create filter with all null/empty values", () => {
      const filter = FilterService.createEmptyFilter();

      expect(filter.origins).toEqual([]);
      expect(filter.language).toBeNull();
      expect(filter.wordLengthMin).toBeNull();
      expect(filter.wordLengthMax).toBeNull();
      expect(filter.hasAudio).toBeNull();
      expect(filter.hasAttributes).toBeNull();
      expect(filter.dateRange.start).toBeNull();
      expect(filter.dateRange.end).toBeNull();
    });
  });

  describe("isEmptyFilter", () => {
    it("should return true for empty filter", () => {
      const filter = FilterService.createEmptyFilter();
      expect(FilterService.isEmptyFilter(filter)).toBe(true);
    });

    it("should return false when origins has values", () => {
      const filter: UserFilter = {
        ...FilterService.createEmptyFilter(),
        origins: ["mw"],
      };
      expect(FilterService.isEmptyFilter(filter)).toBe(false);
    });

    it("should return false when any filter is set", () => {
      const filter: UserFilter = {
        ...FilterService.createEmptyFilter(),
        hasAudio: true,
      };
      expect(FilterService.isEmptyFilter(filter)).toBe(false);
    });

    it("should return false when date range is set", () => {
      const filter: UserFilter = {
        ...FilterService.createEmptyFilter(),
        dateRange: {
          start: new Date("2024-01-01"),
          end: null,
        },
      };
      expect(FilterService.isEmptyFilter(filter)).toBe(false);
    });
  });

  describe("mergeFilters", () => {
    it("should merge partial updates with base filter", () => {
      const base: UserFilter = {
        origins: ["mw"],
        language: "sa",
        wordLengthMin: 5,
        wordLengthMax: 10,
        hasAudio: true,
        hasAttributes: false,
        dateRange: { start: null, end: null },
      };

      const updates: Partial<UserFilter> = {
        origins: ["ap90"],
        wordLengthMin: 3,
      };

      const merged = FilterService.mergeFilters(base, updates);

      expect(merged.origins).toEqual(["ap90"]);
      expect(merged.language).toBe("sa"); // Unchanged
      expect(merged.wordLengthMin).toBe(3);
      expect(merged.wordLengthMax).toBe(10); // Unchanged
    });

    it("should not mutate original filter", () => {
      const base = FilterService.createEmptyFilter();
      const updates: Partial<UserFilter> = {
        origins: ["mw"],
      };

      const merged = FilterService.mergeFilters(base, updates);

      expect(base.origins).toEqual([]);
      expect(merged.origins).toEqual(["mw"]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty origin array", () => {
      const filters: UserFilter = {
        ...FilterService.createEmptyFilter(),
        origins: [],
      };

      const serialized = FilterService.serializeFilters(filters);
      expect(serialized).toBe("");
    });

    it("should handle boolean false values correctly", () => {
      const filters: UserFilter = {
        ...FilterService.createEmptyFilter(),
        hasAudio: false,
        hasAttributes: false,
      };

      const serialized = FilterService.serializeFilters(filters);
      const deserialized = FilterService.deserializeFromUrl(serialized);

      expect(deserialized.hasAudio).toBe(false);
      expect(deserialized.hasAttributes).toBe(false);
    });

    it("should handle zero values for wordLength", () => {
      const filters: UserFilter = {
        ...FilterService.createEmptyFilter(),
        wordLengthMin: 0, // Edge case: zero length
      };

      // Zero length should be treated as invalid (not positive)
      const result = FilterService.validateFilters(filters);
      expect(result.isValid).toBe(false);
    });
  });
});
