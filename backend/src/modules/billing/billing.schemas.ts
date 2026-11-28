import { z } from "zod";
import { errorResponseSchema } from "../../shared/http/error-schemas.js";
import { localeHeaderSchema } from "../../shared/http/locale-header-schema.js";
import { BILLING_PACKAGE_KINDS } from "./billing.types.js";

export const billingAuthenticatedHeadersSchema = localeHeaderSchema.extend({
  authorization: z.string().min(1).optional()
});

export const createCheckoutSessionBodySchema = z
  .object({
    priceId: z.string().trim().min(1).max(191)
  })
  .strict();

export const createCheckoutSessionResponseSchema = z.object({
  sessionId: z.string(),
  client_secret: z.string().min(1)
});

export const syncCheckoutSessionParamsSchema = z
  .object({
    sessionId: z.string().trim().min(1).max(191)
  })
  .strict();

export const syncCheckoutSessionResponseSchema = z.object({
  status: z.enum(["credited", "already_processed", "pending"]),
  balance: z.number().int().nonnegative()
});

export const billingPackageSchema = z.object({
  id: z.string(),
  priceId: z.string(),
  coinsAmount: z.number().int().positive(),
  kind: z.enum(BILLING_PACKAGE_KINDS),
  displayPriceCents: z.number().int().positive(),
  currency: z.literal("USD")
});

export const billingPackagesResponseSchema = z.object({
  packages: z.array(billingPackageSchema)
});

export const stripeWebhookHeadersSchema = z.object({
  "stripe-signature": z.string().min(1).optional()
});

export const stripeWebhookResponseSchema = z.object({
  received: z.literal(true),
  eventType: z.string(),
  action: z.enum([
    "credited",
    "already_processed",
    "ignored",
    "skipped_unpaid"
  ])
});

const protectedBillingRouteBaseSchema = {
  tags: ["billing"],
  headers: billingAuthenticatedHeadersSchema,
  security: [{ bearerAuth: [] }]
};

export const listBillingPackagesRouteSchema = {
  tags: ["billing"],
  headers: localeHeaderSchema,
  summary: "List available credit packages and subscriptions",
  description:
    "Returns the server-configured credit packages and subscription tiers available for purchase.",
  response: {
    200: billingPackagesResponseSchema,
    500: errorResponseSchema
  }
};

export const createCheckoutSessionRouteSchema = {
  ...protectedBillingRouteBaseSchema,
  summary: "Create a Stripe Checkout session",
  description:
    "Creates a server-verified Stripe Checkout session for purchasing coins or subscribing.",
  body: createCheckoutSessionBodySchema,
  response: {
    201: createCheckoutSessionResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    503: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const syncCheckoutSessionRouteSchema = {
  ...protectedBillingRouteBaseSchema,
  summary: "Sync a completed Stripe Checkout session",
  description:
    "Retrieves a Checkout session directly from Stripe, verifies ownership and payment status, and idempotently credits wallet coins if paid.",
  params: syncCheckoutSessionParamsSchema,
  response: {
    200: syncCheckoutSessionResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    503: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const stripeWebhookRouteSchema = {
  tags: ["webhooks"],
  summary: "Receive Stripe billing webhooks",
  description:
    "Verifies Stripe webhook signatures and grants wallet credits atomically upon payment completion.",
  headers: stripeWebhookHeadersSchema,
  response: {
    200: stripeWebhookResponseSchema,
    400: errorResponseSchema,
    503: errorResponseSchema,
    500: errorResponseSchema
  }
};
