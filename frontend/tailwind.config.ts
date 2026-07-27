import type { Config } from "tailwindcss";

/**
 * Token source of truth. Every colour here is sampled from a real Uni-Green
 * asset — no invented values.
 *
 * NOTE ON SEMANTIC COLOUR: the brand mark is green, so green is spent on
 * brand + primary action. It is therefore NOT available to mean "success".
 * Quotation/order states use the `status` ramp below (blue = accepted) and
 * are always paired with an icon + text label, never colour alone.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#1E9445",
          dark: "#157034",
          tint: "#EAF5EE",
        },
        ink: {
          DEFAULT: "#0C1B14",
          muted: "#5A6B62",
          faint: "#8A968F",
        },
        paper: {
          DEFAULT: "#FBFAF7",
          raised: "#FFFFFF",
          sunk: "#F4F2EC",
        },
        line: {
          DEFAULT: "#E2E0D9",
          strong: "#CBC8BE",
        },
        sku: {
          mega: "#1E9445",
          family: "#D4266B",
          tissue: "#1B9AD6",
          oem: "#8A968F",
        },
        status: {
          draft: "#8A968F",
          pending: "#B87514",
          accepted: "#1B7FA8",
          rejected: "#C0392B",
        },
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        eyebrow: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.12em" }],
        data: ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0.01em" }],
        body: ["1rem", { lineHeight: "1.6" }],
        lead: ["1.125rem", { lineHeight: "1.6" }],
        h3: ["1.25rem", { lineHeight: "1.4" }],
        h2: ["1.75rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        h1: ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        display: ["3.5rem", { lineHeight: "1.08", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        card: "12px",
        control: "8px",
      },
      maxWidth: {
        shell: "1200px",
      },
      transitionDuration: {
        DEFAULT: "180ms",
      },
    },
  },
  plugins: [],
};

export default config;
