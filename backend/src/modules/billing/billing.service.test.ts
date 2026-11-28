import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../shared/errors/app-error.js";
import type { WalletService } from "../wallet/wallet.service.js";
import { BillingService } from "./billing.service.js";
import type { StripeClientAdapter } from "./billing.types.js";

const createMockWalletService = () =>
  ({
    grantCredits: vi.fn(),
    getBalance: vi.fn()
  }) as unknown as WalletService & {
    grantCredits: ReturnType<typeof vi.fn>;
    getBalance: ReturnType<typeof vi.fn>;
  };

const createMockStripeAdapter = () => ({
  createCheckoutSession: vi.fn<StripeClientAdapter["createCheckoutSession"]>(),
  retrieveCheckoutSession:
    vi.fn<StripeClientAdapter["retrieveCheckoutSession"]>(),
  constructWebhookEvent: vi.fn<StripeClientAdapter["constructWebhookEvent"]>()
});

describe("BillingService", () => {
  const billingConfig = {
    secretKey: "sk_test_123",
    webhookSecret: "whsec_test_123",
    priceIds: {
      starter: "price_starter",
      pro: "price_pro",
      clubPass: "price_club_pass"
    }
  };

  describe("createCheckoutSession", () => {
    it("creates a one-time payment checkout session for a valid priceId", async () => {
      const walletService = createMockWalletService();
      const stripe = createMockStripeAdapter();
      stripe.createCheckoutSession.mockResolvedValue({
        id: "cs_test_1",
        client_secret: "cs_test_1_secret_abc"
      });

      const service = new BillingService(walletService, billingConfig, stripe);
      const result = await service.createCheckoutSession(
        "user_1",
        "price_starter"
      );

      expect(result).toEqual({
        sessionId: "cs_test_1",
        client_secret: "cs_test_1_secret_abc"
      });
      expect(stripe.createCheckoutSession).toHaveBeenCalledWith({
        userId: "user_1",
        priceId: "price_starter",
        mode: "payment",
        coinsAmount: 100,
        packageId: "starter_pack"
      });
    });

    it("creates a subscription checkout session for recurring plan priceId", async () => {
      const walletService = createMockWalletService();
      const stripe = createMockStripeAdapter();
      stripe.createCheckoutSession.mockResolvedValue({
        id: "cs_sub_1",
        client_secret: "cs_sub_1_secret_xyz"
      });

      const service = new BillingService(walletService, billingConfig, stripe);
      await service.createCheckoutSession("user_1", "price_club_pass");

      expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          coinsAmount: 300,
          packageId: "club_pass_monthly"
        })
      );
    });

    it("rejects unknown priceId with 400 INVALID_BILLING_PRICE", async () => {
      const walletService = createMockWalletService();
      const stripe = createMockStripeAdapter();
      const service = new BillingService(walletService, billingConfig, stripe);

      await expect(
        service.createCheckoutSession("user_1", "price_tampered")
      ).rejects.toMatchObject({
        code: "INVALID_BILLING_PRICE",
        statusCode: 400
      });
      expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe("verifyAndProcessWebhook", () => {
    it("grants credits upon verified checkout.session.completed and skips duplicates", async () => {
      const walletService = createMockWalletService();
      walletService.grantCredits
        .mockResolvedValueOnce({ alreadyProcessed: false })
        .mockResolvedValueOnce({ alreadyProcessed: true });

      const stripe = createMockStripeAdapter();
      stripe.constructWebhookEvent.mockReturnValue({
        id: "evt_1",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_1",
            mode: "payment",
            payment_status: "paid",
            client_reference_id: "user_1",
            metadata: {
              userId: "user_1",
              coinsAmount: "100"
            }
          }
        }
      });

      const service = new BillingService(walletService, billingConfig, stripe);
      const first = await service.verifyAndProcessWebhook(
        Buffer.from("{}"),
        "sig_valid"
      );
      const second = await service.verifyAndProcessWebhook(
        Buffer.from("{}"),
        "sig_valid"
      );

      expect(first).toEqual({
        received: true,
        eventType: "checkout.session.completed",
        action: "credited"
      });
      expect(second).toEqual({
        received: true,
        eventType: "checkout.session.completed",
        action: "already_processed"
      });
      expect(walletService.grantCredits).toHaveBeenCalledWith(
        "user_1",
        100,
        "STRIPE_PURCHASE",
        "cs_test_1",
        "Stripe checkout cs_test_1"
      );
    });

    it("grants recurring credits upon verified invoice.paid", async () => {
      const walletService = createMockWalletService();
      walletService.grantCredits.mockResolvedValueOnce({
        alreadyProcessed: false
      });

      const stripe = createMockStripeAdapter();
      stripe.constructWebhookEvent.mockReturnValue({
        id: "evt_2",
        type: "invoice.paid",
        data: {
          object: {
            id: "in_test_1",
            parent: {
              subscription_details: {
                metadata: {
                  userId: "user_1",
                  coinsAmount: "300"
                }
              }
            }
          }
        }
      });

      const service = new BillingService(walletService, billingConfig, stripe);
      const res = await service.verifyAndProcessWebhook(
        Buffer.from("{}"),
        "sig_valid"
      );

      expect(res).toEqual({
        received: true,
        eventType: "invoice.paid",
        action: "credited"
      });
      expect(walletService.grantCredits).toHaveBeenCalledWith(
        "user_1",
        300,
        "STRIPE_SUBSCRIPTION",
        "in_test_1",
        "Stripe subscription invoice in_test_1"
      );
    });

    it("rejects missing or invalid stripe-signature with 400 WEBHOOK_VERIFICATION_FAILED", async () => {
      const walletService = createMockWalletService();
      const stripe = createMockStripeAdapter();
      stripe.constructWebhookEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const service = new BillingService(walletService, billingConfig, stripe);

      await expect(
        service.verifyAndProcessWebhook(Buffer.from("{}"), undefined)
      ).rejects.toBeInstanceOf(AppError);

      await expect(
        service.verifyAndProcessWebhook(Buffer.from("{}"), "bad_sig")
      ).rejects.toMatchObject({
        code: "WEBHOOK_VERIFICATION_FAILED",
        statusCode: 400
      });
      expect(walletService.grantCredits).not.toHaveBeenCalled();
    });
  });

  describe("syncCheckoutSession", () => {
    it("credits a completed paid one-time checkout session and returns already_processed on repeat", async () => {
      const walletService = createMockWalletService();
      walletService.grantCredits
        .mockResolvedValueOnce({
          alreadyProcessed: false,
          wallet: { balance: 100 }
        })
        .mockResolvedValueOnce({
          alreadyProcessed: true,
          wallet: { balance: 100 }
        });

      const stripe = createMockStripeAdapter();
      stripe.retrieveCheckoutSession.mockResolvedValue({
        id: "cs_test_1",
        status: "complete",
        mode: "payment",
        payment_status: "paid",
        client_reference_id: "user_1",
        metadata: {
          userId: "user_1",
          coinsAmount: "100"
        }
      });

      const service = new BillingService(walletService, billingConfig, stripe);
      const first = await service.syncCheckoutSession("user_1", "cs_test_1");
      const second = await service.syncCheckoutSession("user_1", "cs_test_1");

      expect(first).toEqual({ status: "credited", balance: 100 });
      expect(second).toEqual({ status: "already_processed", balance: 100 });
      expect(walletService.grantCredits).toHaveBeenCalledWith(
        "user_1",
        100,
        "STRIPE_PURCHASE",
        "cs_test_1",
        "Stripe checkout cs_test_1"
      );
    });

    it("credits a completed subscription session using its paid expanded invoice", async () => {
      const walletService = createMockWalletService();
      walletService.grantCredits.mockResolvedValueOnce({
        alreadyProcessed: false,
        wallet: { balance: 300 }
      });

      const stripe = createMockStripeAdapter();
      stripe.retrieveCheckoutSession.mockResolvedValue({
        id: "cs_sub_1",
        status: "complete",
        mode: "subscription",
        payment_status: "paid",
        client_reference_id: "user_1",
        metadata: {
          userId: "user_1",
          coinsAmount: "300"
        },
        invoice: {
          id: "in_sub_1",
          status: "paid"
        }
      });

      const service = new BillingService(walletService, billingConfig, stripe);
      const result = await service.syncCheckoutSession("user_1", "cs_sub_1");

      expect(result).toEqual({ status: "credited", balance: 300 });
      expect(walletService.grantCredits).toHaveBeenCalledWith(
        "user_1",
        300,
        "STRIPE_SUBSCRIPTION",
        "in_sub_1",
        "Stripe subscription invoice in_sub_1"
      );
    });

    it("returns pending with current balance when checkout session is not complete or paid", async () => {
      const walletService = createMockWalletService();
      walletService.getBalance.mockResolvedValueOnce({ balance: 50 });

      const stripe = createMockStripeAdapter();
      stripe.retrieveCheckoutSession.mockResolvedValue({
        id: "cs_open_1",
        status: "open",
        mode: "payment",
        payment_status: "unpaid",
        client_reference_id: "user_1",
        metadata: {
          userId: "user_1",
          coinsAmount: "100"
        }
      });

      const service = new BillingService(walletService, billingConfig, stripe);
      const result = await service.syncCheckoutSession("user_1", "cs_open_1");

      expect(result).toEqual({ status: "pending", balance: 50 });
      expect(walletService.grantCredits).not.toHaveBeenCalled();
    });

    it("rejects syncing a session owned by a different user with 403 FORBIDDEN", async () => {
      const walletService = createMockWalletService();
      const stripe = createMockStripeAdapter();
      stripe.retrieveCheckoutSession.mockResolvedValue({
        id: "cs_other_1",
        status: "complete",
        mode: "payment",
        payment_status: "paid",
        client_reference_id: "user_other",
        metadata: {
          userId: "user_other",
          coinsAmount: "100"
        }
      });

      const service = new BillingService(walletService, billingConfig, stripe);

      await expect(
        service.syncCheckoutSession("user_1", "cs_other_1")
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        statusCode: 403
      });
      expect(walletService.grantCredits).not.toHaveBeenCalled();
    });

    it("maps Stripe 404 resource_missing errors to 404 CHECKOUT_SESSION_NOT_FOUND", async () => {
      const walletService = createMockWalletService();
      const stripe = createMockStripeAdapter();
      stripe.retrieveCheckoutSession.mockRejectedValue(
        Object.assign(new Error("No such checkout.session"), {
          statusCode: 404,
          code: "resource_missing"
        })
      );

      const service = new BillingService(walletService, billingConfig, stripe);

      await expect(
        service.syncCheckoutSession("user_1", "cs_missing_1")
      ).rejects.toMatchObject({
        code: "CHECKOUT_SESSION_NOT_FOUND",
        statusCode: 404
      });
      expect(walletService.grantCredits).not.toHaveBeenCalled();
    });
  });
});
