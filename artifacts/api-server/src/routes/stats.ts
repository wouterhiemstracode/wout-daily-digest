import { Router } from "express";
import { db, digestsTable, storiesTable, sendersTable, emailsTable, feedbackTable, eq, sql, count, gte, inArray } from "@workspace/db";
import { localDay, streakDays } from "../lib/streak";

const router = Router();

router.get("/", async (req, res) => {
  const [digestCount] = await db.select({ count: count() }).from(digestsTable);
  const [senderCount] = await db.select({ count: count() }).from(sendersTable);
  const [emailCount] = await db.select({ count: count() }).from(emailsTable);
  const [storyCount] = await db.select({ count: count() }).from(storiesTable);

  const [lastDigest] = await db
    .select({ date: digestsTable.date })
    .from(digestsTable)
    .where(eq(digestsTable.status, "ready"))
    .orderBy(sql`${digestsTable.createdAt} desc`)
    .limit(1);

  const [lastEmail] = await db
    .select({ receivedAt: emailsTable.receivedAt })
    .from(emailsTable)
    .orderBy(sql`${emailsTable.receivedAt} desc`)
    .limit(1);

  const since = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
  const rated = await db
    .select({ at: feedbackTable.createdAt })
    .from(feedbackTable)
    .where(sql`${inArray(feedbackTable.rating, ["up", "down"])} and ${gte(feedbackTable.createdAt, since)}`);

  res.json({
    streakDays: streakDays(
      rated.map((r) => localDay(r.at)),
      localDay(new Date()),
    ),
    totalDigests: digestCount?.count ?? 0,
    totalStories: storyCount?.count ?? 0,
    totalSenders: senderCount?.count ?? 0,
    emailsProcessed: emailCount?.count ?? 0,
    lastDigestDate: lastDigest?.date ?? null,
    lastSyncAt: lastEmail?.receivedAt?.toISOString() ?? null,
  });
});

export default router;
