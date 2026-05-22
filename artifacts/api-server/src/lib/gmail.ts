import { ReplitConnectors } from "@replit/connectors-sdk";
import { db } from "@workspace/db";
import { gmailTokensTable } from "@workspace/db";
import { logger } from "./logger";

// Gmail connector via Replit's managed OAuth proxy
// Handles token refresh and auth headers automatically

function getConnectors() {
  return new ReplitConnectors();
}

export async function getGmailStatus(): Promise<{ connected: boolean; email: string | null }> {
  try {
    const connectors = getConnectors();
    const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/profile", {
      method: "GET",
    });
    if (!response.ok) return { connected: false, email: null };
    const data = (await response.json()) as { emailAddress?: string };
    return { connected: true, email: data.emailAddress ?? null };
  } catch {
    return { connected: false, email: null };
  }
}

export function getAuthUrl(): string {
  // With Replit connectors, auth is managed by the platform
  // Return a placeholder URL that the frontend can use to trigger reconnect
  const domains = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  return domains ? `https://${domains}` : "http://localhost:80";
}

export async function disconnectGmail(): Promise<void> {
  // With Replit connectors, disconnection is managed in the Replit UI
  // We just clear any local token records
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
  const connectors = getConnectors();

  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const afterEpoch = Math.floor(since.getTime() / 1000);
  const query = encodeURIComponent(`from:${senderEmail} after:${afterEpoch}`);

  const listRes = await connectors.proxy(
    "google-mail",
    `/gmail/v1/users/me/messages?q=${query}&maxResults=20`,
    { method: "GET" }
  );

  if (!listRes.ok) {
    const text = await listRes.text();
    throw new Error(`Gmail list failed: ${listRes.status} ${text}`);
  }

  const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
  const messages = listData.messages ?? [];
  const result: GmailMessage[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;
    try {
      const msgRes = await connectors.proxy(
        "google-mail",
        `/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { method: "GET" }
      );

      if (!msgRes.ok) continue;

      const msgData = (await msgRes.json()) as {
        payload?: {
          headers?: Array<{ name: string; value: string }>;
          parts?: any[];
          body?: { data?: string };
          mimeType?: string;
        };
      };

      const payload = msgData.payload;
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
