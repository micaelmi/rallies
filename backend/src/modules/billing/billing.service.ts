import Stripe from "stripe";
import { AppError } from "../../shared/errors/app-error.js";
import type { WalletService } from "../wallet/wallet.service.js";
import type {
  BillingPackage,
  CreateCheckoutSessionResponse,
  StripeClientAdapter,
  StripeWebhookEvent,
  StripeWebhookResponse,
  SyncCheckoutSessionResponse
} from "./billing.types.js";

export type BillingConfig = {
  secretKey?: string | undefined;
  webhookSecret?: string | undefined;
  priceIds?: {
    starter?: string | undefined;
    pro?: string | undefined;
    clubPass?: string | undefined;
  };
};

export const createStripeClientAdapter = (
  secretKey: string
): StripeClientAdapter => {
  const stripe = new Stripe(secretKey);

  return {
    createCheckoutSession: async (params) => {
      const session = await stripe.checkout.sessions.create({
        ui_mode: "form",
        mode: params.mode,
        billing_address_collection: "auto",
        phone_number_collection: {
          enabled: false
        },
        automatic_tax: {
          enabled: false
        },
        ...(params.mode === "subscription"
          ? { payment_method_collection: "always" as const }
          : {}),
        submit_type: "auto",
        integration_identifier: "custom_embedded_web_0002",
        line_items: [
          {
            price: params.priceId,
            quantity: 1
          }
        ],
        client_reference_id: params.userId,
        metadata: {
          userId: params.userId,
          packageId: params.packageId,
          coinsAmount: String(params.coinsAmount)
        },
        ...(params.mode === "subscription"
          ? {
              subscription_data: {
                metadata: {
                  userId: params.userId,
                  packageId: params.packageId,
                  coinsAmount: String(params.coinsAmount)
                }
              }
            }
          : {})
      });

      return {
        id: session.id,
        client_secret: session.client_secret
      };
    },
    retrieveCheckoutSession: async (sessionId) => {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["invoice"]
      });
      return session as unknown as Record<string, unknown>;
    },
    constructWebhookEvent: (rawBody, signature, webhookSecret) => {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );

      return {
        id: event.id,
        type: event.type,
        data: {
          object: event.data.object as unknown as Record<string, unknown>
        }
      };
    }
  };
};

const buildCatalog = (config: BillingConfig): BillingPackage[] => {
  const catalog: BillingPackage[] = [];

  if (config.priceIds?.starter) {
    catalog.push({
      id: "starter_pack",
      priceId: config.priceIds.starter,
      coinsAmount: 100,
      kind: "ONE_TIME",
      displayPriceCents: 500,
      currency: "USD"
    });
  }

  if (config.priceIds?.pro) {
    catalog.push({
      id: "pro_pack",
      priceId: config.priceIds.pro,
      coinsAmount: 500,
      kind: "ONE_TIME",
      displayPriceCents: 2000,
      currency: "USD"
    });
  }

  if (config.priceIds?.clubPass) {
    catalog.push({
      id: "club_pass_monthly",
      priceId: config.priceIds.clubPass,
      coinsAmount: 300,
      kind: "SUBSCRIPTION",
      displayPriceCents: 999,
      currency: "USD"
    });
  }

  return catalog;
};

