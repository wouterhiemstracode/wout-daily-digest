import { expect, test } from "@playwright/test";
import { mockApi } from "./fixtures";

test.describe("Peek, the croc", () => {
  test("a quiet day keeps today's briefing and doesn't call Claude", async ({ page }) => {
    const api = await mockApi(page, { newEmails: 0 });
    await page.goto("/");
    await page.getByRole("button", { name: "New briefing" }).click();
    await expect(page.getByText("A quiet day")).toBeVisible();
    expect(api.syncs).toBe(1);
    expect(api.generates).toBe(0);
  });

  test("Gmail didn't answer: a worried Peek and Try again", async ({ page }) => {
    const api = await mockApi(page, { gmailDown: true });
    await page.goto("/");
    await page.getByRole("button", { name: "New briefing" }).click();
    const alert = page.getByRole("alert").filter({ hasText: "Gmail didn’t answer" });
    await expect(alert).toBeVisible();
    await alert.getByRole("button", { name: "Try again" }).click();
    await expect.poll(() => api.syncs).toBe(2);
    await alert.getByRole("button", { name: "Dismiss" }).click();
    await expect(alert).toHaveCount(0);
  });

  test("seven days in a row shows the streak", async ({ page }) => {
    await mockApi(page, { streak: 8 });
    await page.goto("/");
    await expect(page.getByText("8 days in a row")).toBeVisible();
  });

  test("no streak card before seven days", async ({ page }) => {
    await mockApi(page, { streak: 6 });
    await page.goto("/");
    await expect(page.getByText("Sort today’s 12")).toBeVisible();
    await expect(page.getByText("days in a row")).toHaveCount(0);
  });

  test("the Peek sheet is public and lists every mood", async ({ page }) => {
    await mockApi(page, { signedIn: false });
    await page.goto("/peek");
    await expect(page.getByRole("heading", { level: 1, name: "Peek" })).toBeVisible();
    for (const name of ["Curious", "Worried", "Sleepy", "Proud", "Over the newspaper", "Night cap", "Sunglasses"]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  });
});
