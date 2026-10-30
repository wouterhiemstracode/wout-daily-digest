import { Router } from "express";
import { db, sendersTable, emailsTable } from "@workspace/db";
import { eq, sql } from "@workspace/db";
import { CreateSenderBody, DeleteSenderParams, UpdateSenderBody, UpdateSenderParams } from "@workspace/api-zod";

import { loadPreferences, type Tally } from "../lib/preferences";

const router = Router();

function toSender(s: typeof sendersTable.$inferSelect, emailCount = 0, ratings: Tally = { kept: 0, skipped: 0 }) {
  return {
    id: s.id,
    email: s.email,
    name: s.name,
    active: s.active,
    autoDetected: s.autoDetected,
    kept: ratings.kept,
    skipped: ratings.skipped,
    emailCount,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const senders = await db.select().from(sendersTable).orderBy(sendersTable.createdAt);

  // Get email counts per sender
  const counts = await db
    .select({ senderId: emailsTable.senderId, count: sql<number>`count(*)::int` })
    .from(emailsTable)
    .groupBy(emailsTable.senderId);

  const countMap = new Map(counts.map((c) => [c.senderId, c.count]));

  const { senders: ratings } = await loadPreferences();
  res.json(senders.map((s) => toSender(s, countMap.get(s.id) ?? 0, ratings.get(s.id))));
});

router.post("/", async (req, res) => {
  const parsed = CreateSenderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { email, name } = parsed.data;

  const [sender] = await db
    .insert(sendersTable)
    .values({ email: email.toLowerCase().trim(), name: name ?? null })
    .onConflictDoUpdate({ target: sendersTable.email, set: { active: true } })
    .returning();

  res.status(201).json(toSender(sender!));
});

router.patch("/:id", async (req, res) => {
  const params = UpdateSenderParams.safeParse({ id: Number(req.params["id"]) });
  const body = UpdateSenderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [sender] = await db
    .update(sendersTable)
    .set({ active: body.data.active })
    .where(eq(sendersTable.id, params.data.id))
    .returning();
  if (!sender) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [counted] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emailsTable)
    .where(eq(emailsTable.senderId, sender.id));
  res.json(toSender(sender, counted?.count ?? 0, (await loadPreferences()).senders.get(sender.id)));
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteSenderParams.safeParse({ id: Number(req.params["id"]) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(sendersTable).where(eq(sendersTable.id, parsed.data.id));
  res.json({ success: true });
});

export default router;
