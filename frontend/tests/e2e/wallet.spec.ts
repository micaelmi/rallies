import { expect, test, type Page } from "@playwright/test";

const MOCK_API_BASE = "http://127.0.0.1:4344/api/v1";

const stubStripeEndiveJs = async (page: Page) => {
  await page.route("https://js.stripe.com/**", async (route) => {
    const mockScript = `
      window.Stripe = function () {
        return {
          initCheckoutFormSdk: function (opts) {
            return {
              createForm: function () {
                var confirmHandler = null;
                var containerEl = null;
                return {
                  mount: function (target) {
                    containerEl = typeof target === "string"
                      ? document.querySelector(target)
                      : target;
                    if (!containerEl) return;
                    var btn = document.createElement("button");
                    btn.type = "button";
                    btn.setAttribute("data-testid", "mock-stripe-pay-button");
                    btn.textContent = "Pay now (E2E Mock)";
                    btn.addEventListener("click", function () {
                      if (confirmHandler) {
                        confirmHandler({ preventDefault: function () {} });
                      }
                    });
                    containerEl.appendChild(btn);
                  },
                  on: function (eventName, cb) {
                    if (eventName === "confirm") {
                      confirmHandler = cb;
                    }
                  },
                  unmount: function () {
                    if (containerEl) containerEl.innerHTML = "";
                  },
                  destroy: function () {
                    if (containerEl) containerEl.innerHTML = "";
                  }
                };
              },
              loadActions: async function () {
                await opts.clientSecret;
                return {
                  type: "success",
                  actions: {
                    confirm: async function () {
                      return { type: "success" };
                    }
                  }
                };
              }
            };
          }
        };
      };
    `;

    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: mockScript
    });
  });
};

test.describe("Wallet & Credit Purchase E2E journey", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    await request.post(`${MOCK_API_BASE}/e2e/wallet/reset`);
  });

  test("selects a coin package, completes embedded checkout, and updates wallet balance on desktop", async ({
    page
  }) => {
    await stubStripeEndiveJs(page);

    await page.goto("/en/wallet", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Top up your Rallies Coins" })
    ).toBeVisible();
    await expect(page.getByText("0 Coins", { exact: true })).toBeVisible();

    await expect(page.getByText("100 Coins", { exact: true })).toBeVisible();
    await expect(page.getByText("500 Coins", { exact: true })).toBeVisible();
    await expect(page.getByText("300 Coins", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Select Package" }).first().click();

    const payBtn = page.getByTestId("mock-stripe-pay-button");
    await expect(payBtn).toBeVisible({ timeout: 10_000 });
    await payBtn.click();

    await expect(
      page.getByText("Payment confirmed! Your wallet balance has been updated.")
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("100 Coins", { exact: true }).first()).toBeVisible();
  });

  test("renders and completes credit purchase cleanly on mobile viewport", async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stubStripeEndiveJs(page);

    await page.goto("/en/wallet", { waitUntil: "networkidle" });
    await expect(page.getByText("0 Coins", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Select Package" }).nth(1).click();

    const payBtn = page.getByTestId("mock-stripe-pay-button");
    await expect(payBtn).toBeVisible({ timeout: 10_000 });
    await payBtn.click();

    await expect(
      page.getByText("Payment confirmed! Your wallet balance has been updated.")
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("500 Coins", { exact: true }).first()).toBeVisible();
  });

  test("syncs balance automatically on pt-BR redirect return with session_id", async ({
    page,
    request
  }) => {
    const createRes = await request.post(
      `${MOCK_API_BASE}/billing/checkout-sessions`,
      {
        data: { priceId: "price_e2e_club_pass" }
      }
    );
    expect(createRes.ok()).toBe(true);
    const { sessionId } = (await createRes.json()) as { sessionId: string };

    await page.goto(`/pt-BR/wallet?session_id=${encodeURIComponent(sessionId)}`, {
      waitUntil: "networkidle"
    });

    await expect(
      page.getByRole("heading", { name: "Adicione Moedas Rallies" })
    ).toBeVisible();
    await expect(
      page.getByText("Pagamento confirmado! Seu saldo foi atualizado.")
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("300 Moedas", { exact: true }).first()).toBeVisible();
  });
});
