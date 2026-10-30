import { db, gmailTokensTable } from "@workspace/db";
import { logger } from "./logger";

/*
 * Google sign-in and Gmail access with your own Google Cloud OAuth client.
 * One consent screen does both: it proves who you are (openid email) and grants
 * read-only Gmail access. The refresh token is stored in gmail_tokens.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GMAIL_BASE = "https://gmail.googleapis.com";
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly"];

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set (see README: Google sign-in)`);
  return value;
}

export function appUrl() {
  return env("APP_URL").replace(/\/+$/, "");
}

const redirectUri = () => `${appUrl()}/api/auth/google/callback`;

/** The Google consent screen to send the browser to. */
export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), ...body }),
  });
  if (!res.ok) throw new Error(`Google token request failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

/** Finish sign-in: trade the code for tokens and find out whose account it is. */
export async function exchangeCode(code: string) {
  const tokens = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  const user = (await res.json()) as { email?: string; email_verified?: boolean };
  if (!user.email || user.email_verified === false) throw new Error("Google account has no verified email");
  return { email: user.email.toLowerCase(), tokens, gmailGranted: (tokens.scope ?? "").includes("gmail.readonly") };
}

/** Keep one Gmail connection: the latest sign-in replaces it. */
export async function saveGmailTokens(email: string, tokens: TokenResponse) {
  const [existing] = await db.select().from(gmailTokensTable).limit(1);
  const refreshToken = tokens.refresh_token ?? (existing?.email === email ? existing.refreshToken : null);
  await db.delete(gmailTokensTable);
  await db.insert(gmailTokensTable).values({
    email,
    accessToken: tokens.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  });
}

export async function clearGmailTokens() {
  await db.delete(gmailTokensTable);
}

/** A valid access token, refreshed when it is about to expire; null when Gmail isn't connected. */
async function accessToken(): Promise<{ token: string; email: string | null } | null> {
  const [row] = await db.select().from(gmailTokensTable).limit(1);
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() > Date.now() + 60_000) return { token: row.accessToken, email: row.email };
  if (!row.refreshToken) return null;

  const fresh = await tokenRequest({ refresh_token: row.refreshToken, grant_type: "refresh_token" });
  await db
    .update(gmailTokensTable)
    .set({ accessToken: fresh.access_token, expiresAt: new Date(Date.now() + fresh.expires_in * 1000), updatedAt: new Date() });
  return { token: fresh.access_token, email: row.email };
}

/** Call the Gmail API, e.g. gmailFetch("/gmail/v1/users/me/profile"). */
export async function gmailFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const auth = await accessToken();
  if (!auth) throw new Error("Gmail not connected");
  return fetch(`${GMAIL_BASE}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${auth.token}` } });
}

export async function gmailStatus(): Promise<{ connected: boolean; email: string | null }> {
  try {
    const auth = await accessToken();
    return auth ? { connected: true, email: auth.email } : { connected: false, email: null };
  } catch (err) {
    logger.warn({ err }, "Gmail token refresh failed");
    return { connected: false, email: null };
  }
}
