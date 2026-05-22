import { Router } from "express";
import { getAuthUrl, getGmailStatus, disconnectGmail } from "../lib/gmail";

const router = Router();

router.get("/gmail/url", async (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to generate auth URL" });
  }
});

router.get("/gmail/status", async (req, res) => {
  const status = await getGmailStatus();
  res.json(status);
});

router.post("/gmail/disconnect", async (req, res) => {
  await disconnectGmail();
  res.json({ success: true });
});

export default router;
