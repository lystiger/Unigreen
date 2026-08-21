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

  /**
   * P1-03. The set-equality check above proves the shapes match but reports
   * nothing useful when they do not. This one names the missing path, which is
   * what makes a CI failure actionable.
   */
  it("reports the exact path of any key missing from a locale", () => {
    const reference = paths(getDictionary("vi"));

    for (const locale of LOCALES) {
      const actual = paths(getDictionary(locale));
      expect({ locale, missing: [...reference].filter((p) => !actual.has(p)) }).toEqual(
        {
          locale,
          missing: [],
        },
      );
      expect({ locale, extra: [...actual].filter((p) => !reference.has(p)) }).toEqual({
        locale,
        extra: [],
      });
    }
  });

  it("has no accidentally empty string in either locale", () => {
    const offenders: string[] = [];

    for (const locale of LOCALES) {
      walk(getDictionary(locale), (path, value) => {
        if (
          typeof value === "string" &&
          value.trim() === "" &&
          !BLANK_BY_DESIGN.has(path)
        ) {
          offenders.push(`${locale}.${path}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it("keeps the {count} placeholder in every locale that needs it", () => {
    for (const locale of LOCALES) {
      const { catalogue } = getDictionary(locale);
      expect(catalogue.resultCount).toContain("{count}");
      expect(catalogue.resultCountFiltered).toContain("{count}");
    }
  });
});

/**
 * Deliberately blank until the Sprint 0 "legal identity and public contact
 * details" decision lands — the standing instruction is to publish no invented
 * business content. Every call site guards these before rendering. Delete an
 * entry here as soon as approved copy replaces it, so the blank cannot outlive
 * the decision unnoticed.
 */
const BLANK_BY_DESIGN = new Set([
  "inquiry.orCall",
  "footer.address",
  "footer.hotline",
  "footer.web",
]);

/** Every leaf path, e.g. `catalogue.resultCount`. */
function paths(value: unknown): Set<string> {
  const found = new Set<string>();
  walk(value, (path) => found.add(path));
  return found;
}

function walk(
  value: unknown,
  visit: (path: string, leaf: unknown) => void,
  prefix = "",
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, visit, `${prefix}[${index}]`));
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, entry] of Object.entries(value)) {
      walk(entry, visit, prefix === "" ? key : `${prefix}.${key}`);
    }
    return;
  }
  visit(prefix, value);
}

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
