import { Router } from "express";
import { db, emailsTable, sendersTable, eq, desc } from "@workspace/db";
import { GmailNotConnectedError, syncNewsletters } from "../lib/briefing";
import { ListEmailsQueryParams } from "@workspace/api-zod";

const router = Router();

router.post("/sync", async (req, res) => {
  try {
    res.json(await syncNewsletters(req.log));
  } catch (err) {
    if (err instanceof GmailNotConnectedError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
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
