import { google } from "googleapis";
import { db } from "@workspace/db";
import { gmailTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuth2Client() {
  const clientId = process.env["GMAIL_CLIENT_ID"];
  const clientSecret = process.env["GMAIL_CLIENT_SECRET"];
  const redirectUri = process.env["GMAIL_REDIRECT_URI"];

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Gmail OAuth credentials not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Get user email
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  // Upsert token record (always keep only one)
  const existing = await db.select().from(gmailTokensTable).limit(1);
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  if (existing.length > 0) {
    await db.update(gmailTokensTable)
      .set({
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? existing[0]!.refreshToken,
        email: data.email ?? null,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(gmailTokensTable.id, existing[0]!.id));
  } else {
    await db.insert(gmailTokensTable).values({
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? null,
      email: data.email ?? null,
      expiresAt,
    });
  }
}

export async function getAuthenticatedClient() {
  const [tokenRecord] = await db.select().from(gmailTokensTable).limit(1);
  if (!tokenRecord) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken ?? undefined,
    expiry_date: tokenRecord.expiresAt?.getTime(),
  });

  // Auto-refresh if needed
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db.update(gmailTokensTable)
        .set({
          accessToken: tokens.access_token,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          updatedAt: new Date(),
        })
        .where(eq(gmailTokensTable.id, tokenRecord.id));
    }
  });

  return oauth2Client;
}

export async function getGmailStatus(): Promise<{ connected: boolean; email: string | null }> {
  const [tokenRecord] = await db.select().from(gmailTokensTable).limit(1);
  if (!tokenRecord) return { connected: false, email: null };
  return { connected: true, email: tokenRecord.email };
}

export async function disconnectGmail(): Promise<void> {
  await db.delete(gmailTokensTable);
}

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
}

export async function fetchEmailsForSender(
  senderEmail: string,
  hoursBack: number = 24
): Promise<GmailMessage[]> {
  const authClient = await getAuthenticatedClient();
  if (!authClient) throw new Error("Gmail not connected");

  const gmail = google.gmail({ version: "v1", auth: authClient });
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const afterEpoch = Math.floor(since.getTime() / 1000);

  const query = `from:${senderEmail} after:${afterEpoch}`;

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 20,
  });

  const messages = listRes.data.messages ?? [];
  const result: GmailMessage[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;
    try {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const payload = msgRes.data.payload;
      const headers = payload?.headers ?? [];
      const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "(no subject)";
      const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? senderEmail;
      const dateHeader = headers.find((h) => h.name?.toLowerCase() === "date")?.value;
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

      const { bodyText, bodyHtml } = extractBody(payload);

      result.push({ id: msg.id, subject, from, bodyText, bodyHtml, receivedAt });
    } catch (err) {
      logger.error({ err, msgId: msg.id }, "Failed to fetch message");
    }
  }

  return result;
}

function extractBody(payload: any): { bodyText: string; bodyHtml: string } {
  let bodyText = "";
  let bodyHtml = "";

  function decode(data: string): string {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  }

  function walk(part: any) {
    if (!part) return;
    const mime = part.mimeType ?? "";
    if (mime === "text/plain" && part.body?.data) {
      bodyText += decode(part.body.data);
    } else if (mime === "text/html" && part.body?.data) {
      bodyHtml += decode(part.body.data);
    } else if (part.parts) {
      for (const p of part.parts) walk(p);
    }
  }

  walk(payload);
  return { bodyText, bodyHtml };
}
