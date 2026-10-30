import { Router } from "express";
import { db, emailsTable, sendersTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { discoverNewsletters, fetchEmailsForSender, fetchMessage, getGmailStatus, type GmailMessage, type NewsletterRef } from "../lib/gmail";
import { ListEmailsQueryParams } from "@workspace/api-zod";

const router = Router();

router.post("/sync", async (req, res) => {
  const status = await getGmailStatus();
  if (!status.connected) {
    res.status(400).json({ error: "Gmail not connected" });
    return;
  }

  const errors: string[] = [];

  // 1. Find newsletters in the inbox and add any sender we haven't seen yet.
  let found: NewsletterRef[] = [];
  try {
    found = await discoverNewsletters(24);
  } catch (err: any) {
    req.log.error({ err }, "Newsletter discovery failed");
    errors.push(`Inbox scan: ${err.message ?? "Unknown error"}`);
  }
  const known = new Set((await db.select({ email: sendersTable.email }).from(sendersTable)).map((s) => s.email));
  const fresh = new Map<string, string | null>();
  for (const ref of found) if (!known.has(ref.email) && !fresh.has(ref.email)) fresh.set(ref.email, ref.name);
  if (fresh.size > 0) {
    await db
      .insert(sendersTable)
      .values([...fresh].map(([email, name]) => ({ email, name, autoDetected: true })))
      .onConflictDoNothing({ target: sendersTable.email });
  }

  // 2. Store new messages from every sender that is switched on.
  const active = await db.select().from(sendersTable).where(eq(sendersTable.active, true));
  const senderByEmail = new Map(active.map((s) => [s.email, s]));
  const stored = new Set(
    found.length
      ? (await db.select({ id: emailsTable.gmailMessageId }).from(emailsTable).where(inArray(emailsTable.gmailMessageId, found.map((f) => f.id)))).map((r) => r.id)
      : [],
  );

  let fetched = 0;
  const save = async (senderId: number, msg: GmailMessage) => {
    const inserted = await db
      .insert(emailsTable)
      .values({
        senderId,
        gmailMessageId: msg.id,
        subject: msg.subject,
        bodyText: msg.bodyText,
        bodyHtml: msg.bodyHtml,
        receivedAt: msg.receivedAt,
        processed: false,
      })
      .onConflictDoNothing({ target: emailsTable.gmailMessageId })
      .returning({ id: emailsTable.id });
    fetched += inserted.length;
  };

  for (const ref of found) {
    const sender = senderByEmail.get(ref.email);
    if (!sender || stored.has(ref.id)) continue;
    const msg = await fetchMessage(ref.id);
    if (msg) await save(sender.id, msg);
  }

  // Senders added by hand may not send list mail, so they are fetched by address too.
  for (const sender of active.filter((s) => !s.autoDetected)) {
    try {
      for (const msg of await fetchEmailsForSender(sender.email, 24)) await save(sender.id, msg);
    } catch (err: any) {
      req.log.error({ err, sender: sender.email }, "Failed to fetch emails for sender");
      errors.push(`${sender.email}: ${err.message ?? "Unknown error"}`);
    }
  }

  res.json({ fetched, senders: active.length, discovered: fresh.size, errors });
});

router.get("/", async (req, res) => {
  const parsed = ListEmailsQueryParams.safeParse(req.query);
  const senderId = parsed.success ? parsed.data.senderId : undefined;
  const limit = (parsed.success ? parsed.data.limit : undefined) ?? 50;

  let query = db
    .select({
      id: emailsTable.id,
      senderId: emailsTable.senderId,
      senderEmail: sendersTable.email,
      subject: emailsTable.subject,
      receivedAt: emailsTable.receivedAt,
      processed: emailsTable.processed,
      gmailMessageId: emailsTable.gmailMessageId,
    })
    .from(emailsTable)
    .leftJoin(sendersTable, eq(emailsTable.senderId, sendersTable.id))
    .orderBy(desc(emailsTable.receivedAt))
    .limit(limit);

  if (senderId) {
    query = query.where(eq(emailsTable.senderId, senderId)) as any;
  }

  const emails = await query;
  res.json(
    emails.map((e) => ({
      ...e,
      receivedAt: e.receivedAt.toISOString(),
      senderEmail: e.senderEmail ?? "",
    }))
  );
});

export default router;
