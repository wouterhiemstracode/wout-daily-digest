import { defineConfig } from "vitest/config";

// Route tests run against a real Postgres: set TEST_DATABASE_URL to a throwaway database
// with the schema pushed (`DATABASE_URL=… pnpm --filter @workspace/db run push`).
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env["TEST_DATABASE_URL"] ?? "postgres://localhost:5432/unused",
      AI_INTEGRATIONS_OPENAI_BASE_URL: "http://openai.invalid",
      AI_INTEGRATIONS_OPENAI_API_KEY: "test",
      LOG_LEVEL: "silent",
    },
    fileParallelism: false,
  },
});
