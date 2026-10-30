import { defineConfig } from "vitest/config";

// Route tests run against a real Postgres: set TEST_DATABASE_URL to a throwaway database
// with the schema pushed (`DATABASE_URL=… pnpm --filter @workspace/db run push`).
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env["TEST_DATABASE_URL"] ?? "postgres://localhost:5432/unused",
      ANTHROPIC_API_KEY: "test",
      SESSION_SECRET: "test-secret",
      ALLOWED_EMAILS: "wout@example.com",
      APP_URL: "http://localhost:8080",
      GOOGLE_CLIENT_ID: "test-client",
      GOOGLE_CLIENT_SECRET: "test-secret",
      WEBHOOK_SECRET: "hook-secret",
      LOG_LEVEL: "silent",
    },
    fileParallelism: false,
  },
});
