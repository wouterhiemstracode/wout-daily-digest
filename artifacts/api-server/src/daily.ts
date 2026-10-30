/**
 * The morning run: check Gmail for newsletters and write today's briefing.
 * Railway runs this on a cron schedule (see railway.json / README); exits 0 on success.
 */
import { pool } from "@workspace/db";
import { syncNewsletters, writeDigest } from "./lib/briefing";
import { logger } from "./lib/logger";

try {
  const synced = await syncNewsletters(logger);
  logger.info(synced, "Inbox checked");
  if (synced.fetched === 0) {
    logger.info("No new newsletters since the last run; skipping today's briefing");
  } else {
    const digest = await writeDigest(24);
    logger.info({ digestId: digest.id, stories: digest.storyCount }, "Briefing written");
  }
  await pool.end();
} catch (err) {
  logger.error({ err }, "Daily briefing failed");
  await pool.end();
  process.exit(1);
}
