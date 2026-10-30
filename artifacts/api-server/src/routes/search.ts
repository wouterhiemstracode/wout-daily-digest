import { Router } from "express";
import { db, storiesTable, digestSectionsTable, digestsTable } from "@workspace/db";
import { eq, sql, ilike, or } from "drizzle-orm";
import { SearchDigestsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = SearchDigestsQueryParams.safeParse(req.query);
  if (!parsed.success || !parsed.data.q) {
    res.status(400).json({ error: "Missing search query" });
    return;
  }

  const q = `%${parsed.data.q}%`;

  const results = await db
    .select({
      id: storiesTable.id,
      headline: storiesTable.headline,
      summary: storiesTable.summary,
      whyItMatters: storiesTable.whyItMatters,
      sourceUrl: storiesTable.sourceUrl,
      sourceName: storiesTable.sourceName,
      relevanceScore: storiesTable.relevanceScore,
      digestId: digestsTable.id,
      digestDate: digestsTable.date,
    })
    .from(storiesTable)
    .innerJoin(digestSectionsTable, eq(storiesTable.sectionId, digestSectionsTable.id))
    .innerJoin(digestsTable, eq(digestSectionsTable.digestId, digestsTable.id))
    .where(
      or(
        ilike(storiesTable.headline, q),
        ilike(storiesTable.summary, q),
        ilike(storiesTable.whyItMatters, q)
      )
    )
    .orderBy(sql`${storiesTable.relevanceScore} desc`)
    .limit(50);

  res.json({ stories: results, total: results.length });
});

export default router;
