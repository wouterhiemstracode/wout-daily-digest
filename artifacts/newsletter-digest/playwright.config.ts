import { defineConfig, devices } from "@playwright/test";

const PORT = 5180;

// Frontend tests: the API is answered from e2e/fixtures.ts, so no server or database is needed.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    timezoneId: "Europe/Amsterdam",
    locale: "en-GB",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1320 } }, testIgnore: /phone\.spec/ },
    {
      name: "phone",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
      testMatch: /(phone|visual)\.spec/,
    },
  ],
  webServer: {
    command: "vite --config vite.config.ts --host 127.0.0.1",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT), BASE_PATH: "/" },
  },
});
