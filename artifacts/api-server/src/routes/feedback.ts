import { Router } from "express";
import { db, feedbackTable, storiesTable } from "@workspace/db";
import { eq } from "@workspace/db";
import { SubmitFeedbackBody } from "@workspace/api-zod";

const router = Router();

router.post("/", async (req, res) => {
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { storyId, rating } = parsed.data;

  // "none" is an undo: it clears the story's rating, and is still logged as feedback.
  await db
    .update(storiesTable)
    .set({ userFeedback: rating === "none" ? null : rating })
    .where(eq(storiesTable.id, storyId));

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
