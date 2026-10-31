import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = 3100;

/**
 * End-to-end tests run against a production build with a throwaway data
 * folder, so the real security headers, session cookie and Server Actions are
 * exercised without touching ./data. Run `npm run build` first.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "en-US",
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL ?? "chrome" } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ADMIN_PASSWORD: "e2e-admin-password",
      SESSION_SECRET: "e2e-only-session-secret-0123456789abcdef",
      DATA_DIR: path.join(tmpdir(), `store-e2e-${Date.now()}`),
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
