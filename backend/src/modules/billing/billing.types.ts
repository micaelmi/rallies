import type { z } from "zod";
import type {
  billingPackagesResponseSchema,
  createCheckoutSessionBodySchema,
  createCheckoutSessionResponseSchema,
  stripeWebhookResponseSchema,
  syncCheckoutSessionParamsSchema,
  syncCheckoutSessionResponseSchema
} from "./billing.schemas.js";

export const BILLING_PACKAGE_KINDS = ["ONE_TIME", "SUBSCRIPTION"] as const;

export type BillingPackageKind = (typeof BILLING_PACKAGE_KINDS)[number];

export type BillingPackage = {
  id: string;
  priceId: string;
  coinsAmount: number;
  kind: BillingPackageKind;
  displayPriceCents: number;
  currency: "USD";
};

export type CreateCheckoutSessionInput = z.infer<
  typeof createCheckoutSessionBodySchema
>;

export type CreateCheckoutSessionResponse = z.infer<
  typeof createCheckoutSessionResponseSchema
>;

export type SyncCheckoutSessionParams = z.infer<
  typeof syncCheckoutSessionParamsSchema
>;

export type SyncCheckoutSessionResponse = z.infer<
  typeof syncCheckoutSessionResponseSchema
>;

export type BillingPackagesResponse = z.infer<
  typeof billingPackagesResponseSchema
>;

export type StripeWebhookResponse = z.infer<
  typeof stripeWebhookResponseSchema
>;

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export interface StripeClientAdapter {
  createCheckoutSession(params: {
    userId: string;
    priceId: string;
    mode: "payment" | "subscription";
    coinsAmount: number;
    packageId: string;
  }): Promise<{ id: string; client_secret: string | null }>;
  retrieveCheckoutSession(sessionId: string): Promise<Record<string, unknown>>;
  constructWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
    webhookSecret: string
  ): StripeWebhookEvent;
}
