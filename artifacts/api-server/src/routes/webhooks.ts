import { Router } from "express";
import { db, emailsTable, sendersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const WEBHOOK_SENDER_EMAIL = "make-webhook@internal";

router.post("/funding", async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const provided = (req.headers["x-webhook-secret"] ?? req.query.secret) as string | undefined;
    if (provided !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const items: any[] = Array.isArray(req.body) ? req.body : [req.body];

  if (items.length === 0) {
    res.status(400).json({ error: "No items provided" });
    return;
  }

  let [sender] = await db
    .select()
    .from(sendersTable)
    .where(eq(sendersTable.email, WEBHOOK_SENDER_EMAIL));

  if (!sender) {
    [sender] = await db
      .insert(sendersTable)
      .values({
        email: WEBHOOK_SENDER_EMAIL,
        name: "Make Funding Tracker",
        active: true,
      })
      .returning();
  }

  let inserted = 0;
  const now = new Date();

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const msgId = `webhook-funding-${now.getTime()}-${i}-${Math.random().toString(36).slice(2)}`;

    const lines = [
      `Company: ${item.company ?? "Unknown"}`,
      `Round: ${item.round ?? item.roundType ?? "Unknown"}`,
      item.amount ? `Amount: ${item.amount}` : null,
      item.location ? `Location: ${item.location}` : null,
      item.sector ? `Sector: ${item.sector}` : null,
      item.description ? `\nDescription: ${item.description}` : null,
      item.url ? `\nSource: ${item.url}` : null,
    ].filter(Boolean);

    const bodyText = lines.join("\n");
    const subject = [
      item.company ?? "Unknown Company",
      "raises",
      item.round ?? item.roundType ?? "funding",
      item.amount ? `(${item.amount})` : null,
      item.location ? `— ${item.location}` : null,
    ].filter(Boolean).join(" ");

    await db
      .insert(emailsTable)
      .values({
        senderId: sender!.id,
        gmailMessageId: msgId,
        subject,
        bodyText,
        bodyHtml: `<pre>${bodyText}</pre>`,
        receivedAt: now,
        processed: false,
      })
      .onConflictDoNothing({ target: emailsTable.gmailMessageId });

    inserted++;
    req.log.info({ company: item.company, round: item.round }, "Webhook funding entry inserted");
  }

  res.json({ inserted, senderId: sender!.id });
});

export default router;
