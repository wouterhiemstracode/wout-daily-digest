import { expect, test } from "@playwright/test";
import { mockApi } from "./fixtures";

test("My sources lists found newsletters with switches", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto("/senders");
  await expect(page.getByText("5 of 6 on")).toBeVisible();
  await expect(page.getByText("found in Gmail").first()).toBeVisible();
  await expect(page.getByText("added by you")).toBeVisible();

  await page.getByRole("switch", { name: "Include The Batch in my briefing" }).click();
  await expect.poll(() => api.senderUpdates).toEqual([{ id: 3, active: false }]);
  await expect(page.getByText("4 of 6 on")).toBeVisible();

  await page.getByRole("button", { name: "Check Gmail now" }).click();
  await expect(page.getByText("Found 1 new newsletter in Gmail.")).toBeVisible();
  expect(api.generates).toBe(0);
});
