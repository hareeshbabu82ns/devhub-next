import {
  chunkArray,
  uniqueArray,
  deepClone,
  omit,
  pick,
  slugify,
  truncate,
  capitalizeFirst,
  camelToKebab,
  kebabToCamel,
  clamp,
  randomBetween,
  isEven,
  isOdd,
  isValidDate,
  addDays,
  daysBetween,
  isEmail,
  isUrl,
  isEmpty,
} from "../test-utils";

describe("Test Utility Functions", () => {
  describe("Array utilities", () => {
    describe("chunkArray", () => {
      it("should split array into chunks of specified size", () => {
        const array = [1, 2, 3, 4, 5, 6, 7];
        const result = chunkArray(array, 3);
        expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
      });

      it("should handle empty array", () => {
        expect(chunkArray([], 3)).toEqual([]);
      });

      it("should throw error for invalid chunk size", () => {
        expect(() => chunkArray([1, 2, 3], 0)).toThrow(
          "Chunk size must be positive",
        );
        expect(() => chunkArray([1, 2, 3], -1)).toThrow(
          "Chunk size must be positive",
        );
      });

      it("should handle chunk size larger than array", () => {
        const array = [1, 2, 3];
        const result = chunkArray(array, 5);
        expect(result).toEqual([[1, 2, 3]]);
      });
    });

    describe("uniqueArray", () => {
      it("should remove duplicate values", () => {
        const array = [1, 2, 2, 3, 3, 3, 4];
        expect(uniqueArray(array)).toEqual([1, 2, 3, 4]);
      });

      it("should handle empty array", () => {
        expect(uniqueArray([])).toEqual([]);
      });

      it("should work with strings", () => {
        const array = ["a", "b", "a", "c", "b"];
        expect(uniqueArray(array)).toEqual(["a", "b", "c"]);
      });
    });
  });

  describe("Object utilities", () => {
    describe("deepClone", () => {
      it("should clone primitive values", () => {
        expect(deepClone(42)).toBe(42);
        expect(deepClone("hello")).toBe("hello");
        expect(deepClone(true)).toBe(true);
        expect(deepClone(null)).toBe(null);
      });

      it("should clone arrays", () => {
        const original = [1, 2, [3, 4]];
        const cloned = deepClone(original);
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned[2]).not.toBe(original[2]);
      });

      it("should clone objects", () => {
        const original = { a: 1, b: { c: 2 } };
        const cloned = deepClone(original);
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned.b).not.toBe(original.b);
      });

      it("should clone dates", () => {
        const original = new Date("2024-01-01");
        const cloned = deepClone(original);
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
      });
    });

    describe("omit", () => {
      it("should remove specified keys", () => {
        const obj = { a: 1, b: 2, c: 3 };
        const result = omit(obj, ["b", "c"]);
        expect(result).toEqual({ a: 1 });
      });

      it("should handle non-existent keys", () => {
        const obj = { a: 1, b: 2 };
        const result = omit(obj, ["c"] as any);
        expect(result).toEqual({ a: 1, b: 2 });
      });
    });

    describe("pick", () => {
      it("should pick specified keys", () => {
        const obj = { a: 1, b: 2, c: 3 };
        const result = pick(obj, ["a", "c"]);
        expect(result).toEqual({ a: 1, c: 3 });
      });

      it("should handle non-existent keys", () => {
        const obj = { a: 1, b: 2 };
        const result = pick(obj, ["a", "c"] as any);
        expect(result).toEqual({ a: 1 });
      });
    });
  });

  describe("String utilities", () => {
    describe("slugify", () => {
      it("should convert text to slug format", () => {
        expect(slugify("Hello World!")).toBe("hello-world");
      });

      it("should handle special characters", () => {
        expect(slugify("Hello, World! @#$")).toBe("hello-world");
      });

      it("should handle multiple spaces", () => {
        expect(slugify("hello    world")).toBe("hello-world");
      });
    });

    describe("truncate", () => {
      it("should truncate long text", () => {
        const text = "This is a very long text";
        expect(truncate(text, 10)).toBe("This is...");
      });

      it("should not truncate short text", () => {
        const text = "Short";
        expect(truncate(text, 10)).toBe("Short");
      });

      it("should use custom suffix", () => {
        const text = "This is a long text";
        expect(truncate(text, 10, "***")).toBe("This is***");
      });
    });

    describe("capitalizeFirst", () => {
      it("should capitalize first letter", () => {
        expect(capitalizeFirst("hello")).toBe("Hello");
      });

      it("should handle empty string", () => {
        expect(capitalizeFirst("")).toBe("");
      });

      it("should lowercase the rest", () => {
        expect(capitalizeFirst("hELLO")).toBe("Hello");
      });
    });

    describe("camelToKebab", () => {
      it("should convert camelCase to kebab-case", () => {
        expect(camelToKebab("helloWorld")).toBe("hello-world");
      });

      it("should handle single word", () => {
        expect(camelToKebab("hello")).toBe("hello");
      });
    });

    describe("kebabToCamel", () => {
      it("should convert kebab-case to camelCase", () => {
        expect(kebabToCamel("hello-world")).toBe("helloWorld");
      });

      it("should handle single word", () => {
        expect(kebabToCamel("hello")).toBe("hello");
      });
    });
  });

  describe("Number utilities", () => {
    describe("clamp", () => {
      it("should clamp value within range", () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(15, 0, 10)).toBe(10);
      });
    });

    describe("randomBetween", () => {
      it("should generate number in range", () => {
        const result = randomBetween(1, 10);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
      });
    });

    describe("isEven and isOdd", () => {
      it("should identify even numbers", () => {
        expect(isEven(2)).toBe(true);
        expect(isEven(3)).toBe(false);
      });

      it("should identify odd numbers", () => {
        expect(isOdd(3)).toBe(true);
        expect(isOdd(2)).toBe(false);
      });
    });
  });

  describe("Date utilities", () => {
    describe("isValidDate", () => {
      it("should validate dates", () => {
        expect(isValidDate(new Date())).toBe(true);
        expect(isValidDate(new Date("invalid"))).toBe(false);
        expect(isValidDate("not a date")).toBe(false);
      });
    });

    describe("addDays", () => {
      it("should add days to date", () => {
        const date = new Date("2024-01-01");
        const result = addDays(date, 5);
        expect(result.getDate()).toBe(6);
      });
    });

    describe("daysBetween", () => {
      it("should calculate days between dates", () => {
        const date1 = new Date("2024-01-01");
        const date2 = new Date("2024-01-06");
        expect(daysBetween(date1, date2)).toBe(5);
      });
    });
  });

  describe("Validation utilities", () => {
    describe("isEmail", () => {
      it("should validate email addresses", () => {
        expect(isEmail("test@example.com")).toBe(true);
        expect(isEmail("invalid-email")).toBe(false);
        expect(isEmail("test@")).toBe(false);
      });
    });

    describe("isUrl", () => {
      it("should validate URLs", () => {
        expect(isUrl("https://example.com")).toBe(true);
        expect(isUrl("http://test.com")).toBe(true);
        expect(isUrl("not-a-url")).toBe(false);
      });
    });

    describe("isEmpty", () => {
      it("should check if values are empty", () => {
        expect(isEmpty(null)).toBe(true);
        expect(isEmpty(undefined)).toBe(true);
        expect(isEmpty("")).toBe(true);
        expect(isEmpty("   ")).toBe(true);
        expect(isEmpty([])).toBe(true);
        expect(isEmpty({})).toBe(true);
        expect(isEmpty("hello")).toBe(false);
        expect(isEmpty([1])).toBe(false);
        expect(isEmpty({ a: 1 })).toBe(false);
      });
    });
  });
});
