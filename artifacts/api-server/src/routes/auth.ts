import { Router } from "express";
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getGmailStatus,
  disconnectGmail,
} from "../lib/gmail";

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

router.get("/gmail/callback", async (req, res) => {
  const code = req.query["code"] as string;
  if (!code) {
    return res.status(400).send("Missing OAuth code");
  }
  try {
    await exchangeCodeForTokens(code);
    // Redirect to frontend
    const domains = process.env["REPLIT_DOMAINS"]?.split(",")[0];
    const redirectBase = domains ? `https://${domains}` : "http://localhost:80";
    res.redirect(`${redirectBase}/?gmail=connected`);
  } catch (err: any) {
    req.log.error({ err }, "Gmail OAuth callback failed");
    res.status(500).send("OAuth failed: " + (err.message ?? "Unknown error"));
  }
});

router.post("/gmail/disconnect", async (req, res) => {
  await disconnectGmail();
  res.json({ success: true });
});

export default router;
