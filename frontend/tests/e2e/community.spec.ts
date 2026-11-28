import { expect, test } from "@playwright/test";

const MOCK_API_BASE = "http://127.0.0.1:4344/api/v1";

test.describe("Clubs & Events Community E2E journey", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    await request.post(`${MOCK_API_BASE}/e2e/community/reset`);
  });

  test("creates club, requests membership as another user, and owner accepts request", async ({
    page,
    request
  }) => {
    await page.goto("/en/clubs", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Discover Table Tennis Clubs" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Create Club" }).click();
    await expect(
      page.getByText("Creating a club costs 50 Coins from your wallet.")
    ).toBeVisible();

    await page
      .getByPlaceholder("e.g. Pinheiros Table Tennis")
      .fill("Pinheiros Spin Club");
    await page
      .getByPlaceholder("club@example.com")
      .fill("contact@pinheiros.example.com");
    await page.getByPlaceholder("SP").fill("SP");
    await page.getByPlaceholder("Sao Paulo").fill("Sao Paulo");
    await page
      .getByPlaceholder("Rua Hans Nobiling, 100")
      .fill("Rua Hans Nobiling, 100");
    await page
      .getByPlaceholder("Describe tables, training schedule, and community vibe...")
      .fill("Competitive table tennis club in Sao Paulo.");

    await page.getByRole("button", { name: "Create Club (50 Coins)" }).click();

    await expect(
      page.getByRole("heading", { name: "Pinheiros Spin Club" })
    ).toBeVisible({ timeout: 10_000 });

    // Switch active E2E user to another player and request membership
    await request.post(`${MOCK_API_BASE}/e2e/auth/switch-user`, {
      data: { userId: "user_e2e_2" }
    });

    await page.getByRole("link", { name: "View Club" }).first().click();
    await page.waitForURL("**/en/clubs/**");
    await expect(page.getByText("Not a Member")).toBeVisible();

    await page.getByRole("button", { name: "Request to Join" }).click();
    await expect(page.getByText("Request Pending")).toBeVisible({
      timeout: 10_000
    });

    // Switch back to owner and accept membership request
    await request.post(`${MOCK_API_BASE}/e2e/auth/switch-user`, {
      data: { userId: "user_e2e_1" }
    });
    await page.reload({ waitUntil: "networkidle" });

    await expect(page.getByText("Owner").first()).toBeVisible();
    await page.getByRole("button", { name: "Accept" }).click();

    await expect(page.getByText("2 members")).toBeVisible({
      timeout: 10_000
    });

    // Discover club via search filter
    await page.goto("/en/clubs", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Filter by club name...").fill("Pinheiros");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(
      page.getByRole("heading", { name: "Pinheiros Spin Club" })
    ).toBeVisible();
  });

  test("organizer drafts, publishes, and boosts an event, then player discovers it by city on mobile", async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/en/events/create", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Create & Publish Event" })
    ).toBeVisible();
    await expect(page.getByText("Publish cost: 30 Coins")).toBeVisible();

    await page
      .getByPlaceholder("e.g. Sao Paulo Open 2026")
      .fill("Sao Paulo Masters 2026");
    await page.getByPlaceholder("Sao Paulo", { exact: true }).fill("Sao Paulo");
    await page.getByPlaceholder("SP", { exact: true }).fill("SP");
    await page.getByPlaceholder("Av. Paulista, 1000").fill("Av. Paulista, 1000");
    await page
      .getByPlaceholder("Categories, format, rules, and prize details...")
      .fill("Open divisions A, B, and C.");

    await page.getByRole("button", { name: "Save Draft & Continue" }).click();
    await expect(
      page.getByText(
        "Draft saved! Review the coin deduction below before publishing."
      )
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Publish Event (30 Coins)" }).click();
    await expect(
      page.getByText("Event published! It is now visible in the marketplace.")
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Boost Event (25 Coins)" }).click();
    await expect(
      page.getByText(
        "Event boosted! It now appears with Promoted priority."
      )
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: "Browse Events" }).click();
    await page.waitForURL("**/en/events");

    await page
      .getByPlaceholder("Filter by city, state, or country...")
      .fill("Sao Paulo");
    await page.getByRole("button", { name: "Filter" }).click();

    await expect(
      page.getByRole("heading", { name: "Sao Paulo Masters 2026" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Promoted", { exact: true })).toBeVisible();
  });
});
