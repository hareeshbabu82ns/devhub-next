import {
  avatarAltName,
  formatPhoneNumber,
  formatCurrency,
  formatDuration,
  simulateDelay,
  formatDateTime,
  encryptKey,
  decryptKey,
  trimNewLineChar,
  trimQuotes,
  getSafePathFromUrl,
} from "../utils";

describe("Utils Functions", () => {
  describe("formatPhoneNumber", () => {
    it("should format valid 10-digit number", () => {
      expect(formatPhoneNumber("1234567890")).toBe("(123) 456-7890");
    });

    it("should format number with existing formatting", () => {
      expect(formatPhoneNumber("123-456-7890")).toBe("(123) 456-7890");
    });

    it("should return original string for invalid format", () => {
      expect(formatPhoneNumber("123456")).toBe("123456");
    });

    it("should handle numeric input", () => {
      expect(formatPhoneNumber(1234567890 as any)).toBe("(123) 456-7890");
    });

    it("should handle empty string", () => {
      expect(formatPhoneNumber("")).toBe("");
    });
  });

  describe("formatCurrency", () => {
    it("should format positive numbers", () => {
      expect(formatCurrency(1234.56)).toBe("1,234.56");
    });

    it("should format negative numbers", () => {
      expect(formatCurrency(-1234.56)).toBe("-1,234.56");
    });

    it("should format zero", () => {
      expect(formatCurrency(0)).toBe("0.00");
    });

    it("should format integers with decimal places", () => {
      expect(formatCurrency(1000)).toBe("1,000.00");
    });

    it("should handle small decimal numbers", () => {
      expect(formatCurrency(0.99)).toBe("0.99");
    });
  });

  describe("formatDuration", () => {
    it("should format minutes only", () => {
      expect(formatDuration(45)).toBe("45m");
    });

    it("should format hours and minutes", () => {
      expect(formatDuration(125)).toBe("02h 05m");
    });

    it("should format zero duration", () => {
      expect(formatDuration(0)).toBe("");
    });

    it("should handle undefined duration", () => {
      expect(formatDuration()).toBe("");
    });

    it("should format exact hours", () => {
      expect(formatDuration(120)).toBe("02h 00m");
    });

    it("should pad single digits", () => {
      expect(formatDuration(65)).toBe("01h 05m");
    });
  });

  describe("simulateDelay", () => {
    it("should resolve after specified time", async () => {
      const start = Date.now();
      await simulateDelay(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
    });

    it("should handle zero delay", async () => {
      const start = Date.now();
      await simulateDelay(0);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe("formatDateTime", () => {
    const testDate = new Date("2024-01-15T14:30:00Z");

    it("should return formatted date time object", () => {
      const result = formatDateTime(testDate, "UTC");
      expect(result).toHaveProperty("dateTime");
      expect(result).toHaveProperty("dateDay");
      expect(result).toHaveProperty("dateOnly");
      expect(result).toHaveProperty("timeOnly");
    });

    it("should handle string date input", () => {
      const result = formatDateTime("2024-01-15T14:30:00Z", "UTC");
      expect(result.dateOnly).toContain("Jan");
      expect(result.dateOnly).toContain("15");
      expect(result.dateOnly).toContain("2024");
    });

    it("should use default timezone when not provided", () => {
      const result = formatDateTime(testDate);
      expect(result).toHaveProperty("dateTime");
    });
  });

  describe("encryptKey and decryptKey", () => {
    const testString = "test-password-123";

    it("should encrypt and decrypt correctly", () => {
      const encrypted = encryptKey(testString);
      const decrypted = decryptKey(encrypted);
      expect(decrypted).toBe(testString);
    });

    it("should produce different output when encrypting", () => {
      const encrypted = encryptKey(testString);
      expect(encrypted).not.toBe(testString);
    });

    it("should handle empty string", () => {
      const encrypted = encryptKey("");
      const decrypted = decryptKey(encrypted);
      expect(decrypted).toBe("");
    });

    it("should handle special characters", () => {
      const specialString = "test@#$%^&*()";
      const encrypted = encryptKey(specialString);
      const decrypted = decryptKey(encrypted);
      expect(decrypted).toBe(specialString);
    });
  });

  describe("trimNewLineChar", () => {
    it("should remove newline characters", () => {
      expect(trimNewLineChar("test\nstring")).toBe("teststring");
    });

    it("should remove carriage return", () => {
      expect(trimNewLineChar("test\rstring")).toBe("teststring");
    });

    it("should remove both newline and carriage return", () => {
      expect(trimNewLineChar("test\r\nstring")).toBe("teststring");
    });

    it("should handle multiple newlines", () => {
      expect(trimNewLineChar("test\n\nstring\n")).toBe("teststring");
    });

    it("should return non-string input unchanged", () => {
      expect(trimNewLineChar(123)).toBe(123);
      expect(trimNewLineChar(null)).toBe(null);
      expect(trimNewLineChar(undefined)).toBe(undefined);
    });

    it("should handle empty string", () => {
      expect(trimNewLineChar("")).toBe("");
    });
  });

  describe("trimQuotes", () => {
    it("should remove double quotes", () => {
      expect(trimQuotes('"test string"')).toBe("test string");
    });

    it("should remove single quotes", () => {
      expect(trimQuotes("'test string'")).toBe("test string");
    });

    it("should remove multiple quotes", () => {
      expect(trimQuotes('"""test string"""')).toBe("test string");
    });

    it("should handle mixed quotes", () => {
      expect(trimQuotes("'\"test string\"'")).toBe("test string");
    });

    it("should handle quotes only at ends", () => {
      expect(trimQuotes('"test "quoted" string"')).toBe('test "quoted" string');
    });

    it("should return non-string input unchanged", () => {
      expect(trimQuotes(123)).toBe(123);
      expect(trimQuotes(null)).toBe(null);
      expect(trimQuotes(undefined)).toBe(undefined);
    });

    it("should handle string without quotes", () => {
      expect(trimQuotes("test string")).toBe("test string");
    });
  });

  describe("getSafePathFromUrl", () => {
    it("should generate safe paths from valid URL", () => {
      const url = "https://example.com/path/to/page";
      const result = getSafePathFromUrl(url);

      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("folderName");
      expect(result).toHaveProperty("jsonFilePath");
      expect(result).toHaveProperty("htmlFilePath");
      expect(result).toHaveProperty("folderPath");

      expect(result.folderName).toBe("example_com_path_to_page");
      expect(result.timestamp).toMatch(/^\d{14}$/); // yyyyMMddHHmmss format
    });

    it("should handle URLs with special characters", () => {
      const url = "https://test-site.com/page?param=value&other=123";
      const result = getSafePathFromUrl(url);

      expect(result.folderName).toBe(
        "test_site_com_page_param_value_other_123",
      );
    });

    it("should handle invalid URLs", () => {
      const invalidUrl = "not-a-url";
      const result = getSafePathFromUrl(invalidUrl);

      expect(result.folderName).toBe("output");
      expect(result.timestamp).toMatch(/^\d{14}$/);
    });

    it("should generate consistent timestamp format", () => {
      const url = "https://example.com";
      const result = getSafePathFromUrl(url);

      expect(result.timestamp).toHaveLength(14);
      expect(Number(result.timestamp)).not.toBeNaN();
    });

    it("should include correct file paths", () => {
      const url = "https://example.com/test";
      const result = getSafePathFromUrl(url);

      expect(result.jsonFilePath).toContain(result.folderName);
      expect(result.jsonFilePath).toContain(result.timestamp);
      expect(result.jsonFilePath).toContain(".json");

      expect(result.htmlFilePath).toContain(result.folderName);
      expect(result.htmlFilePath).toContain("page.html");
    });
  });
});
