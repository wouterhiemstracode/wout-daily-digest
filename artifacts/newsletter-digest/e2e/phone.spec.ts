import { expect, test, type Page } from "@playwright/test";
import { LEAD_ID, mockApi } from "./fixtures";

async function swipe(page: Page, dx: number) {
  const card = page.locator("article").first();
  const box = (await card.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, y, { steps: 10 });
  await page.mouse.up();
}

test.describe("Today (phone)", () => {
  test("swipe right keeps, swipe left skips", async ({ page }) => {
    const api = await mockApi(page);
    await page.goto("/");
    await expect(page.getByText("12 left")).toBeVisible();
    await swipe(page, 200);
    await expect(page.getByText("11 left")).toBeVisible();
    await swipe(page, -200);
    await expect(page.getByText("10 left")).toBeVisible();
    expect(api.feedback).toEqual([
      { storyId: LEAD_ID, rating: "up" },
      { storyId: LEAD_ID + 1, rating: "down" },
    ]);
  });

  test("a short drag springs back; a tap opens the story", async ({ page }) => {
    const api = await mockApi(page);
    await page.goto("/");
    await swipe(page, 60);
    await expect(page.getByText("12 left")).toBeVisible();
    await page.locator("article").first().click();
    await expect(page).toHaveURL(`/story/1/${LEAD_ID}`);
    expect(api.feedback).toEqual([]);
  });

  test("buttons within thumb reach, and the reading list sheet", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Keep" }).click();
    await expect(page.getByText("11 left")).toBeVisible();
    await page.getByRole("button", { name: "Reading list", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Today" });
    await expect(sheet.getByText("AI agents are becoming a workflow, not a feature")).toBeVisible();
    await sheet.getByRole("button", { name: "Sections" }).click();
    await expect(sheet.getByText("Engineering & AI")).toBeVisible();
    await page.getByRole("button", { name: "Close sheet" }).click();
    await expect(sheet).toHaveCount(0);
  });

  test("the tab bar replaces the sidebar", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    const tabs = page.getByRole("navigation", { name: "Main" });
    await expect(tabs).toBeVisible();
    await tabs.getByText("My sources").click();
    await expect(page).toHaveURL("/senders");
    await expect(tabs.getByRole("link", { name: "My sources" }).locator("[aria-current=page]")).toBeVisible();
  });
});
