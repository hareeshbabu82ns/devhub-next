import { z } from "zod";
import { EntityFormSchema } from "../entities";

describe("Entity Validation Schemas", () => {
  describe("EntityFormSchema", () => {
    const validEntityData = {
      type: "STHOTRAM",
      text: [
        { language: "SAN", value: "शिवाय नमः" },
        { language: "ENG", value: "Shivaya Namah" },
      ],
      meaning: [{ language: "ENG", value: "Salutations to Shiva" }],
      order: 1,
      bookmarked: false,
      notes: "Test notes",
    };

    it("should validate valid entity data", () => {
      expect(() => EntityFormSchema.parse(validEntityData)).not.toThrow();
    });

    it("should require type field", () => {
      const invalidData = { ...validEntityData };
      delete (invalidData as any).type;

      expect(() => EntityFormSchema.parse(invalidData)).toThrow();
    });

    it("should allow empty text array", () => {
      const dataWithEmptyText = { ...validEntityData, text: [] };

      expect(() => EntityFormSchema.parse(dataWithEmptyText)).not.toThrow();
    });

    it("should validate text entries have required fields", () => {
      const invalidData = {
        ...validEntityData,
        text: [{ language: "SAN" }], // missing value
      };

      expect(() => EntityFormSchema.parse(invalidData)).toThrow();
    });

    it("should accept valid entity types", () => {
      const entityTypes = [
        "GOD",
        "AUTHOR",
        "ITIHASAM",
        "PURANAM",
        "STHOTRAM",
        "DANDAKAM",
        "KAANDAM",
        "SARGA",
        "PARVAM",
        "ADHYAAYAM",
        "SLOKAM",
        "OTHERS",
        "SKANDAM",
        "GHATTAM",
        "VRATHAM",
        "KEERTHANAM",
      ];

      entityTypes.forEach((type) => {
        const testData = { ...validEntityData, type };
        expect(() => EntityFormSchema.parse(testData)).not.toThrow();
      });
    });

    it("should reject invalid entity types", () => {
      const invalidData = { ...validEntityData, type: "INVALID_TYPE" };

      expect(() => EntityFormSchema.parse(invalidData)).toThrow();
    });

    it("should accept valid language codes", () => {
      const languages = ["SAN", "TEL", "TAM", "ITRANS", "IAST", "SLP1", "ENG"];

      languages.forEach((language) => {
        const testData = {
          ...validEntityData,
          text: [{ language, value: "test value" }],
        };
        expect(() => EntityFormSchema.parse(testData)).not.toThrow();
      });
    });

    it("should reject invalid language codes", () => {
      const invalidData = {
        ...validEntityData,
        text: [{ language: "INVALID_LANG", value: "test" }],
      };

      expect(() => EntityFormSchema.parse(invalidData)).toThrow();
    });

    it("should make meaning optional", () => {
      const { meaning, ...dataWithoutMeaning } = validEntityData;
      expect(() => EntityFormSchema.parse(dataWithoutMeaning)).not.toThrow();
    });

    it("should make attributes optional", () => {
      const dataWithoutAttributes = { ...validEntityData };
      delete (dataWithoutAttributes as any).attributes;

      expect(() => EntityFormSchema.parse(dataWithoutAttributes)).not.toThrow();
    });

    it("should validate attributes structure when provided", () => {
      const dataWithAttributes = {
        ...validEntityData,
        attributes: [
          { key: "category", value: "devotional" },
          { key: "difficulty", value: "beginner" },
        ],
      };

      expect(() => EntityFormSchema.parse(dataWithAttributes)).not.toThrow();
    });

    it("should reject attributes with missing keys", () => {
      const invalidData = {
        ...validEntityData,
        attributes: [
          { value: "devotional" }, // missing key
        ],
      };

      expect(() => EntityFormSchema.parse(invalidData)).toThrow();
    });

    it("should handle optional fields correctly", () => {
      const minimalData = {
        type: "STHOTRAM",
        text: [{ language: "SAN", value: "test" }],
      };

      // Should parse successfully with minimal data
      const parsed = EntityFormSchema.parse(minimalData);
      expect(parsed.type).toBe("STHOTRAM");
      expect(parsed.text).toEqual([{ language: "SAN", value: "test" }]);

      // Optional fields should be undefined when not provided (this is valid)
      expect(parsed.meaning).toBeUndefined();
      expect(parsed.attributes).toBeUndefined();
      expect(parsed.parentIDs).toBeUndefined();
      expect(parsed.childIDs).toBeUndefined();
    });

    it("should handle parent and child relationships", () => {
      const dataWithRelations = {
        ...validEntityData,
        parentIDs: [{ type: "GOD", id: "123", text: "Shiva" }],
        childIDs: [{ type: "SLOKAM", id: "456", text: "First verse" }],
      };

      expect(() => EntityFormSchema.parse(dataWithRelations)).not.toThrow();
    });

    it("should validate numeric order field", () => {
      const validOrderData = { ...validEntityData, order: 42 };
      expect(() => EntityFormSchema.parse(validOrderData)).not.toThrow();

      const invalidOrderData = { ...validEntityData, order: "not-a-number" };
      expect(() => EntityFormSchema.parse(invalidOrderData)).toThrow();
    });

    it("should validate boolean bookmarked field", () => {
      const bookmarkedData = { ...validEntityData, bookmarked: true };
      expect(() => EntityFormSchema.parse(bookmarkedData)).not.toThrow();

      const invalidBookmarkData = {
        ...validEntityData,
        bookmarked: "not-boolean",
      };
      expect(() => EntityFormSchema.parse(invalidBookmarkData)).toThrow();
    });
  });
});
