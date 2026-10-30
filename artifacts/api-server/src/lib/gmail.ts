import { logger } from "./logger";
import { clearGmailTokens, gmailFetch, gmailStatus } from "./google";

export async function getGmailStatus(): Promise<{ connected: boolean; email: string | null }> {
  return gmailStatus();
}

/** Sign-in and Gmail access are one Google consent screen. */
export function getAuthUrl(): string {
  return "/api/auth/google/start";
}

export async function disconnectGmail(): Promise<void> {
  await clearGmailTokens();
}

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
}

type Header = { name: string; value: string };
const header = (headers: Header[], name: string) => headers.find((h) => h.name?.toLowerCase() === name)?.value;

/** "Lenny's Newsletter <lenny@substack.com>" → { email, name } */
export function parseFrom(from: string): { email: string; name: string | null } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { email: m[2]!.trim().toLowerCase(), name: m[1]!.trim() || null };
  return { email: from.trim().toLowerCase(), name: null };
}

// Mailing-list mail that is really an account notice, receipt or shop promotion.
const NOT_A_NEWSLETTER_SUBJECT =
  /\b(receipt|invoice|your order|order (confirmation|#)|has shipped|shipping|delivered|payment|password|verify|verification|confirm your|security alert|sign[- ]?in|log[- ]?in|one[- ]time|2fa|reset|\d+% off|sale ends|coupon|free shipping)\b/i;
const NOT_A_NEWSLETTER_SENDER =
  /@((.+\.)?github\.com|accounts\.google\.com|calendar-notification@google\.com|(.+\.)?slack\.com|(.+\.)?atlassian\.net|(.+\.)?zoom\.us)$/i;

/**
 * Newsletters are sent through mailing-list software, which adds List-Unsubscribe
 * or List-Id headers. Receipts, security mails and app notifications are left out.
 */
export function isNewsletter(headers: Header[]): boolean {
  const listMail =
    !!header(headers, "list-unsubscribe") ||
    !!header(headers, "list-id") ||
    /^(bulk|list)$/i.test(header(headers, "precedence") ?? "");
  if (!listMail) return false;
  const { email } = parseFrom(header(headers, "from") ?? "");
  if (!email || NOT_A_NEWSLETTER_SENDER.test(email)) return false;
  return !NOT_A_NEWSLETTER_SUBJECT.test(header(headers, "subject") ?? "");
}

async function listMessageIds(query: string, max: number): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = pageToken ? `&pageToken=${pageToken}` : "";
    const res = await gmailFetch(`/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${page}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error(`Gmail list failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { messages?: Array<{ id: string }>; nextPageToken?: string };
    ids.push(...(data.messages ?? []).map((m) => m.id).filter(Boolean));
    pageToken = data.nextPageToken;
  } while (pageToken && ids.length < max);
  return ids.slice(0, max);
}

/** Run `fn` over items with at most `limit` requests in flight. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface NewsletterRef {
  id: string;
  email: string;
  name: string | null;
}

/** Find the newsletters in the inbox from the last `hoursBack` hours, from headers only. */
export async function discoverNewsletters(hoursBack = 24, max = 300): Promise<NewsletterRef[]> {
  const after = Math.floor((Date.now() - hoursBack * 60 * 60 * 1000) / 1000);
  const ids = await listMessageIds(`after:${after} -in:sent -in:chats -in:spam -in:trash`, max);
  const wanted = ["From", "Subject", "List-Unsubscribe", "List-Id", "Precedence"].map((h) => `metadataHeaders=${h}`).join("&");

  const refs = await mapLimit(ids, 8, async (id) => {
    try {
      const res = await gmailFetch(`/gmail/v1/users/me/messages/${id}?format=metadata&${wanted}`, { method: "GET" });
      if (!res.ok) return null;
      const data = (await res.json()) as { payload?: { headers?: Header[] } };
      const headers = data.payload?.headers ?? [];
      if (!isNewsletter(headers)) return null;
      return { id, ...parseFrom(header(headers, "from") ?? "") };
    } catch (err) {
      logger.warn({ err, msgId: id }, "Failed to read message headers");
      return null;
    }
  });
  return refs.filter((r): r is NewsletterRef => r !== null);
}

/** Fetch one message with its body. */
export async function fetchMessage(id: string): Promise<GmailMessage | null> {
  try {
    const res = await gmailFetch(`/gmail/v1/users/me/messages/${id}?format=full`, { method: "GET" });
    if (!res.ok) return null;
    const data = (await res.json()) as { payload?: { headers?: Header[]; parts?: any[]; body?: { data?: string }; mimeType?: string } };
    const headers = data.payload?.headers ?? [];
    const dateHeader = header(headers, "date");
    const { bodyText, bodyHtml } = extractBody(data.payload);
    return {
      id,
      subject: header(headers, "subject") ?? "(no subject)",
      from: header(headers, "from") ?? "",
      bodyText,
      bodyHtml,
      receivedAt: dateHeader ? new Date(dateHeader) : new Date(),
    };
  } catch (err) {
    logger.error({ err, msgId: id }, "Failed to fetch message");
    return null;
  }
}

/** Messages from one sender in the last `hoursBack` hours (for senders added by hand). */
export async function fetchEmailsForSender(senderEmail: string, hoursBack: number = 24): Promise<GmailMessage[]> {
  const after = Math.floor((Date.now() - hoursBack * 60 * 60 * 1000) / 1000);
  const ids = await listMessageIds(`from:${senderEmail} after:${after}`, 20);
  const messages = await mapLimit(ids, 8, fetchMessage);
  return messages.filter((m): m is GmailMessage => m !== null);
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