const readString = (
  record: Record<string, unknown> | undefined,
  key: string
): string | null => {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const readMetadata = (
  obj: Record<string, unknown>
): Record<string, unknown> | undefined => {
  const meta = obj.metadata;
  if (typeof meta === "object" && meta !== null) {
    return meta as Record<string, unknown>;
  }
  return undefined;
};

export class BillingService {
  private readonly catalog: BillingPackage[];
  private readonly stripeAdapter: StripeClientAdapter | null;

  public constructor(
    private readonly walletService: WalletService,
    private readonly config: BillingConfig,
    stripeAdapter?: StripeClientAdapter
  ) {
    this.catalog = buildCatalog(config);
    this.stripeAdapter =
      stripeAdapter ??
      (config.secretKey ? createStripeClientAdapter(config.secretKey) : null);
  }

  public listPackages(): BillingPackage[] {
    return this.catalog;
  }

  public async createCheckoutSession(
    userId: string,
    priceId: string
  ): Promise<CreateCheckoutSessionResponse> {
    if (!this.stripeAdapter) {
      throw new AppError({
        code: "BILLING_NOT_CONFIGURED",
        messageKey: "errors.billing.not_configured",
        statusCode: 503
      });
    }

    const pkg = this.catalog.find((entry) => entry.priceId === priceId);

    if (!pkg) {
      throw new AppError({
        code: "INVALID_BILLING_PRICE",
        messageKey: "errors.billing.invalid_price",
        statusCode: 400,
        details: { priceId }
      });
    }

    const session = await this.stripeAdapter.createCheckoutSession({
      userId,
      priceId: pkg.priceId,
      mode: pkg.kind === "SUBSCRIPTION" ? "subscription" : "payment",
      coinsAmount: pkg.coinsAmount,
      packageId: pkg.id
    });

    if (!session.client_secret) {
      throw new AppError({
        code: "BILLING_SESSION_FAILED",
        messageKey: "errors.billing.checkout_session_failed",
        statusCode: 500
      });
    }

    return {
      sessionId: session.id,
      client_secret: session.client_secret
    };
  }

  public async syncCheckoutSession(
    userId: string,
    sessionId: string
  ): Promise<SyncCheckoutSessionResponse> {
    if (!this.stripeAdapter) {
      throw new AppError({
        code: "BILLING_NOT_CONFIGURED",
        messageKey: "errors.billing.not_configured",
        statusCode: 503
      });
    }

    let session: Record<string, unknown>;

    try {
      session = await this.stripeAdapter.retrieveCheckoutSession(sessionId);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        (("statusCode" in error && error.statusCode === 404) ||
          ("code" in error && error.code === "resource_missing"))
      ) {
        throw new AppError({
          code: "CHECKOUT_SESSION_NOT_FOUND",
          messageKey: "errors.billing.checkout_session_not_found",
          statusCode: 404
        });
      }

      throw error;
    }

    const metadata = readMetadata(session);
    const sessionUserId =
      readString(metadata, "userId") ??
      readString(session, "client_reference_id");

    if (!sessionUserId || sessionUserId !== userId) {
      throw new AppError({
        code: "FORBIDDEN",
        messageKey: "errors.auth.forbidden",
        statusCode: 403
      });
    }

    const status = readString(session, "status");
    const mode = readString(session, "mode");
    const paymentStatus = readString(session, "payment_status");
    const coinsRaw = readString(metadata, "coinsAmount");
    const coinsAmount = coinsRaw ? Number(coinsRaw) : NaN;

    if (status !== "complete") {
      const currentWallet = await this.walletService.getBalance(userId);
      return {
        status: "pending",
        balance: currentWallet.balance
      };
    }

    if (mode === "payment") {
      if (paymentStatus !== "paid") {
        const currentWallet = await this.walletService.getBalance(userId);
        return {
          status: "pending",
          balance: currentWallet.balance
        };
      }

      if (!Number.isInteger(coinsAmount) || coinsAmount <= 0) {
        throw new AppError({
          code: "WEBHOOK_INVALID_PAYLOAD",
          messageKey: "errors.webhooks.invalid_payload",
          statusCode: 400
        });
      }

      const result = await this.walletService.grantCredits(
        userId,
        coinsAmount,
        "STRIPE_PURCHASE",
        sessionId,
        `Stripe checkout ${sessionId}`
      );

      return {
        status: result.alreadyProcessed ? "already_processed" : "credited",
        balance: result.wallet.balance
      };
    }

    if (mode === "subscription") {
      const invoice =
        typeof session.invoice === "object" && session.invoice !== null
          ? (session.invoice as Record<string, unknown>)
          : undefined;
      const invoiceId = readString(invoice, "id");
      const invoiceStatus = readString(invoice, "status");

      if (invoiceId && invoiceStatus === "paid") {
        if (!Number.isInteger(coinsAmount) || coinsAmount <= 0) {
          throw new AppError({
            code: "WEBHOOK_INVALID_PAYLOAD",
            messageKey: "errors.webhooks.invalid_payload",
            statusCode: 400
          });
        }

        const result = await this.walletService.grantCredits(
          userId,
          coinsAmount,
          "STRIPE_SUBSCRIPTION",
          invoiceId,
          `Stripe subscription invoice ${invoiceId}`
        );

        return {
          status: result.alreadyProcessed ? "already_processed" : "credited",
          balance: result.wallet.balance
        };
      }

      const currentWallet = await this.walletService.getBalance(userId);
      return {
        status: "pending",
        balance: currentWallet.balance
      };
    }

    const currentWallet = await this.walletService.getBalance(userId);
    return {
      status: "pending",
      balance: currentWallet.balance
    };
  }

  public async verifyAndProcessWebhook(
    rawBody: string | Buffer | undefined,
    signature: string | undefined
  ): Promise<StripeWebhookResponse> {
    if (!this.stripeAdapter || !this.config.webhookSecret) {
      throw new AppError({
        code: "WEBHOOK_NOT_CONFIGURED",
        messageKey: "errors.webhooks.stripe_not_configured",
        statusCode: 503
      });
    }

    if (!rawBody || !signature) {
      throw new AppError({
        code: "WEBHOOK_VERIFICATION_FAILED",
        messageKey: "errors.webhooks.signature_verification_failed",
        statusCode: 400
      });
    }

    let event: StripeWebhookEvent;

    try {
      event = this.stripeAdapter.constructWebhookEvent(
        rawBody,
        signature,
        this.config.webhookSecret
      );
    } catch {
      throw new AppError({
        code: "WEBHOOK_VERIFICATION_FAILED",
        messageKey: "errors.webhooks.signature_verification_failed",
        statusCode: 400
      });
    }

    if (event.type === "checkout.session.completed") {
      return this.handleCheckoutSessionCompleted(event.data.object);
    }

    if (event.type === "invoice.paid") {
      return this.handleInvoicePaid(event.data.object);
    }

    return {
      received: true,
      eventType: event.type,
      action: "ignored"
    };
  }

  private async handleCheckoutSessionCompleted(
    session: Record<string, unknown>
  ): Promise<StripeWebhookResponse> {
    const paymentStatus = readString(session, "payment_status");
    const mode = readString(session, "mode");

    // Subscriptions are credited via invoice.paid so recurring renewals and initial invoices use one path.
    if (mode === "subscription") {
      return {
        received: true,
        eventType: "checkout.session.completed",
        action: "ignored"
      };
    }

    if (paymentStatus && paymentStatus !== "paid") {
      return {
        received: true,
        eventType: "checkout.session.completed",
        action: "skipped_unpaid"
      };
    }

    const sessionId = readString(session, "id");
    const metadata = readMetadata(session);
    const userId =
      readString(metadata, "userId") ?? readString(session, "client_reference_id");
    const coinsRaw = readString(metadata, "coinsAmount");
    const coinsAmount = coinsRaw ? Number(coinsRaw) : NaN;

    if (!sessionId || !userId || !Number.isInteger(coinsAmount) || coinsAmount <= 0) {
      throw new AppError({
        code: "WEBHOOK_INVALID_PAYLOAD",
        messageKey: "errors.webhooks.invalid_payload",
        statusCode: 400
      });
    }

    const result = await this.walletService.grantCredits(
      userId,
      coinsAmount,
      "STRIPE_PURCHASE",
      sessionId,
      `Stripe checkout ${sessionId}`
    );

    return {
      received: true,
      eventType: "checkout.session.completed",
      action: result.alreadyProcessed ? "already_processed" : "credited"
    };
  }

  private async handleInvoicePaid(
    invoice: Record<string, unknown>
  ): Promise<StripeWebhookResponse> {
    const invoiceId = readString(invoice, "id");
    const subscriptionDetails =
      typeof invoice.subscription_details === "object" &&
      invoice.subscription_details !== null
        ? (invoice.subscription_details as Record<string, unknown>)
        : undefined;
    const parent =
      typeof invoice.parent === "object" && invoice.parent !== null
        ? (invoice.parent as Record<string, unknown>)
        : undefined;
    const parentSubDetails =
      typeof parent?.subscription_details === "object" &&
      parent.subscription_details !== null
        ? (parent.subscription_details as Record<string, unknown>)
        : undefined;

    const metadata =
      readMetadata(invoice) ??
      readMetadata(subscriptionDetails ?? {}) ??
      readMetadata(parentSubDetails ?? {});

    const userId = readString(metadata, "userId");
    const coinsRaw = readString(metadata, "coinsAmount");
    const coinsAmount = coinsRaw ? Number(coinsRaw) : NaN;

    if (!invoiceId || !userId || !Number.isInteger(coinsAmount) || coinsAmount <= 0) {
      return {
        received: true,
        eventType: "invoice.paid",
        action: "ignored"
      };
    }

    const result = await this.walletService.grantCredits(
      userId,
      coinsAmount,
      "STRIPE_SUBSCRIPTION",
      invoiceId,
      `Stripe subscription invoice ${invoiceId}`
    );

    return {
      received: true,
      eventType: "invoice.paid",
      action: result.alreadyProcessed ? "already_processed" : "credited"
    };
  }
}
