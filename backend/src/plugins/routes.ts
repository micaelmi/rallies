import type { FastifyInstance } from "fastify";
import {
  registerBillingRoutes,
  registerStripeWebhookRoutes
} from "../modules/billing/billing.routes.js";
import { registerIdentityRoutes } from "../modules/identity/identity.routes.js";
import { registerProfilesRoutes } from "../modules/profiles/profiles.routes.js";
import { registerWalletRoutes } from "../modules/wallet/wallet.routes.js";
import { registerClerkWebhookRoutes } from "../modules/webhooks/clerk.routes.js";
import { registerHealthRoutes } from "../shared/http/health.routes.js";

export const registerRoutes = async (app: FastifyInstance): Promise<void> => {
  await app.register(registerHealthRoutes, { prefix: "/api/v1" });
  await app.register(registerIdentityRoutes, { prefix: "/api/v1/identity" });
  await app.register(registerProfilesRoutes, { prefix: "/api/v1" });
  await app.register(registerWalletRoutes, { prefix: "/api/v1/wallet" });
  await app.register(registerBillingRoutes, { prefix: "/api/v1/billing" });
  await app.register(registerClerkWebhookRoutes, { prefix: "/api/v1/webhooks" });
  await app.register(registerStripeWebhookRoutes, { prefix: "/api/v1/webhooks" });
};
