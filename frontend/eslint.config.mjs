import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat config, so these are spread directly.
// FlatCompat cannot consume them — it validates them as eslintrc and throws.
const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      // Generated from contracts/openapi.json; never hand-edited.
      "lib/api/schema.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;
