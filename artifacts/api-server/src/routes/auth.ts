import { randomBytes } from "node:crypto";
import { Router } from "express";
import { getAuthUrl, getGmailStatus, disconnectGmail } from "../lib/gmail";
import { exchangeCode, googleAuthUrl, saveGmailTokens } from "../lib/google";
import { STATE_COOKIE, endSession, isAllowed, sessionEmail, setOAuthState, startSession } from "../lib/session";

const router = Router();

// ── Sign in with Google (browser redirects, not JSON) ──────────────────────
router.get("/google/start", (_req, res) => {
  const state = randomBytes(16).toString("hex");
  setOAuthState(res, state);
  res.redirect(googleAuthUrl(state));
});

router.get("/google/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const expected = req.signedCookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE);
  if (error || !code) {
    res.redirect("/?signin=cancelled");
    return;
  }
  if (!state || state !== expected) {
    res.redirect("/?signin=failed");
    return;
  }

  try {
    const { email, tokens, gmailGranted } = await exchangeCode(code);
    if (!isAllowed(email)) {
      req.log.warn({ email }, "Sign-in refused: not in ALLOWED_EMAILS");
      res.redirect("/?signin=denied");
      return;
    }
    if (gmailGranted) await saveGmailTokens(email, tokens);
    startSession(res, email);
    res.redirect(gmailGranted ? "/" : "/?signin=gmail");
  } catch (err) {
    req.log.error({ err }, "Google sign-in failed");
    res.redirect("/?signin=failed");
  }
});

router.get("/me", (req, res) => {
  res.json({ email: sessionEmail(req) });
});

router.post("/signout", (_req, res) => {
  endSession(res);
  res.json({ success: true });
});

// ── Gmail connection ───────────────────────────────────────────────────────
router.get("/gmail/url", (_req, res) => {
  res.json({ url: getAuthUrl() });
});

router.get("/gmail/status", async (_req, res) => {
  res.json(await getGmailStatus());
});

router.post("/gmail/disconnect", async (_req, res) => {
  await disconnectGmail();
  res.json({ success: true });
});

export default router;
