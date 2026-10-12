import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end tests run against a production build in demo mode, so the real
 * CSP, security headers and server actions are exercised.
 * Run `npm run build` first, then `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
    // Deterministic language; the app otherwise follows the browser (Accept-Language).
    locale: "en-US",
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL ?? "chrome", locale: "en-US" } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ALLOW_DEMO_MODE: "true",
      DEMO_SESSION_SECRET: "e2e-only-demo-session-secret-0123456789abcdef",
      IP_HASH_SALT: "e2e-only-ip-hash-salt-0123456789",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
