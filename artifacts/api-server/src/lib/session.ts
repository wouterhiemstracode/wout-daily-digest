import type { Request, Response, NextFunction } from "express";

/*
 * Sign-in is a signed cookie holding the Google account's email. Only the addresses
 * in ALLOWED_EMAILS (comma-separated) can sign in, so the app stays private.
 */

export const SESSION_COOKIE = "wd_session";
export const STATE_COOKIE = "wd_oauth_state";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function allowedEmails() {
  return (process.env["ALLOWED_EMAILS"] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(email: string) {
  return allowedEmails().includes(email.toLowerCase());
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env["NODE_ENV"] === "production",
  signed: true,
});

export function startSession(res: Response, email: string) {
  res.cookie(SESSION_COOKIE, email, { ...cookieOptions(), maxAge: THIRTY_DAYS });
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

export function setOAuthState(res: Response, state: string) {
  res.cookie(STATE_COOKIE, state, { ...cookieOptions(), maxAge: 10 * 60 * 1000 });
}

/** The signed-in email, or null. Removing an address from ALLOWED_EMAILS signs it out. */
export function sessionEmail(req: Request): string | null {
  const email = req.signedCookies?.[SESSION_COOKIE];
  return typeof email === "string" && isAllowed(email) ? email : null;
}

// Reachable without signing in: the sign-in flow itself, the health check, and the
// webhooks and scheduled jobs, which check their own secrets.
const PUBLIC = [/^\/healthz$/, /^\/auth\/google\/(start|callback)$/, /^\/webhooks\//, /^\/jobs\//];

export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC.some((p) => p.test(req.path)) || sessionEmail(req)) {
    next();
    return;
  }
  res.status(401).json({ error: "Sign in required" });
}
