import { expect, test } from "@playwright/test";
import { mockApi } from "./fixtures";

test("signed out: one Google button, nothing else loads", async ({ page }) => {
  await mockApi(page, { signedIn: false });
  await page.goto("/");
  const button = page.getByRole("link", { name: "Sign in with Google" });
  await expect(button).toHaveAttribute("href", "/api/auth/google/start");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
});

test("a refused account is told why", async ({ page }) => {
  await mockApi(page, { signedIn: false });
  await page.goto("/?signin=denied");
  await expect(page.getByRole("alert")).toContainText("isn’t on this wout.daily");
});

test("signed in: straight to Today", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Good evening, Wout" })).toBeVisible();
});
