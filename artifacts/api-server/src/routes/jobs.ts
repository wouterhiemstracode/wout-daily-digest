import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { runDaily } from "../lib/briefing";

const router = Router();

const matches = (given: string, expected: string) =>
  given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));

// Cloud Scheduler calls this every morning. It skips sign-in, so it needs CRON_SECRET.
router.post("/daily", async (req, res) => {
  const secret = process.env["CRON_SECRET"];
  if (!secret) {
    res.status(503).json({ error: "Morning job disabled: set CRON_SECRET" });
    return;
  }
  if (!matches(String(req.headers["x-cron-secret"] ?? ""), secret)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    res.json(await runDaily(req.log));
  } catch (err: any) {
    req.log.error({ err }, "Daily briefing failed");
    res.status(500).json({ error: err.message ?? "Daily briefing failed" });
  }
});

export default router;
