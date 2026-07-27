import type { NextConfig } from "next";

/**
 * `output: "standalone"` emits a self-contained server bundle so the Docker
 * image does not ship node_modules — but `next start` does not support it, and
 * both `npm run start` and the Playwright webServer depend on `next start`.
 * So it is enabled only for container builds, where the Dockerfile sets
 * BUILD_STANDALONE=1 and runs `node server.js` directly.
 */
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
};

export default config;
