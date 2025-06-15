import { transliteratedText } from "../../app/(app)/sanscript/_components/utils";
import { LANGUAGES_TYPE } from "@/lib/constants";

describe("transliteratedText", () => {
  describe("when processing transliteration instructions", () => {
    it("should transliterate text when transliteration instruction is present", () => {
      const textData = [
        { language: "SAN", value: "गायत्री मंत्र" },
        { language: "TEL", value: "$transliterateFrom=SAN" },
      ];

      const result = transliteratedText(textData);

      // Should have the same number of items
      expect(result).toHaveLength(2);
      // Original Sanskrit text should be preserved
      expect(result?.[0]).toEqual({ language: "SAN", value: "गायत्री मंत्र" });
      // Telugu text should be transliterated (not the instruction)
      expect(result?.[1].language).toBe("TEL");
      expect(result?.[1].value).not.toBe("$transliterateFrom=SAN");
      // Should be a non-empty string (actual transliteration result)
      expect(result?.[1].value).toBeTruthy();
      expect(typeof result?.[1].value).toBe("string");
    });

    it("should handle multiple source languages in transliteration instruction", () => {
      const textData = [
        { language: "SAN", value: "ॐ गायत्री" },
        { language: "IAST", value: "oṃ gāyatrī" },
        { language: "TEL", value: "$transliterateFrom=SAN|IAST" },
      ];

      const result = transliteratedText(textData);

      // Should preserve original entries
      expect(result).toHaveLength(3);
      expect(result?.[0]).toEqual({ language: "SAN", value: "ॐ गायत्री" });
      expect(result?.[1]).toEqual({ language: "IAST", value: "oṃ gāyatrī" });
      // Should use the first available source language (SAN) and transliterate
      expect(result?.[2].language).toBe("TEL");
      expect(result?.[2].value).not.toBe("$transliterateFrom=SAN|IAST");
      expect(result?.[2].value).toBeTruthy();
    });

    it("should fallback to second language when first is not available", () => {
      const textData = [
        { language: "IAST", value: "oṃ gāyatrī" },
        { language: "TEL", value: "$transliterateFrom=SAN|IAST" },
      ];

      const result = transliteratedText(textData);

      // Should use IAST since SAN is not available
      expect(result).toHaveLength(2);
      expect(result?.[0]).toEqual({ language: "IAST", value: "oṃ gāyatrī" });
      expect(result?.[1].language).toBe("TEL");
      expect(result?.[1].value).not.toBe("$transliterateFrom=SAN|IAST");
      expect(result?.[1].value).toBeTruthy();
    });

    it("should return original text when no valid source language is found", () => {
      const textData = [
        { language: "HIN", value: "गायत्री मंत्र" },
        { language: "TEL", value: "$transliterateFrom=SAN|IAST" },
      ];

      const result = transliteratedText(textData);

      // Should return the original instruction since no SAN or IAST text is available
      expect(result).toEqual([
        { language: "HIN", value: "गायत्री मंत्र" },
        { language: "TEL", value: "$transliterateFrom=SAN|IAST" },
      ]);
    });

    it("should return original text when source scheme is not in LANGUAGE_SCHEME_MAP", () => {
      const textData = [
        { language: "UNKNOWN", value: "some text" },
        { language: "TEL", value: "$transliterateFrom=UNKNOWN" },
      ];

      const result = transliteratedText(textData);

      // Should return original since UNKNOWN is not a valid scheme
      expect(result).toEqual([
        { language: "UNKNOWN", value: "some text" },
        { language: "TEL", value: "$transliterateFrom=UNKNOWN" },
      ]);
    });

    it("should return original text when target scheme is not in LANGUAGE_SCHEME_MAP", () => {
      const textData = [
        { language: "SAN", value: "गायत्री मंत्र" },
        { language: "UNKNOWN", value: "$transliterateFrom=SAN" },
      ];

      const result = transliteratedText(textData);

      // Should return original since UNKNOWN is not a valid target scheme
      expect(result).toEqual([
        { language: "SAN", value: "गायत्री मंत्र" },
        { language: "UNKNOWN", value: "$transliterateFrom=SAN" },
      ]);
    });
  });

  describe("when processing regular text", () => {
    it("should return text unchanged when no transliteration instruction", () => {
      const textData = [
        { language: "SAN", value: "गायत्री मंत्र" },
        { language: "TEL", value: "గాయత్రీ మంత్ర" },
        { language: "IAST", value: "gāyatrī mantra" },
      ];

      const result = transliteratedText(textData);

      // Should return exactly the same data
      expect(result).toEqual(textData);
    });

    it("should handle mixed content with some transliteration instructions", () => {
      const textData = [
        { language: "SAN", value: "गायत्री मंत्र" },
        { language: "TEL", value: "$transliterateFrom=SAN" },
        { language: "IAST", value: "gāyatrī mantra" },
      ];

      const result = transliteratedText(textData);

      expect(result).toHaveLength(3);
      // First and third should be unchanged
      expect(result?.[0]).toEqual({ language: "SAN", value: "गायत्री मंत्र" });
      expect(result?.[2]).toEqual({
        language: "IAST",
        value: "gāyatrī mantra",
      });
      // Second should be transliterated
      expect(result?.[1].language).toBe("TEL");
      expect(result?.[1].value).not.toBe("$transliterateFrom=SAN");
      expect(result?.[1].value).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("should handle empty textData array", () => {
      const result = transliteratedText([]);

      expect(result).toEqual([]);
    });

    it("should handle undefined textData", () => {
      const result = transliteratedText(undefined as any);

      expect(result).toBeUndefined();
    });

    it("should handle malformed transliteration instruction without equals sign", () => {
      const textData = [
        { language: "SAN", value: "गायत्री मंत्र" },
        { language: "TEL", value: "$transliterateFromSAN" },
      ];

      const result = transliteratedText(textData);

      // Should return original since instruction is malformed
      expect(result).toEqual(textData);
    });

    it("should handle empty source language list", () => {
      const textData = [
        { language: "SAN", value: "गायत्री मंत्र" },
        { language: "TEL", value: "$transliterateFrom=" },
      ];

      const result = transliteratedText(textData);

      // Should return original since no source languages specified
      expect(result).toEqual(textData);
    });

    it("should handle transliteration instruction with empty source text", () => {
      const textData = [
        { language: "SAN", value: "" },
        { language: "TEL", value: "$transliterateFrom=SAN" },
      ];

      const result = transliteratedText(textData);

      // Empty string is falsy, so the condition `if (from && to && text)` fails
      // and the function returns the original transliteration instruction
      expect(result).toEqual([
        { language: "SAN", value: "" },
        { language: "TEL", value: "$transliterateFrom=SAN" },
      ]);
    });

    it("should handle transliteration instruction with non-empty source text", () => {
      const textData = [
        { language: "SAN", value: "ॐ" },
        { language: "TEL", value: "$transliterateFrom=SAN" },
      ];

      const result = transliteratedText(textData);

      expect(result).toHaveLength(2);
      expect(result?.[0]).toEqual({ language: "SAN", value: "ॐ" });
      expect(result?.[1].language).toBe("TEL");
      expect(result?.[1].value).not.toBe("$transliterateFrom=SAN");
      expect(result?.[1].value).toBeTruthy();
    });

    it("should preserve original array structure and order", () => {
      const textData = [
        { language: "IAST", value: "mantra" },
        { language: "SAN", value: "मंत्र" },
        { language: "TEL", value: "$transliterateFrom=SAN" },
        { language: "HIN", value: "मंत्र" },
      ];

      const result = transliteratedText(textData);

      expect(result).toHaveLength(4);
      expect(result?.[0]).toEqual({ language: "IAST", value: "mantra" });
      expect(result?.[1]).toEqual({ language: "SAN", value: "मंत्र" });
      expect(result?.[3]).toEqual({ language: "HIN", value: "मंत्र" });
      // Only the third item should be transliterated
      expect(result?.[2].language).toBe("TEL");
      expect(result?.[2].value).not.toBe("$transliterateFrom=SAN");
      expect(result?.[2].value).toBeTruthy();
    });
  });

  describe("multiple transliterations in same dataset", () => {
    it("should handle multiple transliteration instructions", () => {
      const textData = [
        { language: "SAN", value: "गायत्री मंत्र" },
        { language: "IAST", value: "gāyatrī mantra" },
        { language: "TEL", value: "$transliterateFrom=SAN" },
        { language: "TAM", value: "$transliterateFrom=IAST" },
      ];

      const result = transliteratedText(textData);

      expect(result).toHaveLength(4);
      // Original texts should be preserved
      expect(result?.[0]).toEqual({ language: "SAN", value: "गायत्री मंत्र" });
      expect(result?.[1]).toEqual({
        language: "IAST",
        value: "gāyatrī mantra",
      });
      // Both transliterations should be processed
      expect(result?.[2].language).toBe("TEL");
      expect(result?.[2].value).not.toBe("$transliterateFrom=SAN");
      expect(result?.[2].value).toBeTruthy();

      expect(result?.[3].language).toBe("TAM");
      expect(result?.[3].value).not.toBe("$transliterateFrom=IAST");
      expect(result?.[3].value).toBeTruthy();
    });
  });

  describe("real-world transliteration scenarios", () => {
    it("should handle Sanskrit to Telugu transliteration", () => {
      const textData = [
        { language: "SAN", value: "ॐ गणेशाय नमः" },
        { language: "TEL", value: "$transliterateFrom=SAN" },
      ];

      const result = transliteratedText(textData);

      expect(result).toHaveLength(2);
      expect(result?.[0]).toEqual({ language: "SAN", value: "ॐ गणेशाय नमः" });
      expect(result?.[1].language).toBe("TEL");
      expect(result?.[1].value).not.toBe("$transliterateFrom=SAN");
      expect(result?.[1].value).toBeTruthy();
      // The result should be Telugu script
      expect(result?.[1].value).toMatch(/[\u0C00-\u0C7F]/); // Telugu Unicode range
    });

    it("should handle IAST to Sanskrit transliteration", () => {
      const textData = [
        { language: "IAST", value: "śrī gaṇeśāya namaḥ" },
        { language: "SAN", value: "$transliterateFrom=IAST" },
      ];

      const result = transliteratedText(textData);

      expect(result).toHaveLength(2);
      expect(result?.[0]).toEqual({
        language: "IAST",
        value: "śrī gaṇeśāya namaḥ",
      });
      expect(result?.[1].language).toBe("SAN");
      expect(result?.[1].value).not.toBe("$transliterateFrom=IAST");
      expect(result?.[1].value).toBeTruthy();
      // The result should be Devanagari script
      expect(result?.[1].value).toMatch(/[\u0900-\u097F]/); // Devanagari Unicode range
    });
  });

  describe("fillLanguages functionality", () => {
    describe("basic fill operations", () => {
      it("should add missing languages from fillLanguages array", () => {
        const textData = [
          { language: "SAN", value: "गायत्री मंत्र" },
          { language: "IAST", value: "gāyatrī mantra" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TEL", "TAM"];

        const result = transliteratedText(textData, fillLanguages);

        expect(result).toHaveLength(4);
        // Original entries should be preserved
        expect(result?.[0]).toEqual({
          language: "SAN",
          value: "गायत्री मंत्र",
        });
        expect(result?.[1]).toEqual({
          language: "IAST",
          value: "gāyatrī mantra",
        });

        // TEL and TAM should be added with transliterated content
        const telEntry = result?.find((entry) => entry.language === "TEL");
        const tamEntry = result?.find((entry) => entry.language === "TAM");

        expect(telEntry).toBeTruthy();
        expect(tamEntry).toBeTruthy();
        expect(telEntry?.value).toBeTruthy();
        expect(tamEntry?.value).toBeTruthy();
        expect(typeof telEntry?.value).toBe("string");
        expect(typeof tamEntry?.value).toBe("string");
      });

      it("should not duplicate existing languages when fillLanguages contains them", () => {
        const textData = [
          { language: "SAN", value: "गायत्री मंत्र" },
          { language: "TEL", value: "గాయత్రీ మంత్ర" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TEL", "TAM"];

        const result = transliteratedText(textData, fillLanguages);

        expect(result).toHaveLength(3);
        // TEL should not be duplicated, original value should be preserved
        const telEntries = result?.filter((entry) => entry.language === "TEL");
        expect(telEntries).toHaveLength(1);
        expect(telEntries?.[0].value).toBe("గాయత్రీ మంత్ర");

        // TAM should be added
        const tamEntry = result?.find((entry) => entry.language === "TAM");
        expect(tamEntry).toBeTruthy();
        expect(tamEntry?.value).toBeTruthy();
      });

      it("should work when fillLanguages is empty array", () => {
        const textData = [
          { language: "SAN", value: "गायत्री मंत्र" },
          { language: "IAST", value: "gāyatrī mantra" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = [];

        const result = transliteratedText(textData, fillLanguages);

        // Should return original data unchanged
        expect(result).toEqual(textData);
      });

      it("should work when fillLanguages is undefined", () => {
        const textData = [
          { language: "SAN", value: "गायत्री मंत्र" },
          { language: "IAST", value: "gāyatrī mantra" },
        ];

        const result = transliteratedText(textData, undefined);

        // Should return original data unchanged
        expect(result).toEqual(textData);
      });
    });

    describe("source language selection for fill operations", () => {
      it("should prioritize Sanskrit (SAN) as source when available", () => {
        const textData = [
          { language: "SAN", value: "ॐ गणेशाय नमः" },
          { language: "IAST", value: "oṃ gaṇeśāya namaḥ" },
          { language: "HIN", value: "ॐ गणेशाय नमः" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TEL"];

        const result = transliteratedText(textData, fillLanguages);

        const telEntry = result?.find((entry) => entry.language === "TEL");
        expect(telEntry).toBeTruthy();
        // Should be transliterated from Devanagari (Sanskrit)
        expect(telEntry?.value).toMatch(/[\u0C00-\u0C7F]/); // Telugu Unicode range
      });

      it("should fallback to IAST when Sanskrit is not available", () => {
        const textData = [
          { language: "IAST", value: "oṃ gaṇeśāya namaḥ" },
          { language: "HIN", value: "ॐ गणेशाय नमः" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TEL"];

        const result = transliteratedText(textData, fillLanguages);

        const telEntry = result?.find((entry) => entry.language === "TEL");
        expect(telEntry).toBeTruthy();
        expect(telEntry?.value).toBeTruthy();
      });

      it("should prioritize IAST as source when available (new fallback sequence)", () => {
        const textData = [
          { language: "SAN", value: "ॐ गणेशाय नमः" },
          { language: "IAST", value: "oṃ gaṇeśāya namaḥ" },
          { language: "TEL", value: "ఓం గణేశాయ నమః" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TAM"];

        const result = transliteratedText(textData, fillLanguages);

        // Should create TAM entry
        const tamEntry = result?.find((entry) => entry.language === "TAM");
        expect(tamEntry).toBeTruthy();
        expect(tamEntry?.value).toBeTruthy();
        // Should have 4 entries total (3 original + 1 filled)
        expect(result).toHaveLength(4);
      });

      it("should use the first available language when neither SAN nor IAST available", () => {
        const textData = [
          { language: "TEL", value: "ఓం గణేశాయ నమః" },
          { language: "SLP1", value: "OM gaNeDAya namaH" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TAM"];

        const result = transliteratedText(textData, fillLanguages);

        const tamEntry = result?.find((entry) => entry.language === "TAM");
        expect(tamEntry).toBeTruthy();
        expect(tamEntry?.value).toBeTruthy();
      });

      it("should skip fill when no valid source language exists", () => {
        const textData = [{ language: "UNKNOWN", value: "some text" }];
        const fillLanguages: LANGUAGES_TYPE[] = ["TEL"];

        const result = transliteratedText(textData, fillLanguages);

        // Should only have the original entry, no TEL added
        expect(result).toHaveLength(1);
        expect(result?.[0]).toEqual({
          language: "UNKNOWN",
          value: "some text",
        });
      });

      it("should fallback to SLP1 when IAST is not available", () => {
        const textData = [
          { language: "SAN", value: "ॐ गणेशाय नमः" },
          { language: "SLP1", value: "oM gaNeDAya namaH" },
          { language: "TEL", value: "ఓం గణేశాయ నమః" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TAM"];

        const result = transliteratedText(textData, fillLanguages);

        const tamEntry = result?.find((entry) => entry.language === "TAM");
        expect(tamEntry).toBeTruthy();
        expect(tamEntry?.value).toBeTruthy();
      });

      it("should follow the complete fallback sequence: IAST > SLP1 > ITRANS > SAN > TEL", () => {
        // Test case with only SAN and TEL available - should pick SAN (higher priority than TEL)
        const textDataWithSAN = [
          { language: "SAN", value: "ॐ गणेशाय नमः" },
          { language: "TEL", value: "ఓం గణేశాయ నమః" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TAM"];

        const resultWithSAN = transliteratedText(
          textDataWithSAN,
          fillLanguages,
        );
        const tamEntryFromSAN = resultWithSAN?.find(
          (entry) => entry.language === "TAM",
        );
        expect(tamEntryFromSAN).toBeTruthy();
        expect(tamEntryFromSAN?.value).toBeTruthy();

        // Test case with only TEL available - should use TEL
        const textDataWithTEL = [{ language: "TEL", value: "ఓం గణేశాయ నమః" }];

        const resultWithTEL = transliteratedText(
          textDataWithTEL,
          fillLanguages,
        );
        const tamEntryFromTEL = resultWithTEL?.find(
          (entry) => entry.language === "TAM",
        );
        expect(tamEntryFromTEL).toBeTruthy();
        expect(tamEntryFromTEL?.value).toBeTruthy();
      });

      it("should respect exact fallback sequence priority with multiple languages", () => {
        // Test with all languages available - should pick IAST first
        const textDataMultiple = [
          { language: "SAN", value: "ॐ गणेशाय नमः" },
          { language: "TEL", value: "ఓం గణేశాయ నమః" },
          { language: "SLP1", value: "oM gaNeDAya namaH" },
          { language: "IAST", value: "oṃ gaṇeśāya namaḥ" },
          { language: "ITRANS", value: "om gaNeshaaya namaH" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TAM"];

        const result = transliteratedText(textDataMultiple, fillLanguages);
        const tamEntry = result?.find((entry) => entry.language === "TAM");
        expect(tamEntry).toBeTruthy();
        expect(tamEntry?.value).toBeTruthy();
        // Should have all original entries plus the filled one
        expect(result).toHaveLength(6);
      });

      it("should use first available language when none from fallback sequence available", () => {
        const textData = [{ language: "TAM", value: "ஓம் கணேசாய நமஃ" }];
        const fillLanguages: LANGUAGES_TYPE[] = ["SAN"];

        const result = transliteratedText(textData, fillLanguages);

        const sanEntry = result?.find((entry) => entry.language === "SAN");
        expect(sanEntry).toBeTruthy();
        expect(sanEntry?.value).toBeTruthy();
      });
    });

    describe("combined with transliteration instructions", () => {
      it("should process both transliteration instructions and fill languages", () => {
        const textData = [
          { language: "SAN", value: "गायत्री मंत्र" },
          { language: "TEL", value: "$transliterateFrom=SAN" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TAM", "ITRANS"];

        const result = transliteratedText(textData, fillLanguages);

        expect(result).toHaveLength(4);

        // Original Sanskrit should be preserved
        expect(result?.[0]).toEqual({
          language: "SAN",
          value: "गायत्री मंत्र",
        });

        // TEL should be processed from instruction (not filled)
        const telEntry = result?.find((entry) => entry.language === "TEL");
        expect(telEntry?.value).not.toBe("$transliterateFrom=SAN");
        expect(telEntry?.value).toBeTruthy();

        // TAM should be added through fill
        const tamEntry = result?.find((entry) => entry.language === "TAM");
        expect(tamEntry).toBeTruthy();
        expect(tamEntry?.value).toBeTruthy();
      });

      it("should not conflict when fillLanguages contains same language as instruction", () => {
        const textData = [
          { language: "SAN", value: "गायत्री मंत्र" },
          { language: "TEL", value: "$transliterateFrom=SAN" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TEL", "TAM"];

        const result = transliteratedText(textData, fillLanguages);

        expect(result).toHaveLength(3);

        // TEL should only appear once (from instruction, not fill)
        const telEntries = result?.filter((entry) => entry.language === "TEL");
        expect(telEntries).toHaveLength(1);
        expect(telEntries?.[0].value).not.toBe("$transliterateFrom=SAN");

        // TAM should be added through fill
        const tamEntry = result?.find((entry) => entry.language === "TAM");
        expect(tamEntry).toBeTruthy();
        expect(tamEntry?.value).toBeTruthy();
      });
    });

    describe("edge cases with fillLanguages", () => {
      it("should handle empty textData with fillLanguages", () => {
        const result = transliteratedText([], ["TEL", "TAM"]);

        expect(result).toEqual([]);
      });

      it("should handle undefined textData with fillLanguages", () => {
        const result = transliteratedText(undefined as any, ["TEL", "TAM"]);

        expect(result).toBeUndefined();
      });

      it("should preserve array order with fillLanguages", () => {
        const textData = [
          { language: "IAST", value: "mantra" },
          { language: "SAN", value: "मंत्र" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TEL", "TAM"];

        const result = transliteratedText(textData, fillLanguages);

        expect(result).toHaveLength(4);
        // Original order should be preserved, fill languages appended
        expect(result?.[0]).toEqual({ language: "IAST", value: "mantra" });
        expect(result?.[1]).toEqual({ language: "SAN", value: "मंत्र" });

        // Fill languages should be in the order specified
        expect(result?.[2].language).toBe("TEL");
        expect(result?.[3].language).toBe("TAM");
      });
    });

    describe("real-world scenarios with fillLanguages", () => {
      it("should handle typical devotional content with multiple regional languages", () => {
        const textData = [
          { language: "SAN", value: "श्री गणेशाय नमः" },
          { language: "IAST", value: "śrī gaṇeśāya namaḥ" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TEL", "TAM", "ITRANS"];

        const result = transliteratedText(textData, fillLanguages);

        expect(result).toHaveLength(5); // SAN + IAST + TEL + TAM + ITRANS

        // All regional languages should be filled (including ITRANS)
        const regionalLanguages = ["TEL", "TAM", "ITRANS"];
        regionalLanguages.forEach((lang) => {
          const entry = result?.find((entry) => entry.language === lang);
          expect(entry).toBeTruthy();
          expect(entry?.value).toBeTruthy();
          expect(typeof entry?.value).toBe("string");
        });
      });

      it("should handle mixed existing and missing languages efficiently", () => {
        const textData = [
          { language: "SAN", value: "ॐ शान्ति शान्ति शान्तिः" },
          { language: "TEL", value: "ఓం శాంతి శాంతి శాంతిః" }, // Already exists
          { language: "IAST", value: "oṃ śānti śānti śāntiḥ" },
        ];
        const fillLanguages: LANGUAGES_TYPE[] = ["TEL", "TAM", "ITRANS"];

        const result = transliteratedText(textData, fillLanguages);

        expect(result).toHaveLength(5); // SAN + TEL + IAST + TAM + ITRANS

        // TEL should preserve original value, not be overwritten
        const telEntry = result?.find((entry) => entry.language === "TEL");
        expect(telEntry?.value).toBe("ఓం శాంతి శాంతి శాంతిః");

        // Other languages should be filled
        ["TAM", "ITRANS"].forEach((lang) => {
          const entry = result?.find((entry) => entry.language === lang);
          expect(entry).toBeTruthy();
          expect(entry?.value).toBeTruthy();
        });
      });
    });
  });
});
