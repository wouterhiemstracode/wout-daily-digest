import { expect, test } from "@playwright/test";
import { LEAD_ID, mockApi } from "./fixtures";

/*
 * Visual baselines for the Dessn v3 frames. They were checked by eye against the frames'
 * screenshots when this file was written; a diff here means the design drifted.
 * Update on purpose with: pnpm --filter @workspace/newsletter-digest run test:e2e --update-snapshots
 */

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

const settle = async (page: import("@playwright/test").Page) => {
  await page.evaluate(() => document.fonts.ready);
};

test("v3 · Today", async ({ page }, info) => {
  await page.goto("/?edition=day");
  await settle(page);
  await expect(page).toHaveScreenshot(`today-${info.project.name}.png`);
});

test("v3 · Today night", async ({ page }, info) => {
  await page.goto("/?edition=night");
  await settle(page);
  await expect(page).toHaveScreenshot(`today-night-${info.project.name}.png`);
});

test("v3 · Reading view", async ({ page }, info) => {
  await page.goto(`/story/1/${LEAD_ID}?edition=day`);
  await settle(page);
  await expect(page).toHaveScreenshot(`story-${info.project.name}.png`);
});
