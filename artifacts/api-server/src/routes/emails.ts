import { Router } from "express";
import { db, emailsTable, sendersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { fetchEmailsForSender } from "../lib/gmail";
import { ListEmailsQueryParams } from "@workspace/api-zod";

const router = Router();

router.post("/sync", async (req, res) => {
  // Check Gmail is connected
  const { getGmailStatus } = await import("../lib/gmail");
  const status = await getGmailStatus();
  if (!status.connected) {
    res.status(400).json({ error: "Gmail not connected" });
    return;
  }

  const senders = await db
    .select()
    .from(sendersTable)
    .where(eq(sendersTable.active, true));

  let totalFetched = 0;
  const errors: string[] = [];

  for (const sender of senders) {
    try {
      const messages = await fetchEmailsForSender(sender.email, 24);

      for (const msg of messages) {
        try {
          await db
            .insert(emailsTable)
            .values({
              senderId: sender.id,
              gmailMessageId: msg.id,
              subject: msg.subject,
              bodyText: msg.bodyText,
              bodyHtml: msg.bodyHtml,
              receivedAt: msg.receivedAt,
              processed: false,
            })
            .onConflictDoNothing({ target: emailsTable.gmailMessageId });
          totalFetched++;
        } catch (err: any) {
          req.log.warn({ err, msgId: msg.id }, "Skipped duplicate email");
        }
      }
    } catch (err: any) {
      req.log.error({ err, sender: sender.email }, "Failed to fetch emails for sender");
      errors.push(`${sender.email}: ${err.message ?? "Unknown error"}`);
    }
  }

  res.json({ fetched: totalFetched, senders: senders.length, errors });
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
