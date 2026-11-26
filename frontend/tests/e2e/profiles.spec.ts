import { expect, test } from "@playwright/test";

test.describe("Profiles E2E journey", () => {
  test("completes profile setup wizard and renders the newly published public profile", async ({
    page,
    browserName
  }) => {
    const uniqueHandle = `e2e_${browserName}_${Date.now().toString(36)}`.slice(0, 30);

    await page.goto("/en/profiles/setup", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Complete your player card" })
    ).toBeVisible();

    const usernameInput = page.getByPlaceholder("e.g. hugo_calderano");

    // Verify taken handle is detected via debounced API availability check
    await usernameInput.fill("taken_player");
    await expect(
      page.getByText("This handle is already taken. Try another.")
    ).toBeVisible({ timeout: 10_000 });

    // Enter a fresh available handle
    await usernameInput.fill(uniqueHandle);
    await expect(page.getByText("Handle is available!")).toBeVisible({
      timeout: 10_000
    });

    await page.getByPlaceholder("e.g. Hugo Calderano").fill("Bruna Takahashi");
    await page.getByRole("button", { name: "Next step" }).click();

    // Step 2: Sport Identity
    const selects = page.locator("form select");
    await expect(selects).toHaveCount(3);
    await selects.nth(0).selectOption("shakehand");
    await selects.nth(1).selectOption("right");
    await selects.nth(2).selectOption("pro");
    await page
      .getByPlaceholder(
        "Tell the community about your playstyle, gear setup, or favorite clubs..."
      )
      .fill("Aggressive loop driver playing out of Sao Paulo.");
    await page.getByRole("button", { name: "Next step" }).click();

    // Step 3: Home Court Location & Social
    await expect(
      page.getByRole("button", { name: "Publish Player Card" })
    ).toBeVisible();
    await page.locator("form select").first().selectOption("Brazil");
    await page.getByPlaceholder("e.g. California or São Paulo").fill("SP");
    await page.getByPlaceholder("e.g. San Jose or Rio de Janeiro").fill("Sao Paulo");
    await page
      .getByPlaceholder("https://instagram.com/yourhandle")
      .fill(`https://www.instagram.com/${uniqueHandle}`);

    await page.getByRole("button", { name: "Publish Player Card" }).click();

    // Verify success screen and navigate to newly created public profile
    await expect(
      page.getByRole("heading", { name: "Welcome to the court!" })
    ).toBeVisible();

    await page.getByRole("button", { name: "View My Profile" }).click();
    await page.waitForURL(`**/en/profiles/${uniqueHandle}`);

    await expect(page.getByRole("heading", { name: `@${uniqueHandle}` })).toBeVisible();
    await expect(page.getByText("Active Player")).toBeVisible();
    await expect(page.getByText("Sao Paulo, SP, Brazil")).toBeVisible();
    await expect(
      page.getByText("Aggressive loop driver playing out of Sao Paulo.")
    ).toBeVisible();

    const igLink = page.getByRole("link", { name: "Instagram" });
    await expect(igLink).toHaveAttribute(
      "href",
      `https://www.instagram.com/${uniqueHandle}`
    );
  });

  test("anonymous visitor views public profile with localized English metadata and OpenGraph tags", async ({
    page
  }) => {
    await page.goto("/en/profiles/hugo_calderano");

    await expect(page).toHaveTitle("@hugo_calderano | Rallies Table Tennis");
    await expect(
      page.locator('meta[property="og:title"]')
    ).toHaveAttribute("content", "@hugo_calderano | Rallies Table Tennis");
    await expect(
      page.locator('meta[property="og:type"]')
    ).toHaveAttribute("content", "profile");
    await expect(
      page.locator('meta[property="og:url"]')
    ).toHaveAttribute("content", "https://rallies.app/en/profiles/hugo_calderano");

    await expect(page.getByRole("heading", { name: "@hugo_calderano" })).toBeVisible();
    await expect(page.getByText("Active Player")).toBeVisible();
    await expect(page.getByText("Rio de Janeiro, RJ, Brazil")).toBeVisible();
    await expect(page.getByText("Player Bio")).toBeVisible();
    await expect(page.getByText(/Member since/)).toBeVisible();
  });

  test("anonymous visitor views public profile with localized pt-BR UI and metadata", async ({
    page
  }) => {
    await page.goto("/pt-BR/profiles/hugo_calderano");

    await expect(page).toHaveTitle("@hugo_calderano | Rallies Table Tennis");
    await expect(
      page.locator('meta[property="og:url"]')
    ).toHaveAttribute("content", "https://rallies.app/pt-BR/profiles/hugo_calderano");

    await expect(page.getByRole("heading", { name: "@hugo_calderano" })).toBeVisible();
    await expect(page.getByText("Jogador Ativo")).toBeVisible();
    await expect(page.getByText("Biografia do Jogador")).toBeVisible();
    await expect(page.getByText(/Membro desde/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Voltar para Perfis" })).toBeVisible();
  });

  test("renders localized not-found state for private or missing profiles", async ({
    page
  }) => {
    await page.goto("/en/profiles/private_player");
    await expect(page).toHaveTitle("Player Not Found | Rallies");
    await expect(page.getByRole("heading", { name: "Player Not Found" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to Profiles" })).toBeVisible();

    await page.goto("/pt-BR/profiles/private_player");
    await expect(page).toHaveTitle("Jogador não encontrado | Rallies");
    await expect(
      page.getByRole("heading", { name: "Jogador não encontrado" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Voltar para Perfis" })).toBeVisible();
  });
});
