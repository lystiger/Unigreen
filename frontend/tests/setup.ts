import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom implements no media queries. Components must not depend on this stub
// existing — they guard for its absence — but installing it lets component
// tests drive the viewport-dependent branches deliberately.
if (typeof window !== "undefined" && window.matchMedia === undefined) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}
