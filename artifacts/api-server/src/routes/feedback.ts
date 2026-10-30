import { Router } from "express";
import { db, feedbackTable, storiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubmitFeedbackBody } from "@workspace/api-zod";

const router = Router();

router.post("/", async (req, res) => {
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { storyId, rating } = parsed.data;

  if (!["up", "down"].includes(rating)) {
    res.status(400).json({ error: "Rating must be 'up' or 'down'" });
    return;
  }

  // Update story's userFeedback field
  await db.update(storiesTable).set({ userFeedback: rating }).where(eq(storiesTable.id, storyId));

  const [feedback] = await db
    .insert(feedbackTable)
    .values({ storyId, rating })
    .returning();

  res.status(201).json({
    id: feedback!.id,
    storyId: feedback!.storyId,
    rating: feedback!.rating,
    createdAt: feedback!.createdAt.toISOString(),
  });
});

export default router;
