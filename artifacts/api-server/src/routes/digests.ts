import { Router } from "express";
import { db, digestsTable, digestSectionsTable, storiesTable, eq, desc, count } from "@workspace/db";
import { buildFullDigest, writeDigest } from "../lib/briefing";
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
    res.status(404).json({ error: "No digest found" });
    return;
  }

  res.json(await buildFullDigest(digest.id));
});

// GET /digests/:id
router.get("/:id", async (req, res) => {
  const parsed = GetDigestParams.safeParse({ id: Number(req.params["id"]) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [digest] = await db.select().from(digestsTable).where(eq(digestsTable.id, parsed.data.id));
  if (!digest) { res.status(404).json({ error: "Not found" }); return; }

  res.json(await buildFullDigest(digest.id));
});

// POST /digests/generate
router.post("/generate", async (req, res) => {
  const parsed = GenerateDigestBody.safeParse(req.body ?? {});
  try {
    res.json(await writeDigest((parsed.success ? parsed.data.hoursBack : undefined) ?? 24));
  } catch (err: any) {
    req.log.error({ err }, "Digest generation failed");
    res.status(500).json({ error: "Generation failed: " + (err.message ?? "Unknown error") });
  }
});

export default router;
