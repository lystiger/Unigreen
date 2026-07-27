import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary, isLocale, swapLocaleInPath } from "@/lib/i18n";

describe("isLocale", () => {
  it("accepts the supported locales", () => {
    expect(isLocale("vi")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale("VI")).toBe(false);
  });
});

describe("swapLocaleInPath", () => {
  it("keeps the reader on the same route", () => {
    expect(swapLocaleInPath("/vi/products/ug-mr-6", "en")).toBe("/en/products/ug-mr-6");
  });

  it("handles the locale root", () => {
    expect(swapLocaleInPath("/vi", "en")).toBe("/en");
    expect(swapLocaleInPath("/", "en")).toBe("/en");
  });

  it("prefixes a path that has no locale segment", () => {
    expect(swapLocaleInPath("/products", "vi")).toBe("/vi/products");
  });
});

describe("dictionaries", () => {
  it("defines the same key set for every locale", () => {
    const keySets = LOCALES.map((locale) =>
      JSON.stringify(structureOf(getDictionary(locale))),
    );

    expect(new Set(keySets).size).toBe(1);
  });
});

/** Key names only, so a missing translation fails but wording differences do not. */
function structureOf(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(structureOf);
  }
  if (typeof value === "object" && value !== null) {
    return Object.keys(value)
      .sort()
      .map((key) => [key, structureOf((value as Record<string, unknown>)[key])]);
  }
  return typeof value;
}
