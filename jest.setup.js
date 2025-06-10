// Optional: configure or set up a testing framework before each test.
// This file is imported by jest.config.js setupFilesAfterEnv

// Global test timeout
jest.setTimeout(10000);

// Add custom matchers or global test utilities here
// Example: expect.extend({...})

// Mock Next.js router for utility function tests that might use it
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock environment variables if needed
process.env.NODE_ENV = "test";
