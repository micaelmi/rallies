import type { FastifyInstance } from "fastify";
import { PrismaWalletRepository } from "../wallet/wallet.repository.js";
import { WalletService } from "../wallet/wallet.service.js";
import { BillingController } from "./billing.controller.js";
import {
  createCheckoutSessionRouteSchema,
  listBillingPackagesRouteSchema,
  stripeWebhookRouteSchema,
  syncCheckoutSessionRouteSchema
} from "./billing.schemas.js";
import { BillingService } from "./billing.service.js";
import type { StripeClientAdapter } from "./billing.types.js";

export type BillingRoutesOptions = {
  stripeAdapter?: StripeClientAdapter;
};

const createBillingController = (
  app: FastifyInstance,
  stripeAdapter?: StripeClientAdapter
): BillingController => {
  const walletRepository = new PrismaWalletRepository(app.prisma);
  const walletService = new WalletService(walletRepository);
  const billingService = new BillingService(
    walletService,
    {
      secretKey: app.config?.STRIPE_SECRET_KEY,
      webhookSecret: app.config?.STRIPE_WEBHOOK_SECRET,
      priceIds: {
        starter: app.config?.STRIPE_PRICE_ID_STARTER,
        pro: app.config?.STRIPE_PRICE_ID_PRO,
        clubPass: app.config?.STRIPE_PRICE_ID_CLUB_PASS
      }
    },
    stripeAdapter
  );

  return new BillingController(billingService);
};

export const registerBillingRoutes = async (
  app: FastifyInstance,
  opts: BillingRoutesOptions = {}
): Promise<void> => {
  const billingController = createBillingController(app, opts.stripeAdapter);

  app.get(
    "/packages",
    {
      schema: listBillingPackagesRouteSchema
    },
    billingController.listPackages
  );

  await app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.requireAuth);

    protectedApp.post(
      "/checkout-sessions",
      {
        schema: createCheckoutSessionRouteSchema
      },
      billingController.createCheckoutSession
    );

    protectedApp.post(
      "/checkout-sessions/:sessionId/sync",
      {
        schema: syncCheckoutSessionRouteSchema
      },
      billingController.syncCheckoutSession
    );
  });
};

export const registerStripeWebhookRoutes = async (
  app: FastifyInstance,
  opts: BillingRoutesOptions = {}
): Promise<void> => {
  const billingController = createBillingController(app, opts.stripeAdapter);

  app.post(
    "/stripe",
    {
      schema: stripeWebhookRouteSchema,
      config: {
        rawBody: true
      }
    },
    billingController.handleStripeWebhook
  );
};
