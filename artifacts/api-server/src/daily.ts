/**
 * The morning run from the command line: `pnpm --filter @workspace/api-server run daily`.
 * In production Cloud Scheduler calls POST /api/jobs/daily instead.
 */
import { pool } from "@workspace/db";
import { runDaily } from "./lib/briefing";
import { logger } from "./lib/logger";

try {
  await runDaily(logger);
  await pool.end();
} catch (err) {
  logger.error({ err }, "Daily briefing failed");
  await pool.end();
  process.exit(1);
}
