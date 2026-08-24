import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCANNED = ["app", "components"];

/** `uppercase` is permitted here and only here — see the file's own comment. */
const UPPERCASE_ALLOWLIST = ["components/ui/LocaleCode.tsx"];

function tsxFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...tsxFiles(full));
    } else if (entry.endsWith(".tsx")) {
      found.push(full);
    }
  }
  return found;
}

const FILES = SCANNED.flatMap((d) => tsxFiles(join(ROOT, d))).map((f) => ({
  path: relative(ROOT, f).split("\\").join("/"),
  source: readFileSync(f, "utf8"),
}));

/** Extract each JSX opening tag for the given element names. */
function openingTags(source: string, names: readonly string[]): string[] {
  const tags: string[] = [];
  const pattern = new RegExp(`<(${names.join("|")})\\s`, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    let depth = 0;
    let i = match.index;
    while (i < source.length) {
      const c = source[i];
      if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      else if (c === ">" && depth === 0) break;
      i += 1;
    }
    tags.push(source.slice(match.index, i));
  }
  return tags;
}

function classNameOf(tag: string): string | null {
  return /className="([^"]*)"/.exec(tag)?.[1] ?? null;
}

describe("P1-02 — no uppercase on localized copy", () => {
  it("finds files to scan", () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  it("applies `uppercase` nowhere outside the allowlist", () => {
    const offenders = FILES.filter(
      (file) =>
        !UPPERCASE_ALLOWLIST.includes(file.path) &&
        openingTags(file.source, ["\\w+"]).some((tag) =>
          /\buppercase\b/.test(classNameOf(tag) ?? ""),
        ),
    ).map((file) => file.path);

    // Whether a string is localized cannot be read off a className, so the
    // rule is structural: uppercase lives in LocaleCode and nowhere else.
    expect(offenders).toEqual([]);
  });
});

describe("P1-04 — raw <img> carries what next/image would have provided", () => {
  const imgTags = FILES.flatMap((file) =>
    openingTags(file.source, ["img"]).map((tag) => ({ path: file.path, tag })),
  );

  it("finds the runtime media call sites", () => {
    expect(imgTags.length).toBeGreaterThan(0);
  });

  it("always sets intrinsic dimensions, so media causes no layout shift", () => {
    const offenders = imgTags
      .filter(({ tag }) => !/\bwidth=/.test(tag) || !/\bheight=/.test(tag))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it("always decodes off the main thread", () => {
    const offenders = imgTags
      .filter(({ tag }) => !/decoding="async"/.test(tag))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it("declares a loading strategy, eager only alongside fetchPriority", () => {
    const offenders = imgTags
      .filter(({ tag }) => {
        if (!/loading="(lazy|eager)"/.test(tag)) return true;
        // An eager image is a deliberate LCP claim; it must say so.
        return /loading="eager"/.test(tag) && !/fetchPriority="high"/.test(tag);
      })
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});

describe("Sprint 2 §4.1 — basket logic stays free of React and transport", () => {
  const BASKET = [
    "lib/basket/reducer.ts",
    "lib/basket/persistence.ts",
    "lib/basket/types.ts",
  ];

  it("imports no React and no data-fetching layer", () => {
    const offenders: string[] = [];

    for (const rel of BASKET) {
      const source = readFileSync(join(ROOT, rel), "utf8");
      const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
      const forbidden = imports.filter(
        (spec) =>
          spec === "react" ||
          spec.startsWith("react/") ||
          spec.startsWith("next/") ||
          spec.includes("@tanstack") ||
          spec.includes("/api/"),
      );
      if (forbidden.length > 0) offenders.push(`${rel}: ${forbidden.join(", ")}`);
    }

    // The reducer decides what a buyer is asking us to quote. Keeping it a
    // plain function is what lets that be tested exhaustively (§18.3).
    expect(offenders).toEqual([]);
  });
});

describe("P1-03 — one source of translation truth", () => {
  it("declares no component-local COPY object", () => {
    const offenders = FILES.filter((file) => /\bconst COPY\b/.test(file.source)).map(
      (file) => file.path,
    );
    expect(offenders).toEqual([]);
  });
});

describe("P1-01 — every control clears 44px", () => {
  it("gives every padded button and anchor a height floor", () => {
    const offenders: string[] = [];

    for (const file of FILES) {
      for (const tag of openingTags(file.source, ["button", "a", "Link"])) {
        const classes = classNameOf(tag);
        if (classes === null) continue;

        const isControl = classes.includes("rounded-control");
        const hasFloor = /\b(min-)?h-\d|\bh-full\b/.test(classes);
        // sr-only controls are 1px until focused; their floor is focus-scoped.
        const srOnly = classes.includes("sr-only");

        if (isControl && !hasFloor && !srOnly) {
          offenders.push(`${file.path}: ${classes.slice(0, 70)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("centres any anchor given a height floor", () => {
    const offenders: string[] = [];

    for (const file of FILES) {
      for (const tag of openingTags(file.source, ["a", "Link"])) {
        const classes = classNameOf(tag);
        if (classes === null || !/\bmin-h-\d/.test(classes)) continue;
        // A min-height on a non-flex anchor leaves the label at the top edge.
        if (!/\bflex\b|\binline-flex\b/.test(classes)) {
          offenders.push(`${file.path}: ${classes.slice(0, 70)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
