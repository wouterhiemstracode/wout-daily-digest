import { expect, test } from "@playwright/test";
import { LEAD_ID, mockApi } from "./fixtures";

test("the reading view sets the full story with its pull quote", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/story/1/${LEAD_ID}`);
  await expect(page.getByRole("heading", { level: 1, name: "AI agents are becoming a workflow, not a feature" })).toBeVisible();
  await expect(page.getByText("For two years, adding AI to a product")).toBeVisible();
  await expect(page.getByText("“The interesting surface is no longer the prompt box. It is the hand-off.”")).toBeVisible();
  await expect(page.getByText("Read it in full at lennysnewsletter.com")).toBeVisible();

  await page.getByText("Up next").click();
  await expect(page).toHaveURL(`/story/1/${LEAD_ID + 1}`);
});

test("a story without full text falls back to the briefing", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/story/1/${LEAD_ID + 7}`); // "Building calmer notification experiences": no body, no takeaways
  await expect(page.getByRole("heading", { level: 1, name: "Building calmer notification experiences" })).toBeVisible();
  await expect(page.getByText("Why it matters")).toBeVisible();
  await expect(page.getByText("Takeaways")).toHaveCount(0);
});

test("an unknown story says so", async ({ page }) => {
  await mockApi(page);
  await page.goto("/story/1/9999");
  await expect(page.getByText("We couldn’t find that story.")).toBeVisible();
});
