// Quick test for the updated getTransliteratedWords function
const {
  getTransliteratedWords,
} = require("./src/lib/dictionary/word-utils.ts");

// Test cases
const testCases = [
  {
    description: "Sanskrit with mixed English words",
    input: { language: "SAN", value: "श्री गणेशाय namah वेदान्त philosophy" },
    expected: "Should only transliterate Sanskrit words, not English ones",
  },
  {
    description: "Telugu with English words",
    input: { language: "TEL", value: "శ్రీ రామ chandra देव" },
    expected: "Should only transliterate Telugu words",
  },
  {
    description: "Pure English text",
    input: { language: "ENG", value: "This is pure English text" },
    expected: "Should return original English text",
  },
  {
    description: "IAST with mixed content",
    input: { language: "IAST", value: "śrī rāma and some english words" },
    expected: "Should only transliterate IAST characters",
  },
];

console.log("Testing getTransliteratedWords function...\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`Input: ${JSON.stringify(testCase.input)}`);

  try {
    const result = getTransliteratedWords(testCase.input);
    console.log(`Result: ${JSON.stringify(result)}`);
    console.log(`Expected: ${testCase.expected}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  console.log("-".repeat(50));
});
