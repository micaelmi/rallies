import type { FastifyInstance } from "fastify";
import { registerIdentityRoutes } from "../modules/identity/identity.routes.js";
import { registerProfilesRoutes } from "../modules/profiles/profiles.routes.js";
import { registerClerkWebhookRoutes } from "../modules/webhooks/clerk.routes.js";
import { registerHealthRoutes } from "../shared/http/health.routes.js";

export const registerRoutes = async (app: FastifyInstance): Promise<void> => {
  await app.register(registerHealthRoutes, { prefix: "/api/v1" });
  await app.register(registerIdentityRoutes, { prefix: "/api/v1/identity" });
  await app.register(registerProfilesRoutes, { prefix: "/api/v1" });
  await app.register(registerClerkWebhookRoutes, { prefix: "/api/v1/webhooks" });
};
