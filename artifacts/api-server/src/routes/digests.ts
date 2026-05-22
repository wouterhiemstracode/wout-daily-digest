import { Router } from "express";
import { db, emailsTable, sendersTable, digestsTable, digestSectionsTable, storiesTable } from "@workspace/db";
import { eq, desc, sql, and, gte, count, inArray } from "drizzle-orm";
import { processEmailsIntoDigest, type EmailContent, type FeedbackContext } from "../lib/ai-processor";
import { GetDigestParams, GenerateDigestBody, ListDigestsQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /digests - list all digests
router.get("/", async (req, res) => {
  const parsed = ListDigestsQueryParams.safeParse(req.query);
  const limit = (parsed.success ? parsed.data.limit : undefined) ?? 30;

  const digests = await db
    .select()
    .from(digestsTable)
    .orderBy(desc(digestsTable.createdAt))
    .limit(limit);

  const storyCountsRaw = await db
    .select({
      digestId: digestSectionsTable.digestId,
      count: count(storiesTable.id),
    })
    .from(digestSectionsTable)
    .leftJoin(storiesTable, eq(storiesTable.sectionId, digestSectionsTable.id))
    .groupBy(digestSectionsTable.digestId);

  const countMap = new Map(storyCountsRaw.map((r) => [r.digestId, r.count]));

  res.json(
    digests.map((d) => ({
      id: d.id,
      date: d.date,
      status: d.status,
      storyCount: countMap.get(d.id) ?? 0,
      createdAt: d.createdAt.toISOString(),
    }))
  );
});

// GET /digests/latest
router.get("/latest", async (req, res) => {
  const [digest] = await db
    .select()
    .from(digestsTable)
    .where(eq(digestsTable.status, "ready"))
    .orderBy(desc(digestsTable.createdAt))
    .limit(1);

  if (!digest) {
    return res.status(404).json({ error: "No digest found" });
  }

  res.json(await buildFullDigest(digest.id));
});

// GET /digests/:id
router.get("/:id", async (req, res) => {
  const parsed = GetDigestParams.safeParse({ id: Number(req.params["id"]) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid ID" });

  const [digest] = await db.select().from(digestsTable).where(eq(digestsTable.id, parsed.data.id));
  if (!digest) return res.status(404).json({ error: "Not found" });

  res.json(await buildFullDigest(digest.id));
});

// POST /digests/generate
router.post("/generate", async (req, res) => {
  const parsed = GenerateDigestBody.safeParse(req.body ?? {});
  const hoursBack = (parsed.success ? parsed.data.hoursBack : undefined) ?? 24;

  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const emails = await db
    .select({
      senderId: emailsTable.senderId,
      senderEmail: sendersTable.email,
      subject: emailsTable.subject,
      bodyText: emailsTable.bodyText,
      bodyHtml: emailsTable.bodyHtml,
      receivedAt: emailsTable.receivedAt,
    })
    .from(emailsTable)
    .leftJoin(sendersTable, eq(emailsTable.senderId, sendersTable.id))
    .where(gte(emailsTable.receivedAt, since))
    .orderBy(desc(emailsTable.receivedAt));

  // Build feedback context from past story ratings
  const likedStories = await db
    .select({ headline: storiesTable.headline, sourceName: storiesTable.sourceName })
    .from(storiesTable)
    .where(eq(storiesTable.userFeedback, "up"))
    .orderBy(desc(storiesTable.createdAt))
    .limit(30);

  const dislikedStories = await db
    .select({ headline: storiesTable.headline, sourceName: storiesTable.sourceName })
    .from(storiesTable)
    .where(eq(storiesTable.userFeedback, "down"))
    .orderBy(desc(storiesTable.createdAt))
    .limit(30);

  const feedback: FeedbackContext = {
    likedTopics: likedStories.map((s) => s.headline).filter(Boolean),
    dislikedTopics: dislikedStories.map((s) => s.headline).filter(Boolean),
  };

  const emailContent: EmailContent[] = emails.map((e) => ({
    senderId: e.senderId,
    senderEmail: e.senderEmail ?? "",
    subject: e.subject,
    bodyText: e.bodyText ?? "",
    bodyHtml: e.bodyHtml ?? "",
    receivedAt: e.receivedAt,
  }));

  const today = new Date().toISOString().split("T")[0]!;
  const [digest] = await db
    .insert(digestsTable)
    .values({ date: today, status: "draft" })
    .returning();

  try {
    const output = await processEmailsIntoDigest(emailContent, feedback);

    for (let i = 0; i < output.sections.length; i++) {
      const section = output.sections[i]!;
      if (section.stories.length === 0) continue;

      const [sec] = await db
        .insert(digestSectionsTable)
        .values({
          digestId: digest!.id,
          sectionType: section.type,
          title: section.title,
          sortOrder: i,
        })
        .returning();

      for (let j = 0; j < section.stories.length; j++) {
        const story = section.stories[j]!;
        await db.insert(storiesTable).values({
          sectionId: sec!.id,
          headline: story.headline,
          summary: story.summary,
          whyItMatters: story.whyItMatters,
          takeaways: story.takeaways ?? [],
          sourceUrl: story.sourceUrl,
          sourceName: story.sourceName,
          relevanceScore: story.relevanceScore,
          sortOrder: j,
        });
      }
    }

    await db.update(digestsTable).set({ status: "ready" }).where(eq(digestsTable.id, digest!.id));

    await db
      .update(emailsTable)
      .set({ processed: true })
      .where(gte(emailsTable.receivedAt, since));

    res.json(await buildFullDigest(digest!.id));
  } catch (err: any) {
    req.log.error({ err }, "Digest generation failed");
    await db.update(digestsTable).set({ status: "error" }).where(eq(digestsTable.id, digest!.id));
    res.status(500).json({ error: "Generation failed: " + (err.message ?? "Unknown error") });
  }
});

async function buildFullDigest(digestId: number) {
  const [digest] = await db.select().from(digestsTable).where(eq(digestsTable.id, digestId));
  if (!digest) throw new Error("Digest not found");

  const sections = await db
    .select()
    .from(digestSectionsTable)
    .where(eq(digestSectionsTable.digestId, digestId))
    .orderBy(digestSectionsTable.sortOrder);

  const fullSections = await Promise.all(
    sections.map(async (sec) => {
      const stories = await db
        .select()
        .from(storiesTable)
        .where(eq(storiesTable.sectionId, sec.id))
        .orderBy(storiesTable.sortOrder);

      return {
        id: sec.id,
        digestId: sec.digestId,
        sectionType: sec.sectionType,
        title: sec.title,
        sortOrder: sec.sortOrder,
        stories: stories.map((s) => ({
          id: s.id,
          sectionId: s.sectionId,
          headline: s.headline,
          summary: s.summary,
          whyItMatters: s.whyItMatters,
          takeaways: (s.takeaways as string[]) ?? [],
          sourceUrl: s.sourceUrl,
          sourceName: s.sourceName,
          relevanceScore: s.relevanceScore,
          sortOrder: s.sortOrder,
          userFeedback: s.userFeedback,
        })),
      };
    })
  );

  const storyCount = fullSections.reduce((sum, s) => sum + s.stories.length, 0);

  return {
    id: digest.id,
    date: digest.date,
    status: digest.status,
    storyCount,
    createdAt: digest.createdAt.toISOString(),
    sections: fullSections,
  };
}

export default router;
