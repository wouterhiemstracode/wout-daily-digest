import { Router } from "express";
import { db, sendersTable, emailsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateSenderBody, DeleteSenderParams } from "@workspace/api-zod";
import { z } from "zod/v4";

const router = Router();

router.get("/", async (req, res) => {
  const senders = await db.select().from(sendersTable).orderBy(sendersTable.createdAt);

  // Get email counts per sender
  const counts = await db
    .select({ senderId: emailsTable.senderId, count: sql<number>`count(*)::int` })
    .from(emailsTable)
    .groupBy(emailsTable.senderId);

  const countMap = new Map(counts.map((c) => [c.senderId, c.count]));

  const result = senders.map((s) => ({
    id: s.id,
    email: s.email,
    name: s.name,
    active: s.active,
    emailCount: countMap.get(s.id) ?? 0,
    createdAt: s.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/", async (req, res) => {
  const parsed = CreateSenderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { email, name } = parsed.data;

  const [sender] = await db
    .insert(sendersTable)
    .values({ email: email.toLowerCase().trim(), name: name ?? null })
    .onConflictDoUpdate({ target: sendersTable.email, set: { active: true } })
    .returning();

  res.status(201).json({
    id: sender!.id,
    email: sender!.email,
    name: sender!.name,
    active: sender!.active,
    emailCount: 0,
    createdAt: sender!.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteSenderParams.safeParse({ id: Number(req.params["id"]) });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  await db.delete(sendersTable).where(eq(sendersTable.id, parsed.data.id));
  res.json({ success: true });
});

export default router;
