# Testing Framework Setup

This document describes the testing framework setup for TypeScript and JavaScript utility functions in the DevHub project.

## Overview

The testing framework is built on Jest with TypeScript support, designed specifically for testing utility functions, validation schemas, and business logic (not React components or Next.js specific features).

## Setup

### Dependencies

The following testing dependencies are installed:

- `jest` - JavaScript testing framework
- `@types/jest` - TypeScript definitions for Jest
- `jest-environment-node` - Node.js environment for Jest
- `ts-jest` - TypeScript preprocessor for Jest

### Configuration Files

#### `jest.config.js`

Main Jest configuration that:

- Uses Node.js environment for utility function testing
- Excludes Next.js app directory from testing
- Sets up TypeScript transformation with ts-jest
- Configures coverage collection and thresholds
- Maps path aliases from tsconfig.json

#### `jest.setup.js`

Setup file that runs before each test:

- Sets global test timeout
- Mocks Next.js router for tests that might need it
- Sets up test environment variables

### Test Scripts

Add the following scripts to your workflow:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests in CI mode
pnpm test:ci
```

## Test Structure

### Directory Structure

```
src/
├── lib/
│   ├── __tests__/           # Tests for lib utilities
│   │   ├── utils.test.ts
│   │   └── test-utils.test.ts
│   ├── validations/
│   │   └── __tests__/       # Tests for validation schemas
│   │       └── entities.test.ts
│   ├── utils.ts
│   └── test-utils.ts
```

### Test File Patterns

Tests are discovered using these patterns:

- `src/**/__tests__/**/*.{js,jsx,ts,tsx}`
- `src/**/*.(test|spec).{js,jsx,ts,tsx}`
- `tests/**/*.{js,jsx,ts,tsx}`

## Writing Tests

### Basic Test Structure

```typescript
import { functionToTest } from "../utils";

describe("Function Group", () => {
  describe("functionToTest", () => {
    it("should handle valid input", () => {
      const result = functionToTest("valid input");
      expect(result).toBe("expected output");
    });

    it("should handle edge cases", () => {
      expect(() => functionToTest(null)).toThrow();
    });
  });
});
```

### Test Categories

#### 1. Utility Functions (`src/lib/__tests__/utils.test.ts`)

Tests for general utility functions like:

- String manipulation (`formatPhoneNumber`, `trimQuotes`)
- Date formatting (`formatDateTime`)
- Data transformation (`getSafePathFromUrl`)
- Validation helpers

#### 2. Validation Schemas (`src/lib/validations/__tests__/`)

Tests for Zod validation schemas:

- Valid data validation
- Invalid data rejection
- Required field validation
- Default value assignment
- Custom validation rules

#### 3. Helper Utilities (`src/lib/__tests__/test-utils.test.ts`)

Tests for common utility functions:

- Array operations (`chunkArray`, `uniqueArray`)
- Object manipulation (`deepClone`, `omit`, `pick`)
- String utilities (`slugify`, `truncate`)
- Number utilities (`clamp`, `randomBetween`)
- Date utilities (`addDays`, `daysBetween`)
- Validation helpers (`isEmail`, `isUrl`)

### Best Practices

#### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the behavior
- Test both success and failure cases
- Include edge cases and boundary conditions

#### 2. Test Data

- Use realistic test data that matches your domain
- Create reusable test fixtures for complex objects
- Test with both valid and invalid inputs

#### 3. Assertions

```typescript
// Good: Specific assertions
expect(result).toBe("expected value");
expect(result).toEqual({ key: "value" });
expect(() => fn()).toThrow("specific error message");

// Good: Property checks
expect(result).toHaveProperty("timestamp");
expect(result.folderName).toMatch(/^[a-z0-9_]+$/);
```

#### 4. Async Testing

```typescript
// Promise-based
it("should handle async operations", async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Timer-based
it("should handle delays", async () => {
  const start = Date.now();
  await simulateDelay(100);
  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(90);
});
```

## Coverage

The project is configured with coverage thresholds:

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

Coverage is collected from:

- `src/lib/**/*.{ts,tsx}`
- `src/hooks/**/*.{ts,tsx}`
- `src/types/**/*.{ts,tsx}`
- `src/config/**/*.{ts,tsx}`

Excluded from coverage:

- Type definition files (`*.d.ts`)
- Story files (`*.stories.{ts,tsx}`)

## Running Tests

### Command Line Options

```bash
# Run specific test file
pnpm test src/lib/__tests__/utils.test.ts

# Run tests matching pattern
pnpm test --testNamePattern="formatPhoneNumber"

# Run with verbose output
pnpm test --verbose

# Run without cache
pnpm test --no-cache

# Update snapshots (if using)
pnpm test --updateSnapshot
```

### Debugging Tests

1. **Add console.log statements** in tests for debugging
2. **Use `--verbose` flag** for detailed test output
3. **Run single test file** to isolate issues
4. **Check test setup** if all tests are failing

## Continuous Integration

For CI environments, use:

```bash
pnpm test:ci
```

This command:

- Runs tests without watch mode
- Generates coverage reports
- Fails if coverage thresholds are not met
- Outputs results in CI-friendly format

## Next Steps

1. **Add more test files** for other utility modules
2. **Increase test coverage** for existing functions
3. **Add integration tests** for complex workflows
4. **Set up automated testing** in CI/CD pipeline
5. **Add snapshot testing** for consistent outputs

## Troubleshooting

### Common Issues

1. **TypeScript compilation errors**: Check `tsconfig.json` paths
2. **Module not found**: Verify import paths in test files
3. **Tests timeout**: Increase timeout in `jest.setup.js`
4. **Coverage too low**: Add more test cases for uncovered branches

### Getting Help

- Check Jest documentation: https://jestjs.io/docs/getting-started
- TypeScript Jest setup: https://jestjs.io/docs/getting-started#using-typescript
- Testing best practices: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
