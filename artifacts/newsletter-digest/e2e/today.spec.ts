import { expect, test } from "@playwright/test";
import { LEAD_ID, mockApi } from "./fixtures";

test.describe("Today (desktop)", () => {
  test("shows the edition: greeting, sort card, rail and section tiles", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Good evening, Wout" })).toBeVisible();
    await expect(page.getByText("Edition 1 · 12 stories")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sort today’s 12" })).toBeVisible();
    await expect(page.getByText("96% match")).toBeVisible();
    await expect(page.getByText("6 newsletters")).toBeVisible();
    for (const tile of ["How I AI", "Product & Design", "Engineering & AI", "Job Openings"]) {
      await expect(page.getByText(tile, { exact: true }).first()).toBeVisible();
    }
  });

  test("keep, skip and undo are sent as feedback", async ({ page }) => {
    const api = await mockApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Keep" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText("3 / 12")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("2 / 12")).toBeVisible();
    await expect(page.getByText("1 saved")).toBeVisible();
    expect(api.feedback).toEqual([
      { storyId: LEAD_ID, rating: "up" },
      { storyId: LEAD_ID + 1, rating: "down" },
      { storyId: LEAD_ID + 1, rating: "none" },
    ]);
  });

  test("arrow keys sort and Z undoes", async ({ page }) => {
    const api = await mockApi(page);
    await page.goto("/");
    await expect(page.getByText("1 / 12")).toBeVisible();
    // pressed back to back, faster than React re-renders: each must act on the next story
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("z");
    await expect(page.getByText("1 kept")).toBeVisible();
    expect(api.feedback).toEqual([
      { storyId: LEAD_ID, rating: "up" },
      { storyId: LEAD_ID + 1, rating: "down" },
      { storyId: LEAD_ID + 1, rating: "none" },
    ]);
  });

  test("two decisions in the same tick rate two different stories", async ({ page }) => {
    const api = await mockApi(page);
    await page.goto("/");
    await expect(page.getByText("1 / 12")).toBeVisible();
    await page.evaluate(() => {
      for (const key of ["ArrowRight", "ArrowRight"]) window.dispatchEvent(new KeyboardEvent("keydown", { key }));
    });
    await expect(page.getByText("2 kept")).toBeVisible();
    expect(api.feedback.map((f) => f.storyId)).toEqual([LEAD_ID, LEAD_ID + 1]);
  });

  test("a kept story opens in the reading view from the reading list", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Keep" }).click();
    await page.getByText("Top Stories · 2 min").click();
    await expect(page).toHaveURL(`/story/1/${LEAD_ID}`);
  });

  test("New briefing checks Gmail, then writes", async ({ page }) => {
    const api = await mockApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "New briefing" }).click();
    await expect(page.getByText("Your briefing is ready")).toBeVisible();
    expect(api.syncs).toBe(1);
    expect(api.generates).toBe(1);
  });

  test("first run: connect Gmail, then make the first briefing", async ({ page }) => {
    await mockApi(page, { digest: null, connected: false });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Connect Gmail" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New briefing" })).toHaveCount(0);

    await page.unrouteAll();
    const api = await mockApi(page, { digest: null, connected: true });
    await page.reload();
    await page.getByRole("button", { name: "Make my first briefing" }).click();
    await expect.poll(() => api.generates).toBe(1);
  });

  test("the night edition is remembered", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Night edition" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.goto("/?edition=day");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});
